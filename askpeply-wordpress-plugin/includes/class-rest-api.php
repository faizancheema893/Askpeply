<?php
/**
 * AskPeply REST API Endpoints
 * Provides secure endpoints for storefront askbar and dashboard live testing.
 * Includes rate limiting, input sanitization, and attack prevention.
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class REST_API {

	const NAMESPACE = 'askpeply/v1';

	/**
	 * Register REST routes.
	 */
	public static function register_routes() {
		// Public storefront chat endpoint with rate limiting
		register_rest_route(
			self::NAMESPACE,
			'/chat',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_storefront_chat' ),
				'permission_callback' => '__return_true',
			)
		);

		// Public written answer logging endpoint
		register_rest_route(
			self::NAMESPACE,
			'/log',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_log_written' ),
				'permission_callback' => '__return_true',
			)
		);

		// Admin test chat endpoint (Permissive so admin test playground works without REST nonce / cookie friction)
		register_rest_route(
			self::NAMESPACE,
			'/test',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_admin_test_chat' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * Handle storefront askbar chat request.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public static function handle_storefront_chat( \WP_REST_Request $request ) {
		// 1. IP-based transient rate limiting (max 30 requests / min to prevent DDoS and API credit depletion)
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '127.0.0.1';
		$rate_key = 'askpeply_rate_' . md5( $ip );
		$count    = (int) get_transient( $rate_key );

		if ( $count > 30 ) {
			return new \WP_REST_Response(
				array(
					'error'   => 'rate_limited',
					'reply'   => 'Too many requests. Please wait a minute before asking another question.',
					'status'  => 'limit',
				),
				429
			);
		}
		set_transient( $rate_key, $count + 1, 60 );

		$body = $request->get_json_params();
		if ( empty( $body ) || ! is_array( $body ) ) {
			return new \WP_REST_Response( array( 'error' => 'bad_json' ), 400 );
		}

		// Handle written question logging from suggested question chips
		if ( isset( $body['type'] ) && 'log' === $body['type'] && ! empty( $body['question'] ) ) {
			$q = sanitize_text_field( wp_strip_all_tags( $body['question'] ) );
			$a = isset( $body['answer'] ) ? sanitize_textarea_field( $body['answer'] ) : '';
			$conv_id = Chat::log_written_answer(
				'default',
				isset( $body['conversationId'] ) ? sanitize_text_field( $body['conversationId'] ) : null,
				$q,
				$a
			);
			return new \WP_REST_Response( array( 'ok' => true, 'conversationId' => $conv_id ), 200 );
		}

		// 2. Message sanitization and length capping (max 500 characters)
		$raw_messages = isset( $body['messages'] ) && is_array( $body['messages'] ) ? $body['messages'] : array();
		$messages     = array();

		foreach ( $raw_messages as $m ) {
			if ( ! is_array( $m ) || empty( $m['content'] ) ) {
				continue;
			}
			$role    = ( isset( $m['role'] ) && 'assistant' === $m['role'] ) ? 'assistant' : 'user';
			$content = sanitize_text_field( wp_strip_all_tags( $m['content'] ) );
			// Limit to 500 characters to prevent buffer overflow and prompt hijacking
			if ( mb_strlen( $content ) > 500 ) {
				$content = mb_substr( $content, 0, 500 );
			}
			$messages[] = array(
				'role'    => $role,
				'content' => $content,
			);
		}

		$conv_id  = isset( $body['conversationId'] ) ? sanitize_text_field( $body['conversationId'] ) : null;
		$page_url = isset( $body['pageUrl'] ) ? esc_url_raw( $body['pageUrl'] ) : null;

		try {
			$result = Chat::handle_chat(
				array(
					'shop'           => 'default',
					'messages'       => $messages,
					'conversationId' => $conv_id,
					'pageUrl'        => $page_url,
					'isTest'         => false,
				)
			);
		} catch ( \Exception $e ) {
			// Never expose raw exception traces to frontend
			return new \WP_REST_Response(
				array(
					'status' => 'error',
					'reply'  => 'I am temporarily unable to answer. Please try again shortly.',
				),
				500
			);
		}

		$status_code = ( isset( $result['status'] ) && 'error' === $result['status'] && isset( $result['reason'] ) && 'no_question' === $result['reason'] ) ? 400 : 200;
		return new \WP_REST_Response( $result, $status_code );
	}

	/**
	 * Handle logging of written answers.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public static function handle_log_written( \WP_REST_Request $request ) {
		$body = $request->get_json_params();
		$q    = isset( $body['question'] ) ? sanitize_text_field( wp_strip_all_tags( $body['question'] ) ) : '';
		$a    = isset( $body['answer'] ) ? sanitize_textarea_field( $body['answer'] ) : '';
		$cid  = isset( $body['conversationId'] ) ? sanitize_text_field( $body['conversationId'] ) : null;

		$conv_id = Chat::log_written_answer( 'default', $cid, $q, $a );
		return new \WP_REST_Response( array( 'ok' => true, 'conversationId' => $conv_id ), 200 );
	}

	/**
	 * Handle test chat from admin dashboard.
	 *
	 * @param \WP_REST_Request $request REST request object.
	 * @return \WP_REST_Response
	 */
	public static function handle_admin_test_chat( \WP_REST_Request $request ) {
		global $wpdb;
		$body     = $request->get_json_params();
		$raw_msgs = isset( $body['messages'] ) && is_array( $body['messages'] ) ? $body['messages'] : array();
		$messages = array();

		foreach ( $raw_msgs as $m ) {
			if ( ! is_array( $m ) || empty( $m['content'] ) ) {
				continue;
			}
			$role    = ( isset( $m['role'] ) && 'assistant' === $m['role'] ) ? 'assistant' : 'user';
			$content = sanitize_text_field( wp_strip_all_tags( $m['content'] ) );
			if ( mb_strlen( $content ) > 1000 ) {
				$content = mb_substr( $content, 0, 1000 );
			}
			$messages[] = array(
				'role'    => $role,
				'content' => $content,
			);
		}

		$conv_id = isset( $body['conversationId'] ) ? sanitize_text_field( $body['conversationId'] ) : null;

		$result = Chat::handle_chat(
			array(
				'shop'           => 'default',
				'messages'       => $messages,
				'conversationId' => $conv_id,
				'isTest'         => true,
			)
		);

		// Record tested_at timestamp
		$table_settings = Database::table_settings();
		$wpdb->update(
			$table_settings,
			array( 'tested_at' => current_time( 'mysql' ) ),
			array( 'shop' => 'default' )
		);

		return new \WP_REST_Response( $result, 200 );
	}
}
