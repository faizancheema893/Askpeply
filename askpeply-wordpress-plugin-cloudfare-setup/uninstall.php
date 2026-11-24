<?php
/**
 * AskPeply Uninstall
 *
 * @package AskPeply
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

// Check if merchant opted to delete data on uninstall
$settings = get_option( 'askpeply_settings', array() );
$delete_data = ! empty( $settings['delete_on_uninstall'] );

if ( $delete_data ) {
	// Drop custom tables
	$tables = array(
		$wpdb->prefix . 'askpeply_settings',
		$wpdb->prefix . 'askpeply_knowledge',
		$wpdb->prefix . 'askpeply_conversations',
		$wpdb->prefix . 'askpeply_messages',
		$wpdb->prefix . 'askpeply_access_logs',
	);

	foreach ( $tables as $table ) {
		$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	// Delete options
	delete_option( 'askpeply_settings' );
	delete_option( 'askpeply_guardrails' );
	delete_option( 'askpeply_plan' );
	delete_option( 'askpeply_version' );
	delete_option( 'askpeply_last_sync' );
	delete_option( 'askpeply_last_purge' );
	delete_transient( 'askpeply_gemini_models' );
}

