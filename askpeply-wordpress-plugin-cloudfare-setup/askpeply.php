<?php
/**
 * Plugin Name:       AskPeply - AI Shopping Assistant & Compliance Chatbot for WooCommerce
 * Plugin URI:        https://askpeply.com
 * Description:       Intelligent AI shopping assistant and compliance chatbot for WordPress & WooCommerce, powered by Google Gemini. Provides instant customer answers, store policies, FAQs, and order tracking with a stunning floating ask-bar.
 * Version:           1.0.4
 * Author:            AskPeply
 * Author URI:        https://askpeply.com
 * License:           GPL-2.0+
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       askpeply
 * Domain Path:       /languages
 * Requires at least: 5.8
 * Requires PHP:      7.4
 *
 * @package           AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Plugin constants
define( 'ASKPEPLY_VERSION', '1.0.4' );
define( 'ASKPEPLY_PLUGIN_FILE', __FILE__ );
define( 'ASKPEPLY_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ASKPEPLY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'ASKPEPLY_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Lightweight .env file loader for AskPeply.
 * Loads environment variables from .env in the plugin directory if present.
 */
function askpeply_load_env() {
	$env_file = ASKPEPLY_PLUGIN_DIR . '.env';
	if ( ! file_exists( $env_file ) || ! is_readable( $env_file ) ) {
		return;
	}

	$lines = file( $env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
	if ( false === $lines ) {
		return;
	}

	foreach ( $lines as $line ) {
		$line = trim( $line );
		if ( '' === $line || 0 === strpos( $line, '#' ) ) {
			continue;
		}

		if ( strpos( $line, '=' ) !== false ) {
			list( $name, $value ) = explode( '=', $line, 2 );
			$name  = trim( $name );
			$value = trim( $value );

			// Strip surrounding quotes
			if ( ( 0 === strpos( $value, '"' ) && substr( $value, -1 ) === '"' ) ||
			     ( 0 === strpos( $value, "'" ) && substr( $value, -1 ) === "'" ) ) {
				$value = substr( $value, 1, -1 );
			}

			if ( ! empty( $name ) ) {
				@putenv( "{$name}={$value}" );
				$_ENV[ $name ]    = $value;
				$_SERVER[ $name ] = $value;
				if ( 'GEMINI_API_KEY' === $name && ! empty( $value ) && 'your_gemini_api_key_here' !== $value ) {
					if ( ! get_option( 'askpeply_gemini_api_key' ) ) {
						update_option( 'askpeply_gemini_api_key', $value );
					}
				}
				if ( 'ASKPEPLY_PLAN' === $name && ! empty( $value ) ) {
					if ( ! get_option( 'askpeply_active_plan' ) ) {
						update_option( 'askpeply_active_plan', $value );
					}
				}
				if ( 'ASKPEPLY_LICENSE_KEY' === $name && ! empty( $value ) ) {
					if ( ! get_option( 'askpeply_license_key' ) ) {
						update_option( 'askpeply_license_key', $value );
					}
				}
			}
		}
	}
}
askpeply_load_env();

/**
 * Autoloader for AskPeply classes.
 */
spl_autoload_register(
	function ( $class_name ) {
		$prefix = 'AskPeply\\';
		if ( 0 !== strpos( $class_name, $prefix ) ) {
			return;
		}

		$relative_class = substr( $class_name, strlen( $prefix ) );
		$parts          = explode( '\\', $relative_class );
		$class          = array_pop( $parts );
		$file_name      = 'class-' . strtolower( str_replace( '_', '-', $class ) ) . '.php';

		$dir = ASKPEPLY_PLUGIN_DIR . 'includes/';
		if ( ! empty( $parts ) ) {
			$dir .= strtolower( implode( '/', $parts ) ) . '/';
		}

		$file_path = $dir . $file_name;
		if ( file_exists( $file_path ) ) {
			require_once $file_path;
		}
	}
);

// Activation and deactivation hooks
register_activation_hook( __FILE__, array( 'AskPeply\\Database', 'install' ) );
register_deactivation_hook( __FILE__, array( 'AskPeply\\Plugin', 'deactivate' ) );

// Launch AskPeply plugin
function askpeply_init() {
	return \AskPeply\Plugin::instance();
}
add_action( 'plugins_loaded', 'askpeply_init' );

