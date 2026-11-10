<?php
/**
 * AskPeply Guardrails & Compliance Pre-checker
 * Intercepts risky or non-compliant queries before reaching AI.
 *
 * @package AskPeply
 */

namespace AskPeply;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Guardrails {

	/**
	 * Regular expression patterns for compliance detection.
	 * Exact patterns ported from guardrails.server.ts in the Shopify app.
	 */
	public static function get_presets() {
		return array(
			'blockDosing'   => array(
				'label'    => 'dosing',
				'patterns' => array(
					'/\b(dose|doses|dosage|dosing|microdos\w*)\b/i',
					'/\bhow\s+(much|many|often)\b.*\b(take|taking|inject|injecting|use|using|run|running|dose|per\s+day|a\s+day|daily|weekly|per\s+week)\b/i',
					'/\b\d+\s?(mg|mcg|µg|iu|units?)\b.*\b(day|daily|week|weekly|night|morning)\b/i',
					'/\b(cycle\s+length|how\s+long\s+(should|do)\s+i\s+(run|take|use))\b/i',
				),
			),
			'blockHumanUse' => array(
				'label'    => 'human use',
				'patterns' => array(
					'/\b(inject|injecting|injection|injections|subq|sub-q|sub\s+q|subcutaneous\w*|intramuscular\w*|pin\s+it|pinning)\b/i',
					'/\b(take\s+it\s+orally|swallow|nasal\s+spray|sublingual\w*)\b/i',
					'/\b(safe|okay|ok)\s+(for\s+me\s+|for\s+humans?\s+)?to\s+(take|use|inject)\b/i',
					'/\b(can|should)\s+i\s+(take|use|inject|try)\b/i',
				),
			),
			'blockMedical'  => array(
				'label'    => 'medical',
				'patterns' => array(
					'/\b(cure|cures|treat|treats|treatment|heal|heals|healing|diagnos\w*|disease|illness|symptom\w*|prescri\w*)\b/i',
					'/\b(cancer|diabetes|arthritis|tendon|injury|injuries|pain|anxiety|depression|insomnia|alzheimer\w*)\b/i',
					'/\b(side\s+effects?|interactions?|pregnan\w*|breastfeed\w*)\b/i',
					'/\b(weight\s+loss|lose\s+weight|fat\s+loss|burn\s+fat|anti[- ]?aging)\b/i',
				),
			),
			'blockOffLabel' => array(
				'label'    => 'off-label',
				'patterns' => array(
					'/\b(stack|stacks|stacking)\b/i',
					'/\b(bodybuild\w*|steroids?|peds?|performance[- ]enhanc\w*|bulking|cutting\s+cycle|gains)\b/i',
				),
			),
		);
	}

	/**
	 * Pre-check query against guardrails.
	 *
	 * @param string $text Question text.
	 * @param array  $g Guardrails configuration.
	 * @param bool   $allow_custom_topics Whether plan allows custom topics.
	 * @return array Array with blocked (bool), reason (string|null), reply (string|null).
	 */
	public static function precheck( $text, $g, $allow_custom_topics = false ) {
		$q       = (string) ( $text ? $text : '' );
		$presets = self::get_presets();
		$refusal = ! empty( $g['refusalMessage'] ) ? $g['refusalMessage'] : Settings::get_default_guardrails()['refusalMessage'];

		foreach ( $presets as $key => $preset ) {
			if ( empty( $g[ $key ] ) ) {
				continue;
			}
			foreach ( $preset['patterns'] as $pattern ) {
				if ( preg_match( $pattern, $q ) ) {
					return array(
						'blocked' => true,
						'reason'  => $preset['label'],
						'reply'   => $refusal,
					);
				}
			}
		}

		if ( $allow_custom_topics && ! empty( $g['blockedTopics'] ) && trim( $g['blockedTopics'] ) ) {
			$lower  = strtolower( $q );
			$topics = preg_split( '/\r?\n|,/', $g['blockedTopics'] );
			foreach ( $topics as $topic ) {
				$topic = trim( strtolower( $topic ) );
				if ( '' !== $topic && strpos( $lower, $topic ) !== false ) {
					return array(
						'blocked' => true,
						'reason'  => 'custom: ' . $topic,
						'reply'   => $refusal,
					);
				}
			}
		}

		return array( 'blocked' => false );
	}
}

