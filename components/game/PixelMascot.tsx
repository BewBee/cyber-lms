/**
 * components/game/PixelMascot.tsx — "BYTE" — 8-bit pixel-art mascot for CyberShield LMS.
 *
 * Reactive to quiz state:
 *   idle    → gentle bob, cyan eyes
 *   correct → jump + smile (cyan grin)
 *   wrong   → shake + X eyes
 *   streak  → fast bounce + yellow eyes + glow
 *   victory → celebrate spin + orange star eyes + arms raised
 *
 * Rendered as a crisp SVG pixel grid — no image files, no external libs.
 * pixelSize controls the size of each pixel square (default 4 → 48×72 px total).
 */

'use client';

import { motion, type TargetAndTransition, type Transition } from 'framer-motion';

export type PixelMood = 'idle' | 'correct' | 'wrong' | 'streak' | 'victory';

interface PixelMascotProps {
  mood?: PixelMood;
  /** Size of each pixel square in CSS px. Default 4 → character is 48 × 72 px */
  pixelSize?: number;
  className?: string;
}

// ── Colour palette ─────────────────────────────────────────────────────────────
// null = transparent pixel (skipped in SVG output)
const PALETTE: Record<string, string | null> = {
  _: null,
  G: '#00ff88', // bright green — body outline
  g: '#007744', // dark green — shadow / depth
  C: '#00ccff', // cyan — normal eyes
  Y: '#ffcc00', // yellow — streak eyes + grin
  X: '#ff4455', // red — wrong / X eyes
  O: '#ff8800', // orange — victory star eyes
  B: '#0a1825', // very dark blue — body fill
  W: '#ccffe8', // near-white — face highlight
};

// ── 12 × 18 character frames ───────────────────────────────────────────────────
// Each string is exactly 12 characters (one char = one pixel).
const FRAMES: Record<PixelMood, string[]> = {
  // ── IDLE: cyan eyes, neutral face ────────────────────────────────────────────
  idle: [
    '____GGGG____', // 0  head top
    '___GggggG___', // 1  head
    '__GgWBBWgG__', // 2  face highlight
    '__GgBCCBgG__', // 3  eyes (cyan)
    '__GgBCCBgG__', // 4  eyes
    '__GgWBBWgG__', // 5  face highlight
    '___GggggG___', // 6  chin
    '____GGGG____', // 7  neck
    '_GGGggggGGG_', // 8  shoulders
    '_GgBBBBBBgG_', // 9  body
    '_GgBBBBBBgG_', // 10 body
    '_GgBBBBBBgG_', // 11 body
    '_GgGGGGGGgG_', // 12 belt
    '___Gg__gG___', // 13 hips
    '___Gg__gG___', // 14 upper legs
    '___Gg__gG___', // 15 lower legs
    '__GGg__gGG__', // 16 feet
    '__GGg__gGG__', // 17 feet
  ],

  // ── CORRECT: smile mouth, same eyes ───────────────────────────────────────────
  correct: [
    '____GGGG____',
    '___GggggG___',
    '__GgWBBWgG__',
    '__GgBCCBgG__', // eyes same
    '__GgBCCBgG__',
    '__GgWCCWgG__', // cyan grin instead of highlight
    '___GggggG___',
    '____GGGG____',
    '_GGGggggGGG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgGGGGGGgG_',
    '___Gg__gG___',
    '___Gg__gG___',
    '___Gg__gG___',
    '__GGg__gGG__',
    '__GGg__gGG__',
  ],

  // ── WRONG: X eyes (cross pattern) ────────────────────────────────────────────
  wrong: [
    '____GGGG____',
    '___GggggG___',
    '__GgWBBWgG__',
    '__GgXBBXgG__', // X outer pixels
    '__GgBXXBgG__', // X inner pixels → diagonal cross
    '__GgWBBWgG__',
    '___GggggG___',
    '____GGGG____',
    '_GGGggggGGG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgGGGGGGgG_',
    '___Gg__gG___',
    '___Gg__gG___',
    '___Gg__gG___',
    '__GGg__gGG__',
    '__GGg__gGG__',
  ],

  // ── STREAK: yellow eyes + golden grin ────────────────────────────────────────
  streak: [
    '____GGGG____',
    '___GggggG___',
    '__GgWBBWgG__',
    '__GgBYYBgG__', // yellow eyes
    '__GgBYYBgG__',
    '__GgWYYWgG__', // golden grin
    '___GggggG___',
    '____GGGG____',
    '_GGGggggGGG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgGGGGGGgG_',
    '___Gg__gG___',
    '___Gg__gG___',
    '___Gg__gG___',
    '__GGg__gGG__',
    '__GGg__gGG__',
  ],

  // ── VICTORY: orange eyes, arms raised ────────────────────────────────────────
  victory: [
    '____GGGG____',
    '___GggggG___',
    '__GgWBBWgG__',
    '__GgBOOBgG__', // orange star eyes
    '__GgBOOBgG__',
    '__GgWOOWgG__', // big orange smile
    '___GggggG___',
    '____GGGG____',
    '_GGGggggGGG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgBBBBBBgG_',
    '_GgGGGGGGgG_',
    'Ggg_Gg__GggG', // arms fully extended outward
    'GGg__g__gGGG', // arms raised high
    '___Gg__gG___',
    '__GGg__gGG__',
    '__GGg__gGG__',
  ],
};

// ── Per-mood Framer Motion animations ─────────────────────────────────────────
const ANIMATIONS: Record<PixelMood, { animate: TargetAndTransition; transition: Transition }> = {
  idle: {
    animate: { y: [0, -3, 0] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  correct: {
    animate: { y: [0, -14, -2, -8, 0], scale: [1, 1.18, 0.95, 1.05, 1] },
    transition: { duration: 0.55, ease: 'easeOut' },
  },
  wrong: {
    animate: { x: [0, -7, 7, -7, 5, -3, 0], y: [0, 2, 0] },
    transition: { duration: 0.45 },
  },
  streak: {
    animate: { y: [0, -5, 0], scale: [1, 1.06, 1] },
    transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
  },
  victory: {
    animate: {
      y: [0, -20, -10, -18, 0],
      scale: [1, 1.28, 1.12, 1.22, 1],
      rotate: [0, -12, 12, -6, 0],
    },
    transition: { duration: 0.9, ease: 'backOut' },
  },
};

// ── Glow colours per mood ─────────────────────────────────────────────────────
const GLOW: Partial<Record<PixelMood, string>> = {
  streak:  '#ffcc00',
  victory: '#ff8800',
  correct: '#00ff88',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PixelMascot({ mood = 'idle', pixelSize = 4, className }: PixelMascotProps) {
  const frame = FRAMES[mood];
  const cols  = frame[0].length;  // 12
  const rows  = frame.length;     // 18
  const svgW  = cols * pixelSize;
  const svgH  = rows * pixelSize;

  const { animate, transition } = ANIMATIONS[mood];
  const glowColor = GLOW[mood];

  return (
    <motion.div
      key={mood}                           // remount on mood change → resets animation
      className={`inline-block relative ${className ?? ''}`}
      animate={animate}
      transition={transition}
    >
      {/* Glow halo for reactive moods */}
      {glowColor && (
        <motion.div
          className="absolute inset-0 rounded pointer-events-none"
          animate={{ boxShadow: [`0 0 0px ${glowColor}00`, `0 0 14px ${glowColor}99`, `0 0 0px ${glowColor}00`] }}
          transition={{ duration: mood === 'victory' ? 0.5 : 0.7, repeat: Infinity }}
        />
      )}

      {/* Pixel art SVG */}
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ imageRendering: 'pixelated', display: 'block' }}
        aria-label={`BYTE mascot — ${mood}`}
      >
        {frame.map((row, rowIdx) =>
          row.split('').map((char, colIdx) => {
            const color = PALETTE[char];
            if (!color) return null;
            return (
              <rect
                key={`${rowIdx}-${colIdx}`}
                x={colIdx * pixelSize}
                y={rowIdx * pixelSize}
                width={pixelSize}
                height={pixelSize}
                fill={color}
              />
            );
          })
        )}
      </svg>
    </motion.div>
  );
}
