<?php
/**
 * AskPeply Admin Assistant Customizer Tab
 * Ported from app.assistant.tsx in the Shopify app.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$color_fields = AskPeply\Settings::get_color_fields();
$themes       = AskPeply\Settings::get_themes();
$can_track    = AskPeply\Settings::plan_allows( $active_plan, 'orderTracking' );
$groups       = array_unique( array_column( $color_fields, 'group' ) );
$slots        = range( 0, 3 );
?>

<div class="ap-pagehead">
	<div>
		<h1><?php esc_html_e( 'Assistant', 'askpeply' ); ?></h1>
		<p><?php esc_html_e( 'How the assistant looks and what it says before the AI takes over.', 'askpeply' ); ?></p>
	</div>
	<div class="ap-pagehead__tools">
		<button type="button" class="ap-btn ap-btn--primary" id="ap-save-assistant-btn">
			<?php esc_html_e( 'Save and publish', 'askpeply' ); ?>
		</button>
	</div>
</div>

<div class="ap-layout" style="--ap-aside: 410px;">
	<!-- Main Form Column -->
	<div class="ap-main">
		<!-- Appearance Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Appearance', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'Start from a theme, then fine-tune any color. Every part of the bar can be changed.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<!-- Theme Preset Buttons -->
				<div class="ap-themes">
					<?php foreach ( $themes as $t ) : ?>
					<button
						type="button"
						class="ap-theme <?php echo 'nebula' === $t['key'] ? 'is-active' : ''; ?>"
						data-key="<?php echo esc_attr( $t['key'] ); ?>"
						data-colors="<?php echo esc_attr( wp_json_encode( $t['colors'] ) ); ?>"
						aria-pressed="<?php echo 'nebula' === $t['key'] ? 'true' : 'false'; ?>"
					>
						<span class="ap-theme__swatch" style="background: <?php echo esc_attr( $t['colors']['barBg'] ); ?>;">
							<i style="background: <?php echo esc_attr( $t['colors']['chipText'] ); ?>;"></i>
							<b style="background: linear-gradient(135deg, <?php echo esc_attr( $t['colors']['accentViolet'] ); ?>, <?php echo esc_attr( $t['colors']['accentFuchsia'] ); ?> 60%, <?php echo esc_attr( $t['colors']['accentCyan'] ); ?>);"></b>
						</span>
						<?php echo esc_html( $t['name'] ); ?>
						<?php echo 'nebula' === $t['key'] ? '<small style="opacity: .6;">(default)</small>' : ''; ?>
					</button>
					<?php endforeach; ?>
				</div>

				<!-- Color Fields by Group -->
				<div class="ap-colors">
					<?php foreach ( $groups as $group_name ) : ?>
					<div class="ap-colors__group">
						<h4><?php echo esc_html( $group_name ); ?></h4>
						<?php
						foreach ( $color_fields as $cf ) :
							if ( $cf['group'] !== $group_name ) {
								continue;
							}
							$val = ! empty( $settings[ $cf['key'] ] ) ? $settings[ $cf['key'] ] : '#0D132A';
							?>
							<div class="ap-color">
								<label class="ap-color__well" style="background: <?php echo esc_attr( $val ); ?>;">
									<input type="color" class="ap-color-input" data-key="<?php echo esc_attr( $cf['key'] ); ?>" value="<?php echo esc_attr( $val ); ?>">
								</label>
								<div>
									<div class="ap-color__name"><?php echo esc_html( $cf['label'] ); ?></div>
									<div class="ap-color__help"><?php echo esc_html( $cf['help'] ); ?></div>
								</div>
								<input type="text" class="ap-color__hex ap-color-hex" data-key="<?php echo esc_attr( $cf['key'] ); ?>" value="<?php echo esc_attr( $val ); ?>" maxlength="7">
							</div>
						<?php endforeach; ?>
					</div>
					<?php endforeach; ?>
				</div>
			</div>
		</section>

		<!-- Name and Wording Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Name and wording', 'askpeply' ); ?></h3>
				</div>
			</div>
			<div class="ap-card__body">
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Assistant name', 'askpeply' ); ?></span>
					<input type="text" class="ap-input" name="botName" value="<?php echo esc_attr( $settings['botName'] ); ?>">
					<span class="ap-help"><?php esc_html_e( 'Shown in the chat header and as the avatar letter.', 'askpeply' ); ?></span>
				</label>

				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Input placeholder', 'askpeply' ); ?></span>
					<input type="text" class="ap-input" name="placeholder" value="<?php echo esc_attr( $settings['placeholder'] ); ?>">
				</label>

				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Example questions typed in the closed bar', 'askpeply' ); ?></span>
					<textarea class="ap-textarea" name="typingLines" rows="5"><?php echo esc_textarea( $settings['typingLines'] ); ?></textarea>
					<span class="ap-help"><?php esc_html_e( 'One question per line. They type, pause, erase and rotate.', 'askpeply' ); ?></span>
				</label>

				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Small note under the open bar', 'askpeply' ); ?></span>
					<input type="text" class="ap-input" name="note" value="<?php echo esc_attr( $settings['note'] ); ?>">
				</label>

				<div class="ap-toggle">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Microphone button (Voice input)', 'askpeply' ); ?></span>
						<span class="ap-help"><?php esc_html_e( 'Lets customers speak their question using voice recognition (in browsers that support it).', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="showMic" id="ap-toggle-show-mic" <?php checked( ! empty( $settings['showMic'] ) ); ?>>
						<span></span>
					</span>
				</div>

				<div class="ap-toggle">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Sound effects', 'askpeply' ); ?></span>
						<span class="ap-help"><?php esc_html_e( 'Soft chime when answers arrive and buttons are pressed.', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="sound" id="ap-toggle-sound" <?php checked( ! empty( $settings['sound'] ) ); ?>>
						<span></span>
					</span>
				</div>
			</div>
		</section>

		<!-- Order Tracking Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Order tracking', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'Customers can type "where is my order?" or their order number. The assistant asks for their email and shows live status and tracking from WooCommerce.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<div class="ap-toggle <?php echo ! $can_track ? 'ap-toggle--disabled' : ''; ?>">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Answer order status questions', 'askpeply' ); ?></span>
						<span class="ap-help"><?php esc_html_e( 'Customers receive instant shipment updates with tracking links.', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="orderTracking" <?php checked( ! empty( $settings['orderTracking'] ) && $can_track ); ?> <?php disabled( ! $can_track ); ?>>
						<span></span>
					</span>
				</div>
			</div>
		</section>

		<!-- Suggested Questions Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Suggested questions', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'Shown above the bar when open. Write your own fast answers, or let the assistant answer with AI.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<?php
				$saved_sq = isset( $settings['suggested'] ) && is_array( $settings['suggested'] ) ? $settings['suggested'] : array();
				foreach ( $slots as $i ) :
					$item = isset( $saved_sq[ $i ] ) ? $saved_sq[ $i ] : array( 'question' => '', 'answer' => '', 'keywords' => '' );
					?>
					<div class="ap-qbox">
						<span class="ap-qbox__num">Question <?php echo esc_html( $i + 1 ); ?></span>
						<label class="ap-field">
							<span class="ap-label"><?php esc_html_e( 'Question', 'askpeply' ); ?></span>
							<input type="text" class="ap-input" name="q<?php echo esc_attr( $i ); ?>" value="<?php echo esc_attr( isset( $item['question'] ) ? $item['question'] : '' ); ?>" placeholder="e.g. How long does shipping take?">
						</label>

						<label class="ap-field">
							<span class="ap-label"><?php esc_html_e( 'Faster answer (optional)', 'askpeply' ); ?></span>
							<textarea class="ap-textarea" name="a<?php echo esc_attr( $i ); ?>" rows="2" placeholder="Leave empty to let the AI answer"><?php echo esc_textarea( isset( $item['answer'] ) ? $item['answer'] : '' ); ?></textarea>
						</label>

						<label class="ap-field">
							<span class="ap-label"><?php esc_html_e( 'Best keywords', 'askpeply' ); ?></span>
							<input type="text" class="ap-input" name="k<?php echo esc_attr( $i ); ?>" value="<?php echo esc_attr( isset( $item['keywords'] ) ? $item['keywords'] : '' ); ?>" placeholder="shipping, delivery, ship, arrive">
							<span class="ap-help"><?php esc_html_e( 'If customer types one of these, you can choose to give this fast answer or let the AI answer.', 'askpeply' ); ?></span>
						</label>
					</div>
				<?php endforeach; ?>
			</div>
		</section>

		<!-- Position Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Position', 'askpeply' ); ?></h3>
				</div>
			</div>
			<div class="ap-card__body">
				<div class="ap-grid2">
					<label class="ap-field">
						<span class="ap-label"><?php esc_html_e( 'Position on customer screen', 'askpeply' ); ?></span>
						<select class="ap-select" name="position">
							<option value="right" <?php selected( $settings['position'], 'right' ); ?>>Bottom right</option>
							<option value="left" <?php selected( $settings['position'], 'left' ); ?>>Bottom left</option>
							<option value="center" <?php selected( $settings['position'], 'center' ); ?>>Bottom center</option>
						</select>
					</label>

					<label class="ap-field">
						<span class="ap-label"><?php esc_html_e( 'Distance from the side (px)', 'askpeply' ); ?></span>
						<input type="number" class="ap-input" name="sideOffset" min="8" max="80" value="<?php echo esc_attr( $settings['sideOffset'] ); ?>">
					</label>

					<label class="ap-field">
						<span class="ap-label"><?php esc_html_e( 'Distance from the bottom (px)', 'askpeply' ); ?></span>
						<input type="number" class="ap-input" name="bottomOffset" min="8" max="80" value="<?php echo esc_attr( $settings['bottomOffset'] ); ?>">
					</label>
				</div>
			</div>
		</section>

		<!-- Backup Answers Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Backup answers', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( "Used only when the AI can't give an answer.", 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'When nothing matches', 'askpeply' ); ?></span>
					<textarea class="ap-textarea" name="fallbackAnswer" rows="3"><?php echo esc_textarea( $settings['fallbackAnswer'] ); ?></textarea>
				</label>
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( "When the AI can't be reached", 'askpeply' ); ?></span>
					<textarea class="ap-textarea" name="offlineAnswer" rows="3"><?php echo esc_textarea( $settings['offlineAnswer'] ); ?></textarea>
				</label>
			</div>
		</section>
	</div>

	<!-- Aside Live Preview Column -->
	<div class="ap-aside">
		<section class="ap-card ap-preview-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Live preview', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'Exactly what customers see. Changes appear as you edit; Save and publish sends them to your store.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<!-- Segmented Controls -->
				<div class="ap-stage__bar">
					<!-- State Segments -->
					<div class="ap-seg" role="group" aria-label="Preview State">
						<button type="button" class="ap-preview-state-btn" data-state="closed" aria-pressed="false"><?php esc_html_e( 'Closed', 'askpeply' ); ?></button>
						<button type="button" class="ap-preview-state-btn is-active" data-state="open" aria-pressed="true"><?php esc_html_e( 'Open', 'askpeply' ); ?></button>
						<button type="button" class="ap-preview-state-btn" data-state="chat" aria-pressed="false"><?php esc_html_e( 'Chat', 'askpeply' ); ?></button>
					</div>
					<!-- Store Theme Segments -->
					<div class="ap-seg" role="group" aria-label="Preview Store Theme">
						<button type="button" class="ap-preview-store-btn is-active" data-theme="light" aria-pressed="true"><?php esc_html_e( 'Light store', 'askpeply' ); ?></button>
						<button type="button" class="ap-preview-store-btn" data-theme="dark" aria-pressed="false"><?php esc_html_e( 'Dark store', 'askpeply' ); ?></button>
					</div>
				</div>

				<!-- Live Preview Stage Container -->
				<div class="ap-stage ap-stage--page ap-preview-stage" id="ap-preview-container">
					<!-- Mock Store Background (Skeletons) -->
					<div class="ap-shop ap-shop--light" id="ap-mock-shop" aria-hidden="true">
						<div class="ap-shop__nav">
							<div class="ap-shop__logo"></div>
							<div class="ap-shop__links"><i></i><i></i><i></i></div>
						</div>
						<div class="ap-shop__line" style="width: 45%;"></div>
						<div class="ap-shop__grid">
							<div class="ap-shop__card"></div>
							<div class="ap-shop__card"></div>
							<div class="ap-shop__card"></div>
						</div>
					</div>

					<!-- Floating AskBar Preview Mockup -->
					<div
						id="ap-preview-root"
						class="ap-preview-mockup is-open"
						style="
							--apb-bar-bg: <?php echo esc_attr( $settings['barBg'] ); ?>;
							--apb-bar-text: <?php echo esc_attr( $settings['barText'] ); ?>;
							--apb-panel-bg: <?php echo esc_attr( $settings['panelBg'] ); ?>;
							--apb-chip-bg: <?php echo esc_attr( $settings['chipBg'] ); ?>;
							--apb-chip-text: <?php echo esc_attr( $settings['chipText'] ); ?>;
							--apb-bot-bg: <?php echo esc_attr( $settings['botBg'] ); ?>;
							--apb-bot-text: <?php echo esc_attr( $settings['botText'] ); ?>;
							--apb-user-bg: <?php echo esc_attr( $settings['userBg'] ); ?>;
							--apb-user-text: <?php echo esc_attr( $settings['userText'] ); ?>;
							--apb-note: <?php echo esc_attr( $settings['noteColor'] ); ?>;
							--ap-cyan: <?php echo esc_attr( $settings['accentCyan'] ); ?>;
							--ap-violet: <?php echo esc_attr( $settings['accentViolet'] ); ?>;
							--ap-fuchsia: <?php echo esc_attr( $settings['accentFuchsia'] ); ?>;"
					>
						<!-- 1. CHAT PANEL (Shown in 'chat' state) -->
						<div class="ap-mock-panel" id="ap-mock-chat-panel">
							<div class="ap-mock-header">
								<div class="ap-mock-title">
									<span class="ap-mock-live-dot"></span>
									<span class="ap-mock-title-text"><?php echo esc_html( $settings['botName'] ); ?> &middot; Live</span>
								</div>
								<div class="ap-mock-header-tools">
									<button type="button" class="ap-mock-icon-btn" title="Reset">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
									</button>
									<button type="button" class="ap-mock-icon-btn" title="Close">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
									</button>
								</div>
							</div>
							<div class="ap-mock-feed">
								<!-- Customer Message -->
								<div class="ap-mock-msg is-user">
									<div class="ap-mock-user-bubble">Can I see the COA for a product?</div>
								</div>
								<!-- Bot Reply -->
								<div class="ap-mock-msg is-bot">
									<div class="ap-mock-bot-avatar">A</div>
									<div class="ap-mock-bot-bubble">
										Yes. The <strong>Certificate of Analysis</strong> for every batch is on the product page, with purity and test date.<br><br>Store sealed vials refrigerated and away from light. <a href="#" onclick="return false;">See storage guide</a>
									</div>
								</div>
							</div>
						</div>

						<!-- 2. SUGGESTION CHIPS (Shown in 'open' state) -->
						<div class="ap-mock-chips" id="ap-mock-chips-container">
							<?php
							$preview_chips = array();
							if ( ! empty( $settings['suggested'] ) ) {
								foreach ( $settings['suggested'] as $sq ) {
									if ( ! empty( $sq['question'] ) ) {
										$preview_chips[] = $sq['question'];
									}
								}
							}
							if ( empty( $preview_chips ) ) {
								$preview_chips = array(
									'How long does shipping take?',
									'Can I see the COA for a product?',
									'What is your refund policy?',
								);
							}
							foreach ( array_slice( $preview_chips, 0, 3 ) as $q ) :
								?>
								<button type="button" class="ap-mock-chip"><?php echo esc_html( $q ); ?></button>
							<?php endforeach; ?>
						</div>

						<!-- 3. ASKBAR CAPSULE (Shown in all states) -->
						<div class="ap-mock-bar" id="ap-mock-bar-element">
							<!-- Input field or typing animation -->
							<div class="ap-mock-input-wrap">
								<span class="ap-mock-typing-text" id="ap-mock-typing">What purity is this ba<span class="ap-mock-cursor">|</span></span>
								<input type="text" class="ap-mock-input" id="ap-mock-input-field" placeholder="<?php echo esc_attr( $settings['placeholder'] ); ?>" readonly style="background: transparent !important; background-color: transparent !important; border: 0 !important; outline: none !important; box-shadow: none !important; color: inherit !important;">
							</div>
							<!-- Mic icon (shown in open/chat states) -->
							<div class="ap-mock-mic" id="ap-mock-mic-icon">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
							</div>
							<!-- Up Arrow Gradient Send Button -->
							<div class="ap-mock-send-btn">
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
							</div>
						</div>

						<!-- 4. DISCLAIMER NOTE (Shown in 'open' and 'chat' states) -->
						<div class="ap-mock-note" id="ap-mock-note-element">
							<?php echo esc_html( ! empty( $settings['note'] ) ? $settings['note'] : 'AI answers can be imperfect. Products are for research use only.' ); ?>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</div>
