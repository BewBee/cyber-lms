/**
 * components/game/MedalReveal.tsx — Animated medal reveal component for quiz results.
 * Triggers canvas-confetti only on Gold medal, respects prefers-reduced-motion and user pref.
 * To test: render <MedalReveal medal="gold" /> — should show gold card + confetti on mount.
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MEDAL_META } from '@/lib/medalSystem';
import { config } from '@/lib/config';
import type { Medal } from '@/types';

interface MedalRevealProps {
  medal: Medal;
  accuracy?: number;
  className?: string;
}

export function MedalReveal({ medal, accuracy, className = '' }: MedalRevealProps) {
  const confettiFired = useRef(false);
  const meta = MEDAL_META[medal];

  useEffect(() => {
    if (medal === 'gold' && !confettiFired.current) {
      const prefersReduced =
        typeof window !== 'undefined'
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
          : true;

      const userDisabled =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('disable_confetti') === 'true'
          : true;

      if (!prefersReduced && !userDisabled && config.ANIMATION_SETTINGS.confettiEnabled) {
        // Dynamic import: confetti is client-only, ~15 KB
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#ffd700', '#ffec3d', '#ffffff', '#00d4ff'],
          });
          // Second burst with slight delay
          setTimeout(() => {
            confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
            confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
          }, 300);
        });
      }
      confettiFired.current = true;
    }
  }, [medal]);

  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
      className={[
        'flex flex-col items-center gap-4 p-8 rounded-2xl border text-center',
        meta.bgClass,
        meta.borderClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="assertive"
      aria-label={`Medal awarded: ${meta.label}`}
    >
      {/* Medal emoji with pulse on gold */}
      <motion.span
        className="text-6xl"
        animate={medal === 'gold' ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.6, repeat: medal === 'gold' ? 2 : 0, delay: 0.3 }}
        aria-hidden="true"
      >
        {meta.emoji}
      </motion.span>

      {/* Medal title */}
      <div>
        <p className="text-xs font-mono tracking-widest text-gray-500 uppercase mb-1">
          Medal Awarded
        </p>
        <h2 className="text-2xl font-bold tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </h2>
      </div>

      {accuracy !== undefined && (
        <p className="text-sm text-gray-400">
          Accuracy:{' '}
          <span className="font-semibold text-white">{accuracy.toFixed(1)}%</span>
        </p>
      )}
    </motion.div>
  );
}
