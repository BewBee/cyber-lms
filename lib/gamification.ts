/**
 * lib/gamification.ts — High-level gamification orchestrator for CyberShield LMS.
 * Glues together expSystem and medalSystem to produce a complete GameResult from session data.
 * To test: call processSessionResult() with mock session data and verify the returned GameResult.
 */

import { calculateExpGained, calculateLevel, calculateRank, expToNextLevel } from './expSystem';
import { getMedalFromScore } from './medalSystem';
import type { GameResult, AttemptAnswer, Medal } from '@/types';

// ─── Session Processing ───────────────────────────────────────────────────────

interface SessionInput {
  sessionId: string;
  answers: AttemptAnswer[];
  /** Array of booleans parallel to answers: true if that answer was correct */
  correctness: boolean[];
  /** Module's EXP bonus percent (0 if none) */
  expBonusPercent: number;
  /** Student's current total EXP before this session */
  currentTotalExp: number;
}

/**
 * Processes raw session data into a complete GameResult.
 * This is the single function that ties together scoring, medals, EXP, and ranking.
 *
 * @param input - Session metadata plus per-answer correctness
 * @returns GameResult with all fields populated for display and persistence
 */
export function processSessionResult(input: SessionInput): GameResult {
  const { sessionId, answers, correctness, expBonusPercent, currentTotalExp } = input;

  const totalQuestions = answers.length;
  const correctCount = correctness.filter(Boolean).length;

  // Medal & accuracy
  const { accuracy, medal } = getMedalFromScore(correctCount, totalQuestions);

  // EXP calculation
  const expAwarded = calculateExpGained(correctCount, totalQuestions, expBonusPercent);
  const newTotalExp = currentTotalExp + expAwarded;

  // Level & rank
  const newLevel = calculateLevel(newTotalExp);
  const rankName = calculateRank(newLevel);

  // Average response time (ms)
  const totalTime = answers.reduce((sum, a) => sum + a.responseTimeMs, 0);
  const averageResponseTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;

  // Max streak from attempt records
  const maxStreak = Math.max(...answers.map((a) => a.streakAtAttempt ?? 0), 0);

  return {
    sessionId,
    correctCount,
    totalQuestions,
    accuracy,
    medal,
    expAwarded,
    newTotalExp,
    newLevel,
    rankName,
    averageResponseTime,
    maxStreak,
  };
}

// ─── Badge Eligibility ────────────────────────────────────────────────────────

interface BadgeCheckInput {
  isFirstSession: boolean;
  medal: Medal;
  accuracy: number;
  maxStreak: number;
  totalSessionsCompleted: number;
}

/**
 * Returns badge keys earned in this session.
 * Extend this function to add new badge types.
 *
 * @param input - Context data for badge evaluation
 * @returns Array of badge_key strings to award
 */
export function checkEarnedBadges(input: BadgeCheckInput): string[] {
  const { isFirstSession, medal, accuracy, maxStreak, totalSessionsCompleted } = input;
  const earned: string[] = [];

  if (isFirstSession) earned.push('first_mission');
  if (medal === 'gold') earned.push('perfect_strike');
  if (maxStreak >= 5) earned.push('hot_streak');
  if (totalSessionsCompleted >= 10) earned.push('veteran_operator');
  if (accuracy === 100) earned.push('flawless');

  return earned;
}
