<?php
/**
 * AskPeply Gemini AI Client with Model Fallback & Retry
 * Ported from ai.server.ts in the Shopify app.
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Gemini_Client {

	const DEFAULT_MODEL           = 'gemini-3.5-flash';
	const MAX_MODELS_PER_QUESTION = 5;
	const TIME_BUDGET_SEC         = 30;
	const ATTEMPT_TIMEOUT_SEC     = 9;

	/**
	 * Get the active API Key from .env, environment or saved settings.
	 */
	public static function get_api_key() {
		// 1. Direct parsed .env file (Guaranteed across all server configurations)
		if ( defined( 'ASKPEPLY_PLUGIN_DIR' ) ) {
			$env_file = ASKPEPLY_PLUGIN_DIR . '.env';
			if ( file_exists( $env_file ) && is_readable( $env_file ) ) {
				$lines = @file( $env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
				if ( is_array( $lines ) ) {
					foreach ( $lines as $l ) {
						$l = trim( $l );
						if ( '' === $l || 0 === strpos( $l, '#' ) ) {
							continue;
						}
						if ( false !== strpos( $l, '=' ) ) {
							list( $k, $v ) = explode( '=', $l, 2 );
							if ( 'GEMINI_API_KEY' === trim( $k ) && ! empty( trim( $v ) ) ) {
								$key = trim( trim( $v ), "\"' \t\n\r\0\x0B" );
								if ( ! empty( $key ) ) {
									return $key;
								}
							}
						}
					}
				}
			}
		}

		// 2. Check saved WordPress option
		$opt_key = get_option( 'askpeply_gemini_api_key' );
		if ( ! empty( $opt_key ) ) {
			return trim( $opt_key );
		}

		// 3. Check environment variable
		$env_key = getenv( 'GEMINI_API_KEY' );
		if ( ! empty( $env_key ) ) {
			return trim( $env_key );
		}
		if ( ! empty( $_ENV['GEMINI_API_KEY'] ) ) {
			return trim( $_ENV['GEMINI_API_KEY'] );
		}
		if ( ! empty( $_SERVER['GEMINI_API_KEY'] ) ) {
			return trim( $_SERVER['GEMINI_API_KEY'] );
		}

		// 4. Check saved settings
		$data = Settings::get_shop_data();
		if ( ! empty( $data['settings']['geminiApiKey'] ) ) {
			return trim( $data['settings']['geminiApiKey'] );
		}

		return '';
	}

	/**
	 * Check if AI is configured.
	 * With AskPeply Central Gateway, the plugin is active out-of-the-box (Free trial or License).
	 */
	public static function is_configured() {
		return true;
	}

	/**
	 * Preferred model from env or settings.
	 */
	public static function get_preferred_model() {
		if ( defined( 'ASKPEPLY_PLUGIN_DIR' ) ) {
			$env_file = ASKPEPLY_PLUGIN_DIR . '.env';
			if ( file_exists( $env_file ) && is_readable( $env_file ) ) {
				$lines = @file( $env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
				if ( is_array( $lines ) ) {
					foreach ( $lines as $l ) {
						$l = trim( $l );
						if ( '' === $l || 0 === strpos( $l, '#' ) ) {
							continue;
						}
						if ( false !== strpos( $l, '=' ) ) {
							list( $k, $v ) = explode( '=', $l, 2 );
							if ( 'GEMINI_MODEL' === trim( $k ) && ! empty( trim( $v ) ) ) {
								return trim( trim( $v ), "\"' \t\n\r\0\x0B" );
							}
						}
					}
				}
			}
		}
		$m = getenv( 'GEMINI_MODEL' );
		if ( ! empty( $m ) ) {
			return trim( $m );
		}
		if ( ! empty( $_ENV['GEMINI_MODEL'] ) ) {
			return trim( $_ENV['GEMINI_MODEL'] );
		}
		$data = Settings::get_shop_data();
		if ( ! empty( $data['settings']['geminiModel'] ) ) {
			return trim( $data['settings']['geminiModel'] );
		}
		return self::DEFAULT_MODEL;
	}

	/**
	 * Rank model names to prefer latest flash versions.
	 */
	private static function rank_model( $name ) {
		preg_match( '/gemini-(\d+(?:\.\d+)?)/', $name, $matches );
		$version = isset( $matches[1] ) ? (float) $matches[1] : 0.0;
		$score   = $version * 100;

		if ( preg_match( '/preview|exp/i', $name ) ) {
			$score -= 30;
		}
		if ( preg_match( '/lite/i', $name ) ) {
			$score -= 10;
		}
		if ( preg_match( '/-\d{3,}$|-\d{2}-\d{2}/', $name ) ) {
			$score -= 5;
		}
		return $score;
	}

	/**
	 * Fetch or get cached candidate models.
	 */
	public static function get_candidate_models( $api_key, $preferred = '' ) {
		$cache_key = 'askpeply_gemini_models';
		$cached    = get_transient( $cache_key );
		$models    = is_array( $cached ) ? $cached : array();

		if ( empty( $models ) ) {
			$url      = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000';
			$response = wp_remote_get(
				$url,
				array(
					'headers' => array( 'x-goog-api-key' => $api_key ),
					'timeout' => 8,
				)
			);

			if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
				$data  = json_decode( wp_remote_retrieve_body( $response ), true );
				$names = array();
				if ( ! empty( $data['models'] ) && is_array( $data['models'] ) ) {
					foreach ( $data['models'] as $m ) {
						$methods = isset( $m['supportedGenerationMethods'] ) ? $m['supportedGenerationMethods'] : array();
						if ( ! in_array( 'generateContent', $methods, true ) ) {
							continue;
						}
						$name = preg_replace( '/^models\//', '', isset( $m['name'] ) ? $m['name'] : '' );
						if ( preg_match( '/flash/i', $name ) && ! preg_match( '/(image|tts|audio|live|embed|vision|8b)/i', $name ) ) {
							$names[] = $name;
						}
					}
				}

				usort(
					$names,
					function ( $a, $b ) {
						return self::rank_model( $b ) - self::rank_model( $a );
					}
				);

				if ( ! empty( $names ) ) {
					$models = $names;
					set_transient( $cache_key, $models, HOUR_IN_SECONDS );
				}
			}
		}

		if ( empty( $models ) ) {
			$models = array(
				self::DEFAULT_MODEL,
				'gemini-3.5-flash-lite',
				'gemini-3-flash-preview',
				'gemini-3.1-flash-lite',
				'gemini-flash-latest',
			);
		}

		$preferred = $preferred ? $preferred : self::get_preferred_model();
		$last_good = get_transient( 'askpeply_gemini_last_good' );

		$ordered = array_values( array_unique( array_filter( array_merge( array( $preferred, $last_good ), $models ) ) ) );
		return $ordered;
	}

	/**
	 * Convert chat turns to Gemini API contents structure.
	 */
	public static function to_gemini_contents( $messages ) {
		$out = array();
		if ( ! is_array( $messages ) ) {
			return $out;
		}

		// Take the last 12 messages
		$recent = array_slice( $messages, -12 );

		foreach ( $recent as $m ) {
			$content = isset( $m['content'] ) ? trim( (string) $m['content'] ) : '';
			$content = substr( $content, 0, 1500 );
			if ( '' === $content ) {
				continue;
			}

			$role = ( isset( $m['role'] ) && 'assistant' === $m['role'] ) ? 'model' : 'user';
			$last_idx = count( $out ) - 1;

			if ( $last_idx >= 0 && $out[ $last_idx ]['role'] === $role ) {
				$out[ $last_idx ]['parts'][0]['text'] .= "\n\n" . $content;
			} else {
				$out[] = array(
					'role'  => $role,
					'parts' => array( array( 'text' => $content ) ),
				);
			}
		}

		// Gemini requires the conversation to start with 'user'
		while ( ! empty( $out ) && 'user' !== $out[0]['role'] ) {
			array_shift( $out );
		}

		return $out;
	}

	/**
	 * Attempt a single generation call to a specific model.
	 */
	public static function ask_once( $api_key, $model, $system, $contents ) {
		$url  = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode( $model ) . ':generateContent';
		$body = wp_json_encode(
			array(
				'systemInstruction' => array( 'parts' => array( array( 'text' => $system ) ) ),
				'contents'          => $contents,
				'generationConfig'  => array(
					'temperature'     => 0.2,
					'maxOutputTokens' => 2048,
				),
			)
		);

		$res = wp_remote_post(
			$url,
			array(
				'headers' => array(
					'Content-Type'   => 'application/json',
					'x-goog-api-key' => $api_key,
				),
				'body'    => $body,
				'timeout' => self::ATTEMPT_TIMEOUT_SEC,
			)
		);

		if ( is_wp_error( $res ) ) {
			$err_msg = $res->get_error_message();
			$timed_out = false !== strpos( strtolower( $err_msg ), 'timed out' );
			return array(
				'ok'       => false,
				'status'   => 0,
				'timedOut' => $timed_out,
				'detail'   => $timed_out ? "{$model} did not answer within " . self::ATTEMPT_TIMEOUT_SEC . ' seconds' : 'Could not reach Gemini: ' . $err_msg,
			);
		}

		$status = wp_remote_retrieve_response_code( $res );
		$raw    = wp_remote_retrieve_body( $res );
		$data   = json_decode( $raw, true );

		if ( $status < 200 || $status >= 300 ) {
			$detail = substr( $raw, 0, 400 );
			if ( ! empty( $data['error']['message'] ) ) {
				$detail = $data['error']['message'];
			}
			return array(
				'ok'       => false,
				'status'   => $status,
				'timedOut' => false,
				'detail'   => $detail,
			);
		}

		$parts = isset( $data['candidates'][0]['content']['parts'] ) ? $data['candidates'][0]['content']['parts'] : array();
		$reply = '';
		foreach ( $parts as $p ) {
			if ( empty( $p['thought'] ) && isset( $p['text'] ) ) {
				$reply .= $p['text'];
			}
		}
		$reply = trim( $reply );

		if ( '' === $reply ) {
			return array(
				'ok'       => false,
				'status'   => 200,
				'timedOut' => false,
				'detail'   => 'Empty reply',
			);
		}

		return array(
			'ok'     => true,
			'status' => 200,
			'reply'  => $reply,
		);
	}

	/**
	 * Ask AI through Central Cloudflare Gateway with local fallback.
	 *
	 * @param string $system System prompt.
	 * @param array  $messages Conversation messages.
	 * @param bool   $is_test Whether this is an admin test chat.
	 * @return array
	 */
	public static function ask_ai( $system, $messages, $is_test = false ) {
		// 1. Primary: Central Cloudflare License & AI Gateway
		$gateway_url = Settings::get_cloudflare_api_url() . '/api/chat';
		$license_key = Settings::get_license_key();
		if ( empty( $license_key ) ) {
			$license_key = 'free';
		}

		$payload = array(
			'licenseKey'   => $license_key,
			'domain'       => Settings::get_normalized_domain(),
			'storeUuid'    => Settings::get_store_uuid(),
			'system'       => $system,
			'messages'     => $messages,
			'isTest'       => ! empty( $is_test ),
			'geminiApiKey' => self::get_api_key(),
		);

		$res = wp_remote_post(
			$gateway_url,
			array(
				'headers' => array(
					'Content-Type' => 'application/json',
				),
				'body'    => wp_json_encode( $payload ),
				'timeout' => 25,
			)
		);

		if ( ! is_wp_error( $res ) ) {
			$code = (int) wp_remote_retrieve_response_code( $res );
			$body = wp_remote_retrieve_body( $res );
			$json = json_decode( $body, true );

			// Successful AI response from gateway
			if ( 200 === $code && ! empty( $json['ok'] ) && ! empty( $json['reply'] ) ) {
				return array(
					'ok'             => true,
					'reply'          => $json['reply'],
					'model'          => 'askpeply-cloud',
					'chatsRemaining' => isset( $json['chatsRemaining'] ) ? $json['chatsRemaining'] : null,
				);
			}

			// Usage Limit reached (Cloudflare server-side domain enforcement)
			if ( 429 === $code || ! empty( $json['limit_reached'] ) || ( isset( $json['error'] ) && 'limit_reached' === $json['error'] ) ) {
				return array(
					'ok'            => false,
					'error'         => 'limit_reached',
					'limit_reached' => true,
					'reply'         => ! empty( $json['reply'] ) ? $json['reply'] : __( 'You have reached the 20 free conversations limit. Please upgrade your plan on AskPeply to continue using the assistant.', 'askpeply' ),
				);
			}

			// License errors (expired, domain mismatch, etc.)
			if ( ( 401 === $code || 403 === $code ) && ! empty( $json['reply'] ) ) {
				return array(
					'ok'     => false,
					'error'  => isset( $json['error'] ) ? $json['error'] : 'license_error',
					'detail' => $json['reply'],
				);
			}
		}

		// 2. Direct Fallback if local GEMINI_API_KEY is configured
		$direct_key = self::get_api_key();
		if ( ! empty( $direct_key ) ) {
			return self::ask_gemini_direct( $system, $messages );
		}

		// 3. Fallback error message
		return array(
			'ok'     => false,
			'error'  => 'upstream_error',
			'detail' => __( 'Could not reach the assistant. Please try again shortly or contact support.', 'askpeply' ),
		);
	}

	/**
	 * Ask AI directly with automatic model failover and retries (Local/Offline Fallback).
	 */
	public static function ask_gemini_direct( $system, $messages ) {
		$api_key = self::get_api_key();
		if ( empty( $api_key ) ) {
			return array(
				'ok'     => false,
				'error'  => 'missing_api_key',
				'detail' => 'GEMINI_API_KEY is not set.',
			);
		}

		$contents = self::to_gemini_contents( $messages );
		if ( empty( $contents ) ) {
			return array(
				'ok'     => false,
				'error'  => 'no_question',
				'detail' => 'No question content found.',
			);
		}

		$start_time = microtime( true );
		$models     = array_slice( self::get_candidate_models( $api_key ), 0, self::MAX_MODELS_PER_QUESTION );
		$attempts   = array();

		foreach ( $models as $m ) {
			for ( $try_no = 0; $try_no < 2; $try_no++ ) {
				if ( ( microtime( true ) - $start_time ) > self::TIME_BUDGET_SEC ) {
					return array(
						'ok'       => false,
						'error'    => 'timeout',
						'detail'   => 'Gemini took too long.',
						'attempts' => $attempts,
					);
				}

				$r = self::ask_once( $api_key, $m, $system, $contents );
				$attempts[] = array(
					'model'  => $m,
					'status' => $r['status'],
					'detail' => empty( $r['ok'] ) ? ( isset( $r['detail'] ) ? $r['detail'] : '' ) : null,
				);

				if ( ! empty( $r['ok'] ) ) {
					set_transient( 'askpeply_gemini_last_good', $m, DAY_IN_SECONDS );
					return array(
						'ok'    => true,
						'reply' => $r['reply'],
						'model' => $m,
					);
				}

				if ( ! empty( $r['timedOut'] ) ) {
					break;
				}

				if ( in_array( $r['status'], array( 0, 500, 503 ), true ) && 0 === $try_no ) {
					usleep( 800000 ); // 800ms
					continue;
				}

				break;
			}
		}

		$first  = isset( $attempts[0] ) ? $attempts[0] : null;
		$detail = $first ? substr( "{$first['model']} -> {$first['status']}: {$first['detail']}", 0, 220 ) : 'Failed to reach AI';

		return array(
			'ok'       => false,
			'error'    => 'upstream_error',
			'detail'   => $detail,
			'attempts' => $attempts,
		);
	}

	/**
	 * Extract text from an uploaded PDF using Gemini multimodal generation.
	 * Used for Pro plan "upload your own documents".
	 */
	public static function extract_pdf_text( $base64_data ) {
		$api_key = self::get_api_key();
		if ( empty( $api_key ) ) {
			return array(
				'ok'    => false,
				'error' => 'GEMINI_API_KEY is not set.',
			);
		}

		$models     = array_slice( self::get_candidate_models( $api_key ), 0, 3 );
		$last_error = '';

		foreach ( $models as $model ) {
			$url  = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode( $model ) . ':generateContent';
			$body = wp_json_encode(
				array(
					'contents'         => array(
						array(
							'role'  => 'user',
							'parts' => array(
								array(
									'inline_data' => array(
										'mime_type' => 'application/pdf',
										'data'      => $base64_data,
									),
								),
								array(
									'text' => "Copy out all of the text in this document as plain text. Keep headings, tables (as 'label: value' lines) and numbers exactly. Do not summarise or add anything.",
								),
							),
						),
					),
					'generationConfig' => array(
						'temperature'     => 0,
						'maxOutputTokens' => 8192,
					),
				)
			);

			$res = wp_remote_post(
				$url,
				array(
					'headers' => array(
						'Content-Type'   => 'application/json',
						'x-goog-api-key' => $api_key,
					),
					'body'    => $body,
					'timeout' => 90,
				)
			);

			if ( is_wp_error( $res ) ) {
				$last_error = $res->get_error_message();
				continue;
			}

			$status = wp_remote_retrieve_response_code( $res );
			$raw    = wp_remote_retrieve_body( $res );
			$data   = json_decode( $raw, true );

			if ( $status < 200 || $status >= 300 ) {
				$last_error = ! empty( $data['error']['message'] ) ? $data['error']['message'] : "HTTP {$status}";
				continue;
			}

			$parts = isset( $data['candidates'][0]['content']['parts'] ) ? $data['candidates'][0]['content']['parts'] : array();
			$text  = '';
			foreach ( $parts as $p ) {
				if ( ! empty( $p['text'] ) ) {
					$text .= $p['text'];
				}
			}
			$text = trim( $text );

			if ( '' !== $text ) {
				return array(
					'ok'   => true,
					'text' => $text,
				);
			}

			$last_error = 'No text found in the PDF.';
		}

		return array(
			'ok'    => false,
			'error' => $last_error ? $last_error : 'Could not read the PDF.',
		);
	}
}

