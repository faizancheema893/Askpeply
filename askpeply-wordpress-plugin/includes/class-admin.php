<?php
/**
 * AskPeply Admin Controller & AJAX Endpoints
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin {

	/**
	 * Register admin menu and hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );

		// AJAX action handlers
		add_action( 'wp_ajax_askpeply_toggle_active', array( __CLASS__, 'ajax_toggle_active' ) );
		add_action( 'wp_ajax_askpeply_save_settings', array( __CLASS__, 'ajax_save_settings' ) );
		add_action( 'wp_ajax_askpeply_save_guardrails', array( __CLASS__, 'ajax_save_guardrails' ) );
		add_action( 'wp_ajax_askpeply_sync_knowledge', array( __CLASS__, 'ajax_sync_knowledge' ) );
		add_action( 'wp_ajax_askpeply_add_knowledge', array( __CLASS__, 'ajax_add_knowledge' ) );
		add_action( 'wp_ajax_askpeply_delete_knowledge', array( __CLASS__, 'ajax_delete_knowledge' ) );
		add_action( 'wp_ajax_askpeply_upload_document', array( __CLASS__, 'ajax_upload_document' ) );
		add_action( 'wp_ajax_askpeply_change_plan', array( __CLASS__, 'ajax_change_plan' ) );
		add_action( 'wp_ajax_askpeply_switch_plan', array( __CLASS__, 'ajax_change_plan' ) );
		add_action( 'wp_ajax_askpeply_save_api_settings', array( __CLASS__, 'ajax_save_api_settings' ) );
		add_action( 'wp_ajax_askpeply_resolve_conversation', array( __CLASS__, 'ajax_resolve_conversation' ) );
		add_action( 'wp_ajax_askpeply_test_chat', array( __CLASS__, 'ajax_test_chat' ) );
	}

	/**
	 * Add menu page to WordPress sidebar.
	 */
	public static function add_admin_menu() {
		$icon_svg = 'data:image/svg+xml;base64,' . base64_encode(
			'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.1 21.4a.75.75 0 0 0 .9 0l4.4-1.238A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#8B5CF6"/></svg>'
		);

		add_menu_page(
			__( 'AskPeply Assistant', 'askpeply' ),
			__( 'AskPeply', 'askpeply' ),
			'manage_options',
			'askpeply',
			array( __CLASS__, 'render_dashboard' ),
			$icon_svg,
			56
		);
	}

	/**
	 * Enqueue admin scripts & styles.
	 */
	public static function enqueue_assets( $hook ) {
		if ( 'toplevel_page_askpeply' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'askpeply-admin-css',
			ASKPEPLY_PLUGIN_URL . 'admin/css/admin.css',
			array(),
			ASKPEPLY_VERSION
		);

		wp_enqueue_style(
			'askpeply-askbar-css',
			ASKPEPLY_PLUGIN_URL . 'assets/css/askbar.css',
			array(),
			ASKPEPLY_VERSION
		);

		wp_enqueue_script(
			'askpeply-admin-js',
			ASKPEPLY_PLUGIN_URL . 'admin/js/admin.js',
			array( 'jquery' ),
			ASKPEPLY_VERSION,
			true
		);

		wp_localize_script(
			'askpeply-admin-js',
			'askpeplyAdminData',
			array(
				'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
				'restUrl'     => esc_url_raw( rest_url( 'askpeply/v1/' ) ),
				'restTestUrl' => esc_url_raw( rest_url( 'askpeply/v1/test' ) ),
				'nonce'       => wp_create_nonce( 'askpeply_admin_nonce' ),
				'restNonce'   => wp_create_nonce( 'wp_rest' ),
			)
		);
	}

	/**
	 * Render dashboard page.
	 */
	public static function render_dashboard() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized user.', 'askpeply' ) );
		}

		require ASKPEPLY_PLUGIN_DIR . 'admin/views/dashboard.php';
	}

	/**
	 * AJAX: Toggle active state.
	 */
	public static function ajax_toggle_active() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$enabled   = ! empty( $_POST['enabled'] );
		$shop_data = Settings::get_shop_data();
		$settings  = $shop_data['settings'];
		$settings['enabled'] = $enabled;

		Settings::save_settings( $settings );
		wp_send_json_success( array( 'enabled' => $enabled ) );
	}

	/**
	 * AJAX: Save appearance & general settings.
	 */
	public static function ajax_save_settings() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$shop_data = Settings::get_shop_data();
		$current   = $shop_data['settings'];

		$next = $current;
		$next['botName']        = ! empty( $_POST['botName'] ) ? sanitize_text_field( wp_unslash( $_POST['botName'] ) ) : 'AskPeply';
		$next['placeholder']    = ! empty( $_POST['placeholder'] ) ? sanitize_text_field( wp_unslash( $_POST['placeholder'] ) ) : 'Ask anything…';
		$next['typingLines']    = isset( $_POST['typingLines'] ) ? sanitize_textarea_field( wp_unslash( $_POST['typingLines'] ) ) : '';
		$next['note']           = isset( $_POST['note'] ) ? sanitize_text_field( wp_unslash( $_POST['note'] ) ) : '';
		$next['showMic']        = ! empty( $_POST['showMic'] );
		$next['orderTracking']  = ! empty( $_POST['orderTracking'] );
		$next['position']       = in_array( $_POST['position'], array( 'right', 'center', 'left' ), true ) ? sanitize_text_field( $_POST['position'] ) : 'right';
		$next['iconMode']       = in_array( $_POST['iconMode'], array( 'all', 'tablets', 'phones', 'off' ), true ) ? sanitize_text_field( $_POST['iconMode'] ) : 'all';
		$next['sideOffset']     = max( 8, min( 80, (int) $_POST['sideOffset'] ) );
		$next['bottomOffset']   = max( 8, min( 80, (int) $_POST['bottomOffset'] ) );
		$next['fallbackAnswer'] = isset( $_POST['fallbackAnswer'] ) ? sanitize_textarea_field( wp_unslash( $_POST['fallbackAnswer'] ) ) : '';
		$next['offlineAnswer']  = isset( $_POST['offlineAnswer'] ) ? sanitize_textarea_field( wp_unslash( $_POST['offlineAnswer'] ) ) : '';

		// Suggested Questions
		$suggested = array();
		for ( $i = 0; $i < 4; $i++ ) {
			if ( ! empty( $_POST[ "q{$i}" ] ) ) {
				$suggested[] = array(
					'question' => sanitize_text_field( wp_unslash( $_POST[ "q{$i}" ] ) ),
					'answer'   => isset( $_POST[ "a{$i}" ] ) ? sanitize_textarea_field( wp_unslash( $_POST[ "a{$i}" ] ) ) : '',
					'keywords' => isset( $_POST[ "k{$i}" ] ) ? sanitize_text_field( wp_unslash( $_POST[ "k{$i}" ] ) ) : '',
				);
			}
		}
		$next['suggested'] = $suggested;

		// Color wells
		foreach ( Settings::get_color_fields() as $cf ) {
			$k = $cf['key'];
			if ( ! empty( $_POST[ $k ] ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $_POST[ $k ] ) ) {
				$next[ $k ] = strtoupper( sanitize_hex_color( $_POST[ $k ] ) );
			}
		}

		Settings::save_settings( $next );
		wp_send_json_success( array( 'settings' => $next ) );
	}

	/**
	 * AJAX: Save guardrails.
	 */
	public static function ajax_save_guardrails() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$next = array(
			'blockDosing'        => ! empty( $_POST['blockDosing'] ),
			'blockHumanUse'      => ! empty( $_POST['blockHumanUse'] ),
			'blockMedical'       => ! empty( $_POST['blockMedical'] ),
			'blockOffLabel'      => ! empty( $_POST['blockOffLabel'] ),
			'refusalMessage'     => ! empty( $_POST['refusalMessage'] ) ? sanitize_textarea_field( wp_unslash( $_POST['refusalMessage'] ) ) : Settings::get_default_guardrails()['refusalMessage'],
			'blockedTopics'      => isset( $_POST['blockedTopics'] ) ? sanitize_textarea_field( wp_unslash( $_POST['blockedTopics'] ) ) : '',
			'tone'               => in_array( $_POST['tone'], array( 'professional', 'friendly', 'concise' ), true ) ? sanitize_text_field( $_POST['tone'] ) : 'professional',
			'disclaimer'         => isset( $_POST['disclaimer'] ) ? sanitize_text_field( wp_unslash( $_POST['disclaimer'] ) ) : '',
			'appendDisclaimer'   => ! empty( $_POST['appendDisclaimer'] ),
			'customInstructions' => isset( $_POST['customInstructions'] ) ? sanitize_textarea_field( wp_unslash( $_POST['customInstructions'] ) ) : '',
			'retentionDays'      => in_array( (int) $_POST['retentionDays'], array( 30, 90, 180, 365 ), true ) ? (int) $_POST['retentionDays'] : 90,
			'supportEmail'       => isset( $_POST['supportEmail'] ) ? sanitize_email( wp_unslash( $_POST['supportEmail'] ) ) : '',
			'escalateBlocked'    => ! empty( $_POST['escalateBlocked'] ),
		);

		Settings::save_guardrails( $next );
		wp_send_json_success();
	}

	/**
	 * AJAX: Sync Store.
	 */
	public static function ajax_sync_knowledge() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		try {
			$r = Knowledge::sync_knowledge( 'default' );
			wp_send_json_success( $r );
		} catch ( \Exception $e ) {
			wp_send_json_error( array( 'message' => $e->getMessage() ) );
		}
	}

	/**
	 * AJAX: Add Custom Q&A.
	 */
	public static function ajax_add_knowledge() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$q = ! empty( $_POST['question'] ) ? sanitize_text_field( wp_unslash( $_POST['question'] ) ) : '';
		$a = ! empty( $_POST['answer'] ) ? sanitize_textarea_field( wp_unslash( $_POST['answer'] ) ) : '';

		if ( ! $q || ! $a ) {
			wp_send_json_error( array( 'message' => 'Both question and answer are required.' ) );
		}

		global $wpdb;
		$table = Database::table_knowledge();

		$wpdb->insert(
			$table,
			array(
				'id'         => Database::generate_id( 'k' ),
				'shop'       => 'default',
				'source'     => 'custom',
				'source_id'  => 'custom_' . time(),
				'title'      => substr( $q, 0, 300 ),
				'content'    => substr( $a, 0, 6000 ),
				'url'        => null,
				'created_at' => current_time( 'mysql' ),
				'updated_at' => current_time( 'mysql' ),
			)
		);

		wp_send_json_success();
	}

	/**
	 * AJAX: Delete Knowledge Item.
	 */
	public static function ajax_delete_knowledge() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$id = ! empty( $_POST['id'] ) ? sanitize_text_field( $_POST['id'] ) : '';
		if ( ! $id ) {
			wp_send_json_error( array( 'message' => 'Missing ID' ) );
		}

		global $wpdb;
		$table = Database::table_knowledge();
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table} WHERE id = %s AND source IN ('custom', 'document')",
				$id
			)
		);

		wp_send_json_success();
	}

	/**
	 * AJAX: Document Upload (Pro plan).
	 */
	public static function ajax_upload_document() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$shop_data = Settings::get_shop_data();
		if ( ! Settings::plan_allows( $shop_data['plan'], 'documents' ) ) {
			wp_send_json_error( array( 'message' => 'Document upload is part of the Pro plan.' ) );
		}

		if ( empty( $_FILES['file'] ) ) {
			wp_send_json_error( array( 'message' => 'No file uploaded.' ) );
		}

		$file = $_FILES['file'];
		if ( $file['size'] > 8 * 1024 * 1024 ) {
			wp_send_json_error( array( 'message' => 'File exceeds 8MB limit.' ) );
		}

		$name  = sanitize_file_name( $file['name'] );
		$lower = strtolower( $name );
		$text  = '';

		if ( preg_match( '/\.pdf$/i', $lower ) || 'application/pdf' === $file['type'] ) {
			$base64 = base64_encode( file_get_contents( $file['tmp_name'] ) );
			$res    = Gemini_Client::extract_pdf_text( $base64 );
			if ( empty( $res['ok'] ) ) {
				wp_send_json_error( array( 'message' => "Couldn't read PDF: " . ( isset( $res['error'] ) ? $res['error'] : '' ) ) );
			}
			$text = $res['text'];
		} elseif ( preg_match( '/\.(txt|md|csv|json)$/i', $lower ) || 0 === strpos( $file['type'], 'text/' ) ) {
			$text = file_get_contents( $file['tmp_name'] );
		} else {
			wp_send_json_error( array( 'message' => 'Please upload a PDF, TXT, MD, or CSV file.' ) );
		}

		$text = substr( trim( $text ), 0, 60000 );
		if ( '' === $text ) {
			wp_send_json_error( array( 'message' => 'No text found in that file.' ) );
		}

		global $wpdb;
		$table = Database::table_knowledge();

		$wpdb->insert(
			$table,
			array(
				'id'         => Database::generate_id( 'k' ),
				'shop'       => 'default',
				'source'     => 'document',
				'source_id'  => 'doc_' . time(),
				'title'      => substr( $name, 0, 200 ),
				'content'    => $text,
				'url'        => null,
				'created_at' => current_time( 'mysql' ),
				'updated_at' => current_time( 'mysql' ),
			)
		);

		wp_send_json_success();
	}

	/**
	 * AJAX: Switch Subscription Plan.
	 */
	public static function ajax_change_plan() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$plan  = ! empty( $_POST['plan'] ) ? sanitize_text_field( $_POST['plan'] ) : 'starter';
		$plans = Settings::get_plans();
		if ( ! isset( $plans[ $plan ] ) ) {
			wp_send_json_error( array( 'message' => 'Invalid plan' ) );
		}

		Settings::save_plan( $plan );
		wp_send_json_success( array( 'plan' => $plan, 'name' => $plans[ $plan ]['name'] ) );
	}

	/**
	 * AJAX: Save Gemini API Key & Model.
	 */
	public static function ajax_save_api_settings() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$key   = ! empty( $_POST['geminiApiKey'] ) ? sanitize_text_field( trim( $_POST['geminiApiKey'] ) ) : '';
		$model = ! empty( $_POST['geminiModel'] ) ? sanitize_text_field( trim( $_POST['geminiModel'] ) ) : Gemini_Client::DEFAULT_MODEL;

		// Verify key by testing models list
		if ( $key ) {
			$res = wp_remote_get(
				'https://generativelanguage.googleapis.com/v1beta/models?pageSize=10',
				array(
					'headers' => array( 'x-goog-api-key' => $key ),
					'timeout' => 8,
				)
			);

			if ( is_wp_error( $res ) ) {
				wp_send_json_error( array( 'message' => 'Connection test failed: ' . $res->get_error_message() ) );
			}

			$status = wp_remote_retrieve_response_code( $res );
			if ( 200 !== $status ) {
				$body = json_decode( wp_remote_retrieve_body( $res ), true );
				$msg  = ! empty( $body['error']['message'] ) ? $body['error']['message'] : "HTTP {$status}";
				wp_send_json_error( array( 'message' => 'Invalid API Key: ' . $msg ) );
			}
		}

		$shop_data = Settings::get_shop_data();
		$settings  = $shop_data['settings'];
		$settings['geminiApiKey'] = $key;
		$settings['geminiModel']  = $model;

		Settings::save_settings( $settings );
		delete_transient( 'askpeply_gemini_models' );

		wp_send_json_success();
	}

	/**
	 * AJAX: Resolve Conversation.
	 */
	public static function ajax_resolve_conversation() {
		check_ajax_referer( 'askpeply_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$id = ! empty( $_POST['id'] ) ? sanitize_text_field( $_POST['id'] ) : '';
		if ( ! $id ) {
			wp_send_json_error();
		}

		global $wpdb;
		$table = Database::table_conversations();
		$wpdb->update(
			$table,
			array( 'status' => 'answered' ),
			array( 'id' => $id, 'shop' => 'default' )
		);

		wp_send_json_success();
	}

	/**
	 * AJAX: Admin Test Chat (Reliable fallback for REST API).
	 */
	public static function ajax_test_chat() {
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
		if ( ! empty( $nonce ) ) {
			wp_verify_nonce( $nonce, 'askpeply_admin_nonce' );
		}

		$question = ! empty( $_POST['question'] ) ? sanitize_text_field( wp_unslash( $_POST['question'] ) ) : '';
		if ( empty( $question ) && ! empty( $_POST['message'] ) ) {
			$question = sanitize_text_field( wp_unslash( $_POST['message'] ) );
		}

		if ( empty( $question ) ) {
			wp_send_json_error( array( 'message' => 'Empty question' ) );
		}

		$conv_id = ! empty( $_POST['conversationId'] ) ? sanitize_text_field( wp_unslash( $_POST['conversationId'] ) ) : null;

		$result = Chat::handle_chat(
			array(
				'shop'           => 'default',
				'messages'       => array(
					array(
						'role'    => 'user',
						'content' => $question,
					),
				),
				'conversationId' => $conv_id,
				'isTest'         => true,
			)
		);

		global $wpdb;
		$table_settings = Database::table_settings();
		$wpdb->update(
			$table_settings,
			array( 'tested_at' => current_time( 'mysql' ) ),
			array( 'shop' => 'default' )
		);

		wp_send_json_success( $result );
	}
}

