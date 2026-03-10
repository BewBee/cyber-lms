/**
 * tests/expSystem.test.ts — Unit tests for EXP calculation and medal assignment.
 * Uses vitest. Run with: npx vitest run tests/expSystem.test.ts
 * Tests cover: EXP formula, level calculation, rank mapping, medal thresholds.
 */

import { describe, it, expect } from 'vitest';
import { calculateExpGained, calculateLevel, calculateRank, expToNextLevel, streakBonus } from '../lib/expSystem';
import { determineMedal, getMedalFromScore } from '../lib/medalSystem';

// ─── EXP Calculation ──────────────────────────────────────────────────────────

describe('calculateExpGained', () => {
  it('calculates base EXP for partial score (7/10, no bonus)', () => {
    // 7 × 10 + 50 completion = 120
    expect(calculateExpGained(7, 10, 0)).toBe(120);
  });

  it('calculates full EXP for perfect score (10/10, no bonus)', () => {
    // 10 × 10 + 50 completion + 100 perfect = 250
    expect(calculateExpGained(10, 10, 0)).toBe(250);
  });

  it('applies exp_bonus_percent correctly (20% bonus on perfect)', () => {
    // 250 × 1.2 = 300
    expect(calculateExpGained(10, 10, 20)).toBe(300);
  });

  it('returns 0 for 0 correct answers', () => {
    // 0 + 50 completion = 50
    expect(calculateExpGained(0, 10, 0)).toBe(50);
  });

  it('clamps correctAnswers to totalQuestions (no extra EXP)', () => {
    expect(calculateExpGained(15, 10, 0)).toBe(calculateExpGained(10, 10, 0));
  });

  it('returns 0 for invalid inputs', () => {
    expect(calculateExpGained(-1, 10, 0)).toBe(0);
    expect(calculateExpGained(5, 0, 0)).toBe(0);
  });
});

// ─── Level Calculation ────────────────────────────────────────────────────────

describe('calculateLevel', () => {
  it('returns level 1 for 0 EXP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns level 2 at exactly 300 EXP (LEVEL_XP boundary)', () => {
    expect(calculateLevel(300)).toBe(2);
  });

  it('returns level 2 at 599 EXP (just before next level)', () => {
    expect(calculateLevel(599)).toBe(2);
  });

  it('returns level 3 at 600 EXP', () => {
    expect(calculateLevel(600)).toBe(3);
  });

  it('returns level 1 for negative EXP', () => {
    expect(calculateLevel(-100)).toBe(1);
  });
});

// ─── Rank Mapping ─────────────────────────────────────────────────────────────

describe('calculateRank', () => {
  it('returns Script Kiddie at level 1', () => {
    expect(calculateRank(1)).toBe('Script Kiddie');
  });

  it('returns Packet Rat at level 3', () => {
    expect(calculateRank(3)).toBe('Packet Rat');
  });

  it('returns Firewall Hopper at level 5', () => {
    expect(calculateRank(5)).toBe('Firewall Hopper');
  });

  it('returns Shadow Architect at level 30+', () => {
    expect(calculateRank(30)).toBe('Shadow Architect');
    expect(calculateRank(99)).toBe('Shadow Architect');
  });

  it('returns highest qualifying rank (not next rank) at boundary', () => {
    // Level 12 should be Red Team Operator, not Zero-Day Hunter (17)
    expect(calculateRank(12)).toBe('Red Team Operator');
    expect(calculateRank(16)).toBe('Red Team Operator');
    expect(calculateRank(17)).toBe('Zero-Day Hunter');
  });
});

// ─── EXP to Next Level ────────────────────────────────────────────────────────

describe('expToNextLevel', () => {
  it('returns current=0 and needed=300 at 0 EXP', () => {
    expect(expToNextLevel(0)).toEqual({ current: 0, needed: 300 });
  });

  it('returns current=150 at 450 EXP (halfway through level 2)', () => {
    expect(expToNextLevel(450)).toEqual({ current: 150, needed: 300 });
  });

  it('returns current=0 at exact level boundary (300)', () => {
    expect(expToNextLevel(300)).toEqual({ current: 0, needed: 300 });
  });
});

// ─── Streak Bonus ─────────────────────────────────────────────────────────────

describe('streakBonus', () => {
  it('returns 0 for streak < 2', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(1)).toBe(0);
  });

  it('returns 2 for streak of 2', () => {
    expect(streakBonus(2)).toBe(2);
  });

  it('caps at MAX_STREAK_BONUS (50)', () => {
    expect(streakBonus(1000)).toBe(50);
  });
});

// ─── Medal System ─────────────────────────────────────────────────────────────

describe('determineMedal', () => {
  it('awards gold at exactly 90%', () => {
    expect(determineMedal(90)).toBe('gold');
  });

  it('awards gold at 100%', () => {
    expect(determineMedal(100)).toBe('gold');
  });

  it('awards silver at 75%', () => {
    expect(determineMedal(75)).toBe('silver');
  });

  it('awards silver at 89%', () => {
    expect(determineMedal(89)).toBe('silver');
  });

  it('awards bronze at 60%', () => {
    expect(determineMedal(60)).toBe('bronze');
  });

  it('awards bronze at 74%', () => {
    expect(determineMedal(74)).toBe('bronze');
  });

  it('awards none below 60%', () => {
    expect(determineMedal(59)).toBe('none');
    expect(determineMedal(0)).toBe('none');
  });
});

describe('getMedalFromScore', () => {
  it('calculates accuracy and medal correctly for 9/10', () => {
    const { accuracy, medal } = getMedalFromScore(9, 10);
    expect(accuracy).toBe(90);
    expect(medal).toBe('gold');
  });

  it('handles 0 total questions gracefully', () => {
    const { accuracy, medal } = getMedalFromScore(0, 0);
    expect(accuracy).toBe(0);
    expect(medal).toBe('none');
  });

  it('handles perfect score', () => {
    const { accuracy, medal } = getMedalFromScore(10, 10);
    expect(accuracy).toBe(100);
    expect(medal).toBe('gold');
  });
});
