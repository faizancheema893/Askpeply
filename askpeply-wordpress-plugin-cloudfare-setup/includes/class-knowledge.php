<?php
/**
 * AskPeply Knowledge Base Synchronization & Search
 * Ported from knowledge.server.ts in the Shopify app.
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Knowledge {

	/**
	 * Strip HTML and normalize whitespace.
	 */
	public static function strip_html( $html ) {
		$text = (string) ( $html ? $html : '' );
		$text = preg_replace( '/<(script|style)[\s\S]*?<\/\1>/i', ' ', $text );
		$text = preg_replace( '/<br\s*\/?>/i', "\n", $text );
		$text = preg_replace( '/<\/(p|div|li|h[1-6]|tr)>/i', "\n", $text );
		$text = preg_replace( '/<li[^>]*>/i', '- ', $text );
		$text = wp_strip_all_tags( $text );
		$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$text = preg_replace( '/[ \t]+/', ' ', $text );
		$text = preg_replace( "/\n\s*\n\s*/", "\n", $text );
		return trim( $text );
	}

	/**
	 * Synchronize WooCommerce products into the knowledge base.
	 */
	public static function fetch_products() {
		$items = array();

		// Check if WooCommerce is installed and active
		if ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_products' ) ) {
			$products = wc_get_products(
				array(
					'status' => 'publish',
					'limit'  => 300,
				)
			);

			foreach ( $products as $p ) {
				$id    = (string) $p->get_id();
				$title = $p->get_name();
				$url   = wp_make_link_relative( get_permalink( $p->get_id() ) );

				$desc  = self::strip_html( $p->get_description() );
				if ( empty( $desc ) ) {
					$desc = self::strip_html( $p->get_short_description() );
				}

				$sku   = $p->get_sku();
				$price = $p->get_price();
				$stock = $p->is_in_stock() ? 'In stock' : 'Out of stock';

				// Handle variations if variable product
				$variations_text = '';
				if ( $p->is_type( 'variable' ) ) {
					$vars = $p->get_available_variations();
					$v_parts = array();
					foreach ( array_slice( $vars, 0, 15 ) as $v ) {
						$attr_str = implode( ' / ', array_values( $v['attributes'] ) );
						$v_price  = ! empty( $v['display_price'] ) ? '$' . $v['display_price'] : '';
						$v_parts[] = "{$attr_str}: {$v_price}" . ( $v['is_in_stock'] ? '' : ' — out of stock' );
					}
					if ( ! empty( $v_parts ) ) {
						$variations_text = 'Sizes/Options: ' . implode( '; ', $v_parts );
					}
				}

				$categories = wp_get_post_terms( $p->get_id(), 'product_cat', array( 'fields' => 'names' ) );

				$content_lines = array(
					$desc ? "Description: {$desc}" : '',
					$price ? "Price: $" . $price : '',
					$sku ? "SKU: {$sku}" : '',
					$stock ? "Stock: {$stock}" : '',
					! empty( $categories ) && ! is_wp_error( $categories ) ? 'Category: ' . implode( ', ', $categories ) : '',
					$variations_text ? $variations_text : '',
				);

				$content = implode( "\n", array_filter( $content_lines ) );

				$items[] = array(
					'source'   => 'product',
					'sourceId' => $id,
					'title'    => $title,
					'content'  => $content,
					'url'      => $url,
				);
			}
		}

		return $items;
	}

	/**
	 * Synchronize published WordPress pages.
	 */
	public static function fetch_pages() {
		$items = array();
		$pages = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'publish',
				'posts_per_page' => 100,
			)
		);

		foreach ( $pages as $page ) {
			$id      = (string) $page->ID;
			$title   = $page->post_title;
			$content = self::strip_html( $page->post_content );
			$content = substr( $content, 0, 6000 );
			$url     = wp_make_link_relative( get_permalink( $page->ID ) );

			if ( ! empty( $content ) ) {
				$items[] = array(
					'source'   => 'page',
					'sourceId' => $id,
					'title'    => $title,
					'content'  => $content,
					'url'      => $url,
				);
			}
		}

		return $items;
	}

	/**
	 * Synchronize store policies (Privacy, Terms, Returns).
	 */
	public static function fetch_policies() {
		$items = array();

		// 1. WordPress Privacy Policy Page
		$privacy_id = get_option( 'wp_page_for_privacy_policy' );
		if ( $privacy_id ) {
			$page = get_post( $privacy_id );
			if ( $page && 'publish' === $page->post_status ) {
				$items[] = array(
					'source'   => 'policy',
					'sourceId' => 'policy_privacy',
					'title'    => $page->post_title ? $page->post_title : 'Privacy Policy',
					'content'  => substr( self::strip_html( $page->post_content ), 0, 8000 ),
					'url'      => wp_make_link_relative( get_permalink( $page->ID ) ),
				);
			}
		}

		// 2. WooCommerce Terms & Conditions Page
		if ( function_exists( 'wc_terms_and_conditions_page_id' ) ) {
			$terms_id = wc_terms_and_conditions_page_id();
			if ( $terms_id && $terms_id !== $privacy_id ) {
				$page = get_post( $terms_id );
				if ( $page && 'publish' === $page->post_status ) {
					$items[] = array(
						'source'   => 'policy',
						'sourceId' => 'policy_terms',
						'title'    => $page->post_title ? $page->post_title : 'Terms and Conditions',
						'content'  => substr( self::strip_html( $page->post_content ), 0, 8000 ),
						'url'      => wp_make_link_relative( get_permalink( $page->ID ) ),
					);
				}
			}
		}

		// 3. Search for Shipping or Refund Pages
		$policy_pages = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'publish',
				'title'          => 'refund',
				'posts_per_page' => 2,
			)
		);
		foreach ( $policy_pages as $page ) {
			if ( $page->ID === $privacy_id ) {
				continue;
			}
			$items[] = array(
				'source'   => 'policy',
				'sourceId' => 'policy_' . $page->ID,
				'title'    => $page->post_title,
				'content'  => substr( self::strip_html( $page->post_content ), 0, 8000 ),
				'url'      => wp_make_link_relative( get_permalink( $page->ID ) ),
			);
		}

		return array(
			'items'     => $items,
			'shop_name' => get_bloginfo( 'name' ),
			'email'     => get_option( 'admin_email' ),
		);
	}

	/**
	 * Execute full knowledge sync and update database.
	 */
	public static function sync_knowledge( $shop = 'default' ) {
		global $wpdb;
		$table = Database::table_knowledge();

		$products = self::fetch_products();
		$pages    = self::fetch_pages();
		$policies = self::fetch_policies();

		$all = array_merge( $products, $pages, $policies['items'] );

		foreach ( $all as $it ) {
			$existing = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$table} WHERE shop = %s AND source = %s AND source_id = %s",
					$shop,
					$it['source'],
					$it['sourceId']
				)
			);

			if ( $existing ) {
				$wpdb->update(
					$table,
					array(
						'title'      => $it['title'],
						'content'    => $it['content'],
						'url'        => $it['url'],
						'updated_at' => current_time( 'mysql' ),
					),
					array( 'id' => $existing )
				);
			} else {
				$wpdb->insert(
					$table,
					array(
						'id'         => Database::generate_id( 'k' ),
						'shop'       => $shop,
						'source'     => $it['source'],
						'source_id'  => $it['sourceId'],
						'title'      => $it['title'],
						'content'    => $it['content'],
						'url'        => $it['url'],
						'created_at' => current_time( 'mysql' ),
						'updated_at' => current_time( 'mysql' ),
					)
				);
			}
		}

		// Prune items of type product/page/policy that no longer exist
		foreach ( array( 'product', 'page', 'policy' ) as $src ) {
			$keep_ids = array();
			foreach ( $all as $item ) {
				if ( $item['source'] === $src ) {
					$keep_ids[] = $item['sourceId'];
				}
			}

			if ( ! empty( $keep_ids ) ) {
				$placeholders = implode( ',', array_fill( 0, count( $keep_ids ), '%s' ) );
				$params       = array_merge( array( $shop, $src ), $keep_ids );
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE shop = %s AND source = %s AND source_id NOT IN ({$placeholders})", $params ) );
			} else {
				$wpdb->delete( $table, array( 'shop' => $shop, 'source' => $src ) );
			}
		}

		// Update last_sync_at timestamp in settings table
		$table_settings = Database::table_settings();
		$wpdb->update(
			$table_settings,
			array( 'last_sync_at' => current_time( 'mysql' ) ),
			array( 'shop' => $shop )
		);

		return array(
			'products' => count( $products ),
			'pages'    => count( $pages ),
			'policies' => count( $policies['items'] ),
			'shopName' => $policies['shop_name'],
			'email'    => $policies['email'],
		);
	}

	/**
	 * Stopwords for search scoring.
	 */
	public static function get_stopwords() {
		return array_flip(
			explode(
				' ',
				'a an and are as at be but by can do does for from have how i if in is it its me my of on or our please so that the this to was what when where which who why will with you your yours tell about any there their them they we us'
			)
		);
	}

	/**
	 * Extract terms from question text.
	 */
	public static function extract_terms( $text ) {
		$stop  = self::get_stopwords();
		$clean = strtolower( (string) $text );
		$clean = preg_replace( '/[^a-z0-9À-ɏ -]/', ' ', $clean );
		$words = preg_split( '/\s+/', $clean );
		$terms = array();

		foreach ( $words as $w ) {
			if ( strlen( $w ) > 1 && ! isset( $stop[ $w ] ) ) {
				$terms[] = $w;
			}
		}
		return array_values( array_unique( $terms ) );
	}

	/**
	 * Simple keyword search with scoring.
	 * Identical scoring logic as Shopify knowledge.server.ts.
	 */
	public static function search_knowledge( $shop = 'default', $question = '', $limit = 6 ) {
		global $wpdb;
		$table = Database::table_knowledge();

		$items = $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM {$table} WHERE shop = %s", $shop ),
			ARRAY_A
		);

		if ( empty( $items ) ) {
			return array();
		}

		$terms = self::extract_terms( $question );
		if ( empty( $terms ) ) {
			$filtered = array();
			foreach ( $items as $it ) {
				if ( 'policy' === $it['source'] || 'custom' === $it['source'] ) {
					$filtered[] = $it;
				}
			}
			return array_slice( $filtered, 0, $limit );
		}

		$scored = array();
		foreach ( $items as $it ) {
			$title = strtolower( $it['title'] );
			$body  = strtolower( $it['content'] );
			$score = 0;

			foreach ( $terms as $t ) {
				if ( false !== strpos( $title, $t ) ) {
					$score += 4;
				}
				$hits = substr_count( $body, $t );
				$score += min( $hits, 5 );
			}

			if ( 'custom' === $it['source'] ) {
				$score *= 1.5;
			}

			if ( $score > 0 ) {
				$scored[] = array(
					'item'  => $it,
					'score' => $score,
				);
			}
		}

		usort(
			$scored,
			function ( $a, $b ) {
				if ( $b['score'] == $a['score'] ) {
					return 0;
				}
				return ( $b['score'] > $a['score'] ) ? 1 : -1;
			}
		);

		$result = array();
		foreach ( array_slice( $scored, 0, $limit ) as $s ) {
			$result[] = $s['item'];
		}
		return $result;
	}
}

