/**
 * components/game/LevelUpBurst.tsx — Full-screen level-up celebration overlay.
 *
 * Fires automatically when a student's level increases after quiz completion.
 * Sequence:
 *   0.0s  Radial flash burst + pixel sparks fly outward
 *   0.1s  "// LEVEL UP //" text materialises
 *   0.25s Giant level number spins in from 3D rotation
 *   0.7s  New rank name fades up
 *   1.5s  "[ TAP TO CONTINUE ]" hint appears
 *   3.5s  Auto-dismisses (or tap/click to dismiss early)
 *
 * Props:
 *   show       — controls visibility (use AnimatePresence externally or rely on internal state)
 *   newLevel   — the level number to display prominently
 *   newRank    — rank name (e.g. "Cyber Defender")
 *   onComplete — callback when animation finishes / user taps
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpBurstProps {
  show: boolean;
  newLevel: number;
  newRank: string;
  onComplete: () => void;
}

// ── Pixel spark particles ──────────────────────────────────────────────────────
// 36 sparks radiated outward at varying angles, distances, and sizes.
const SPARKS = Array.from({ length: 36 }, (_, i) => {
  const angle  = (i / 36) * Math.PI * 2;
  const dist   = 80 + (i % 4) * 35;           // 80 / 115 / 150 / 185 px radius
  const size   = i % 5 === 0 ? 8 : i % 3 === 0 ? 5 : 3;
  const colors = ['#00ff88', '#00ccff', '#ffcc00', '#00ff88', '#ffffff'];
  return {
    x:     Math.cos(angle) * dist,
    y:     Math.sin(angle) * dist,
    size,
    color: colors[i % colors.length],
    delay: 0.12 + (i % 9) * 0.025,            // staggered launch
  };
});

// ── Component ─────────────────────────────────────────────────────────────────

export function LevelUpBurst({ show, newLevel, newRank, onComplete }: LevelUpBurstProps) {
  // Auto-dismiss after 3.5 s
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onComplete, 3500);
    return () => clearTimeout(t);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onComplete}
          aria-label="Level up! Tap to continue"
        >
          {/* ── Dark scanline backdrop ─────────────────────────────────────── */}
          <div
            className="absolute inset-0 bg-black/88"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,136,0.03) 3px,rgba(0,255,136,0.03) 4px)',
            }}
          />

          {/* ── Radial green flash ────────────────────────────────────────── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at center, rgba(0,255,136,0.35) 0%, transparent 65%)',
            }}
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />

          {/* ── Expanding pulse rings ─────────────────────────────────────── */}
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 160, height: 160,
                marginLeft: -80, marginTop: -80,
                left: '50%', top: '50%',
                border: `${2 - i * 0.5}px solid rgba(0,255,136,${0.5 - i * 0.12})`,
              }}
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 4 + i, opacity: 0 }}
              transition={{ duration: 1.2 + i * 0.2, delay, ease: 'easeOut' }}
            />
          ))}

          {/* ── Pixel spark particles ─────────────────────────────────────── */}
          {SPARKS.map((spark, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{
                width:           spark.size,
                height:          spark.size,
                backgroundColor: spark.color,
                left:            '50%',
                top:             '50%',
                marginLeft:      -spark.size / 2,
                marginTop:       -spark.size / 2,
                imageRendering:  'pixelated',
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: spark.x, y: spark.y, opacity: 0, scale: 0 }}
              transition={{ duration: 0.85, delay: spark.delay, ease: 'easeOut' }}
            />
          ))}

          {/* ── Main content ──────────────────────────────────────────────── */}
          <div className="relative z-10 text-center select-none px-8">

            {/* // LEVEL UP // label */}
            <motion.p
              className="font-mono text-xs tracking-[0.5em] mb-5"
              style={{ color: '#00ff8899' }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              // LEVEL UP //
            </motion.p>

            {/* Giant level number */}
            <motion.div
              className="font-black tabular-nums leading-none"
              style={{
                fontSize:   'clamp(6rem, 22vw, 10rem)',
                color:      '#00ff88',
                textShadow: '0 0 30px #00ff8877, 0 0 80px #00ff8833',
              }}
              initial={{ scale: 0.1, opacity: 0, rotateX: 90 }}
              animate={{ scale: 1,   opacity: 1, rotateX: 0 }}
              transition={{
                delay:     0.22,
                duration:  0.55,
                type:      'spring',
                stiffness: 240,
                damping:   15,
              }}
            >
              {newLevel}
            </motion.div>

            {/* Rank name */}
            <motion.p
              className="font-mono text-lg tracking-widest uppercase mt-4"
              style={{ color: '#00ccff', textShadow: '0 0 12px #00ccff66' }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.4 }}
            >
              {newRank}
            </motion.p>

            {/* Dismiss hint */}
            <motion.p
              className="font-mono text-xs tracking-widest mt-10"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.4 }}
            >
              [ TAP TO CONTINUE ]
            </motion.p>
          </div>

          {/* ── Corner pixel decorations ──────────────────────────────────── */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <motion.div
              key={corner}
              className="absolute pointer-events-none"
              style={{
                top:    corner.startsWith('t') ? 24 : undefined,
                bottom: corner.startsWith('b') ? 24 : undefined,
                left:   corner.endsWith('l')   ? 24 : undefined,
                right:  corner.endsWith('r')   ? 24 : undefined,
                width:  12, height: 12,
                border: '2px solid #00ff8866',
                borderRight:  corner.endsWith('r')  ? '2px solid #00ff8866' : 'none',
                borderBottom: corner.startsWith('b') ? '2px solid #00ff8866' : 'none',
                borderTop:    corner.startsWith('t') ? '2px solid #00ff8866' : 'none',
                borderLeft:   corner.endsWith('l')   ? '2px solid #00ff8866' : 'none',
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
