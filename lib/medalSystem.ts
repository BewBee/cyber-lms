/**
 * lib/medalSystem.ts — Medal determination logic for CyberShield LMS.
 * Reads medal thresholds from lib/config.ts — edit config.MEDAL_THRESHOLDS to change award boundaries.
 * To test: run `npx vitest run tests/expSystem.test.ts` — includes medal assertion suite.
 */

import { config } from './config';
import type { Medal } from '@/types';

// Re-export Medal type so consumers can import from this module directly
export type { Medal };

// ─── Medal Labels & Visual Config ────────────────────────────────────────────

export const MEDAL_META: Record<
  Medal,
  { label: string; color: string; bgClass: string; borderClass: string; emoji: string }
> = {
  gold: {
    label: 'GOLD',
    color: '#ffd700',
    bgClass: 'bg-yellow-400/10',
    borderClass: 'border-yellow-400',
    emoji: '🥇',
  },
  silver: {
    label: 'SILVER',
    color: '#c0c0c0',
    bgClass: 'bg-gray-300/10',
    borderClass: 'border-gray-300',
    emoji: '🥈',
  },
  bronze: {
    label: 'BRONZE',
    color: '#cd7f32',
    bgClass: 'bg-amber-600/10',
    borderClass: 'border-amber-600',
    emoji: '🥉',
  },
  none: {
    label: 'COMPLETED',
    color: '#60a5fa',
    bgClass: 'bg-blue-400/10',
    borderClass: 'border-blue-400',
    emoji: '✅',
  },
};

// ─── Core Medal Logic ─────────────────────────────────────────────────────────

/**
 * Determines the medal awarded for a given accuracy percentage.
 * Thresholds are sourced from config.MEDAL_THRESHOLDS.
 *
 * @param accuracy - Accuracy as a number 0–100 (e.g., 87.5 for 87.5%)
 * @returns Medal tier: 'gold' | 'silver' | 'bronze' | 'none'
 */
export function determineMedal(accuracy: number): Medal {
  const { gold, silver, bronze } = config.MEDAL_THRESHOLDS;
  if (accuracy >= gold) return 'gold';
  if (accuracy >= silver) return 'silver';
  if (accuracy >= bronze) return 'bronze';
  return 'none';
}

/**
 * Converts correct/total counts to an accuracy percentage and determines medal.
 *
 * @param correctCount - Number of correct answers
 * @param totalQuestions - Total number of questions
 * @returns { accuracy: number (0-100), medal: Medal }
 */
export function getMedalFromScore(
  correctCount: number,
  totalQuestions: number
): { accuracy: number; medal: Medal } {
  if (totalQuestions === 0) return { accuracy: 0, medal: 'none' };
  const accuracy = Math.round((correctCount / totalQuestions) * 10000) / 100; // 2 dp
  const medal = determineMedal(accuracy);
  return { accuracy, medal };
}
