<?php
/**
 * AskPeply Admin AI & API Configuration Tab
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$api_key        = AskPeply\Gemini_Client::get_api_key();
$is_configured  = AskPeply\Gemini_Client::is_configured();
$selected_model = AskPeply\Gemini_Client::get_preferred_model();
$env_path       = ASKPEPLY_PLUGIN_DIR . '.env';
$has_env        = file_exists( $env_path );
$wc_active      = class_exists( 'WooCommerce' );
?>

<div class="ap-pagehead">
	<div>
		<h1><?php esc_html_e( 'AI & API Configuration', 'askpeply' ); ?></h1>
		<p><?php esc_html_e( 'Configure your Google Gemini API credentials and model preferences.', 'askpeply' ); ?></p>
	</div>
</div>

<div class="ap-layout">
	<!-- Main Column -->
	<div class="ap-main">
		<!-- Central Gateway Status Card -->
		<section class="ap-card" style="margin-bottom: 20px;">
			<div class="ap-card__body" style="padding: 18px 20px;">
				<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
					<div style="display: flex; align-items: center; gap: 10px;">
						<span class="ap-livedot"></span>
						<div>
							<div style="font-size: 14.5px; font-weight: 650; color: var(--ap-text);">
								<?php esc_html_e( 'AskPeply Central Cloud Gateway (Active)', 'askpeply' ); ?>
							</div>
							<div class="ap-muted" style="font-size: 12.5px;">
								<?php
								$lic = AskPeply\Settings::get_license_key();
								if ( ! empty( $lic ) ) {
									echo esc_html( sprintf( __( 'Connected via License Key (%s). AI responses routed through Cloudflare edge gateway.', 'askpeply' ), substr( $lic, 0, 11 ) . '****' ) );
								} else {
									esc_html_e( 'Operating on 20 Free Trial conversations. Enter your license key under Plans to scale.', 'askpeply' );
								}
								?>
							</div>
						</div>
					</div>
					<span class="ap-tag ap-tag--good">
						<?php esc_html_e( 'Cloud Connected', 'askpeply' ); ?>
					</span>
				</div>
			</div>
		</section>

		<!-- Optional Direct API Credentials Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Direct Gemini Credentials (Optional Fallback)', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'Optional. If you want a self-hosted fallback directly with Google AI Studio, provide your personal Gemini key below.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Gemini API Key', 'askpeply' ); ?></span>
					<input type="password" id="ap-gemini-key" class="ap-input" value="<?php echo esc_attr( $api_key ); ?>" placeholder="AQ.Ab8... or AIzaSy...">
					<span class="ap-help">
						<?php esc_html_e( 'Get your API key from Google AI Studio (https://aistudio.google.com/). Stored securely or loaded from .env.', 'askpeply' ); ?>
					</span>
				</label>

				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Preferred Model', 'askpeply' ); ?></span>
					<select id="ap-gemini-model" class="ap-select">
						<option value="gemini-2.5-flash" <?php selected( $selected_model, 'gemini-2.5-flash' ); ?>>gemini-2.5-flash (Recommended, ultra-fast)</option>
						<option value="gemini-2.0-flash" <?php selected( $selected_model, 'gemini-2.0-flash' ); ?>>gemini-2.0-flash</option>
						<option value="gemini-1.5-flash" <?php selected( $selected_model, 'gemini-1.5-flash' ); ?>>gemini-1.5-flash</option>
						<option value="gemini-1.5-flash-8b" <?php selected( $selected_model, 'gemini-1.5-flash-8b' ); ?>>gemini-1.5-flash-8b</option>
					</select>
					<span class="ap-help">
						<?php esc_html_e( 'If a model encounters temporary quota limits (429) or timeouts, AskPeply automatically fails over to the next best Flash model.', 'askpeply' ); ?>
					</span>
				</label>

				<div style="margin-top: 6px;">
					<button type="button" class="ap-btn ap-btn--primary" id="ap-save-api-btn">
						<?php esc_html_e( 'Save API Settings', 'askpeply' ); ?>
					</button>
				</div>
			</div>
		</section>

		<!-- Environment File Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Environment File (.env)', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'You can define your environment variables directly in a .env file inside the plugin directory.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<div style="font-family: var(--ap-font-mono, monospace); font-size: 12.5px; background: var(--ap-surface-2); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--ap-border); line-height: 1.6;">
					<div style="color: var(--ap-text-3);"># <?php echo esc_html( $env_path ); ?></div>
					<div><strong>GEMINI_API_KEY</strong>=<?php echo $api_key ? esc_html( substr( $api_key, 0, 10 ) . '…' . substr( $api_key, -4 ) ) : 'your_key_here'; ?></div>
					<div><strong>GEMINI_MODEL</strong>=<?php echo esc_html( $selected_model ); ?></div>
				</div>
				<span class="ap-faint">
					<?php echo $has_env ? esc_html__( '✓ .env file found in plugin directory.', 'askpeply' ) : esc_html__( 'Notice: .env file not found. Creating it or saving above works identically.', 'askpeply' ); ?>
				</span>
			</div>
		</section>
	</div>

	<!-- Aside Diagnostics Column -->
	<div class="ap-aside">
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'System Health', 'askpeply' ); ?></h3>
				</div>
			</div>
			<div class="ap-card__body ap-card__body--flush">
				<div class="ap-rows">
					<div class="ap-row">
						<div class="ap-row__main">
							<span class="ap-row__title">WooCommerce Integration</span>
							<span class="ap-row__sub"><?php echo $wc_active ? 'Active (Products & Order tracking enabled)' : 'Not active (Using WP pages & policies)'; ?></span>
						</div>
						<span class="ap-tag <?php echo $wc_active ? 'ap-tag--good' : 'ap-tag--plain'; ?>">
							<?php echo $wc_active ? 'Connected' : 'Standard WP'; ?>
						</span>
					</div>

					<div class="ap-row">
						<div class="ap-row__main">
							<span class="ap-row__title">REST API Endpoint</span>
							<span class="ap-row__sub">/wp-json/askpeply/v1/chat</span>
						</div>
						<span class="ap-tag ap-tag--good">Available</span>
					</div>

					<div class="ap-row">
						<div class="ap-row__main">
							<span class="ap-row__title">PHP Version</span>
							<span class="ap-row__sub"><?php echo esc_html( PHP_VERSION ); ?></span>
						</div>
						<span class="ap-tag ap-tag--good">OK</span>
					</div>

					<div class="ap-row">
						<div class="ap-row__main">
							<span class="ap-row__title">cURL & OpenSSL</span>
							<span class="ap-row__sub"><?php echo function_exists( 'curl_init' ) ? 'Supported' : 'Missing'; ?></span>
						</div>
						<span class="ap-tag ap-tag--good">OK</span>
					</div>
				</div>
			</div>
		</section>
	</div>
</div>

