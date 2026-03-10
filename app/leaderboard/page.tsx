/**
 * app/leaderboard/page.tsx — Global leaderboard for CyberShield LMS.
 * Fetches ranked students from GET /api/leaderboard and renders an animated table.
 * To test: navigate to /leaderboard (no auth required). Seed data must be present for rows to show.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateRank } from '@/lib/expSystem';
import type { LeaderboardEntry } from '@/types';

const MEDAL_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard?limit=50')
      .then((r) => r.json())
      .then(({ leaderboard }) => setEntries(leaderboard ?? []))
      .catch((e) => setErrorMsg(String(e.message)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {/* Page header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-neon-cyan">Global</span> Leaderboard
          </h1>
          <p className="text-sm text-gray-500">Top students ranked by total EXP earned</p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {errorMsg && (
          <p className="text-center text-red-400">{errorMsg}</p>
        )}

        {!loading && entries.length === 0 && !errorMsg && (
          <div className="text-center py-20">
            <p className="text-3xl mb-3" aria-hidden="true">🏁</p>
            <p className="text-gray-500">No data yet. Complete quizzes to appear here!</p>
          </div>
        )}

        {entries.length > 0 && (
          <div
            className="rounded-2xl border border-white/8 overflow-hidden"
            role="table"
            aria-label="Global leaderboard"
          >
            {/* Table header */}
            <div
              role="row"
              className="grid grid-cols-[40px_1fr_80px_80px] sm:grid-cols-[48px_1fr_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-white/5 bg-gray-800/60"
            >
              {['#', 'Player', 'Level', 'EXP', 'Accuracy'].map((h, i) => (
                <span
                  key={h}
                  role="columnheader"
                  className={`text-xs font-semibold text-gray-500 uppercase tracking-wide ${i === 0 ? 'text-center' : ''} ${i === 4 ? 'hidden sm:block' : ''}`}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {entries.map((entry, i) => {
              const pos = Number(entry.rank_position ?? i + 1);
              const rankName = calculateRank(entry.level);
              const isTop3 = pos <= 3;

              return (
                <motion.div
                  key={entry.id}
                  role="row"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={[
                    'grid grid-cols-[40px_1fr_80px_80px] sm:grid-cols-[48px_1fr_100px_100px_80px] gap-2',
                    'px-4 py-3.5 border-b border-white/3 items-center',
                    'transition-colors hover:bg-white/3',
                    isTop3 ? 'bg-cyan-500/3' : '',
                  ].join(' ')}
                >
                  {/* Rank */}
                  <span role="cell" className="text-center font-bold text-sm">
                    {MEDAL_ICONS[pos] ?? (
                      <span className="text-gray-600">{pos}</span>
                    )}
                  </span>

                  {/* Name + rank */}
                  <div role="cell">
                    <p className="text-sm font-semibold text-white truncate">{entry.name}</p>
                    <p className="text-xs font-mono text-gray-600">{rankName}</p>
                  </div>

                  {/* Level */}
                  <span role="cell" className="text-sm text-cyan-400 font-semibold">
                    Lv. {entry.level}
                  </span>

                  {/* EXP */}
                  <span role="cell" className="text-sm text-gray-300 font-mono">
                    {entry.total_exp.toLocaleString()}
                  </span>

                  {/* Accuracy (hidden on mobile) */}
                  <span role="cell" className="hidden sm:block text-sm text-gray-500">
                    {Number(entry.avg_accuracy).toFixed(1)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
