<?php
/**
 * AskPeply Chat Handler & System Prompt Engine
 * Ported from chat.server.ts in the Shopify app.
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Chat {

	const NO_ANSWER = '[[NO_ANSWER]]';

	/**
	 * Tone guidelines for AI persona.
	 */
	public static function get_tones() {
		return array(
			'professional' => 'Professional, precise and calm.',
			'friendly'     => 'Warm and friendly, but still precise.',
			'concise'      => 'Very short and to the point.',
		);
	}

	/**
	 * Compile system prompt grounded strictly in store knowledge.
	 */
	public static function build_system_prompt( $shop, $settings, $g, $knowledge ) {
		$store_name = ! empty( $settings['storeName'] ) ? $settings['storeName'] : get_bloginfo( 'name' );
		$tones      = self::get_tones();
		$tone_text  = isset( $tones[ $g['tone'] ] ) ? $tones[ $g['tone'] ] : $tones['professional'];

		$kb_items = array();
		if ( ! empty( $knowledge ) && is_array( $knowledge ) ) {
			foreach ( $knowledge as $i => $k ) {
				$source_label = strtoupper( isset( $k['source'] ) ? $k['source'] : 'INFO' );
				$link_text    = ! empty( $k['url'] ) ? " (link: {$k['url']})" : '';
				$snippet      = substr( isset( $k['content'] ) ? $k['content'] : '', 0, 1500 );
				$kb_items[]   = '[' . ( $i + 1 ) . "] {$source_label}: {$k['title']}{$link_text}\n{$snippet}";
			}
			$kb = implode( "\n\n", $kb_items );
		} else {
			$kb = '(no matching store information found)';
		}

		$support_note = ! empty( $g['supportEmail'] )
			? " and that the customer can email {$g['supportEmail']}"
			: " and suggest contacting the store's support team";

		$custom_inst = ! empty( $g['customInstructions'] ) && trim( $g['customInstructions'] )
			? "\nSTORE OWNER INSTRUCTIONS (follow unless they conflict with the rules above)\n" . trim( $g['customInstructions'] ) . "\n"
			: '';

		$prompt = <<<PROMPT
You are {$settings['botName']}, the AI shopping assistant on the online store "{$store_name}". The store sells research peptides and related products.

TONE: {$tone_text}

RULES
- Answer ONLY from the STORE KNOWLEDGE below. Never use outside knowledge about peptides, never invent products, prices, stock, shipping times, policies or discounts.
- If the answer is not in the store knowledge, start your reply with [[NO_ANSWER]] and then say politely that you don't have that information{$support_note}.
- All products are for research use only. Never give dosing, administration, injection, human-use, medical, health, weight-loss or off-label advice, even if asked directly or indirectly. Decline briefly and offer help with specs, COAs, storage, shipping or policies.
- Never claim a product treats, cures or prevents anything.
- When you mention a product or page, link it with markdown using the link given, e.g. [Product name](/product/handle).
- Keep replies short: 2 to 4 sentences, or at most 4 bullet points. Plain text with **bold** and "- " bullets only. No headings, tables or emojis.
- Reply in the same language the customer writes in.
{$custom_inst}
STORE KNOWLEDGE
{$kb}
PROMPT;

		return $prompt;
	}

	/**
	 * Process a customer chat turn.
	 */
	public static function handle_chat( $input ) {
		global $wpdb;
		$shop = ! empty( $input['shop'] ) ? $input['shop'] : 'default';

		$messages = isset( $input['messages'] ) && is_array( $input['messages'] ) ? $input['messages'] : array();
		$valid_messages = array();
		foreach ( $messages as $m ) {
			if ( ! empty( $m['content'] ) && is_string( $m['content'] ) && '' !== trim( $m['content'] ) ) {
				$valid_messages[] = $m;
			}
		}

		$last = end( $valid_messages );
		if ( empty( $last ) || 'user' !== ( isset( $last['role'] ) ? $last['role'] : '' ) ) {
			return array(
				'reply'          => '',
				'conversationId' => isset( $input['conversationId'] ) ? $input['conversationId'] : null,
				'status'         => 'error',
				'reason'         => 'no_question',
			);
		}

		$question = substr( trim( $last['content'] ), 0, 1500 );

		$shop_data  = Settings::get_shop_data( $shop );
		$settings   = $shop_data['settings'];
		$guardrails = $shop_data['guardrails'];
		$plan       = $shop_data['plan'];
		$plans      = Settings::get_plans();
		$plan_conf  = isset( $plans[ $plan ] ) ? $plans[ $plan ] : $plans[ Settings::PLAN_STARTER ];

		// Run background retention purge
		Orders::purge_old_data( $shop, $guardrails['retentionDays'] );

		// Find or initialize conversation
		$table_c = Database::table_conversations();
		$table_m = Database::table_messages();

		$conversation_id = ! empty( $input['conversationId'] ) ? sanitize_text_field( $input['conversationId'] ) : null;
		$conversation    = null;

		if ( $conversation_id ) {
			$conversation = $wpdb->get_row(
				$wpdb->prepare( "SELECT * FROM {$table_c} WHERE id = %s AND shop = %s", $conversation_id, $shop )
			);
		}

		$is_test = ! empty( $input['isTest'] );

		if ( ! $conversation ) {
			if ( ! $is_test ) {
				$used = Settings::usage_this_month( $shop );
				if ( $used >= $plan_conf['conversations'] ) {
					return array(
						'reply'          => "Our assistant is unavailable right now. Please contact our support team and we'll be happy to help.",
						'conversationId' => null,
						'status'         => 'limit',
					);
				}
			}

			$conversation_id = Database::generate_id( 'conv' );
			$wpdb->insert(
				$table_c,
				array(
					'id'              => $conversation_id,
					'shop'            => $shop,
					'status'          => 'answered',
					'first_question'  => substr( Orders::mask_emails( $question ), 0, 300 ),
					'message_count'   => 0,
					'is_test'         => $is_test ? 1 : 0,
					'page_url'        => ! empty( $input['pageUrl'] ) ? esc_url_raw( $input['pageUrl'] ) : null,
					'started_at'      => current_time( 'mysql' ),
					'last_message_at' => current_time( 'mysql' ),
				)
			);
		}

		// Save user message (emails masked before persisting)
		$wpdb->insert(
			$table_m,
			array(
				'id'              => Database::generate_id( 'msg' ),
				'conversation_id' => $conversation_id,
				'role'            => 'user',
				'content'         => Orders::mask_emails( $question ),
				'flag'            => null,
				'created_at'      => current_time( 'mysql' ),
			)
		);

		// 1. Guardrail Precheck
		$check = Guardrails::precheck(
			$question,
			$guardrails,
			Settings::plan_allows( $plan, 'customTopics' )
		);

		// 2. Order Tracking Check
		$user_msgs = array();
		foreach ( $valid_messages as $m ) {
			if ( 'user' === ( isset( $m['role'] ) ? $m['role'] : '' ) ) {
				$user_msgs[] = $m['content'];
			}
		}
		$order_state = Orders::read_order_state( $user_msgs );
		$can_track   = ! empty( $settings['orderTracking'] ) && Settings::plan_allows( $plan, 'orderTracking' );

		$latest_details = (bool) ( Orders::find_order_number( $question ) || Orders::find_email( $question ) );
		$order_mode     = Orders::is_order_question( $question ) || ( $order_state['wantsOrder'] && $latest_details );

		$result = null;

		if ( ! $check['blocked'] && $order_mode && $can_track ) {
			$result = self::answer_order( $shop, $conversation_id, $order_state, $guardrails['supportEmail'] );
		} elseif ( $check['blocked'] ) {
			$escalate = ! empty( $guardrails['escalateBlocked'] ) && Settings::plan_allows( $plan, 'escalation' );
			$result   = array(
				'reply'          => ! empty( $check['reply'] ) ? $check['reply'] : $guardrails['refusalMessage'],
				'conversationId' => $conversation_id,
				'status'         => $escalate ? 'escalated' : 'blocked',
				'reason'         => $check['reason'],
			);
		} else {
			// Query store knowledge for context
			$last_3_text = array();
			foreach ( array_slice( $valid_messages, -3 ) as $m ) {
				$last_3_text[] = $m['content'];
			}
			$knowledge = Knowledge::search_knowledge( $shop, implode( ' ', $last_3_text ) );
			$system    = self::build_system_prompt( $shop, $settings, $guardrails, $knowledge );

			$ai_messages = array();
			foreach ( $valid_messages as $m ) {
				$ai_messages[] = array(
					'role'    => $m['role'],
					'content' => Orders::mask_emails( $m['content'] ),
				);
			}

			$ai = Gemini_Client::ask_ai( $system, $ai_messages );

			if ( empty( $ai['ok'] ) ) {
				$result = array(
					'reply'          => $settings['offlineAnswer'],
					'conversationId' => $conversation_id,
					'status'         => 'error',
					'reason'         => $is_test ? ( isset( $ai['detail'] ) ? $ai['detail'] : $ai['error'] ) : $ai['error'],
				);
			} else {
				$reply  = $ai['reply'];
				$status = 'answered';

				if ( false !== strpos( $reply, self::NO_ANSWER ) ) {
					$reply  = trim( str_replace( self::NO_ANSWER, '', $reply ) );
					$status = Settings::plan_allows( $plan, 'escalation' ) ? 'escalated' : 'unanswered';
				}

				if ( ! empty( $guardrails['appendDisclaimer'] ) && ! empty( $guardrails['disclaimer'] ) && trim( $guardrails['disclaimer'] ) ) {
					$reply .= "\n\n*" . trim( $guardrails['disclaimer'] ) . '*';
				}

				$sources = array();
				foreach ( $knowledge as $k ) {
					$sources[] = array(
						'title'  => $k['title'],
						'url'    => $k['url'],
						'source' => $k['source'],
					);
				}

				$result = array(
					'reply'          => $reply,
					'conversationId' => $conversation_id,
					'status'         => $status,
					'sources'        => $sources,
				);
			}
		}

		// Save assistant response message
		$flag = ( 'answered' === $result['status'] )
			? ( isset( $result['reason'] ) && 'order' === $result['reason'] ? 'order' : null )
			: $result['status'];

		$wpdb->insert(
			$table_m,
			array(
				'id'              => Database::generate_id( 'msg' ),
				'conversation_id' => $conversation_id,
				'role'            => 'assistant',
				'content'         => Orders::mask_emails( $result['reply'] ),
				'flag'            => $flag,
				'created_at'      => current_time( 'mysql' ),
			)
		);

		// Determine conversation final status: escalated > blocked > unanswered > error > answered
		$order_weights = array(
			'answered'   => 0,
			'error'      => 1,
			'unanswered' => 2,
			'blocked'    => 3,
			'escalated'  => 4,
		);

		$curr_status = $conversation ? $conversation->status : 'answered';
		$curr_weight = isset( $order_weights[ $curr_status ] ) ? $order_weights[ $curr_status ] : 0;
		$new_weight  = isset( $order_weights[ $result['status'] ] ) ? $order_weights[ $result['status'] ] : 0;
		$final_status = ( $new_weight > $curr_weight ) ? $result['status'] : $curr_status;

		// Update conversation meta
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table_c} SET message_count = message_count + 2, last_message_at = %s, status = %s WHERE id = %s",
				current_time( 'mysql' ),
				$final_status,
				$conversation_id
			)
		);

		return $result;
	}

	/**
	 * Log written responses clicked from suggested chips.
	 */
	public static function log_written_answer( $shop, $conversation_id, $question, $answer ) {
		global $wpdb;
		$table_c = Database::table_conversations();
		$table_m = Database::table_messages();

		if ( ! $conversation_id ) {
			$conversation_id = Database::generate_id( 'conv' );
			$wpdb->insert(
				$table_c,
				array(
					'id'              => $conversation_id,
					'shop'            => $shop,
					'status'          => 'answered',
					'first_question'  => substr( Orders::mask_emails( $question ), 0, 300 ),
					'message_count'   => 0,
					'is_test'         => 0,
					'started_at'      => current_time( 'mysql' ),
					'last_message_at' => current_time( 'mysql' ),
				)
			);
		}

		$wpdb->insert(
			$table_m,
			array(
				'id'              => Database::generate_id( 'msg' ),
				'conversation_id' => $conversation_id,
				'role'            => 'user',
				'content'         => substr( $question, 0, 1500 ),
				'flag'            => null,
				'created_at'      => current_time( 'mysql' ),
			)
		);

		$wpdb->insert(
			$table_m,
			array(
				'id'              => Database::generate_id( 'msg' ),
				'conversation_id' => $conversation_id,
				'role'            => 'assistant',
				'content'         => substr( $answer, 0, 4000 ),
				'flag'            => 'written',
				'created_at'      => current_time( 'mysql' ),
			)
		);

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table_c} SET message_count = message_count + 2, last_message_at = %s WHERE id = %s",
				current_time( 'mysql' ),
				$conversation_id
			)
		);

		return $conversation_id;
	}

	/**
	 * Handle order tracking flow with email privacy verification.
	 */
	private static function answer_order( $shop, $conversation_id, $state, $support_email ) {
		global $wpdb;
		$support = $support_email ? " or email us at {$support_email}" : '';

		if ( empty( $state['orderNumber'] ) && empty( $state['email'] ) ) {
			return array(
				'reply'          => "I can check that for you. Please send your **order number** (for example #1001) and the **email** you used at checkout.",
				'conversationId' => $conversation_id,
				'status'         => 'answered',
				'reason'         => 'order',
			);
		}

		if ( empty( $state['orderNumber'] ) ) {
			return array(
				'reply'          => "Thanks. What's your **order number**? It's in your confirmation email, for example #1001.",
				'conversationId' => $conversation_id,
				'status'         => 'answered',
				'reason'         => 'order',
			);
		}

		if ( empty( $state['email'] ) ) {
			$clean = ltrim( $state['orderNumber'], '#' );
			return array(
				'reply'          => "Thanks. To keep your order private, please also send the **email** you used for order #{$clean}.",
				'conversationId' => $conversation_id,
				'status'         => 'answered',
				'reason'         => 'order',
			);
		}

		// Enforce rate-limit: max 3 incorrect tries per conversation
		$table_a = Database::table_access_logs();
		$misses  = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table_a} WHERE shop = %s AND conversation_id = %s AND kind = 'order_miss'",
				$shop,
				$conversation_id
			)
		);

		if ( $misses >= 3 ) {
			return array(
				'reply'          => "I couldn't match those details to an order. Please contact our support team{$support} and they'll help you right away.",
				'conversationId' => $conversation_id,
				'status'         => 'escalated',
				'reason'         => 'order',
			);
		}

		try {
			$order = Orders::lookup_order( $state['orderNumber'], $state['email'] );

			if ( ! $order ) {
				Orders::log_access( $shop, 'order_miss', $state['orderNumber'], $conversation_id );
				return array(
					'reply'          => "I couldn't find an order with that number and email. Please check both and try again{$support}.",
					'conversationId' => $conversation_id,
					'status'         => 'answered',
					'reason'         => 'order',
				);
			}

			Orders::log_access( $shop, 'order_lookup', $order['name'], $conversation_id );
			return array(
				'reply'          => Orders::format_order_reply( $order ),
				'conversationId' => $conversation_id,
				'status'         => 'answered',
				'reason'         => 'order',
			);
		} catch ( \Exception $e ) {
			return array(
				'reply'          => "I can't check orders right now. Please try again in a moment{$support}.",
				'conversationId' => $conversation_id,
				'status'         => 'error',
				'reason'         => 'order lookup failed',
			);
		}
	}
}

