/**
 * components/game/BossIntro.tsx — Dramatic full-screen boss battle intro overlay.
 * Shown before the quiz starts when a module is flagged as a boss mission.
 * Phases: warning flash → typewriter boss name → engage button.
 * Auto-advances to 'ready' phase; student clicks ENGAGE to dismiss.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BossIntroProps {
  bossName: string;
  onStart: () => void;
}

export function BossIntro({ bossName, onStart }: BossIntroProps) {
  type IntroPhase = 'warning' | 'name' | 'ready';
  const [introPhase, setIntroPhase] = useState<IntroPhase>('warning');
  const [displayName, setDisplayName] = useState('');
  const [glitch, setGlitch] = useState(false);

  const fullLabel = `BOSS: ${bossName.toUpperCase()}`;

  // Phase 1 → 2: warning → name
  useEffect(() => {
    const t = setTimeout(() => setIntroPhase('name'), 1300);
    return () => clearTimeout(t);
  }, []);

  // Typewriter for boss name
  useEffect(() => {
    if (introPhase !== 'name') return;
    let i = 0;
    setDisplayName('');
    const interval = setInterval(() => {
      i++;
      setDisplayName(fullLabel.slice(0, i));
      if (i >= fullLabel.length) {
        clearInterval(interval);
        setTimeout(() => setIntroPhase('ready'), 500);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [introPhase, fullLabel]);

  // Glitch flicker loop
  useEffect(() => {
    const flicker = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 80 + Math.random() * 60);
    };
    const id = setInterval(flicker, 1800 + Math.random() * 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
      onClick={introPhase === 'ready' ? onStart : undefined}
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,0,0,0.025) 3px, rgba(255,0,0,0.025) 4px)',
        }}
      />

      {/* Pulsing red border */}
      <motion.div
        className="absolute inset-0 border-2 border-red-600/40 pointer-events-none"
        animate={{ opacity: [0.2, 0.8, 0.2] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      />

      {/* Corner brackets */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-8 h-8 pointer-events-none`}>
          <svg viewBox="0 0 32 32" className="w-full h-full text-red-700/60">
            {i === 0 && <><line x1="0" y1="0" x2="14" y2="0" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="1.5"/></>}
            {i === 1 && <><line x1="32" y1="0" x2="18" y2="0" stroke="currentColor" strokeWidth="1.5"/><line x1="32" y1="0" x2="32" y2="14" stroke="currentColor" strokeWidth="1.5"/></>}
            {i === 2 && <><line x1="0" y1="32" x2="14" y2="32" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="32" x2="0" y2="18" stroke="currentColor" strokeWidth="1.5"/></>}
            {i === 3 && <><line x1="32" y1="32" x2="18" y2="32" stroke="currentColor" strokeWidth="1.5"/><line x1="32" y1="32" x2="32" y2="18" stroke="currentColor" strokeWidth="1.5"/></>}
          </svg>
        </div>
      ))}

      {/* Glitch overlay */}
      <AnimatePresence>
        {glitch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.06 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-500 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 text-center space-y-10 px-6 max-w-2xl w-full">

        {/* Warning banner */}
        <AnimatePresence>
          {introPhase === 'warning' && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                className="inline-block bg-red-600/20 border border-red-600/50 rounded-lg px-6 py-3"
              >
                <p className="text-red-400 font-mono font-black text-lg tracking-[0.35em] uppercase">
                  ⚠ THREAT DETECTED ⚠
                </p>
              </motion.div>
              <p className="text-xs font-mono text-red-800 tracking-[0.2em]">
                CRITICAL ADVERSARY APPROACHING
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boss name + engage */}
        <AnimatePresence>
          {(introPhase === 'name' || introPhase === 'ready') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-red-800 uppercase tracking-[0.4em]">
                  CRITICAL THREAT IDENTIFIED
                </p>
                <motion.h1
                  className={`text-4xl sm:text-5xl font-black font-mono tracking-tight text-red-400 ${
                    glitch ? 'translate-x-0.5' : ''
                  }`}
                  style={{ textShadow: '0 0 40px rgba(239,68,68,0.5), 0 0 80px rgba(239,68,68,0.2)' }}
                >
                  {displayName}
                  <span className="animate-pulse opacity-70">_</span>
                </motion.h1>
              </div>

              {/* Stats row */}
              {introPhase === 'ready' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-center gap-6"
                >
                  {[
                    { label: 'THREAT LEVEL', value: '██████ MAX' },
                    { label: 'LIVES', value: '❤️❤️❤️' },
                    { label: 'HP', value: '100%' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-[9px] font-mono text-red-900 tracking-widest mb-0.5">{label}</p>
                      <p className="text-xs font-mono text-red-500">{value}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Engage button */}
              {introPhase === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="pt-2"
                >
                  <button
                    onClick={onStart}
                    className="relative group px-12 py-4 bg-red-700 hover:bg-red-600 border border-red-500/60 text-white font-black text-sm tracking-[0.25em] uppercase rounded-xl transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}
                  >
                    <span className="relative z-10">⚡ ENGAGE</span>
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-red-500/20"
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                    />
                  </button>
                  <p className="text-[10px] font-mono text-gray-800 mt-3">
                    click anywhere · press enter
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom lore text */}
      {introPhase === 'ready' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-8 left-0 right-0 text-center text-[10px] font-mono text-red-900/70 tracking-[0.15em] uppercase"
        >
          Defeat the boss to earn chapter completion
        </motion.p>
      )}
    </motion.div>
  );
}
