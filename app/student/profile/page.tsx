/**
 * app/student/profile/page.tsx — Student profile page for CyberShield LMS.
 * Shows full stats, all earned badges, session history, and rank progress.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { ExpBar } from '@/components/game/ExpBar';
import { BadgeDisplay } from '@/components/ui/BadgeDisplay';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateRank } from '@/lib/expSystem';
import type { User, Badge, GameSession } from '@/types';

const MEDAL_EMOJI: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '✅' };

interface ProfileData {
  user: User;
  badges: Badge[];
  sessions: (GameSession & { module_name?: string })[];
  stats: {
    totalSessions: number;
    goldCount: number;
    silverCount: number;
    bronzeCount: number;
    avgAccuracy: number;
    totalExp: number;
  };
}

export default function StudentProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const userId = authSession?.user.id;
        if (!userId) { window.location.href = '/login'; return; }

        // Fetch user
        const { data: userData, error: uErr } = await supabase
          .from('users').select('*').eq('id', userId).single();
        if (uErr || !userData) { window.location.href = '/login'; return; }

        // Fetch badges
        const { data: studentBadges } = await supabase
          .from('student_badges')
          .select('badges ( badge_id, badge_key, badge_display_name, badge_icon )')
          .eq('student_id', userId);

        const badges = (studentBadges ?? [])
          .map((sb: Record<string, unknown>) => sb.badges)
          .filter(Boolean) as Badge[];

        // Fetch all completed sessions with module names
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('session_id, module_id, total_score, accuracy, medal_awarded, exp_awarded, finished_at, average_response_time, modules ( module_name )')
          .eq('student_id', userId)
          .not('finished_at', 'is', null)
          .order('finished_at', { ascending: false })
          .limit(50);

        const resolvedSessions = (sessions ?? []).map((s: Record<string, unknown>) => ({
          ...(s as unknown as GameSession),
          module_name: (s.modules as { module_name: string } | null)?.module_name ?? 'Unknown',
        }));

        const totalSessions = resolvedSessions.length;
        const goldCount = resolvedSessions.filter((s) => s.medal_awarded === 'gold').length;
        const silverCount = resolvedSessions.filter((s) => s.medal_awarded === 'silver').length;
        const bronzeCount = resolvedSessions.filter((s) => s.medal_awarded === 'bronze').length;
        const avgAccuracy = totalSessions > 0
          ? resolvedSessions.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) / totalSessions
          : 0;

        setData({
          user: userData as User,
          badges,
          sessions: resolvedSessions,
          stats: {
            totalSessions,
            goldCount,
            silverCount,
            bronzeCount,
            avgAccuracy,
            totalExp: userData.total_exp,
          },
        });
      } catch (e) {
        setErrorMsg(String((e as Error).message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" />
      <main className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" label="Loading profile…" />
      </main>
    </div>
  );

  if (errorMsg || !data) return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" />
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-red-400">{errorMsg ?? 'Could not load profile.'}</p>
      </main>
    </div>
  );

  const { user, badges, sessions, stats } = data;
  const rankName = calculateRank(user.level);

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" userName={user.name} />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 space-y-8">
        {/* Back */}
        <Link href="/student/dashboard" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">
          ← Dashboard
        </Link>

        {/* Profile hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-500/20 bg-gray-900/80 p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-2xl font-bold text-cyan-400">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{user.name}</h1>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest mt-1">{rankName}</p>
            </div>
            <div className="sm:w-56">
              <ExpBar totalExp={user.total_exp} level={user.level} rankName={rankName} />
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Level', value: user.level, icon: '⚡' },
            { label: 'Sessions', value: stats.totalSessions, icon: '🎮' },
            { label: 'Gold', value: stats.goldCount, icon: '🥇' },
            { label: 'Silver', value: stats.silverCount, icon: '🥈' },
            { label: 'Bronze', value: stats.bronzeCount, icon: '🥉' },
            { label: 'Avg Acc.', value: `${stats.avgAccuracy.toFixed(1)}%`, icon: '🎯' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-gray-900/40 p-3 text-center">
              <p className="text-lg mb-1" aria-hidden="true">{icon}</p>
              <p className="text-sm font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <section aria-labelledby="profile-badges-heading">
          <h2 id="profile-badges-heading" className="text-sm font-semibold text-white mb-3">
            Badges Earned ({badges.length})
          </h2>
          {badges.length === 0 ? (
            <p className="text-sm text-gray-600">No badges yet — complete quizzes to earn them!</p>
          ) : (
            <BadgeDisplay badges={badges} maxVisible={20} />
          )}
        </section>

        {/* Session history */}
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-sm font-semibold text-white mb-3">
            Session History <span className="text-gray-600 font-normal">({sessions.length})</span>
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-600">No sessions yet — start a quiz to see your history here.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => {
                const acc = s.accuracy ?? 0;
                const medal = s.medal_awarded ?? 'none';
                const MEDAL_COLOR: Record<string, string> = {
                  gold: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
                  silver: 'text-gray-300 border-gray-500/30 bg-gray-500/5',
                  bronze: 'text-orange-400 border-orange-500/30 bg-orange-500/5',
                  none: 'text-gray-500 border-white/5 bg-gray-900/40',
                };
                const ACC_BAR_COLOR = acc >= 90 ? 'bg-amber-400' : acc >= 75 ? 'bg-cyan-400' : acc >= 60 ? 'bg-orange-400' : 'bg-red-400';
                return (
                  <motion.div
                    key={s.session_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-xl border px-4 py-3 ${MEDAL_COLOR[medal]}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Medal */}
                      <span className="text-xl flex-shrink-0 mt-0.5">{MEDAL_EMOJI[medal]}</span>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.module_name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {/* Accuracy bar */}
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-[120px]">
                            <div className={`h-full rounded-full ${ACC_BAR_COLOR}`} style={{ width: `${acc}%` }} />
                          </div>
                          <span className="text-xs font-mono text-gray-400">{acc.toFixed(0)}%</span>
                          <span className="text-gray-700">·</span>
                          <span className="text-xs text-gray-600">
                            {s.finished_at ? new Date(s.finished_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs font-bold text-green-400">+{s.exp_awarded} XP</span>
                        <Link
                          href={`/quiz/review/${s.session_id}`}
                          className="text-[11px] font-medium text-cyan-500 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/40 rounded px-2 py-0.5 transition-colors"
                        >
                          Review
                        </Link>
                        <Link
                          href={`/quiz/session/${s.module_id}`}
                          className="text-[11px] font-medium text-gray-500 hover:text-gray-300 border border-white/8 hover:border-white/20 rounded px-2 py-0.5 transition-colors"
                        >
                          Replay
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
