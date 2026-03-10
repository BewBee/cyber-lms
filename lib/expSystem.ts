/**
 * lib/expSystem.ts — EXP calculation, level computation, and rank mapping for CyberShield LMS.
 * All formulas read from lib/config.ts so changing config values automatically updates behavior.
 * To test: run `npx vitest run tests/expSystem.test.ts` and verify all assertions pass.
 */

import { config } from './config';

// ─── EXP Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates total EXP earned for a quiz session.
 * Formula: (correctAnswers × EXP_PER_CORRECT) + EXP_PER_COMPLETION + (perfect bonus if applicable)
 * × (1 + expBonusPercent / 100)
 *
 * @param correctAnswers - Number of correct answers in the session
 * @param totalQuestions - Total number of questions in the session
 * @param expBonusPercent - Module-level EXP multiplier bonus (0 = no bonus)
 * @returns Total EXP gained (floored integer)
 */
export function calculateExpGained(
  correctAnswers: number,
  totalQuestions: number,
  expBonusPercent = 0
): number {
  if (correctAnswers < 0 || totalQuestions <= 0) return 0;
  const safeCorrect = Math.min(correctAnswers, totalQuestions);

  const baseExp = safeCorrect * config.EXP_PER_CORRECT;
  const completionBonus = config.EXP_PER_COMPLETION;
  const perfectBonus = safeCorrect === totalQuestions ? config.EXP_PER_PERFECT : 0;

  const rawExp = baseExp + completionBonus + perfectBonus;
  const multiplier = 1 + expBonusPercent / 100;

  return Math.floor(rawExp * multiplier);
}

// ─── Level Calculation ────────────────────────────────────────────────────────

/**
 * Calculates the current level from cumulative EXP.
 * Levels start at 1 and increment every LEVEL_XP points.
 *
 * @param totalExp - Cumulative EXP across all sessions
 * @returns Current level (minimum 1)
 */
export function calculateLevel(totalExp: number): number {
  if (totalExp < 0) return 1;
  return Math.floor(totalExp / config.LEVEL_XP) + 1;
}

/**
 * Returns how much EXP remains in the current level vs. the total needed.
 * Used to render the progress bar (current / needed).
 *
 * @param totalExp - Cumulative EXP
 * @returns { current: EXP into current level, needed: EXP to complete this level }
 */
export function expToNextLevel(totalExp: number): { current: number; needed: number } {
  const current = Math.max(0, totalExp) % config.LEVEL_XP;
  return { current, needed: config.LEVEL_XP };
}

// ─── Rank Mapping ─────────────────────────────────────────────────────────────

/**
 * Maps a level number to the highest qualifying rank name.
 * Ranks are defined in config.RANKS sorted by minLevel ascending.
 *
 * @param level - Current player level
 * @returns Rank display name string
 */
export function calculateRank(level: number): string {
  const sorted = [...config.RANKS].sort((a, b) => b.minLevel - a.minLevel);
  const rank = sorted.find((r) => level >= r.minLevel);
  return rank?.name ?? config.RANKS[0].name;
}

// ─── Streak Bonus ─────────────────────────────────────────────────────────────

/**
 * Calculates additional EXP from an answer streak (consecutive correct answers).
 * Capped at config.MAX_STREAK_BONUS.
 *
 * @param streak - Current consecutive correct answer count
 * @returns Additional EXP for this streak level
 */
export function streakBonus(streak: number): number {
  if (streak < 2) return 0;
  return Math.min((streak - 1) * 2, config.MAX_STREAK_BONUS);
}
