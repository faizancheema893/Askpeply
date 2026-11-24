<?php
/**
 * AskPeply Frontend Widget Renderer & Assets
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Frontend {

	/**
	 * Convert Hex to RGB string ("R, G, B").
	 */
	public static function hex_to_rgb( $hex ) {
		$hex = ltrim( (string) $hex, '#' );
		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		if ( 6 !== strlen( $hex ) ) {
			return '0, 0, 0';
		}
		$r = hexdec( substr( $hex, 0, 2 ) );
		$g = hexdec( substr( $hex, 2, 2 ) );
		$b = hexdec( substr( $hex, 4, 2 ) );
		return "{$r}, {$g}, {$b}";
	}

	/**
	 * Enqueue frontend scripts and styles.
	 */
	public static function enqueue_assets() {
		$shop_data = Settings::get_shop_data();
		$settings  = $shop_data['settings'];

		if ( empty( $settings['enabled'] ) ) {
			return;
		}

		wp_enqueue_style(
			'askpeply-fonts',
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
			array(),
			ASKPEPLY_VERSION
		);

		wp_enqueue_style(
			'askpeply-askbar',
			ASKPEPLY_PLUGIN_URL . 'assets/css/askbar.css',
			array(),
			ASKPEPLY_VERSION
		);

		wp_enqueue_script(
			'askpeply-askbar',
			ASKPEPLY_PLUGIN_URL . 'assets/js/askbar.js',
			array(),
			ASKPEPLY_VERSION,
			true
		);
	}

	/**
	 * Render the ask bar markup into wp_footer.
	 */
	public static function render_footer_widget() {
		$shop_data = Settings::get_shop_data();
		$settings  = $shop_data['settings'];

		if ( empty( $settings['enabled'] ) ) {
			return;
		}

		echo self::get_widget_html( $settings ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Shortcode handler [askpeply].
	 */
	public static function render_shortcode( $atts = array() ) {
		$shop_data = Settings::get_shop_data();
		$settings  = $shop_data['settings'];
		return self::get_widget_html( $settings );
	}

	/**
	 * Generate AskBar HTML string matching Shopify askbar.liquid exactly.
	 */
	public static function get_widget_html( $c ) {
		$position = ! empty( $c['position'] ) ? $c['position'] : 'right';
		$side     = isset( $c['sideOffset'] ) ? (int) $c['sideOffset'] : 24;
		$bottom   = isset( $c['bottomOffset'] ) ? (int) $c['bottomOffset'] : 20;

		$cyan     = ! empty( $c['accentCyan'] ) ? $c['accentCyan'] : '#38BDF8';
		$violet   = ! empty( $c['accentViolet'] ) ? $c['accentViolet'] : '#8B5CF6';
		$fuchsia  = ! empty( $c['accentFuchsia'] ) ? $c['accentFuchsia'] : '#D946EF';

		$cyan_rgb    = self::hex_to_rgb( $cyan );
		$violet_rgb  = self::hex_to_rgb( $violet );
		$fuchsia_rgb = self::hex_to_rgb( $fuchsia );

		$bot_name    = ! empty( $c['botName'] ) ? $c['botName'] : 'AskPeply';
		$placeholder = ! empty( $c['placeholder'] ) ? $c['placeholder'] : 'Ask anything…';
		$endpoint    = esc_url( rest_url( 'askpeply/v1/chat' ) );

		$style_vars = sprintf(
			'--apb-side: %dpx; --apb-bottom: %dpx; --ap-cyan: %s; --ap-cyan-rgb: %s; --ap-violet: %s; --ap-violet-rgb: %s; --ap-fuchsia: %s; --ap-fuchsia-rgb: %s; --apb-bar-bg: %s; --apb-bar-text: %s; --apb-panel-bg: %s; --apb-chip-bg: %s; --apb-chip-text: %s; --apb-bot-bg: %s; --apb-bot-text: %s; --apb-user-bg: %s; --apb-user-text: %s; --apb-note: %s;',
			$side,
			$bottom,
			esc_attr( $cyan ),
			esc_attr( $cyan_rgb ),
			esc_attr( $violet ),
			esc_attr( $violet_rgb ),
			esc_attr( $fuchsia ),
			esc_attr( $fuchsia_rgb ),
			esc_attr( ! empty( $c['barBg'] ) ? $c['barBg'] : '#0D132A' ),
			esc_attr( ! empty( $c['barText'] ) ? $c['barText'] : '#F2F1EE' ),
			esc_attr( ! empty( $c['panelBg'] ) ? $c['panelBg'] : '#0D132A' ),
			esc_attr( ! empty( $c['chipBg'] ) ? $c['chipBg'] : '#121934' ),
			esc_attr( ! empty( $c['chipText'] ) ? $c['chipText'] : '#F2F1EE' ),
			esc_attr( ! empty( $c['botBg'] ) ? $c['botBg'] : '#1A2034' ),
			esc_attr( ! empty( $c['botText'] ) ? $c['botText'] : '#D7D8DC' ),
			esc_attr( ! empty( $c['userBg'] ) ? $c['userBg'] : '#F1EFEA' ),
			esc_attr( ! empty( $c['userText'] ) ? $c['userText'] : '#0A0A0C' ),
			esc_attr( ! empty( $c['noteColor'] ) ? $c['noteColor'] : '#8A90A0' )
		);

		$config_json = wp_json_encode( $c );

		ob_start();
		?>
		<div
			class="ap-root apb apb--<?php echo esc_attr( $position ); ?>"
			style="<?php echo esc_attr( $style_vars ); ?>"
			data-askbar
			data-endpoint="<?php echo esc_attr( $endpoint ); ?>"
		>
			<script type="application/json" data-apb-config><?php echo $config_json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></script>

			<div class="apb-dock">
				<div class="apb-panel" role="dialog" aria-label="<?php echo esc_attr( $bot_name ); ?> chat">
					<div class="apb-head">
						<div class="apb-title">
							<span class="ap-status-dot"></span>
							<span class="truncate"><?php echo esc_html( $bot_name ); ?> <small>· Live</small></span>
						</div>
						<div class="apb-head-actions">
							<button type="button" class="apb-head-btn apb-reset" aria-label="Start a new chat" title="New chat">
								<svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
							</button>
							<button type="button" class="apb-head-btn apb-close" aria-label="Minimise chat" title="Minimise">
								<svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
							</button>
						</div>
					</div>
					<div class="apb-feed ap-chat-feed" aria-live="polite"></div>
				</div>

				<div class="apb-chips"></div>

				<form class="apb-bar" novalidate>
					<label class="apb-field">
						<span class="ap-sr-only"><?php echo esc_html( $placeholder ); ?></span>
						<input class="apb-input" type="text" autocomplete="off" maxlength="600" enterkeyhint="send">
						<span class="apb-ghost" aria-hidden="true"><span class="apb-ghost-text"></span><span class="apb-caret"></span></span>
					</label>
					<button type="button" class="apb-icon apb-mic" aria-label="Speak your question" title="Speak">
						<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
					</button>
					<button type="button" class="apb-mini" aria-label="Open chat">
						<svg viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</button>
					<button type="submit" class="apb-send" aria-label="Send question">
						<svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</button>
				</form>

				<p class="apb-note"></p>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}
}

