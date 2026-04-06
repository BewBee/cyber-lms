/**
 * components/game/RewardChest.tsx — Post-quiz reward chest opening sequence.
 * Shown between quiz completion and the results screen.
 * Chest tier scales with medal: bronze/silver/gold/boss.
 * Click to open → lid flips → particles burst → rewards reveal one by one.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '@/lib/sounds';

export type ChestTier = 'bronze' | 'silver' | 'gold' | 'boss';
type ChestPhase = 'idle' | 'opening' | 'revealing' | 'done';

interface RewardItem {
  icon: string;
  label: string;
  sublabel: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

export interface RewardChestProps {
  tier: ChestTier;
  exp: number;
  coins: number;
  powerupDrop?: string | null;
  badgesEarned?: string[];
  onComplete: () => void;
}

// ─── Tier visual config ───────────────────────────────────────────────────────

const TIER_CONFIG: Record<ChestTier, {
  label: string;
  lidGradient: string;
  bodyGradient: string;
  borderColor: string;
  bandColor: string;
  glowColor: string;
  accentClass: string;
  particleClasses: string[];
  stripeOpacity: string;
}> = {
  bronze: {
    label: '🟤 Bronze Chest',
    lidGradient: 'linear-gradient(to bottom, #92400e, #78350f)',
    bodyGradient: 'linear-gradient(to bottom, #78350f, #451a03)',
    borderColor: 'rgba(217,119,6,0.55)',
    bandColor: '#b45309',
    glowColor: 'rgba(180,83,9,0.45)',
    accentClass: 'text-orange-400',
    particleClasses: ['bg-orange-400', 'bg-amber-300', 'bg-yellow-500', 'bg-orange-300'],
    stripeOpacity: 'rgba(251,191,36,0.15)',
  },
  silver: {
    label: '⚪ Silver Chest',
    lidGradient: 'linear-gradient(to bottom, #475569, #334155)',
    bodyGradient: 'linear-gradient(to bottom, #334155, #1e293b)',
    borderColor: 'rgba(148,163,184,0.5)',
    bandColor: '#64748b',
    glowColor: 'rgba(148,163,184,0.4)',
    accentClass: 'text-slate-300',
    particleClasses: ['bg-slate-300', 'bg-white', 'bg-slate-200', 'bg-gray-100'],
    stripeOpacity: 'rgba(203,213,225,0.15)',
  },
  gold: {
    label: '🟡 Gold Chest',
    lidGradient: 'linear-gradient(to bottom, #a16207, #854d0e)',
    bodyGradient: 'linear-gradient(to bottom, #854d0e, #431407)',
    borderColor: 'rgba(250,204,21,0.65)',
    bandColor: '#ca8a04',
    glowColor: 'rgba(250,204,21,0.55)',
    accentClass: 'text-yellow-400',
    particleClasses: ['bg-yellow-400', 'bg-amber-300', 'bg-yellow-300', 'bg-amber-400'],
    stripeOpacity: 'rgba(250,204,21,0.2)',
  },
  boss: {
    label: '💀 Boss Chest',
    lidGradient: 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
    bodyGradient: 'linear-gradient(to bottom, #7f1d1d, #450a0a)',
    borderColor: 'rgba(239,68,68,0.55)',
    bandColor: '#b91c1c',
    glowColor: 'rgba(239,68,68,0.5)',
    accentClass: 'text-red-400',
    particleClasses: ['bg-red-400', 'bg-orange-400', 'bg-red-300', 'bg-rose-400'],
    stripeOpacity: 'rgba(239,68,68,0.15)',
  },
};

const POWERUP_DISPLAY: Record<string, { icon: string; name: string }> = {
  fifty_fifty: { icon: '🎯', name: '50/50 Protocol' },
  shield:       { icon: '🛡',  name: 'Firewall Shield' },
  skip:         { icon: '⏭',  name: 'Skip Exploit' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RewardChest({ tier, exp, coins, powerupDrop, badgesEarned = [], onComplete }: RewardChestProps) {
  const [phase, setPhase] = useState<ChestPhase>('idle');
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; colorClass: string; size: number; rotate: number }[]
  >([]);

  const cfg = TIER_CONFIG[tier];

  // Build reward items
  const rewardItems: RewardItem[] = [
    {
      icon: '⚡',
      label: `+${exp} XP`,
      sublabel: 'experience',
      colorClass: 'text-cyan-300',
      borderClass: 'border-cyan-500/30',
      bgClass: 'bg-cyan-500/10',
    },
    {
      icon: '💰',
      label: `+${coins} CR`,
      sublabel: 'credits',
      colorClass: 'text-yellow-300',
      borderClass: 'border-yellow-500/30',
      bgClass: 'bg-yellow-500/10',
    },
    ...(powerupDrop && POWERUP_DISPLAY[powerupDrop]
      ? [{
          icon: POWERUP_DISPLAY[powerupDrop].icon,
          label: POWERUP_DISPLAY[powerupDrop].name,
          sublabel: 'power-up drop!',
          colorClass: 'text-purple-300',
          borderClass: 'border-purple-500/30',
          bgClass: 'bg-purple-500/10',
        }]
      : []),
    ...(badgesEarned.length > 0
      ? [{
          icon: '🏅',
          label: badgesEarned.length === 1 ? 'New Badge!' : `${badgesEarned.length} Badges!`,
          sublabel: 'achievement unlocked',
          colorClass: 'text-amber-300',
          borderClass: 'border-amber-500/30',
          bgClass: 'bg-amber-500/10',
        }]
      : []),
  ];

  const handleOpen = () => {
    if (phase !== 'idle') return;
    setPhase('opening');
    playSound('complete');

    // Spawn burst particles
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: -(Math.random() * 220 + 60),
      colorClass: cfg.particleClasses[i % cfg.particleClasses.length],
      size: Math.random() * 10 + 5,
      rotate: Math.random() * 360,
    }));
    setParticles(newParticles);

    const revealDelay = 350;
    const doneDuration = revealDelay + rewardItems.length * 200 + 700;
    setTimeout(() => setPhase('revealing'), revealDelay);
    setTimeout(() => setPhase('done'), doneDuration);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-6 select-none">

      {/* Tier label */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.3em] mb-1">
          quiz complete — open your reward
        </p>
        <p className={`text-sm font-bold font-mono tracking-widest ${cfg.accentClass}`}>
          {cfg.label}
        </p>
      </motion.div>

      {/* Chest + particles */}
      <div className="relative" style={{ width: 200, height: 160 }}>

        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{ boxShadow: `0 0 40px 10px ${cfg.glowColor}` }}
        />

        {/* Burst particles */}
        <AnimatePresence>
          {phase !== 'idle' && particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: 100, y: 80, scale: 1, rotate: 0 }}
              animate={{ opacity: 0, x: 100 + p.x, y: 80 + p.y, scale: 0.2, rotate: p.rotate }}
              transition={{ duration: 0.65 + Math.random() * 0.3, ease: 'easeOut' }}
              className={`absolute rounded-full pointer-events-none ${p.colorClass}`}
              style={{ width: p.size, height: p.size }}
            />
          ))}
        </AnimatePresence>

        {/* ── Chest SVG-ish div ──────────────────────────────── */}
        <motion.div
          onClick={handleOpen}
          className="absolute inset-0 cursor-pointer"
          animate={
            phase === 'idle'
              ? { x: [0, -5, 5, -3, 3, -1, 1, 0], rotate: [0, -1, 1, -0.5, 0.5, 0] }
              : {}
          }
          transition={
            phase === 'idle'
              ? { repeat: Infinity, repeatDelay: 2.5, duration: 0.45, delay: 1.2 }
              : {}
          }
        >
          {/* Lid */}
          <motion.div
            animate={phase !== 'idle'
              ? { rotateX: -130, y: -24, opacity: 0, scale: 0.95 }
              : { rotateX: 0, y: 0, opacity: 1, scale: 1 }
            }
            transition={{ duration: 0.32, ease: [0.32, 0, 0.67, 0] }}
            style={{
              transformOrigin: 'bottom center',
              transformPerspective: 500,
              background: cfg.lidGradient,
              border: `2px solid ${cfg.borderColor}`,
              borderBottom: 'none',
              borderRadius: '14px 14px 0 0',
              height: 68,
              position: 'absolute',
              top: 0, left: 0, right: 0,
              overflow: 'hidden',
            }}
          >
            {/* Lid top stripe */}
            <div style={{ position: 'absolute', top: 10, left: 16, right: 16, height: 1, background: cfg.stripeOpacity }} />
            {/* Lid band */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: cfg.bandColor }} />
            {/* Clasp */}
            <div style={{
              position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
              width: 28, height: 12, borderRadius: '6px 6px 0 0',
              background: 'rgba(0,0,0,0.3)', border: `1px solid ${cfg.borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.bandColor, border: '1.5px solid rgba(255,255,255,0.2)' }} />
            </div>
          </motion.div>

          {/* Body */}
          <div style={{
            position: 'absolute',
            top: 66,
            left: 0, right: 0,
            height: 94,
            background: cfg.bodyGradient,
            border: `2px solid ${cfg.borderColor}`,
            borderTop: `1.5px solid ${cfg.bandColor}`,
            borderRadius: '0 0 14px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {/* Band at top of body */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: cfg.bandColor }} />
            {/* Keyhole */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, opacity: 0.55, marginTop: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2.5px solid ${cfg.bandColor}` }} />
              <div style={{ width: 10, height: 12, borderRadius: '0 0 4px 4px', border: `2.5px solid ${cfg.bandColor}`, borderTop: 'none', marginTop: -1 }} />
            </div>
            {/* Bottom stripe */}
            <div style={{ position: 'absolute', bottom: 10, left: 16, right: 16, height: 1, background: cfg.stripeOpacity }} />
          </div>

          {/* Click hint */}
          {phase === 'idle' && (
            <motion.p
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -bottom-8 left-0 right-0 text-center text-[10px] font-mono text-gray-600 uppercase tracking-widest"
            >
              tap to open
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Reward cards */}
      <div className="flex flex-wrap justify-center gap-3 min-h-20">
        <AnimatePresence>
          {(phase === 'revealing' || phase === 'done') && rewardItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 40, scale: 0.4, rotate: (Math.random() - 0.5) * 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              transition={{
                delay: i * 0.2,
                type: 'spring',
                stiffness: 280,
                damping: 18,
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-6 py-4 ${item.bgClass} ${item.borderClass}`}
            >
              <span className="text-3xl">{item.icon}</span>
              <span className={`text-base font-black ${item.colorClass}`}>{item.label}</span>
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{item.sublabel}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Continue */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onComplete}
            className="px-10 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            View Results →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
