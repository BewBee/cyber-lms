/**
 * components/game/StreakCounter.tsx — Animated streak counter for quiz sessions.
 * Displays a fire badge when the student has 2+ consecutive correct answers.
 * Uses Framer Motion AnimatePresence for mount/unmount transitions.
 * To test: render <StreakCounter streak={3} /> — should show "🔥 3x STREAK".
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface StreakCounterProps {
  streak: number;
  className?: string;
}

export function StreakCounter({ streak, className = '' }: StreakCounterProps) {
  const isActive = streak >= 2;

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={streak}
          initial={{ scale: 0.6, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          aria-live="polite"
          aria-label={`${streak} answer streak`}
          className={[
            'inline-flex items-center gap-2',
            'rounded-full px-4 py-1.5',
            'bg-orange-500/15 border border-orange-500/50',
            'shadow-[0_0_12px_rgba(249,115,22,0.3)]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <motion.span
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.4, delay: 0.1 }}
            aria-hidden="true"
          >
            🔥
          </motion.span>
          <span className="font-bold text-sm text-orange-300 font-mono tracking-wide">
            {streak}x STREAK
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
