/**
 * lib/config.ts — Central business configuration for CyberShield LMS.
 * ALL tunable rules live here. Edit this file to adjust EXP values,
 * medal thresholds, rank names, and animation settings globally.
 * To test: import { config } from '@/lib/config' and read values in unit tests.
 *
 * See MAINTENANCE.md for a full guide on what each key controls.
 */

export const config = {
  // ─── EXP & Scoring ───────────────────────────────────────────────────────
  /** EXP awarded for each correct answer */
  EXP_PER_CORRECT: 10,
  /** Flat EXP bonus for completing any session */
  EXP_PER_COMPLETION: 50,
  /** Extra EXP bonus for a perfect score (100% accuracy) */
  EXP_PER_PERFECT: 100,
  /** EXP required to advance one level */
  LEVEL_XP: 300,

  // ─── Medal Thresholds (accuracy %) ───────────────────────────────────────
  /** Edit these to change medal award boundaries (0–100) */
  MEDAL_THRESHOLDS: {
    gold: 90,
    silver: 75,
    bronze: 60,
  } as const,

  // ─── Ranks ────────────────────────────────────────────────────────────────
  /**
   * Rank names mapped to minimum level required.
   * Add new entries here — sorted ascending by minLevel at runtime.
   * Format: { minLevel: number, name: string }
   */
  RANKS: [
    { minLevel: 1, name: 'Script Kiddie' },
    { minLevel: 3, name: 'Packet Rat' },
    { minLevel: 5, name: 'Firewall Hopper' },
    { minLevel: 8, name: 'Exploit Dev' },
    { minLevel: 12, name: 'Red Team Operator' },
    { minLevel: 17, name: 'Zero-Day Hunter' },
    { minLevel: 23, name: 'Cyber Warlord' },
    { minLevel: 30, name: 'Shadow Architect' },
  ] as const,

  // ─── Quiz Engine ──────────────────────────────────────────────────────────
  /** Number of questions selected per quiz session */
  QUESTIONS_PER_SESSION: 10,
  /** Maximum EXP bonus from streak (added on top of EXP_PER_CORRECT) */
  MAX_STREAK_BONUS: 50,

  // ─── Animations ──────────────────────────────────────────────────────────
  ANIMATION_SETTINGS: {
    /** Duration (ms) for the DigitalDecrypt scramble reveal effect */
    decryptDuration: 700,
    /** Framer Motion spring config for the EXP progress bar */
    expBarSpring: { type: 'spring' as const, stiffness: 100, damping: 15 },
    /** Set to false to globally disable canvas-confetti (also overridden by user pref) */
    confettiEnabled: true,
  },

  // ─── API & Server ─────────────────────────────────────────────────────────
  /** Leaderboard page size */
  LEADERBOARD_PAGE_SIZE: 50,
  /** Max questions returned in weak-question analytics */
  ANALYTICS_WEAK_QUESTION_LIMIT: 5,
  /**
   * Target rate limit (requests/minute) — informational comment only.
   * Enforce via middleware (e.g. upstash/ratelimit) in production.
   */
  RATE_LIMIT_RPM: 60,
} as const;

export type Config = typeof config;
