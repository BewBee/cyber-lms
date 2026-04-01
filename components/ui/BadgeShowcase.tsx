/**
 * components/ui/BadgeShowcase.tsx — Shows all possible badges with earned/locked states.
 * Earned badges glow and show in full colour.
 * Locked badges are silhouetted with a lock icon and a hint on how to earn them.
 * To test: render <BadgeShowcase earnedBadgeKeys={['first_mission']} />
 */

'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { Badge } from '@/types';

const ALL_BADGES = [
  {
    key: 'first_mission',
    name: 'First Mission',
    icon: '/assets/badge-first-mission.svg',
    hint: 'Complete your first quiz session',
  },
  {
    key: 'perfect_strike',
    name: 'Perfect Strike',
    icon: '/assets/badge-perfect-strike.svg',
    hint: 'Earn a Gold medal on any quiz',
  },
  {
    key: 'hot_streak',
    name: 'Hot Streak',
    icon: '/assets/badge-hot-streak.svg',
    hint: 'Get a streak of 5+ correct answers',
  },
  {
    key: 'veteran_operator',
    name: 'Veteran Operator',
    icon: '/assets/badge-veteran-operator.svg',
    hint: 'Complete 10 or more quiz sessions',
  },
  {
    key: 'flawless',
    name: 'Flawless',
    icon: '/assets/badge-flawless.svg',
    hint: 'Finish a quiz with 100% accuracy',
  },
];

interface BadgeShowcaseProps {
  /** The student's earned badges from the DB */
  earnedBadges: Badge[];
}

export function BadgeShowcase({ earnedBadges }: BadgeShowcaseProps) {
  const earnedKeys = new Set(earnedBadges.map((b) => b.badge_key));

  return (
    <div className="flex flex-wrap gap-3" role="list" aria-label="All badges">
      {ALL_BADGES.map((badge, i) => {
        const earned = earnedKeys.has(badge.key);

        return (
          <motion.div
            key={badge.key}
            role="listitem"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            title={earned ? badge.name : `🔒 ${badge.hint}`}
            className={[
              'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all w-[4.5rem]',
              earned
                ? 'border-cyan-500/25 bg-gray-900/60 hover:border-cyan-400/50 hover:bg-gray-900/80 cursor-default'
                : 'border-white/5 bg-gray-900/30 cursor-default',
            ].join(' ')}
          >
            {/* Badge icon */}
            <div className="relative">
              <Image
                src={badge.icon}
                alt={badge.name}
                width={40}
                height={40}
                className={[
                  'transition-all',
                  earned
                    ? 'drop-shadow-[0_0_6px_rgba(0,212,255,0.35)]'
                    : 'opacity-15 grayscale',
                ].join(' ')}
              />
              {/* Lock overlay on unearned badges */}
              {!earned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm" aria-hidden="true">🔒</span>
                </div>
              )}
              {/* Earned glow ring */}
              {earned && (
                <motion.div
                  className="absolute -inset-1 rounded-full border border-cyan-500/30"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              )}
            </div>

            {/* Badge name */}
            <span
              className={[
                'text-center text-[10px] leading-tight font-medium line-clamp-2',
                earned ? 'text-gray-300' : 'text-gray-600',
              ].join(' ')}
            >
              {earned ? badge.name : '???'}
            </span>

            {/* Hint for locked badges */}
            {!earned && (
              <span className="text-[9px] text-gray-700 text-center leading-tight line-clamp-2">
                {badge.hint}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
