<?php
/**
 * AskPeply Admin Knowledge Base Tab
 * Ported from app.knowledge.tsx in the Shopify app.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

global $wpdb;
$table_k = AskPeply\Database::table_knowledge();
$shop    = 'default';

$items = $wpdb->get_results(
	$wpdb->prepare(
		"SELECT * FROM {$table_k} WHERE shop = %s ORDER BY source ASC, title ASC LIMIT 300",
		$shop
	),
	ARRAY_A
);

$counts = array(
	'all'      => count( $items ),
	'product'  => 0,
	'page'     => 0,
	'policy'   => 0,
	'custom'   => 0,
	'document' => 0,
);

foreach ( $items as $it ) {
	$src = $it['source'];
	if ( isset( $counts[ $src ] ) ) {
		$counts[ $src ]++;
	}
}

$can_upload   = AskPeply\Settings::plan_allows( $active_plan, 'documents' );
$last_sync_at = ! empty( $shop_data['row']->last_sync_at ) ? $shop_data['row']->last_sync_at : null;

$sources_map = array(
	'product'  => array( 'label' => 'Products', 'one' => 'Product', 'icon' => 'box' ),
	'page'     => array( 'label' => 'Pages', 'one' => 'Page', 'icon' => 'page' ),
	'policy'   => array( 'label' => 'Policies', 'one' => 'Policy', 'icon' => 'scale' ),
	'custom'   => array( 'label' => 'Your Q&A', 'one' => 'Q&A', 'icon' => 'qa' ),
	'document' => array( 'label' => 'Documents', 'one' => 'Document', 'icon' => 'doc' ),
);
?>

<div class="ap-pagehead">
	<div>
		<h1><?php esc_html_e( 'Knowledge', 'askpeply' ); ?></h1>
		<p><?php esc_html_e( 'Everything the assistant is allowed to answer from. It never uses anything outside this list.', 'askpeply' ); ?></p>
	</div>
	<div class="ap-pagehead__tools">
		<button type="button" class="ap-btn ap-btn--primary ap-sync-btn">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
			<?php esc_html_e( 'Sync store', 'askpeply' ); ?>
		</button>
	</div>
</div>

<div class="ap-layout">
	<!-- Main Knowledge List Column -->
	<div class="ap-main">
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'What your assistant knows', 'askpeply' ); ?></h3>
					<p class="ap-card__desc">
						<?php
						if ( $last_sync_at ) {
							/* translators: %s: relative time ago */
							echo esc_html( sprintf( __( 'Last synced %s. Sync again after you change products, pages or policies.', 'askpeply' ), human_time_diff( strtotime( $last_sync_at ), time() ) . ' ago' ) );
						} else {
							esc_html_e( 'Not synced yet. Press Sync store to import your products, pages and policies.', 'askpeply' );
						}
						?>
					</p>
				</div>
			</div>
			<div class="ap-card__body ap-card__body--flush">
				<!-- Source Tabs & Instant Search -->
				<div style="padding: 12px 20px 14px; display: grid; gap: 12px;">
					<div class="ap-tabs">
						<button type="button" class="ap-tab ap-source-tab is-active" data-source="all" aria-pressed="true">
							<?php esc_html_e( 'All', 'askpeply' ); ?>
							<span class="ap-tab__count"><?php echo esc_html( $counts['all'] ); ?></span>
						</button>
						<button type="button" class="ap-tab ap-source-tab" data-source="product" aria-pressed="false">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/></svg>
							<?php esc_html_e( 'Products', 'askpeply' ); ?>
							<span class="ap-tab__count"><?php echo esc_html( $counts['product'] ); ?></span>
						</button>
						<button type="button" class="ap-tab ap-source-tab" data-source="page" aria-pressed="false">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
							<?php esc_html_e( 'Pages', 'askpeply' ); ?>
							<span class="ap-tab__count"><?php echo esc_html( $counts['page'] ); ?></span>
						</button>
						<button type="button" class="ap-tab ap-source-tab" data-source="policy" aria-pressed="false">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
							<?php esc_html_e( 'Policies', 'askpeply' ); ?>
							<span class="ap-tab__count"><?php echo esc_html( $counts['policy'] ); ?></span>
						</button>
						<button type="button" class="ap-tab ap-source-tab" data-source="custom" aria-pressed="false">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
							<?php esc_html_e( 'Your Q&A', 'askpeply' ); ?>
							<span class="ap-tab__count"><?php echo esc_html( $counts['custom'] ); ?></span>
						</button>
						<button type="button" class="ap-tab ap-source-tab" data-source="document" aria-pressed="false">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
							<?php esc_html_e( 'Documents', 'askpeply' ); ?>
							<span class="ap-tab__count"><?php echo esc_html( $counts['document'] ); ?></span>
						</button>
					</div>

					<div style="position: relative;">
						<input type="text" id="ap-knowledge-search" class="ap-input" style="padding-left: 36px;" placeholder="<?php esc_attr_e( 'Search products, pages and answers…', 'askpeply' ); ?>">
						<span style="position: absolute; left: 12px; top: 11px; color: var(--ap-text-3); pointer-events: none;">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
						</span>
					</div>
				</div>

				<!-- Item List -->
				<?php if ( empty( $items ) ) : ?>
					<div class="ap-empty">
						<strong><?php esc_html_e( 'Nothing here yet', 'askpeply' ); ?></strong>
						<span class="ap-muted"><?php esc_html_e( 'Press Sync store to give the assistant something to answer from.', 'askpeply' ); ?></span>
						<button type="button" class="ap-btn ap-btn--primary ap-sync-btn" style="margin-top: 10px;">
							<?php esc_html_e( 'Sync store', 'askpeply' ); ?>
						</button>
					</div>
				<?php else : ?>
					<div class="ap-rows" id="ap-knowledge-rows">
						<?php
						foreach ( $items as $it ) :
							$src_meta  = isset( $sources_map[ $it['source'] ] ) ? $sources_map[ $it['source'] ] : array( 'label' => $it['source'], 'one' => $it['source'], 'icon' => 'doc' );
							$removable = in_array( $it['source'], array( 'custom', 'document' ), true );
							preg_match( '/Price:\s*(\$\d+(?:\.\d+)?)/i', $it['content'], $p_match );
							$price_text = isset( $p_match[1] ) ? $p_match[1] : '';
							?>
							<div class="ap-row ap-row--hover ap-knowledge-row" data-source="<?php echo esc_attr( $it['source'] ); ?>">
								<span class="ap-tile ap-tile--<?php echo esc_attr( $it['source'] ); ?>">
									<?php if ( 'product' === $it['source'] ) : ?>
										<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/></svg>
									<?php elseif ( 'page' === $it['source'] ) : ?>
										<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
									<?php elseif ( 'policy' === $it['source'] ) : ?>
										<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
									<?php elseif ( 'custom' === $it['source'] ) : ?>
										<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
									<?php else : ?>
										<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
									<?php endif; ?>
								</span>
								<div class="ap-row__main">
									<span class="ap-row__title"><?php echo esc_html( $it['title'] ); ?></span>
									<span class="ap-row__sub"><?php echo esc_html( substr( $it['content'], 0, 180 ) ); ?></span>
								</div>
								<?php if ( $price_text ) : ?>
									<span class="ap-price"><?php echo esc_html( $price_text ); ?></span>
								<?php endif; ?>
								<span class="ap-tag ap-tag--plain"><?php echo esc_html( $src_meta['one'] ); ?></span>
								<?php if ( $removable ) : ?>
									<button type="button" class="ap-btn ap-btn--danger ap-btn--sm ap-delete-knowledge-btn" data-id="<?php echo esc_attr( $it['id'] ); ?>" title="<?php esc_attr_e( 'Remove', 'askpeply' ); ?>">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
									</button>
								<?php endif; ?>
							</div>
						<?php endforeach; ?>
					</div>
				<?php endif; ?>
			</div>
		</section>
	</div>

	<!-- Aside Actions Column -->
	<div class="ap-aside">
		<!-- Add Q&A Card -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Add a question and answer', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( "For things that aren't on your website: lab partners, batch testing, wholesale terms.", 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Question', 'askpeply' ); ?></span>
					<input type="text" id="ap-qa-question" class="ap-input" placeholder="e.g. Do you offer wholesale pricing?">
				</label>
				<label class="ap-field">
					<span class="ap-label"><?php esc_html_e( 'Answer', 'askpeply' ); ?></span>
					<textarea id="ap-qa-answer" class="ap-textarea" rows="4" placeholder="e.g. Yes, for bulk orders email wholesale@yourstore.com."></textarea>
				</label>
				<div>
					<button type="button" class="ap-btn ap-btn--primary" id="ap-add-qa-btn">
						<?php esc_html_e( 'Add to knowledge', 'askpeply' ); ?>
					</button>
				</div>
			</div>
		</section>

		<!-- Upload Documents Card (Pro Plan) -->
		<section class="ap-card">
			<div class="ap-card__head">
				<div>
					<h3 class="ap-card__title"><?php esc_html_e( 'Upload documents', 'askpeply' ); ?></h3>
					<p class="ap-card__desc"><?php esc_html_e( 'COAs, lab reports, FAQs or price lists. The assistant reads the text and answers from it.', 'askpeply' ); ?></p>
				</div>
			</div>
			<div class="ap-card__body">
				<?php if ( $can_upload ) : ?>
					<label class="ap-drop" for="ap-doc-file-input">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
						<strong id="ap-doc-label" style="font-size: 13.5px;"><?php esc_html_e( 'Choose a file', 'askpeply' ); ?></strong>
						<span class="ap-faint"><?php esc_html_e( 'PDF, TXT, MD or CSV, up to 8 MB', 'askpeply' ); ?></span>
						<input type="file" id="ap-doc-file-input" accept=".pdf,.txt,.md,.csv,application/pdf,text/plain" style="display: none;">
					</label>
				<?php else : ?>
					<div class="ap-lock">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex: none; margin-top: 2px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						<div>
							<?php
							/* translators: %s: plan name */
							echo esc_html( sprintf( __( "Document upload is part of the Pro plan. You're on %s.", 'askpeply' ), $current_plan['name'] ) );
							?>
							<a href="#tab=plans" class="ap-btn ap-btn--ghost ap-btn--sm ap-tab-link" data-tab="plans" style="margin-top: 6px; display: inline-flex;">
								<?php esc_html_e( 'See plans', 'askpeply' ); ?>
							</a>
						</div>
					</div>
				<?php endif; ?>
			</div>
		</section>
	</div>
</div>

