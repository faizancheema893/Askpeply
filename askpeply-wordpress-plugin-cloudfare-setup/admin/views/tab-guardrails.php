<?php
/**
 * AskPeply Admin Guardrails & Compliance Tab
 * Ported from app.guardrails.tsx in the Shopify app.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$custom_topics_allowed = AskPeply\Settings::plan_allows( $active_plan, 'customTopics' );
$escalation_allowed    = AskPeply\Settings::plan_allows( $active_plan, 'escalation' );
?>

<div class="ap-pagehead">
	<div>
		<h1><?php esc_html_e( 'Guardrails', 'askpeply' ); ?></h1>
		<p><?php esc_html_e( 'What the assistant must never answer, and how it sounds when it does.', 'askpeply' ); ?></p>
	</div>
	<div class="ap-pagehead__tools">
		<button type="button" class="ap-btn ap-btn--primary" id="ap-save-guardrails-btn">
			<?php esc_html_e( 'Save guardrails', 'askpeply' ); ?>
		</button>
	</div>
</div>

<div class="ap-layout">
	<!-- Main Column -->
	<div class="ap-main">
		<!-- Always Blocked Presets -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Always blocked', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'These questions are stopped before they reach the AI, so the assistant can never answer them.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<label class="ap-toggle">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Dosing', 'askpeply' ); ?></span>
						<span class="ap-help"><?php esc_html_e( 'How much, how often, mg per day, cycle length', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="blockDosing" <?php checked( ! empty( $guardrails['blockDosing'] ) ); ?>>
						<span></span>
					</span>
				</label>

				<label class="ap-toggle">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Human use and administration', 'askpeply' ); ?></span>
						<span class="ap-help"><?php esc_html_e( 'Injecting, taking it orally, "can I use this"', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="blockHumanUse" <?php checked( ! empty( $guardrails['blockHumanUse'] ) ); ?>>
						<span></span>
					</span>
				</label>

				<label class="ap-toggle">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Medical claims', 'askpeply' ); ?></span>
						<span class="ap-help"><?php esc_html_e( 'Treating or curing conditions, side effects, weight loss, anti-aging', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="blockMedical" <?php checked( ! empty( $guardrails['blockMedical'] ) ); ?>>
						<span></span>
					</span>
				</label>

				<label class="ap-toggle">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Off-label use', 'askpeply' ); ?></span>
						<span class="ap-help"><?php esc_html_e( 'Stacks, bodybuilding, performance enhancement', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="blockOffLabel" <?php checked( ! empty( $guardrails['blockOffLabel'] ) ); ?>>
						<span></span>
					</span>
				</label>

				<label class="ap-field" style="margin-top: 8px;">
					<span class="ap-label"><?php esc_html_e( 'Reply when a question is blocked', 'askpeply' ); ?></span>
					<textarea class="ap-textarea" name="refusalMessage" rows="3"><?php echo esc_textarea( $guardrails['refusalMessage'] ); ?></textarea>
				</label>
			</div>
		</section>

		<!-- Custom Blocked Topics -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Your own blocked topics', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'Any question containing these words gets the blocked reply.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<?php if ( ! $custom_topics_allowed ) : ?>
					<div class="ap-lock" style="margin-bottom: 12px;">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex: none; margin-top: 2px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						<div>
							<?php echo esc_html( sprintf( __( "Custom blocked topics are part of the Growth and Pro plans. You're on %s.", 'askpeply' ), $current_plan['name'] ) ); ?>
							<a href="#tab=plans" class="ap-btn ap-btn--ghost ap-btn--sm ap-tab-link" data-tab="plans" style="margin-top: 6px; display: inline-flex;">
								<?php esc_html_e( 'See plans', 'askpeply' ); ?>
							</a>
						</div>
					</div>
				<?php endif; ?>

				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Words or topics to block', 'askpeply' ); ?></span>
					<textarea class="ap-textarea" name="blockedTopics" rows="4" placeholder="<?php esc_attr_e( "competitor names\ndiscount codes", 'askpeply' ); ?>" <?php disabled( ! $custom_topics_allowed ); ?>><?php echo esc_textarea( $guardrails['blockedTopics'] ); ?></textarea>
					<span class="ap-help"><?php esc_html_e( 'One per line.', 'askpeply' ); ?></span>
				</label>
			</div>
		</section>

		<!-- Voice and Disclaimer -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Voice and disclaimer', 'askpeply' ); ?></h3>
				</div>
			</div>
			<div class="ap-card__body">
				<div class="ap-grid2">
					<label class="ap-field">
						<span class="ap-label"><?php esc_html_e( 'Tone', 'askpeply' ); ?></span>
						<select class="ap-select" name="tone">
							<option value="professional" <?php selected( $guardrails['tone'], 'professional' ); ?>><?php esc_html_e( 'Professional', 'askpeply' ); ?></option>
							<option value="friendly" <?php selected( $guardrails['tone'], 'friendly' ); ?>><?php esc_html_e( 'Friendly', 'askpeply' ); ?></option>
							<option value="concise" <?php selected( $guardrails['tone'], 'concise' ); ?>><?php esc_html_e( 'Concise', 'askpeply' ); ?></option>
						</select>
					</label>

					<label class="ap-field">
						<span class="ap-label"><?php esc_html_e( 'Research-use disclaimer', 'askpeply' ); ?></span>
						<input type="text" class="ap-input" name="disclaimer" value="<?php echo esc_attr( $guardrails['disclaimer'] ); ?>">
					</label>
				</div>

				<label class="ap-toggle">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Add the disclaimer under every AI answer', 'askpeply' ); ?></span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="appendDisclaimer" <?php checked( ! empty( $guardrails['appendDisclaimer'] ) ); ?>>
						<span></span>
					</span>
				</label>

				<label class="ap-field" style="margin-top: 8px;">
					<span class="ap-label"><?php esc_html_e( 'Extra instructions for the assistant', 'askpeply' ); ?></span>
					<textarea class="ap-textarea" name="customInstructions" rows="3"><?php echo esc_textarea( $guardrails['customInstructions'] ); ?></textarea>
					<span class="ap-help"><?php esc_html_e( 'Optional. For example: always mention that orders over $200 ship free.', 'askpeply' ); ?></span>
				</label>
			</div>
		</section>

		<!-- Privacy -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Privacy', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'How long chats are kept. Customer emails are always hidden in saved chats (j***@gmail.com).', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Delete conversations after', 'askpeply' ); ?></span>
					<select class="ap-select" name="retentionDays">
						<option value="30" <?php selected( $guardrails['retentionDays'], 30 ); ?>><?php esc_html_e( '30 days', 'askpeply' ); ?></option>
						<option value="90" <?php selected( $guardrails['retentionDays'], 90 ); ?>><?php esc_html_e( '90 days (recommended)', 'askpeply' ); ?></option>
						<option value="180" <?php selected( $guardrails['retentionDays'], 180 ); ?>><?php esc_html_e( '180 days', 'askpeply' ); ?></option>
						<option value="365" <?php selected( $guardrails['retentionDays'], 365 ); ?>><?php esc_html_e( '1 year', 'askpeply' ); ?></option>
					</select>
				</label>
			</div>
		</section>

		<!-- When the Assistant Can't Help -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( "When the assistant can't help", 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'What customers see, and what your team gets flagged.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Support email shown to customers', 'askpeply' ); ?></span>
					<input type="email" class="ap-input" name="supportEmail" value="<?php echo esc_attr( $guardrails['supportEmail'] ); ?>" placeholder="support@yourstore.com">
					<span class="ap-help"><?php esc_html_e( "Used when the assistant doesn't know an answer.", 'askpeply' ); ?></span>
				</label>

				<label class="ap-toggle <?php echo ! $escalation_allowed ? 'ap-toggle--disabled' : ''; ?>">
					<span style="display: grid; gap: 3px;">
						<span class="ap-label"><?php esc_html_e( 'Flag blocked and unanswered chats for your team', 'askpeply' ); ?></span>
						<span class="ap-help">
							<?php
							if ( $escalation_allowed ) {
								esc_html_e( 'They appear under Conversations → Needs your team.', 'askpeply' );
							} else {
								esc_html_e( 'Smart escalation is part of the Growth and Pro plans.', 'askpeply' );
							}
							?>
						</span>
					</span>
					<span class="ap-switch">
						<input type="checkbox" name="escalateBlocked" <?php checked( ! empty( $guardrails['escalateBlocked'] ) && $escalation_allowed ); ?> <?php disabled( ! $escalation_allowed ); ?>>
						<span></span>
					</span>
				</label>
			</div>
		</section>
	</div>

	<!-- Aside Test Column -->
	<div class="ap-aside">
		<section class="ap-card" id="ap-guardrails-test">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Test the guardrails', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'Save first, then try the red questions. They should be blocked; the normal one should be answered.', 'askpeply' ); ?></p>
				</div>
				<button type="button" class="ap-btn ap-btn--ghost ap-btn--sm ap-new-chat-btn">
					<?php esc_html_e( 'New chat', 'askpeply' ); ?>
				</button>
			</div>
			<div class="ap-card__body ap-card__body--flush">
				<div class="ap-chat__feed"></div>
				<div class="ap-chips">
					<button type="button" class="ap-chip">How should I store it?</button>
					<button type="button" class="ap-chip ap-chip--risk">What dose should I take?</button>
					<button type="button" class="ap-chip ap-chip--risk">Can I inject this daily?</button>
					<button type="button" class="ap-chip ap-chip--risk">Does it help with weight loss?</button>
				</div>
				<div class="ap-chat__input">
					<input type="text" class="ap-test-input" style="border: 0 !important; background: transparent !important; box-shadow: none !important; outline: none !important;" placeholder="<?php esc_attr_e( 'Test a risky question…', 'askpeply' ); ?>">
					<button type="button" class="ap-send ap-test-send-btn" aria-label="Send">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</button>
				</div>
			</div>
		</section>
	</div>
</div>

