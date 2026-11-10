<?php
/**
 * AskPeply Main Plugin Orchestrator
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Plugin {

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->init_hooks();
	}

	private function init_hooks() {
		// REST API
		add_action( 'rest_api_init', array( 'AskPeply\\REST_API', 'register_routes' ) );

		// Admin
		if ( is_admin() ) {
			Admin::init();
		}

		// Frontend
		add_action( 'wp_enqueue_scripts', array( 'AskPeply\\Frontend', 'enqueue_assets' ) );
		add_action( 'wp_footer', array( 'AskPeply\\Frontend', 'render_footer_widget' ) );
		add_shortcode( 'askpeply', array( 'AskPeply\\Frontend', 'render_shortcode' ) );

		// Check database updates
		add_action( 'admin_init', array( $this, 'check_version' ) );
	}

	/**
	 * Run upgrade routines if version changed.
	 */
	public function check_version() {
		if ( get_option( 'askpeply_db_version' ) !== ASKPEPLY_VERSION ) {
			Database::install();
		}
	}

	/**
	 * Deactivation hook callback.
	 */
	public static function deactivate() {
		delete_transient( 'askpeply_gemini_models' );
		delete_transient( 'askpeply_gemini_last_good' );
	}
}

