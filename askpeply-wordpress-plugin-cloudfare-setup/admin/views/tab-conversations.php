<?php
/**
 * AskPeply Admin Conversations Tab & Transcript Viewer
 * Ported from app.conversations._index.tsx and app.conversations.$id.tsx in the Shopify app.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

global $wpdb;
$shop    = 'default';
$table_c = AskPeply\Database::table_conversations();
$table_m = AskPeply\Database::table_messages();

// Check if viewing a specific conversation detail
$view_id = ! empty( $_GET['conv_id'] ) ? sanitize_text_field( $_GET['conv_id'] ) : '';
$detail  = null;
$messages = array();

if ( $view_id ) {
	$detail = $wpdb->get_row(
		$wpdb->prepare( "SELECT * FROM {$table_c} WHERE id = %s AND shop = %s", $view_id, $shop ),
		ARRAY_A
	);
	if ( $detail ) {
		$messages = $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM {$table_m} WHERE conversation_id = %s ORDER BY created_at ASC", $view_id ),
			ARRAY_A
		);
	}
}

// Conversation list query & counts
$current_filter = ! empty( $_GET['conv_filter'] ) ? sanitize_text_field( $_GET['conv_filter'] ) : 'all';
$paged          = max( 1, ! empty( $_GET['paged'] ) ? (int) $_GET['paged'] : 1 );
$per_page       = 25;
$offset         = ( $paged - 1 ) * $per_page;

$where_clause = "WHERE shop = 'default'";
if ( 'test' === $current_filter ) {
	$where_clause .= ' AND is_test = 1';
} else {
	$where_clause .= ' AND is_test = 0';
	if ( in_array( $current_filter, array( 'escalated', 'blocked', 'unanswered', 'answered' ), true ) ) {
		$where_clause .= $wpdb->prepare( ' AND status = %s', $current_filter );
	}
}

$total_convs = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table_c} {$where_clause}" );
$conversations = $wpdb->get_results(
	$wpdb->prepare(
		"SELECT * FROM {$table_c} {$where_clause} ORDER BY last_message_at DESC LIMIT %d OFFSET %d",
		$per_page,
		$offset
	),
	ARRAY_A
);

// Tab Counts
$grouped_counts = $wpdb->get_results(
	"SELECT status, COUNT(*) as cnt FROM {$table_c} WHERE shop = 'default' AND is_test = 0 GROUP BY status",
	ARRAY_A
);

$conv_counts = array(
	'all'        => 0,
	'escalated'  => 0,
	'blocked'    => 0,
	'unanswered' => 0,
	'answered'   => 0,
	'test'       => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table_c} WHERE shop = 'default' AND is_test = 1" ),
);

foreach ( $grouped_counts as $gc ) {
	if ( isset( $conv_counts[ $gc['status'] ] ) ) {
		$conv_counts[ $gc['status'] ] = (int) $gc['cnt'];
	}
	$conv_counts['all'] += (int) $gc['cnt'];
}

$status_labels = array(
	'answered'   => 'Answered',
	'success'    => 'Answered',
	'blocked'    => 'Blocked',
	'escalated'  => 'Needs your team',
	'unanswered' => 'Not in knowledge',
	'error'      => 'AI error',
	'limit'      => 'Plan limit',
);

$flag_labels = array(
	'blocked'    => 'Blocked by guardrails',
	'escalated'  => 'Needs your team',
	'unanswered' => 'Not in knowledge',
	'error'      => 'AI error',
	'written'    => 'Written answer',
	'order'      => 'Order lookup',
);
?>

<?php if ( $detail ) : ?>
	<!-- SINGLE CONVERSATION DETAIL VIEW -->
	<div class="ap-pagehead">
		<div>
			<a href="#tab=conversations" class="ap-btn ap-btn--ghost ap-btn--sm ap-tab-link" data-tab="conversations" style="margin-bottom: 8px;">
				← <?php esc_html_e( 'Back to Conversations', 'askpeply' ); ?>
			</a>
			<h1><?php esc_html_e( 'Conversation', 'askpeply' ); ?></h1>
			<p><?php echo esc_html( sprintf( __( 'Started %s on %s', 'askpeply' ), human_time_diff( strtotime( $detail['started_at'] ), time() ) . ' ago', ! empty( $detail['page_url'] ) ? $detail['page_url'] : 'storefront' ) ); ?></p>
		</div>
		<div class="ap-pagehead__tools">
			<?php if ( in_array( $detail['status'], array( 'escalated', 'unanswered' ), true ) ) : ?>
				<button type="button" class="ap-btn ap-btn--primary ap-resolve-conv-btn" data-id="<?php echo esc_attr( $detail['id'] ); ?>">
					<?php esc_html_e( 'Mark as handled', 'askpeply' ); ?>
				</button>
			<?php endif; ?>
		</div>
	</div>

	<section class="ap-card">
		<div class="ap-card__head">
			<div>
				<h3 class="ap-card__title"><?php echo esc_html( ! empty( $detail['first_question'] ) ? $detail['first_question'] : 'Conversation' ); ?></h3>
			</div>
			<div style="display: flex; gap: 6px; align-items: center;">
				<?php if ( ! empty( $detail['is_test'] ) ) : ?>
					<span class="ap-tag ap-tag--plain">Test</span>
				<?php endif; ?>
				<span class="ap-tag ap-tag--<?php echo esc_attr( $detail['status'] ); ?>" id="ap-conv-status-tag">
					<?php echo esc_html( isset( $status_labels[ $detail['status'] ] ) ? $status_labels[ $detail['status'] ] : $detail['status'] ); ?>
				</span>
			</div>
		</div>
		<div class="ap-card__body ap-card__body--flush">
			<div class="ap-chat__feed" style="max-height: none;">
				<?php foreach ( $messages as $m ) : ?>
					<?php $is_user = ( 'user' === $m['role'] ); ?>
					<div class="ap-msg <?php echo $is_user ? 'ap-msg--user' : 'ap-msg--bot'; ?>">
						<?php if ( ! $is_user ) : ?>
							<span class="ap-avatar">A</span>
						<?php endif; ?>
						<div style="max-width: 80%; display: grid; gap: 6px; justify-items: <?php echo $is_user ? 'end' : 'start'; ?>;">
							<div class="ap-bubble" style="white-space: pre-wrap;"><?php echo esc_html( $m['content'] ); ?></div>
							<div style="display: flex; gap: 6px; align-items: center;">
								<?php if ( ! empty( $m['flag'] ) ) : ?>
									<span class="ap-tag ap-tag--<?php echo 'written' === $m['flag'] ? 'info' : esc_attr( $m['flag'] ); ?>">
										<?php echo esc_html( isset( $flag_labels[ $m['flag'] ] ) ? $flag_labels[ $m['flag'] ] : $m['flag'] ); ?>
									</span>
								<?php endif; ?>
								<span class="ap-faint"><?php echo esc_html( gmdate( 'g:i A', strtotime( $m['created_at'] ) ) ); ?></span>
							</div>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</section>

<?php else : ?>
	<!-- CONVERSATIONS LIST VIEW -->
	<div class="ap-pagehead">
		<div>
			<h1><?php esc_html_e( 'Conversations', 'askpeply' ); ?></h1>
			<p><?php esc_html_e( 'Every chat from your store: what was asked, what was answered, and what was blocked.', 'askpeply' ); ?></p>
		</div>
	</div>

	<section class="ap-card">
		<div class="ap-card__body ap-card__body--flush">
			<!-- Filter Tabs -->
			<div style="padding: 16px 20px 12px;">
				<div class="ap-tabs">
					<a href="<?php echo esc_url( add_query_arg( array( 'conv_filter' => 'all', 'paged' => 1 ) ) ); ?>#tab=conversations" class="ap-tab <?php echo 'all' === $current_filter ? 'is-active' : ''; ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
						<?php esc_html_e( 'All', 'askpeply' ); ?>
						<span class="ap-tab__count"><?php echo esc_html( $conv_counts['all'] ); ?></span>
					</a>
					<a href="<?php echo esc_url( add_query_arg( array( 'conv_filter' => 'escalated', 'paged' => 1 ) ) ); ?>#tab=conversations" class="ap-tab <?php echo 'escalated' === $current_filter ? 'is-active' : ''; ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.33 2q2 0 3.07-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.53"/></svg>
						<?php esc_html_e( 'Needs your team', 'askpeply' ); ?>
						<span class="ap-tab__count"><?php echo esc_html( $conv_counts['escalated'] ); ?></span>
					</a>
					<a href="<?php echo esc_url( add_query_arg( array( 'conv_filter' => 'blocked', 'paged' => 1 ) ) ); ?>#tab=conversations" class="ap-tab <?php echo 'blocked' === $current_filter ? 'is-active' : ''; ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
						<?php esc_html_e( 'Blocked', 'askpeply' ); ?>
						<span class="ap-tab__count"><?php echo esc_html( $conv_counts['blocked'] ); ?></span>
					</a>
					<a href="<?php echo esc_url( add_query_arg( array( 'conv_filter' => 'unanswered', 'paged' => 1 ) ) ); ?>#tab=conversations" class="ap-tab <?php echo 'unanswered' === $current_filter ? 'is-active' : ''; ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						<?php esc_html_e( 'Not answered', 'askpeply' ); ?>
						<span class="ap-tab__count"><?php echo esc_html( $conv_counts['unanswered'] ); ?></span>
					</a>
					<a href="<?php echo esc_url( add_query_arg( array( 'conv_filter' => 'answered', 'paged' => 1 ) ) ); ?>#tab=conversations" class="ap-tab <?php echo 'answered' === $current_filter ? 'is-active' : ''; ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
						<?php esc_html_e( 'Answered', 'askpeply' ); ?>
						<span class="ap-tab__count"><?php echo esc_html( $conv_counts['answered'] ); ?></span>
					</a>
					<a href="<?php echo esc_url( add_query_arg( array( 'conv_filter' => 'test', 'paged' => 1 ) ) ); ?>#tab=conversations" class="ap-tab <?php echo 'test' === $current_filter ? 'is-active' : ''; ?>">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.94 14.06 4 12l5.94-2.06L12 4l2.06 5.94L20 12l-5.94 2.06L12 20Z"/><path d="M19 3v4M17 5h4"/></svg>
						<?php esc_html_e( 'Tests', 'askpeply' ); ?>
						<span class="ap-tab__count"><?php echo esc_html( $conv_counts['test'] ); ?></span>
					</a>
				</div>
			</div>

			<!-- Conversation Rows -->
			<?php if ( empty( $conversations ) ) : ?>
				<div class="ap-empty">
					<strong><?php esc_html_e( 'No conversations here yet', 'askpeply' ); ?></strong>
					<span class="ap-muted">
						<?php
						if ( 'test' === $current_filter ) {
							esc_html_e( "Chats from the dashboard's test boxes show up here.", 'askpeply' );
						} else {
							esc_html_e( 'Chats from your store show up here as soon as customers use the assistant.', 'askpeply' );
						}
						?>
					</span>
				</div>
			<?php else : ?>
				<div class="ap-rows">
					<?php foreach ( $conversations as $r ) : ?>
						<a href="<?php echo esc_url( add_query_arg( array( 'conv_id' => $r['id'] ) ) ); ?>#tab=conversations" class="ap-row">
							<div class="ap-row__main">
								<span class="ap-row__title"><?php echo esc_html( ! empty( $r['first_question'] ) ? $r['first_question'] : '(no question)' ); ?></span>
								<span class="ap-row__sub">
									<?php
									$q_count = (int) ceil( $r['message_count'] / 2 );
									echo esc_html( sprintf( _n( '%d question', '%d questions', $q_count, 'askpeply' ), $q_count ) );
									if ( ! empty( $r['page_url'] ) ) {
										echo esc_html( ' on ' . $r['page_url'] );
									}
									?>
								</span>
							</div>
							<?php if ( ! empty( $r['is_test'] ) ) : ?>
								<span class="ap-tag ap-tag--plain">Test</span>
							<?php endif; ?>
							<span class="ap-tag ap-tag--<?php echo esc_attr( $r['status'] ); ?>">
								<?php echo esc_html( isset( $status_labels[ $r['status'] ] ) ? $status_labels[ $r['status'] ] : $r['status'] ); ?>
							</span>
							<span class="ap-row__meta" style="width: 140px; text-align: right;">
								<?php echo esc_html( gmdate( 'M j, g:i A', strtotime( $r['last_message_at'] ) ) ); ?>
							</span>
						</a>
					<?php endforeach; ?>
				</div>

				<?php if ( $total_convs > $per_page ) : ?>
					<?php $total_pages = ceil( $total_convs / $per_page ); ?>
					<div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid var(--ap-border-2);">
						<span class="ap-faint">
							<?php echo esc_html( sprintf( __( 'Page %d of %d', 'askpeply' ), $paged, $total_pages ) ); ?>
						</span>
						<?php if ( $paged > 1 ) : ?>
							<a href="<?php echo esc_url( add_query_arg( array( 'paged' => $paged - 1 ) ) ); ?>#tab=conversations" class="ap-btn ap-btn--secondary ap-btn--sm">
								<?php esc_html_e( 'Previous', 'askpeply' ); ?>
							</a>
						<?php endif; ?>
						<?php if ( $paged < $total_pages ) : ?>
							<a href="<?php echo esc_url( add_query_arg( array( 'paged' => $paged + 1 ) ) ); ?>#tab=conversations" class="ap-btn ap-btn--secondary ap-btn--sm">
								<?php esc_html_e( 'Next', 'askpeply' ); ?>
							</a>
						<?php endif; ?>
					</div>
				<?php endif; ?>
			<?php endif; ?>
		</div>
	</section>
<?php endif; ?>

