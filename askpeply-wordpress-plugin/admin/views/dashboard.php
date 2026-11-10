<?php
/**
 * AskPeply Main Admin Dashboard View
 * Pixel-perfect match of AskPeply Shopify app.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$shop_data    = AskPeply\Settings::get_shop_data();
$settings     = $shop_data['settings'];
$guardrails   = $shop_data['guardrails'];
$active_plan  = $shop_data['plan'];
$plans        = AskPeply\Settings::get_plans();
$current_plan = isset( $plans[ $active_plan ] ) ? $plans[ $active_plan ] : $plans['starter'];
$is_active    = ! empty( $settings['enabled'] );
$ai_ready     = AskPeply\Gemini_Client::is_configured();
?>

<div class="wrap ap-admin-wrap" id="ap-dashboard">
	<!-- Background Nebula Effects (Shown only in dark mode) -->
	<div class="ap-fx" aria-hidden="true"></div>

	<!-- Top Bar -->
	<header class="ap-topbar">
		<div class="ap-brand">
			<div class="ap-brand-icon">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
					<path fill="url(#apBrandNebula)" d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.1 21.4a.75.75 0 0 0 .9 0l4.4-1.238A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.074-1.116.75.75 0 0 0-.585-.067l-3.082.867.867-3.082a.75.75 0 0 0-.067-.585A7.96 7.96 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
					<defs>
						<linearGradient id="apBrandNebula" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" stop-color="#38BDF8"/>
							<stop offset="50%" stop-color="#8B5CF6"/>
							<stop offset="100%" stop-color="#D946EF"/>
						</linearGradient>
					</defs>
				</svg>
			</div>
			<div>
				<div class="ap-brand-title">
					AskPeply
					<span class="ap-version-pill">v<?php echo esc_html( ASKPEPLY_VERSION ); ?></span>
					<a href="#tab=plans" class="ap-header-plan-pill is-<?php echo esc_attr( $active_plan ); ?> ap-tab-link" data-tab="plans" title="<?php esc_attr_e( 'View plans', 'askpeply' ); ?>">
						<span class="ap-plan-pill-dot"></span>
						<span><?php echo esc_html( $current_plan['name'] ); ?> plan</span>
					</a>
				</div>
			</div>
		</div>

		<div class="ap-topbar-actions">
			<!-- Theme Switcher (Light / Dark) -->
			<div class="ap-themeswitch" role="group" aria-label="Dashboard theme">
				<button type="button" class="ap-theme-btn" data-theme="light" aria-pressed="true">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
					Light
				</button>
				<button type="button" class="ap-theme-btn" data-theme="dark" aria-pressed="false">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
					Dark
				</button>
			</div>

			<!-- Storefront Active Toggle -->
			<div class="ap-master-toggle-wrap">
				<span class="ap-master-label <?php echo $is_active ? 'is-on' : ''; ?>" id="ap-master-status-text">
					<?php echo $is_active ? esc_html__( 'Active', 'askpeply' ) : esc_html__( 'Inactive', 'askpeply' ); ?>
				</span>
				<label class="ap-switch">
					<input type="checkbox" id="ap-master-toggle" <?php checked( $is_active ); ?>>
					<span></span>
				</label>
			</div>
		</div>
	</header>

	<!-- Main Navigation Tabs (6 exact tabs matching Shopify) -->
	<nav class="ap-nav-tabs" role="tablist">
		<a href="#tab=home" class="ap-nav-tab is-active" data-tab="home">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
			<?php esc_html_e( 'Home', 'askpeply' ); ?>
		</a>
		<a href="#tab=assistant" class="ap-nav-tab" data-tab="assistant">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
			<?php esc_html_e( 'Assistant', 'askpeply' ); ?>
		</a>
		<a href="#tab=knowledge" class="ap-nav-tab" data-tab="knowledge">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
			<?php esc_html_e( 'Knowledge', 'askpeply' ); ?>
		</a>
		<a href="#tab=guardrails" class="ap-nav-tab" data-tab="guardrails">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
			<?php esc_html_e( 'Guardrails', 'askpeply' ); ?>
		</a>
		<a href="#tab=conversations" class="ap-nav-tab" data-tab="conversations">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
			<?php esc_html_e( 'Conversations', 'askpeply' ); ?>
		</a>
		<a href="#tab=plans" class="ap-nav-tab" data-tab="plans">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
			<?php esc_html_e( 'Plans', 'askpeply' ); ?>
		</a>
	</nav>

	<!-- Tab Panes -->
	<div class="ap-tab-content">
		<div class="ap-tab-pane" id="ap-tab-home">
			<?php require ASKPEPLY_PLUGIN_DIR . 'admin/views/tab-home.php'; ?>
		</div>
		<div class="ap-tab-pane" id="ap-tab-assistant" style="display: none;">
			<?php require ASKPEPLY_PLUGIN_DIR . 'admin/views/tab-assistant.php'; ?>
		</div>
		<div class="ap-tab-pane" id="ap-tab-knowledge" style="display: none;">
			<?php require ASKPEPLY_PLUGIN_DIR . 'admin/views/tab-knowledge.php'; ?>
		</div>
		<div class="ap-tab-pane" id="ap-tab-guardrails" style="display: none;">
			<?php require ASKPEPLY_PLUGIN_DIR . 'admin/views/tab-guardrails.php'; ?>
		</div>
		<div class="ap-tab-pane" id="ap-tab-conversations" style="display: none;">
			<?php require ASKPEPLY_PLUGIN_DIR . 'admin/views/tab-conversations.php'; ?>
		</div>
		<div class="ap-tab-pane" id="ap-tab-plans" style="display: none;">
			<?php require ASKPEPLY_PLUGIN_DIR . 'admin/views/tab-plans.php'; ?>
		</div>
	</div>
</div>
