<?php
/**
 * AskPeply WooCommerce Order Tracking & Privacy Protection
 * Ported from orders.server.ts and privacy.server.ts in the Shopify app.
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Orders {

	const INTENT_PATTERN = '/\b(track(ing)?|where(\'?s|\s+is)(\s+my)?\s+(order|package|parcel)|order\s+status|status\s+of\s+(my\s+)?order|my\s+order|shipped(\s+yet)?|delivery\s+status|has\s+it\s+shipped|when\s+will\s+(it|my\s+order)\s+(arrive|ship)|order\s*(#|no\.?\s|number))/i';

	/**
	 * Check if message expresses order tracking intent.
	 */
	public static function is_order_question( $text ) {
		return (bool) preg_match( self::INTENT_PATTERN, (string) $text );
	}

	/**
	 * Mask email addresses (e.g. jane.doe@gmail.com -> j***@gmail.com).
	 */
	public static function mask_emails( $text ) {
		return preg_replace_callback(
			'/([a-z0-9._%+-])([a-z0-9._%+-]*)@([a-z0-9.-]+\.[a-z]{2,})/i',
			function ( $m ) {
				return $m[1] . '***@' . $m[3];
			},
			(string) $text
		);
	}

	/**
	 * Extract email address from string.
	 */
	public static function find_email( $text ) {
		if ( preg_match( '/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i', (string) $text, $m ) ) {
			return strtolower( $m[0] );
		}
		return null;
	}

	/**
	 * Extract order number (3-10 digits or alphanumerics).
	 */
	public static function find_order_number( $text ) {
		// Strip email addresses first so they don't confuse numbers
		$t = preg_replace( '/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i', ' ', (string) $text );

		if ( preg_match( '/#\s?([a-z0-9]{0,4}-?\d{3,10})\b/i', $t, $m ) ) {
			return strtoupper( $m[1] );
		}

		if ( preg_match( '/\border(?:\s+(?:no\.?|number|num|#))?\s*:?\s*([a-z0-9]{0,4}-?\d{3,10})\b/i', $t, $m ) ) {
			return strtoupper( $m[1] );
		}

		if ( preg_match( '/(?:^|\s)(\d{3,10})(?=\s|$|[.,!?])/', $t, $m ) ) {
			return strtoupper( $m[1] );
		}

		return null;
	}

	/**
	 * Inspect recent customer messages to extract order tracking state.
	 */
	public static function read_order_state( $user_messages ) {
		$recent = array_slice( (array) $user_messages, -4 );
		$wants_order  = false;
		$order_number = null;
		$email        = null;

		foreach ( $recent as $m ) {
			if ( self::is_order_question( $m ) ) {
				$wants_order = true;
			}
			$num = self::find_order_number( $m );
			if ( $num ) {
				$order_number = $num;
			}
			$em = self::find_email( $m );
			if ( $em ) {
				$email = $em;
			}
		}

		return array(
			'wantsOrder'  => $wants_order,
			'orderNumber' => $order_number,
			'email'       => $email,
		);
	}

	/**
	 * Look up WooCommerce order by number and verify billing email.
	 */
	public static function lookup_order( $order_number, $email ) {
		if ( ! class_exists( 'WooCommerce' ) || ! function_exists( 'wc_get_order' ) ) {
			return null;
		}

		$clean_num = ltrim( trim( $order_number ), '#' );
		$order     = null;

		// 1. Try by primary ID
		if ( is_numeric( $clean_num ) ) {
			$order = wc_get_order( (int) $clean_num );
		}

		// 2. Try by order number query if not matched or order number is custom
		if ( ! $order && function_exists( 'wc_get_orders' ) ) {
			$found = wc_get_orders(
				array(
					'limit'  => 1,
					'number' => $clean_num,
				)
			);
			if ( ! empty( $found ) ) {
				$order = $found[0];
			}
		}

		if ( ! $order || ! is_a( $order, 'WC_Order' ) ) {
			return null;
		}

		// 3. Strictly verify email match (case-insensitive)
		$billing_email = strtolower( trim( $order->get_billing_email() ) );
		if ( $billing_email !== strtolower( trim( $email ) ) ) {
			return null;
		}

		$created_date = $order->get_date_created();
		$created_iso  = $created_date ? $created_date->date( 'c' ) : gmdate( 'c' );
		$status       = $order->get_status(); // e.g. processing, completed, cancelled, refunded

		// Collect items
		$items = array();
		foreach ( $order->get_items() as $item ) {
			$items[] = $item->get_quantity() . ' × ' . $item->get_name();
		}

		// Look for tracking information (WooCommerce Shipment Tracking or custom order meta)
		$shipments = array();
		$tracking_items = $order->get_meta( '_wc_shipment_tracking_items' );
		if ( ! empty( $tracking_items ) && is_array( $tracking_items ) ) {
			foreach ( $tracking_items as $tr ) {
				$shipments[] = array(
					'status'      => 'Shipped',
					'company'     => isset( $tr['custom_tracking_provider'] ) && $tr['custom_tracking_provider'] ? $tr['custom_tracking_provider'] : ( isset( $tr['tracking_provider'] ) ? $tr['tracking_provider'] : null ),
					'number'      => isset( $tr['tracking_number'] ) ? $tr['tracking_number'] : null,
					'url'         => isset( $tr['custom_tracking_link'] ) && $tr['custom_tracking_link'] ? $tr['custom_tracking_link'] : null,
					'eta'         => null,
					'deliveredAt' => 'completed' === $status ? gmdate( 'c' ) : null,
				);
			}
		}

		return array(
			'name'        => '#' . $order->get_order_number(),
			'createdAt'   => $created_iso,
			'cancelled'   => in_array( $status, array( 'cancelled', 'refunded', 'failed' ), true ),
			'financial'   => $order->is_paid() ? 'Paid' : 'Pending',
			'fulfillment' => $status,
			'items'       => $items,
			'shipments'   => $shipments,
		);
	}

	/**
	 * Build natural reply from order details.
	 */
	public static function format_order_reply( $o ) {
		$lines = array();
		$day   = function ( $iso ) {
			$ts = strtotime( $iso );
			return $ts ? gmdate( 'M j, Y', $ts ) : $iso;
		};

		$nice = function ( $s ) {
			return ucfirst( str_replace( '_', ' ', strtolower( $s ) ) );
		};

		if ( ! empty( $o['cancelled'] ) ) {
			$headline = 'has been cancelled';
		} elseif ( in_array( strtolower( $o['fulfillment'] ), array( 'completed', 'delivered' ), true ) ) {
			$headline = 'has been delivered';
		} elseif ( ! empty( $o['shipments'] ) ) {
			$headline = 'is on its way';
		} elseif ( in_array( strtolower( $o['fulfillment'] ), array( 'processing', 'on-hold', 'pending' ), true ) ) {
			$headline = "is being prepared and hasn't shipped yet";
		} else {
			$headline = 'status: ' . $nice( $o['fulfillment'] ? $o['fulfillment'] : 'received' );
		}

		$lines[] = "Your order **{$o['name']}** {$headline}. It was placed on " . $day( $o['createdAt'] ) . '.';

		if ( ! empty( $o['shipments'] ) ) {
			foreach ( $o['shipments'] as $s ) {
				$parts = array();
				if ( ! empty( $s['company'] ) ) {
					$parts[] = $s['company'];
				}
				if ( ! empty( $s['number'] ) ) {
					$parts[] = "tracking number {$s['number']}";
				}
				$line = '- ' . $nice( ! empty( $s['status'] ) ? $s['status'] : 'Shipped' ) . ( $parts ? ': ' . implode( ', ', $parts ) : '' );
				if ( ! empty( $s['deliveredAt'] ) ) {
					$line .= '. Delivered ' . $day( $s['deliveredAt'] );
				} elseif ( ! empty( $s['eta'] ) ) {
					$line .= '. Expected ' . $day( $s['eta'] );
				}
				if ( ! empty( $s['url'] ) ) {
					$line .= ". [Track your package]({$s['url']})";
				}
				$lines[] = $line;
			}
		}

		if ( empty( $o['shipments'] ) && empty( $o['cancelled'] ) ) {
			$lines[] = "- You'll get an email with the tracking number as soon as it ships.";
		}

		if ( ! empty( $o['items'] ) ) {
			$shown = array_slice( $o['items'], 0, 4 );
			$lines[] = 'Items: ' . implode( ', ', $shown ) . ( count( $o['items'] ) > 4 ? '…' : '' );
		}

		return implode( "\n", $lines );
	}

	/**
	 * Log order access or miss for security.
	 */
	public static function log_access( $shop, $kind, $ref, $conversation_id = null ) {
		global $wpdb;
		$table = Database::table_access_logs();

		$wpdb->insert(
			$table,
			array(
				'id'              => Database::generate_id( 'log' ),
				'shop'            => $shop,
				'kind'            => $kind,
				'ref'             => substr( (string) $ref, 0, 120 ),
				'conversation_id' => $conversation_id ? $conversation_id : null,
				'created_at'      => current_time( 'mysql' ),
			)
		);
	}

	/**
	 * Purge conversations and logs older than store retention days.
	 */
	public static function purge_old_data( $shop, $retention_days ) {
		$last_purge = (int) get_option( 'askpeply_last_purge', 0 );
		$now        = time();

		// Run at most once per hour
		if ( ( $now - $last_purge ) < 3600 ) {
			return;
		}
		update_option( 'askpeply_last_purge', $now );

		global $wpdb;
		$days   = max( 7, min( 730, (int) $retention_days ? (int) $retention_days : 90 ) );
		$cutoff = gmdate( 'Y-m-d H:i:s', $now - ( $days * DAY_IN_SECONDS ) );

		$table_c = Database::table_conversations();
		$table_m = Database::table_messages();
		$table_a = Database::table_access_logs();

		// Find conversation IDs to delete
		$old_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT id FROM {$table_c} WHERE shop = %s AND last_message_at < %s",
				$shop,
				$cutoff
			)
		);

		if ( ! empty( $old_ids ) ) {
			$placeholders = implode( ',', array_fill( 0, count( $old_ids ), '%s' ) );
			// Delete child messages
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->query( $wpdb->prepare( "DELETE FROM {$table_m} WHERE conversation_id IN ({$placeholders})", $old_ids ) );
			// Delete conversations
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->query( $wpdb->prepare( "DELETE FROM {$table_c} WHERE id IN ({$placeholders})", $old_ids ) );
		}

		// Delete old access logs
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$table_a} WHERE shop = %s AND created_at < %s",
				$shop,
				$cutoff
			)
		);
	}
}

