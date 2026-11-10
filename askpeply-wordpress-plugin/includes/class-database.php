<?php
/**
 * AskPeply Database Manager & Schema Definitions
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Database {

	/**
	 * Table names.
	 */
	public static function table_settings() {
		global $wpdb;
		return $wpdb->prefix . 'askpeply_settings';
	}

	public static function table_knowledge() {
		global $wpdb;
		return $wpdb->prefix . 'askpeply_knowledge';
	}

	public static function table_conversations() {
		global $wpdb;
		return $wpdb->prefix . 'askpeply_conversations';
	}

	public static function table_messages() {
		global $wpdb;
		return $wpdb->prefix . 'askpeply_messages';
	}

	public static function table_access_logs() {
		global $wpdb;
		return $wpdb->prefix . 'askpeply_access_logs';
	}

	/**
	 * Generate a unique ID (matching Prisma cuid style).
	 */
	public static function generate_id( $prefix = '' ) {
		$bytes = wp_generate_password( 16, false, false );
		$id    = ( $prefix ? $prefix . '_' : 'c_' ) . bin2hex( random_bytes( 6 ) ) . strtolower( $bytes );
		return substr( $id, 0, 32 );
	}

	/**
	 * Run database migrations on plugin activation or update.
	 */
	public static function install() {
		global $wpdb;
		$charset_collate = $wpdb->get_charset_collate();

		$table_settings      = self::table_settings();
		$table_knowledge     = self::table_knowledge();
		$table_conversations = self::table_conversations();
		$table_messages      = self::table_messages();
		$table_access_logs   = self::table_access_logs();

		$sql = "
		CREATE TABLE {$table_settings} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			shop varchar(191) NOT NULL DEFAULT 'default',
			settings longtext,
			guardrails longtext,
			plan varchar(50) NOT NULL DEFAULT 'starter',
			settings_saved_at datetime DEFAULT NULL,
			guardrails_saved_at datetime DEFAULT NULL,
			tested_at datetime DEFAULT NULL,
			last_sync_at datetime DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY uq_shop (shop)
		) {$charset_collate};

		CREATE TABLE {$table_knowledge} (
			id varchar(64) NOT NULL,
			shop varchar(191) NOT NULL DEFAULT 'default',
			source varchar(50) NOT NULL,
			source_id varchar(191) NOT NULL,
			title text NOT NULL,
			content longtext NOT NULL,
			url text DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY uq_shop_src_id (shop, source, source_id(100)),
			KEY ix_shop (shop)
		) {$charset_collate};

		CREATE TABLE {$table_conversations} (
			id varchar(64) NOT NULL,
			shop varchar(191) NOT NULL DEFAULT 'default',
			status varchar(50) NOT NULL DEFAULT 'answered',
			first_question text NOT NULL,
			message_count int(11) NOT NULL DEFAULT 0,
			is_test tinyint(1) NOT NULL DEFAULT 0,
			page_url text DEFAULT NULL,
			started_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			last_message_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY ix_shop_last (shop, last_message_at)
		) {$charset_collate};

		CREATE TABLE {$table_messages} (
			id varchar(64) NOT NULL,
			conversation_id varchar(64) NOT NULL,
			role varchar(20) NOT NULL,
			content longtext NOT NULL,
			flag varchar(50) DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY ix_conv (conversation_id)
		) {$charset_collate};

		CREATE TABLE {$table_access_logs} (
			id varchar(64) NOT NULL,
			shop varchar(191) NOT NULL DEFAULT 'default',
			kind varchar(50) NOT NULL,
			ref varchar(191) NOT NULL,
			conversation_id varchar(64) DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY ix_shop_created (shop, created_at)
		) {$charset_collate};
		";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );

		// Seed initial row in settings table if not present
		$exists = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table_settings} WHERE shop = %s", 'default' ) );
		if ( ! $exists ) {
			$defaults_s = wp_json_encode( Settings::get_default_settings() );
			$defaults_g = wp_json_encode( Settings::get_default_guardrails() );
			$wpdb->insert(
				$table_settings,
				array(
					'shop'       => 'default',
					'settings'   => $defaults_s,
					'guardrails' => $defaults_g,
					'plan'       => 'starter',
					'created_at' => current_time( 'mysql' ),
					'updated_at' => current_time( 'mysql' ),
				)
			);
		}

		update_option( 'askpeply_db_version', ASKPEPLY_VERSION );
	}
}

