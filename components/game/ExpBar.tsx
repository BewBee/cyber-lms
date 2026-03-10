/**
 * components/game/ExpBar.tsx — Animated EXP progress bar for CyberShield LMS.
 * Uses Framer Motion spring animation from lib/config.ts ANIMATION_SETTINGS.
 * Shows current level, EXP progress, and rank name.
 * To test: render <ExpBar totalExp={450} level={2} rankName="Packet Rat" /> and watch bar fill.
 */

'use client';

import { motion } from 'framer-motion';
import { config } from '@/lib/config';
import { expToNextLevel } from '@/lib/expSystem';

interface ExpBarProps {
  totalExp: number;
  level: number;
  rankName?: string;
  /** If provided, show the EXP gained this session as a delta */
  expGainedThisSession?: number;
  className?: string;
}

export function ExpBar({ totalExp, level, rankName, expGainedThisSession, className = '' }: ExpBarProps) {
  const { current, needed } = expToNextLevel(totalExp);
  const percentage = Math.min((current / needed) * 100, 100);

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')} aria-label={`Level ${level}, ${current} of ${needed} XP`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/50 text-xs font-bold text-cyan-400">
            {level}
          </span>
          {rankName && (
            <span className="text-xs font-mono text-cyan-600 uppercase tracking-widest">
              {rankName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {expGainedThisSession !== undefined && expGainedThisSession > 0 && (
            <span className="text-xs text-green-400 font-semibold animate-pulse">
              +{expGainedThisSession} XP
            </span>
          )}
          <span className="text-xs text-gray-500 font-mono">
            {current}/{needed}
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div
        className="h-2.5 rounded-full bg-gray-800 border border-gray-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={needed}
        aria-valuetext={`${Math.round(percentage)}% to next level`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 relative"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={config.ANIMATION_SETTINGS.expBarSpring}
        >
          {/* Glow effect on the bar tip */}
          <span className="absolute right-0 top-0 h-full w-3 bg-white/30 rounded-full blur-sm" />
        </motion.div>
      </div>
    </div>
  );
}
