<?php
/**
 * AskPeply Settings & Plan Management
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Settings {

	const PLAN_STARTER = 'starter';
	const PLAN_GROWTH  = 'growth';
	const PLAN_PRO     = 'pro';

	/**
	 * Default bot settings (identical to defaults.ts in Shopify app).
	 */
	public static function get_default_settings() {
		return array(
			'botName'        => 'AskPeply',
			'placeholder'    => 'Ask anything…',
			'typingLines'    => "What purity is this batch?\nCan I see the COA?\nHow should I store it?\nIs shipping cold-chain?\nWhat is your refund policy?",
			'note'           => 'AI answers can be imperfect. Products are for research use only.',
			'position'       => 'right',
			'iconMode'       => 'all',
			'sideOffset'     => 24,
			'bottomOffset'   => 20,
			'showMic'        => true,
			'accentCyan'     => '#38BDF8',
			'accentViolet'   => '#8B5CF6',
			'accentFuchsia'  => '#D946EF',
			'barBg'          => '#0D132A',
			'barText'        => '#F2F1EE',
			'panelBg'        => '#0D132A',
			'chipBg'         => '#121934',
			'chipText'       => '#F2F1EE',
			'botBg'          => '#1A2034',
			'botText'        => '#D7D8DC',
			'userBg'         => '#F1EFEA',
			'userText'       => '#0A0A0C',
			'noteColor'      => '#8A90A0',
			'orderTracking'  => true,
			'suggested'      => array(
				array(
					'question' => 'How long does shipping take?',
					'answer'   => '',
					'keywords' => 'shipping, delivery, ship, arrive',
				),
				array(
					'question' => 'Can I see the COA for a product?',
					'answer'   => '',
					'keywords' => 'coa, certificate, purity, lab test',
				),
				array(
					'question' => 'What is your refund policy?',
					'answer'   => '',
					'keywords' => 'refund, return, money back',
				),
			),
			'fallbackAnswer' => "I can help with our products, COAs, shipping, storage and store policies. Try one of the suggested questions or contact our support team.",
			'offlineAnswer'  => "I can't reach the assistant right now. Please try again in a moment, or contact our support team.",
			'storeName'      => get_bloginfo( 'name' ),
			'storeEmail'     => get_option( 'admin_email' ),
			'enabled'        => true,
		);
	}

	/**
	 * Default guardrails (identical to defaults.ts in Shopify app).
	 */
	public static function get_default_guardrails() {
		return array(
			'blockDosing'        => true,
			'blockHumanUse'      => true,
			'blockMedical'       => true,
			'blockOffLabel'      => true,
			'blockedTopics'      => '',
			'refusalMessage'     => "I can't help with dosing, human use or medical questions. All of our products are sold strictly for research use only. I'm happy to help with product specs, COAs, storage, shipping or store policies.",
			'disclaimer'         => 'All products are for research use only. Not for human consumption.',
			'appendDisclaimer'   => false,
			'tone'               => 'professional', // professional | friendly | concise
			'customInstructions' => '',
			'supportEmail'       => get_option( 'admin_email' ),
			'escalateBlocked'    => true,
			'retentionDays'      => 90,
		);
	}

	/**
	 * Plan configurations.
	 */
	public static function get_plans() {
		return array(
			self::PLAN_STARTER => array(
				'name'          => 'Starter',
				'price'         => 49,
				'conversations' => 1000,
				'for'           => 'For new and smaller peptide stores getting their first questions answered.',
				'features'      => array(
					'1 storefront',
					'Core compliance filters',
					'Product & policy knowledge',
					'Instant answers 24/7',
					'Conversation logs',
				),
			),
			self::PLAN_GROWTH  => array(
				'name'          => 'Growth',
				'price'         => 99,
				'conversations' => 5000,
				'for'           => 'For stores that want full protection and their team in the loop.',
				'features'      => array(
					'Everything in Starter',
					'Order tracking in chat',
					'Advanced compliance controls (custom blocked topics)',
					'Smart escalation',
					'Priority response speed',
				),
			),
			self::PLAN_PRO     => array(
				'name'          => 'Pro',
				'price'         => 199,
				'conversations' => 20000,
				'for'           => 'For high-volume stores with their own documents and research data.',
				'features'      => array(
					'Everything in Growth',
					'Upload your own documents (PDF, text)',
					'Higher conversation limits',
					'Dedicated support',
				),
			),
		);
	}

	/**
	 * Check feature permissions according to the store's current subscription plan.
	 */
	public static function plan_allows( $plan, $feature ) {
		$ranks = array(
			self::PLAN_STARTER => 0,
			self::PLAN_GROWTH  => 1,
			self::PLAN_PRO     => 2,
		);
		$rank  = isset( $ranks[ $plan ] ) ? $ranks[ $plan ] : 0;

		if ( 'customTopics' === $feature || 'escalation' === $feature || 'orderTracking' === $feature ) {
			return $rank >= 1;
		}
		if ( 'customKnowledge' === $feature ) {
			return true;
		}
		if ( 'documents' === $feature ) {
			return $rank >= 2;
		}
		return false;
	}

	/**
	 * Color fields configuration matching Shopify dashboard.
	 */
	public static function get_color_fields() {
		return array(
			array( 'key' => 'barBg', 'label' => 'Bar background', 'help' => 'The ask bar and the round chat icon.', 'group' => 'Bar' ),
			array( 'key' => 'barText', 'label' => 'Bar text', 'help' => 'Typed questions and the placeholder.', 'group' => 'Bar' ),
			array( 'key' => 'noteColor', 'label' => 'Note text', 'help' => 'The small note under the open bar.', 'group' => 'Bar' ),
			array( 'key' => 'chipBg', 'label' => 'Question buttons', 'help' => 'Background of the suggested questions.', 'group' => 'Suggested questions' ),
			array( 'key' => 'chipText', 'label' => 'Question button text', 'help' => 'Text on the suggested questions.', 'group' => 'Suggested questions' ),
			array( 'key' => 'panelBg', 'label' => 'Chat window', 'help' => 'Background of the conversation panel.', 'group' => 'Conversation' ),
			array( 'key' => 'botBg', 'label' => 'Assistant replies', 'help' => 'Background of the assistant\'s messages.', 'group' => 'Conversation' ),
			array( 'key' => 'botText', 'label' => 'Assistant reply text', 'help' => 'Text in the assistant\'s messages and the chat header.', 'group' => 'Conversation' ),
			array( 'key' => 'userBg', 'label' => 'Customer messages', 'help' => 'Background of what the customer sends.', 'group' => 'Conversation' ),
			array( 'key' => 'userText', 'label' => 'Customer message text', 'help' => 'Text in the customer\'s messages.', 'group' => 'Conversation' ),
			array( 'key' => 'accentCyan', 'label' => 'Highlight', 'help' => 'Typing cursor, live dot, links and the line beside replies.', 'group' => 'Accents' ),
			array( 'key' => 'accentViolet', 'label' => 'Glow', 'help' => 'Glow around the bar and the assistant\'s avatar.', 'group' => 'Accents' ),
			array( 'key' => 'accentFuchsia', 'label' => 'Send button', 'help' => 'Send button and hover glow. All three accents blend in the animated border.', 'group' => 'Accents' ),
		);
	}

	/**
	 * Color themes matching Shopify dashboard.
	 */
	public static function get_themes() {
		return array(
			array(
				'key'    => 'nebula',
				'name'   => 'Nebula',
				'colors' => array(
					'barBg'         => '#0D132A', 'barText'  => '#F2F1EE', 'panelBg'  => '#0D132A',
					'chipBg'        => '#121934', 'chipText' => '#F2F1EE', 'botBg'    => '#1A2034',
					'botText'       => '#D7D8DC', 'userBg'   => '#F1EFEA', 'userText' => '#0A0A0C',
					'noteColor'     => '#8A90A0', 'accentCyan' => '#38BDF8', 'accentViolet' => '#8B5CF6',
					'accentFuchsia' => '#D946EF',
				),
			),
			array(
				'key'    => 'lab',
				'name'   => 'Clean lab',
				'colors' => array(
					'barBg'         => '#FFFFFF', 'barText'  => '#101828', 'panelBg'  => '#FFFFFF',
					'chipBg'        => '#FFFFFF', 'chipText' => '#101828', 'botBg'    => '#F2F4F7',
					'botText'       => '#1D2939', 'userBg'   => '#101828', 'userText' => '#FFFFFF',
					'noteColor'     => '#667085', 'accentCyan' => '#0EA5E9', 'accentViolet' => '#6366F1',
					'accentFuchsia' => '#0EA5E9',
				),
			),
			array(
				'key'    => 'emerald',
				'name'   => 'Emerald',
				'colors' => array(
					'barBg'         => '#06201A', 'barText'  => '#ECFDF5', 'panelBg'  => '#06201A',
					'chipBg'        => '#0B2E25', 'chipText' => '#ECFDF5', 'botBg'    => '#123B30',
					'botText'       => '#D1FAE5', 'userBg'   => '#ECFDF5', 'userText' => '#06201A',
					'noteColor'     => '#6B8F84', 'accentCyan' => '#34D399', 'accentViolet' => '#10B981',
					'accentFuchsia' => '#A3E635',
				),
			),
			array(
				'key'    => 'graphite',
				'name'   => 'Graphite',
				'colors' => array(
					'barBg'         => '#18181B', 'barText'  => '#FAFAFA', 'panelBg'  => '#18181B',
					'chipBg'        => '#27272A', 'chipText' => '#FAFAFA', 'botBg'    => '#27272A',
					'botText'       => '#E4E4E7', 'userBg'   => '#FAFAFA', 'userText' => '#18181B',
					'noteColor'     => '#8B8B93', 'accentCyan' => '#FAFAFA', 'accentViolet' => '#A1A1AA',
					'accentFuchsia' => '#F4F4F5',
				),
			),
			array(
				'key'    => 'rose',
				'name'   => 'Rose gold',
				'colors' => array(
					'barBg'         => '#2A1418', 'barText'  => '#FFF1F2', 'panelBg'  => '#2A1418',
					'chipBg'        => '#3A1C22', 'chipText' => '#FFF1F2', 'botBg'    => '#43222A',
					'botText'       => '#FFE4E6', 'userBg'   => '#FFE4E6', 'userText' => '#2A1418',
					'noteColor'     => '#9F7A80', 'accentCyan' => '#FDA4AF', 'accentViolet' => '#F472B6',
					'accentFuchsia' => '#FB7185',
				),
			),
		);
	}

	/**
	 * Retrieve all shop data (row, settings, guardrails, plan).
	 */
	public static function get_shop_data( $shop = 'default' ) {
		global $wpdb;
		$table = Database::table_settings();

		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE shop = %s", $shop ) );
		if ( ! $row ) {
			Database::install();
			$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE shop = %s", $shop ) );
		}

		$raw_s = ! empty( $row->settings ) ? json_decode( $row->settings, true ) : array();
		$raw_g = ! empty( $row->guardrails ) ? json_decode( $row->guardrails, true ) : array();

		$settings   = wp_parse_args( is_array( $raw_s ) ? $raw_s : array(), self::get_default_settings() );
		$guardrails = wp_parse_args( is_array( $raw_g ) ? $raw_g : array(), self::get_default_guardrails() );

		if ( ! isset( $settings['suggested'] ) || ! is_array( $settings['suggested'] ) ) {
			$defaults = self::get_default_settings();
			$settings['suggested'] = $defaults['suggested'];
		}

		$plans = self::get_plans();
		$opt_plan = get_option( 'askpeply_active_plan', self::PLAN_STARTER );
		$plan  = ! empty( $row->plan ) && isset( $plans[ $row->plan ] ) ? $row->plan : ( isset( $plans[ $opt_plan ] ) ? $opt_plan : self::PLAN_STARTER );

		return array(
			'row'        => $row,
			'settings'   => $settings,
			'guardrails' => $guardrails,
			'plan'       => $plan,
		);
	}

	/**
	 * Save bot settings.
	 */
	public static function save_settings( $settings, $shop = 'default' ) {
		global $wpdb;
		$table = Database::table_settings();
		$json  = wp_json_encode( $settings );

		$wpdb->update(
			$table,
			array(
				'settings'          => $json,
				'settings_saved_at' => current_time( 'mysql' ),
				'updated_at'        => current_time( 'mysql' ),
			),
			array( 'shop' => $shop )
		);
	}

	/**
	 * Save guardrails.
	 */
	public static function save_guardrails( $guardrails, $shop = 'default' ) {
		global $wpdb;
		$table = Database::table_settings();
		$json  = wp_json_encode( $guardrails );

		$wpdb->update(
			$table,
			array(
				'guardrails'          => $json,
				'guardrails_saved_at' => current_time( 'mysql' ),
				'updated_at'          => current_time( 'mysql' ),
			),
			array( 'shop' => $shop )
		);
	}

	/**
	 * Save active plan.
	 */
	public static function save_plan( $plan, $shop = 'default' ) {
		global $wpdb;
		$table = Database::table_settings();
		$plans = self::get_plans();
		if ( ! isset( $plans[ $plan ] ) ) {
			return false;
		}

		// Always persist to WordPress options as an immediate fail-safe
		update_option( 'askpeply_active_plan', $plan );

		// Ensure settings table and default row exist
		$exists = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE shop = %s", $shop ) );
		if ( ! $exists ) {
			Database::install();
		}

		$updated = $wpdb->update(
			$table,
			array(
				'plan'       => $plan,
				'updated_at' => current_time( 'mysql' ),
			),
			array( 'shop' => $shop )
		);

		return true;
	}

	/**
	 * Calculate current UTC month start.
	 */
	public static function month_start() {
		return gmdate( 'Y-m-01 00:00:00' );
	}

	/**
	 * Count live conversations used this month.
	 */
	public static function usage_this_month( $shop = 'default' ) {
		global $wpdb;
		$table = Database::table_conversations();
		$since = self::month_start();

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table} WHERE shop = %s AND is_test = 0 AND started_at >= %s",
				$shop,
				$since
			)
		);
	}
}

