<?php
/**
 * AskPeply Admin Home / Overview Tab
 * Ported from app._index.tsx in the Shopify app.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

global $wpdb;
$shop        = 'default';
$table_c     = AskPeply\Database::table_conversations();
$table_m     = AskPeply\Database::table_messages();
$table_k     = AskPeply\Database::table_knowledge();
$since       = AskPeply\Settings::month_start();

$used            = AskPeply\Settings::usage_this_month( $shop );
$knowledge_count = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table_k} WHERE shop = %s", $shop ) );
$blocked_count   = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table_c} WHERE shop = %s AND is_test = 0 AND status = 'blocked' AND started_at >= %s", $shop, $since ) );
$escalated_count = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table_c} WHERE shop = %s AND is_test = 0 AND status = 'escalated' AND started_at >= %s", $shop, $since ) );
$messages_count  = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table_m} m INNER JOIN {$table_c} c ON m.conversation_id = c.id WHERE c.shop = %s AND c.is_test = 0 AND m.role = 'user' AND m.created_at >= %s", $shop, $since ) );
$tests_count     = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table_c} WHERE shop = %s AND is_test = 1 AND started_at >= %s", $shop, $since ) );

$recent_chats = $wpdb->get_results(
	$wpdb->prepare(
		"SELECT * FROM {$table_c} WHERE shop = %s ORDER BY last_message_at DESC LIMIT 6",
		$shop
	),
	ARRAY_A
);

$limit = isset( $current_plan['conversations'] ) ? $current_plan['conversations'] : 1000;
$pct   = min( 100, (int) round( ( $used / $limit ) * 100 ) );

// Setup steps status
$step_knowledge  = $knowledge_count > 0;
$step_guardrails = ! empty( $shop_data['row']->guardrails_saved_at );
$step_assistant  = ! empty( $shop_data['row']->settings_saved_at );
$step_tested     = ! empty( $shop_data['row']->tested_at );
$step_active     = ! empty( $settings['enabled'] );

$steps = array(
	array(
		'done'  => $step_knowledge,
		'title' => 'Sync your store',
		'sub'   => $step_knowledge ? "{$knowledge_count} items the assistant can answer from" : 'Import products, pages and policies',
		'label' => $step_knowledge ? 'View' : 'Sync now',
		'tab'   => 'knowledge',
	),
	array(
		'done'  => $step_guardrails,
		'title' => 'Review guardrails',
		'sub'   => 'Dosing, medical and human-use questions are blocked by default',
		'label' => 'Review',
		'tab'   => 'guardrails',
	),
	array(
		'done'  => $step_assistant,
		'title' => 'Make it yours',
		'sub'   => 'Name, colors and suggested questions',
		'label' => 'Customize',
		'tab'   => 'assistant',
	),
	array(
		'done'  => $step_tested,
		'title' => 'Test a few questions',
		'sub'   => 'Use the chat below',
		'label' => 'Test',
		'tab'   => 'home',
		'scroll'=> '#ap-test',
	),
	array(
		'done'  => $step_active,
		'title' => 'Turn it on in your store',
		'sub'   => 'Active via master toggle or shortcode [askpeply]',
		'label' => $step_active ? 'Active' : 'Turn on',
		'tab'   => 'home',
	),
);

$done_count = 0;
foreach ( $steps as $s ) {
	if ( $s['done'] ) {
		$done_count++;
	}
}

$status_labels = array(
	'answered'   => 'Answered',
	'blocked'    => 'Blocked',
	'escalated'  => 'Needs your team',
	'unanswered' => 'Not in knowledge',
	'error'      => 'AI error',
	'limit'      => 'Plan limit',
);
?>

<div class="ap-pagehead">
	<div>
		<h1><?php esc_html_e( 'Overview', 'askpeply' ); ?></h1>
		<p><?php esc_html_e( 'How your assistant is doing this month.', 'askpeply' ); ?></p>
	</div>
</div>

<div class="ap-layout">
	<!-- Main Column -->
	<div class="ap-main">
		<!-- Hero Banner -->
		<div class="ap-hero">
			<div class="ap-hero__copy">
				<span class="ap-hero__status">
					<span class="ap-livedot <?php echo $ai_ready ? '' : 'ap-livedot--off'; ?>"></span>
					<?php echo $ai_ready ? esc_html__( 'AI connected', 'askpeply' ) : esc_html__( 'AI key missing: please set GEMINI_API_KEY in .env', 'askpeply' ); ?>
				</span>
				<h2 class="ap-hero__title" style="color: #FFFFFF !important;">
					<?php echo esc_html( $settings['botName'] ); ?> is ready to answer for <?php echo esc_html( ! empty( $settings['storeName'] ) ? $settings['storeName'] : get_bloginfo( 'name' ) ); ?>
				</h2>
				<p class="ap-hero__text" style="color: rgba(242, 241, 238, 0.85) !important;">
					<?php esc_html_e( 'Every reply comes from your own products and policies. Dosing, medical and human-use questions are stopped before they reach the AI.', 'askpeply' ); ?>
				</p>
				<div class="ap-hero__actions">
					<a href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank" class="ap-btn ap-btn--pearl">
						<?php esc_html_e( 'View on store', 'askpeply' ); ?>
					</a>
					<a href="#tab=assistant" class="ap-btn ap-btn--glass ap-tab-link" data-tab="assistant">
						<?php esc_html_e( 'Customize', 'askpeply' ); ?>
					</a>
				</div>
			</div>
		</div>

		<!-- 4 Metrics Strip -->
		<section class="ap-card ap-metrics">
			<div class="ap-metric">
				<span class="ap-metric__label">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
					<?php esc_html_e( 'Conversations', 'askpeply' ); ?>
				</span>
				<span class="ap-metric__value"><?php echo esc_html( number_format_i18n( $used ) ); ?></span>
				<span class="ap-metric__hint"><?php esc_html_e( 'this month', 'askpeply' ); ?></span>
			</div>
			<div class="ap-metric">
				<span class="ap-metric__label">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.94 14.06 4 12l5.94-2.06L12 4l2.06 5.94L20 12l-5.94 2.06L12 20Z"/><path d="M19 3v4M17 5h4"/></svg>
					<?php esc_html_e( 'Questions answered', 'askpeply' ); ?>
				</span>
				<span class="ap-metric__value"><?php echo esc_html( number_format_i18n( $messages_count ) ); ?></span>
				<span class="ap-metric__hint"><?php esc_html_e( 'this month', 'askpeply' ); ?></span>
			</div>
			<div class="ap-metric">
				<span class="ap-metric__label">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
					<?php esc_html_e( 'Blocked', 'askpeply' ); ?>
				</span>
				<span class="ap-metric__value"><?php echo esc_html( number_format_i18n( $blocked_count ) ); ?></span>
				<span class="ap-metric__hint"><?php esc_html_e( 'risky questions stopped', 'askpeply' ); ?></span>
			</div>
			<div class="ap-metric">
				<span class="ap-metric__label">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.33 2q2 0 3.07-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.53"/></svg>
					<?php esc_html_e( 'Need your team', 'askpeply' ); ?>
				</span>
				<span class="ap-metric__value"><?php echo esc_html( number_format_i18n( $escalated_count ) ); ?></span>
				<span class="ap-metric__hint"><?php esc_html_e( 'escalated chats', 'askpeply' ); ?></span>
			</div>
		</section>

		<!-- 5-Step Setup Checklist -->
		<?php if ( $done_count < 5 ) : ?>
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Get set up', 'askpeply' ); ?></h3>
					<p class="ap-card__desc">
						<?php
						/* translators: %d: count of setup steps done */
						echo esc_html( sprintf( __( '%d of 5 steps done', 'askpeply' ), $done_count ) );
						?>
					</p>
				</div>
			</div>
			<div class="ap-card__body ap-card__body--flush">
				<div class="ap-check">
					<?php foreach ( $steps as $i => $s ) : ?>
					<div class="ap-check__row <?php echo $s['done'] ? 'ap-check__row--done' : ''; ?>">
						<span class="ap-check__num">
							<?php if ( $s['done'] ) : ?>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
							<?php else : ?>
								<?php echo esc_html( $i + 1 ); ?>
							<?php endif; ?>
						</span>
						<div class="ap-row__main">
							<span class="ap-check__title"><?php echo esc_html( $s['title'] ); ?></span>
							<span class="ap-row__sub"><?php echo esc_html( $s['sub'] ); ?></span>
						</div>
						<a href="#tab=<?php echo esc_attr( $s['tab'] ); ?>" class="ap-btn ap-btn--secondary ap-btn--sm ap-tab-link" data-tab="<?php echo esc_attr( $s['tab'] ); ?>">
							<?php echo esc_html( $s['label'] ); ?>
						</a>
					</div>
					<?php endforeach; ?>
				</div>
			</div>
		</section>
		<?php endif; ?>

		<!-- Try Your Assistant (Test Chat Component) -->
		<section class="ap-card" id="ap-test">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Try your assistant', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( "Ask the way a customer would. Test chats are saved under Conversations → Tests and don't count toward your plan.", 'askpeply' ); ?></p>
				</div>
				<button type="button" class="ap-btn ap-btn--ghost ap-btn--sm ap-new-chat-btn">
					<?php esc_html_e( 'New chat', 'askpeply' ); ?>
				</button>
			</div>
			<div class="ap-card__body ap-card__body--flush">
				<div class="ap-chat__feed"></div>
				<div class="ap-chips">
					<?php
					$suggestions = array();
					if ( ! empty( $settings['suggested'] ) ) {
						foreach ( array_slice( $settings['suggested'], 0, 3 ) as $sq ) {
							if ( ! empty( $sq['question'] ) ) {
								$suggestions[] = $sq['question'];
							}
						}
					}
					if ( empty( $suggestions ) ) {
						$suggestions = array( 'How long does shipping take?', 'Can I see the COA for a product?' );
					}
					foreach ( $suggestions as $q ) :
						?>
						<button type="button" class="ap-chip"><?php echo esc_html( $q ); ?></button>
					<?php endforeach; ?>
					<button type="button" class="ap-chip ap-chip--risk">What dose should I take?</button>
				</div>
				<div class="ap-chat__input">
					<input type="text" class="ap-test-input" style="border: 0 !important; background: transparent !important; box-shadow: none !important; outline: none !important;" placeholder="<?php esc_attr_e( 'Ask a question…', 'askpeply' ); ?>">
					<button type="button" class="ap-send ap-test-send-btn" aria-label="Send">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</button>
				</div>
			</div>
		</section>
	</div>

	<!-- Aside Column -->
	<div class="ap-aside">
		<!-- Plan Meter Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php echo esc_html( $current_plan['name'] ); ?> plan</h3>
				</div>
				<a href="#tab=plans" class="ap-btn ap-btn--secondary ap-btn--sm ap-tab-link" data-tab="plans">
					<?php esc_html_e( 'Change', 'askpeply' ); ?>
				</a>
			</div>
			<div class="ap-card__body">
				<div style="display: flex; justify-content: space-between; font-size: 13px;">
					<span class="ap-muted"><?php esc_html_e( 'Conversations this month', 'askpeply' ); ?></span>
					<strong style="font-variant-numeric: tabular-nums;">
						<?php echo esc_html( number_format_i18n( $used ) ); ?> / <?php echo esc_html( number_format_i18n( $limit ) ); ?>
					</strong>
				</div>
				<div class="ap-meter">
					<span style="width: <?php echo esc_attr( max( 2, $pct ) ); ?>%;"></span>
				</div>
				<span class="ap-faint">
					Live store chats only. <?php echo (int) $tests_count; ?> test chat<?php echo 1 === $tests_count ? '' : 's'; ?> this month don't count.
				</span>
			</div>
		</section>

		<!-- Latest Conversations Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Latest conversations', 'askpeply' ); ?></h3>
				</div>
				<a href="#tab=conversations" class="ap-btn ap-btn--ghost ap-btn--sm ap-tab-link" data-tab="conversations">
					<?php esc_html_e( 'See all', 'askpeply' ); ?>
				</a>
			</div>
			<div class="ap-card__body ap-card__body--flush">
				<?php if ( empty( $recent_chats ) ) : ?>
					<div class="ap-empty">
						<span class="ap-muted"><?php esc_html_e( 'Chats from your store appear here.', 'askpeply' ); ?></span>
					</div>
				<?php else : ?>
					<div class="ap-rows">
						<?php foreach ( $recent_chats as $r ) : ?>
							<a href="#tab=conversations&id=<?php echo esc_attr( $r['id'] ); ?>" class="ap-row ap-tab-link" data-tab="conversations" data-conv-id="<?php echo esc_attr( $r['id'] ); ?>">
								<div class="ap-row__main">
									<span class="ap-row__title"><?php echo esc_html( ! empty( $r['first_question'] ) ? $r['first_question'] : '(no question)' ); ?></span>
									<span style="display: flex; gap: 6px; align-items: center;">
										<span class="ap-tag ap-tag--<?php echo esc_attr( $r['status'] ); ?>">
											<?php echo esc_html( isset( $status_labels[ $r['status'] ] ) ? $status_labels[ $r['status'] ] : $r['status'] ); ?>
										</span>
										<?php if ( ! empty( $r['is_test'] ) ) : ?>
											<span class="ap-tag ap-tag--plain">Test</span>
										<?php endif; ?>
									</span>
								</div>
								<span class="ap-row__meta">
									<?php echo esc_html( human_time_diff( strtotime( $r['last_message_at'] ), time() ) . ' ago' ); ?>
								</span>
							</a>
						<?php endforeach; ?>
					</div>
				<?php endif; ?>
			</div>
		</section>
	</div>
</div>

