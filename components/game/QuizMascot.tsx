/**
 * components/game/QuizMascot.tsx — Animated shield mascot for CyberShield LMS.
 * Reacts to quiz events with different expressions. Kid-friendly emotional anchor.
 * To test: render <QuizMascot mood="correct" /> and watch it bounce.
 */

'use client';

import { motion } from 'framer-motion';

export type MascotMood = 'idle' | 'thinking' | 'correct' | 'wrong' | 'celebrating';

const MOODS: Record<MascotMood, {
  faceColor: string;
  glowColor: string;
  leftEye: string;
  rightEye: string;
  mouth: string;
  label: string;
}> = {
  idle: {
    faceColor: '#00d4ff', glowColor: 'rgba(0,212,255,0.3)',
    leftEye: '●', rightEye: '●', mouth: '—', label: '',
  },
  thinking: {
    faceColor: '#818cf8', glowColor: 'rgba(129,140,248,0.3)',
    leftEye: '●', rightEye: '◔', mouth: '…', label: '?',
  },
  correct: {
    faceColor: '#22c55e', glowColor: 'rgba(34,197,94,0.4)',
    leftEye: '▲', rightEye: '▲', mouth: '◡', label: '✓',
  },
  wrong: {
    faceColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.35)',
    leftEye: '╥', rightEye: '╥', mouth: '﹏', label: '!',
  },
  celebrating: {
    faceColor: '#ffd700', glowColor: 'rgba(255,215,0,0.45)',
    leftEye: '★', rightEye: '★', mouth: '◡', label: '★',
  },
};

const ANIMATIONS: Record<MascotMood, import('framer-motion').TargetAndTransition> = {
  idle:        { y: [0, -3, 0], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
  thinking:    { rotate: [-3, 3, -3], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
  correct:     { y: [0, -14, 0, -8, 0], scale: [1, 1.1, 1], transition: { duration: 0.5, ease: 'easeOut' } },
  wrong:       { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4, ease: 'easeOut' } },
  celebrating: { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.15, 1.15, 1.15, 1.15, 1], transition: { duration: 0.7 } },
};

interface QuizMascotProps {
  mood: MascotMood;
  size?: number;
}

export function QuizMascot({ mood, size = 64 }: QuizMascotProps) {
  const m = MOODS[mood];

  return (
    <motion.div
      key={mood}
      animate={ANIMATIONS[mood]}
      style={{ width: size, height: size, flexShrink: 0 }}
      className="relative select-none"
    >
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ boxShadow: [`0 0 10px ${m.glowColor}`, `0 0 22px ${m.glowColor}`, `0 0 10px ${m.glowColor}`] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
      />

      {/* Shield body SVG */}
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        {/* Shield shape */}
        <path
          d="M32 4 L56 14 L56 36 C56 50 44 60 32 62 C20 60 8 50 8 36 L8 14 Z"
          fill="#0d1b2a"
          stroke={m.faceColor}
          strokeWidth="2.5"
        />
        {/* Visor screen */}
        <rect x="14" y="20" width="36" height="26" rx="5" fill="#0a1628" stroke={m.faceColor} strokeWidth="1.5" opacity="0.9" />

        {/* Eyes */}
        <text x="20" y="35" fontSize="9" fill={m.faceColor} textAnchor="middle" fontFamily="monospace">{m.leftEye}</text>
        <text x="44" y="35" fontSize="9" fill={m.faceColor} textAnchor="middle" fontFamily="monospace">{m.rightEye}</text>

        {/* Mouth */}
        <text x="32" y="44" fontSize="8" fill={m.faceColor} textAnchor="middle" fontFamily="monospace">{m.mouth}</text>

        {/* Top emblem */}
        <circle cx="32" cy="11" r="3" fill={m.faceColor} opacity="0.8" />
      </svg>
    </motion.div>
  );
}
