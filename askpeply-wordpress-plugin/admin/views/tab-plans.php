<?php
/**
 * AskPeply Admin Plans Tab
 * Ported from app.plans.tsx in the Shopify app.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$plans   = AskPeply\Settings::get_plans();
$current = $active_plan;
$limit   = isset( $plans[ $current ]['conversations'] ) ? $plans[ $current ]['conversations'] : 1000;
$used    = AskPeply\Settings::usage_this_month( 'default' );
$pct     = min( 100, (int) round( ( $used / $limit ) * 100 ) );
?>

<div class="ap-pagehead">
	<div>
		<h1><?php esc_html_e( 'Plans', 'askpeply' ); ?></h1>
		<p><?php esc_html_e( 'Pick the plan that fits your store. You can change it any time.', 'askpeply' ); ?></p>
	</div>
</div>

<div class="ap-wrap">
	<!-- Usage Meter Card -->
	<section class="ap-card">
		<div class="ap-card__body">
			<div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;">
				<div style="display: grid; gap: 4px;">
					<span style="font-size: 15px; font-weight: 650;">
						<?php echo esc_html( sprintf( __( "You're on %s", 'askpeply' ), $plans[ $current ]['name'] ) ); ?>
					</span>
					<span class="ap-muted">
						<?php echo esc_html( sprintf( __( '%s of %s conversations used this month. Test chats don\'t count.', 'askpeply' ), number_format_i18n( $used ), number_format_i18n( $limit ) ) ); ?>
					</span>
				</div>
				<div style="width: 240px;" class="ap-meter">
					<span style="width: <?php echo max( 2, $pct ); ?>%;"></span>
				</div>
			</div>
		</div>
	</section>

	<!-- 3 Tiers Grid -->
	<div class="ap-plans">
		<?php
		foreach ( $plans as $key => $p ) :
			$is_current = ( $current === $key );
			$featured   = ( 'growth' === $key );
			?>
			<div class="ap-plan <?php echo $featured ? 'ap-plan--featured' : ''; ?> <?php echo ( $is_current && ! $featured ) ? 'ap-plan--current' : ''; ?>">
				<div class="ap-plan__name">
					<span><?php echo esc_html( $p['name'] ); ?></span>
					<?php if ( $is_current ) : ?>
						<span class="ap-tag ap-tag--good"><?php esc_html_e( 'Current plan', 'askpeply' ); ?></span>
					<?php elseif ( $featured ) : ?>
						<span class="ap-tag ap-tag--brand ap-tag--plain"><?php esc_html_e( 'Most chosen', 'askpeply' ); ?></span>
					<?php endif; ?>
				</div>

				<div class="ap-plan__price">
					<b>$<?php echo esc_html( $p['price'] ); ?></b>
					<span><?php esc_html_e( 'USD per month', 'askpeply' ); ?></span>
				</div>

				<p class="ap-plan__for"><?php echo esc_html( $p['for'] ); ?></p>

				<div class="ap-plan__volume">
					<b><?php echo number_format_i18n( $p['conversations'] ); ?></b> <?php esc_html_e( 'conversations a month', 'askpeply' ); ?>
				</div>

				<ul>
					<?php foreach ( $p['features'] as $f ) : ?>
						<li>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>
							<?php echo esc_html( $f ); ?>
						</li>
					<?php endforeach; ?>
				</ul>

				<button
					type="button"
					class="ap-btn ap-switch-plan-btn <?php echo $featured ? 'ap-btn--pearl' : ( $is_current ? 'ap-btn--secondary' : 'ap-btn--primary' ); ?>"
					data-plan="<?php echo esc_attr( $key ); ?>"
					<?php disabled( $is_current ); ?>
				>
					<?php echo $is_current ? esc_html__( 'Your plan', 'askpeply' ) : esc_html( sprintf( __( 'Switch to %s', 'askpeply' ), $p['name'] ) ); ?>
				</button>
			</div>
		<?php endforeach; ?>
	</div>

	<p class="ap-faint" style="text-align: center; margin-top: 16px;">
		<?php esc_html_e( 'Demo mode: switching plans is instant and nothing is charged.', 'askpeply' ); ?>
	</p>
</div>

