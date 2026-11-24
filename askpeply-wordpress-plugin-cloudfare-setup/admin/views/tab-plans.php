<?php
/**
 * AskPeply Admin Plans Tab
 * Dynamic Subscription Management with Free Tier (20 Chats) and License Activation.
 *
 * @package AskPeply
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$plans        = AskPeply\Settings::get_plans();
$current      = $active_plan;
$limit        = isset( $plans[ $current ]['conversations'] ) ? $plans[ $current ]['conversations'] : 20;
$used         = AskPeply\Settings::usage_this_month( 'default' );
$pct          = min( 100, (int) round( ( $used / max( 1, $limit ) ) * 100 ) );
$license_key  = AskPeply\Settings::get_license_key();
$license_data = get_option( 'askpeply_license_data', array() );
$is_limit_hit = ( $used >= $limit );
?>

<div class="ap-pagehead">
	<div>
		<h1><?php esc_html_e( 'Plans & Licensing', 'askpeply' ); ?></h1>
		<p><?php esc_html_e( 'Manage your AskPeply subscription, activate your license key, or upgrade for higher limits.', 'askpeply' ); ?></p>
	</div>
</div>

<div class="ap-wrap">

	<?php if ( $is_limit_hit ) : ?>
		<!-- Limit Warning Banner -->
		<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px;">
			<div style="color: #EF4444; font-size: 24px; line-height: 1;">⚠️</div>
			<div>
				<b style="color: #EF4444; font-size: 14px;"><?php esc_html_e( 'Conversation Limit Reached', 'askpeply' ); ?></b>
				<p style="margin: 4px 0 0; font-size: 13px; color: var(--ap-text-2, #94A3B8);">
					<?php
					if ( AskPeply\Settings::PLAN_FREE === $current ) {
						esc_html_e( 'You have used all 20 free conversations. Enter your license key below or upgrade to restore AI assistance.', 'askpeply' );
					} else {
						esc_html_e( 'Your store has reached its monthly conversation limit. Please upgrade your plan on AskPeply.', 'askpeply' );
					}
					?>
				</p>
			</div>
		</div>
	<?php endif; ?>

	<!-- Usage Meter Card -->
	<section class="ap-card" style="margin-bottom: 24px;">
		<div class="ap-card__body">
			<div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;">
				<div style="display: grid; gap: 4px;">
					<div style="display: flex; align-items: center; gap: 8px;">
						<span style="font-size: 16px; font-weight: 700;">
							<?php
							/* translators: %s: current plan name */
							echo esc_html( sprintf( __( "You're on %s", 'askpeply' ), $plans[ $current ]['name'] ) );
							?>
						</span>
						<?php if ( AskPeply\Settings::PLAN_FREE === $current || empty( $license_key ) ) : ?>
							<span class="ap-tag ap-tag--plain"><?php esc_html_e( 'Free Tier (20 Chats)', 'askpeply' ); ?></span>
						<?php else : ?>
							<span class="ap-tag ap-tag--good"><?php esc_html_e( 'Active License', 'askpeply' ); ?></span>
						<?php endif; ?>
					</div>
					<span class="ap-muted" style="font-size: 13px;">
						<?php
						echo esc_html(
							sprintf(
								/* translators: 1: conversations used, 2: total limit */
								__( '%1$s of %2$s conversations used this month. Test chats don\'t count.', 'askpeply' ),
								number_format_i18n( $used ),
								number_format_i18n( $limit )
							)
						);
						?>
					</span>
				</div>
				<div style="width: 260px;" class="ap-meter">
					<span style="width: <?php echo esc_attr( max( 3, $pct ) ); ?>%; <?php echo $is_limit_hit ? 'background: #EF4444;' : ''; ?>"></span>
				</div>
			</div>
		</div>
	</section>

	<!-- License Key Activation Card -->
	<section class="ap-card" style="margin-bottom: 28px;">
		<div class="ap-card__head">
			<div>
				<h3 style="margin: 0; font-size: 15px; font-weight: 650;"><?php esc_html_e( 'AskPeply License Key', 'askpeply' ); ?></h3>
				<p class="ap-muted" style="margin: 4px 0 0; font-size: 13px;">
					<?php esc_html_e( 'Connect your store to the central AskPeply license server to unlock higher limits and premium AI features.', 'askpeply' ); ?>
				</p>
			</div>
		</div>
		<div class="ap-card__body">
			<?php if ( ! empty( $license_key ) ) : ?>
				<div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px 18px;">
					<div>
						<div style="font-size: 12px; color: var(--ap-text-muted, #94A3B8); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
							<?php esc_html_e( 'Active Key', 'askpeply' ); ?>
						</div>
						<div style="font-family: monospace; font-size: 16px; font-weight: 700; color: #38BDF8; margin-top: 4px;">
							<?php echo esc_html( substr( $license_key, 0, 11 ) . '****' ); ?>
						</div>
						<div style="font-size: 12px; color: var(--ap-text-muted, #94A3B8); margin-top: 4px;">
							<?php
							echo esc_html(
								sprintf(
									/* translators: %s: domain */
									__( 'Locked to: %s', 'askpeply' ),
									AskPeply\Settings::get_normalized_domain()
								)
							);
							?>
						</div>
					</div>
					<div>
						<button type="button" id="ap-deactivate-license-btn" class="ap-btn ap-btn--secondary" style="color: #EF4444; border-color: rgba(239, 68, 68, 0.3);">
							<?php esc_html_e( 'Deactivate License', 'askpeply' ); ?>
						</button>
					</div>
				</div>
			<?php else : ?>
				<div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
					<input
						type="text"
						id="ap-license-key-input"
						class="ap-input"
						placeholder="ASK-PRO-XXXX-XXXX"
						style="max-width: 360px; font-family: monospace; font-size: 14px; text-transform: uppercase;"
					/>
					<button type="button" id="ap-activate-license-btn" class="ap-btn ap-btn--primary">
						<?php esc_html_e( 'Activate License', 'askpeply' ); ?>
					</button>
				</div>
				<p class="ap-muted" style="font-size: 12px; margin-top: 8px;">
					<?php esc_html_e( 'Don\'t have a license key? Every new store starts with 20 free conversations. Choose a plan below to upgrade.', 'askpeply' ); ?>
				</p>
			<?php endif; ?>

			<div id="ap-license-msg" style="display: none; margin-top: 14px; padding: 10px 14px; border-radius: 8px; font-size: 13px;"></div>
		</div>
	</section>

	<!-- Available Plans Grid -->
	<h2 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;"><?php esc_html_e( 'Available Plans', 'askpeply' ); ?></h2>
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
					<b><?php echo esc_html( number_format_i18n( $p['conversations'] ) ); ?></b> <?php esc_html_e( 'conversations a month', 'askpeply' ); ?>
				</div>

				<ul>
					<?php foreach ( $p['features'] as $f ) : ?>
						<li>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>
							<?php echo esc_html( $f ); ?>
						</li>
					<?php endforeach; ?>
				</ul>

				<?php if ( $is_current ) : ?>
					<button type="button" class="ap-btn ap-btn--secondary" disabled>
						<?php esc_html_e( 'Active Plan', 'askpeply' ); ?>
					</button>
				<?php elseif ( 'free' === $key ) : ?>
					<button type="button" class="ap-btn ap-btn--secondary" disabled>
						<?php esc_html_e( 'Free Starter Trial', 'askpeply' ); ?>
					</button>
				<?php else : ?>
					<a
						href="https://askpeply.com"
						target="_blank"
						rel="noopener noreferrer"
						class="ap-btn <?php echo $featured ? 'ap-btn--pearl' : 'ap-btn--primary'; ?>"
						style="text-align: center; text-decoration: none;"
					>
						<?php
						/* translators: %s: upgrade plan name */
						echo esc_html( sprintf( __( 'Upgrade to %s', 'askpeply' ), $p['name'] ) );
						?>
					</a>
				<?php endif; ?>
			</div>
		<?php endforeach; ?>
	</div>

	<p class="ap-faint" style="text-align: center; margin-top: 20px;">
		<?php esc_html_e( 'All plans are backed by AskPeply central intelligence with 24/7 uptime monitoring.', 'askpeply' ); ?>
	</p>
</div>
