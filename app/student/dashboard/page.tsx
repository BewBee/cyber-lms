/**
 * app/student/dashboard/page.tsx — Student home dashboard for CyberShield LMS.
 * Loads user profile, available modules, recent sessions, and earned badges from Supabase.
 * Reads dev session from sessionStorage if Supabase auth is not configured.
 * To test: log in as Alice (dev quick login) and verify modules and EXP bar display.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { Card } from '@/components/ui/Card';
import { BadgeShowcase } from '@/components/ui/BadgeShowcase';
import { ExpBar } from '@/components/game/ExpBar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateRank } from '@/lib/expSystem';
import { CampaignMap } from '@/components/campaign/CampaignMap';
import { QuizMascot } from '@/components/game/QuizMascot';
import type { User, Module, Badge } from '@/types';

function getMascotGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Morning, ${name}. Your next mission awaits.`;
  if (h < 17) return `Welcome back, ${name}. Ready to breach?`;
  if (h < 21) return `Evening, ${name}. Time to level up.`;
  return `Still up, ${name}? Operatives never sleep.`;
}

interface EnrolledClass {
  enrollment_id: string;
  class_id: string;
  class_name: string;
  teacher_name: string;
  status: string;
}

interface StudentModule extends Module {
  class_id: string | null;
  class_name: string | null;
}

interface ModuleStats {
  module_id: string;
  module_name: string;
  totalXp: number;
  bestAccuracy: number;
  attempts: number;
  bestMedal: string;
  lastSessionId: string;
  lastPlayed: string;
}

interface DashboardData {
  user: User;
  modules: StudentModule[];
  badges: Badge[];
  moduleStats: ModuleStats[];
  totalSessions: number;
  lastSession: { module_id: string; accuracy: number } | null;
}



function TerminalStandby() {
  const lines = [
    '> SCANNING FOR MISSIONS...',
    '> NO ACTIVE ASSIGNMENTS FOUND',
    '> CONTACT YOUR INSTRUCTOR TO BEGIN',
  ];
  return (
    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-5 py-4 font-mono text-xs space-y-1.5">
      {lines.map((line, i) => (
        <motion.p
          key={line}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.35, duration: 0.3 }}
          className="text-green-500/70"
        >
          {line}
        </motion.p>
      ))}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="inline-block w-2 h-3 bg-green-500/60 align-middle"
      />
    </div>
  );
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Get authenticated user from cookie-based session (set by browserSupabase)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user.id ?? null;

        if (!userId) {
          window.location.href = '/login';
          return;
        }

        // Fetch user profile from public.users
        const { data: userData, error: uErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (uErr || !userData) {
          window.location.href = '/login';
          return;
        }

        const user: User = userData;

        // Fetch modules filtered by class enrollment via API
        const modulesRes = await fetch(`/api/student/modules?studentId=${userId}`);
        const modulesJson = modulesRes.ok ? await modulesRes.json() : { modules: [] };

        // Fetch badges
        const { data: studentBadges } = await supabase
          .from('student_badges')
          .select('badges ( badge_id, badge_key, badge_display_name, badge_icon )')
          .eq('student_id', userId);

        const badges = (studentBadges ?? [])
          .map((sb: Record<string, unknown>) => sb.badges)
          .filter(Boolean) as Badge[];

        // Fetch ALL sessions to compute per-module stats
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('session_id, module_id, accuracy, medal_awarded, exp_awarded, finished_at')
          .eq('student_id', userId)
          .not('finished_at', 'is', null)
          .order('finished_at', { ascending: false });

        const resolvedModules = (modulesJson.modules ?? []) as StudentModule[];

        // Build per-module stats — group by module_id, keep best accuracy + total XP
        const statsMap = new Map<string, ModuleStats>();
        for (const s of sessions ?? []) {
          const existing = statsMap.get(s.module_id);
          const mod = resolvedModules.find((m) => m.module_id === s.module_id);
          if (!existing) {
            statsMap.set(s.module_id, {
              module_id: s.module_id,
              module_name: mod?.module_name ?? 'Unknown',
              totalXp: s.exp_awarded ?? 0,
              bestAccuracy: s.accuracy ?? 0,
              attempts: 1,
              bestMedal: s.medal_awarded ?? 'none',
              lastSessionId: s.session_id,
              lastPlayed: s.finished_at ?? '',
            });
          } else {
            existing.totalXp += s.exp_awarded ?? 0;
            existing.attempts += 1;
            if ((s.accuracy ?? 0) > existing.bestAccuracy) {
              existing.bestAccuracy = s.accuracy ?? 0;
              existing.bestMedal = s.medal_awarded ?? existing.bestMedal;
              existing.lastSessionId = s.session_id;
            }
          }
        }
        const moduleStats = Array.from(statsMap.values())
          .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());

        const lastSession = sessions && sessions.length > 0
          ? { module_id: sessions[0].module_id, accuracy: sessions[0].accuracy ?? 0 }
          : null;

        // Fetch enrolled classes
        const enrollRes = await fetch(`/api/enrollments?studentId=${userId}`);
        if (enrollRes.ok) {
          const { enrollments } = await enrollRes.json();
          setEnrolledClasses(enrollments ?? []);
        }

        // Fetch global rank position
        const lbRes = await fetch('/api/leaderboard?limit=500');
        if (lbRes.ok) {
          const { leaderboard } = await lbRes.json();
          const entry = (leaderboard ?? []).find((e: { id: string; rank_position: number }) => e.id === userId);
          if (entry?.rank_position) setGlobalRank(entry.rank_position);
        }

        setData({
          user,
          modules: resolvedModules,
          badges,
          moduleStats,
          totalSessions: (sessions ?? []).length,
          lastSession,
        });
      } catch (e) {
        setErrorMsg(String((e as Error).message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header userRole="student" />
        <main className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" label="Loading dashboard…" />
        </main>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-red-400">{errorMsg ?? 'Could not load dashboard.'}</p>
        </main>
      </div>
    );
  }

  const { user, modules, badges, moduleStats, totalSessions, lastSession } = data;
  const rankName = calculateRank(user.level);
  const MEDAL_BADGE: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '—' };

  // Build class_id → teacher_name lookup from already-loaded enrolledClasses
  const classTeacherMap = new Map<string, string>(
    enrolledClasses.map((c) => [c.class_id, c.teacher_name])
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };


  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" userName={user.name} onSignOut={handleSignOut} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* ─── Hero row ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-950/25 px-5 py-4"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest">{rankName}</p>
                {globalRank && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 rounded-full px-2 py-0.5"
                  >
                    #{globalRank} globally
                  </motion.span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <QuizMascot mood="idle" size={32} />
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">{getMascotGreeting(user.name.split(' ')[0])}</h1>
                  <p className="text-xs text-gray-600 mt-0.5">{user.total_exp} total XP earned</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-52 hidden sm:block">
                <ExpBar totalExp={user.total_exp} level={user.level} rankName={rankName} />
              </div>
              <Link href="/student/profile" className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg px-3 py-1.5">
                Profile →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ─── Last operation highlight ──────────────────────────────────────── */}
        {lastSession && (() => {
          const mod = modules.find((m) => m.module_id === lastSession.module_id);
          if (!mod) return null;
          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg flex-shrink-0">🎯</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-amber-600 uppercase tracking-widest">Last Operation</p>
                  <p className="text-sm font-semibold text-white truncate">{mod.module_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-500">{lastSession.accuracy.toFixed(0)}% accuracy</span>
                <Link
                  href={`/quiz/session/${lastSession.module_id}`}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/25 hover:border-amber-500/50 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Replay ↗
                </Link>
              </div>
            </motion.div>
          );
        })()}

        {/* ─── CAMPAIGN MAP (main hero) ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CampaignMap studentId={user.id} />
        </motion.div>

        {/* ─── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Level',    value: user.level,       icon: '⚡', color: 'text-cyan-400',   border: 'border-cyan-500/20',   bg: 'bg-cyan-500/5'   },
            { label: 'Badges',   value: badges.length,    icon: '🎖️', color: 'text-amber-400',  border: 'border-amber-500/20',  bg: 'bg-amber-500/5'  },
            { label: 'Sessions', value: totalSessions,    icon: '🎮', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
            { label: 'Modules',  value: modules.length,   icon: '📚', color: 'text-green-400',  border: 'border-green-500/20',  bg: 'bg-green-500/5'  },
          ].map(({ label, value, icon, color, border, bg }) => (
            <div key={label} className={`rounded-xl border ${border} ${bg} p-4 text-center`}>
              <p className="text-xl mb-1" aria-hidden="true">{icon}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ─── My Classes shortcut ───────────────────────────────────────────── */}
        <Link href="/student/classes">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between rounded-xl border border-cyan-500/15 bg-cyan-500/5 hover:border-cyan-500/30 hover:bg-cyan-500/8 px-5 py-4 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏫</span>
              <div>
                <p className="text-sm font-semibold text-white">My Classes</p>
                <p className="text-xs text-gray-500">
                  {enrolledClasses.filter(e => e.status !== 'dropped').length > 0
                    ? `${enrolledClasses.filter(e => e.status !== 'dropped').length} enrolled — view modules & side quests`
                    : 'Browse and join a class'}
                </p>
              </div>
            </div>
            <span className="text-cyan-500 text-sm">→</span>
          </motion.div>
        </Link>

        {/* ─── Side Quests (modules) ─────────────────────────────────────────── */}
        <section aria-labelledby="modules-heading">
          <div className="flex items-center gap-2 mb-3">
            <h2 id="modules-heading" className="text-sm font-semibold text-white">⚔️ Side Quests</h2>
            <span className="text-[10px] font-mono text-gray-600 border border-gray-700/50 rounded px-1.5">OPTIONAL</span>
          </div>
          {modules.length === 0 ? (
            <TerminalStandby />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod) => (
                <Link key={mod.module_id} href={`/modules/${mod.module_id}`}>
                  <Card
                    hoverable
                    variant={mod.module_type === 'core' ? 'highlight' : 'default'}
                    className="h-full"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0" aria-hidden="true">
                        {mod.module_type === 'core' ? '🏛️' : '📝'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{mod.module_name}</h3>
                        {mod.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mod.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {mod.module_type === 'core' ? (
                            <span className="text-xs font-mono text-cyan-700 bg-cyan-500/10 rounded px-1.5 py-0.5 uppercase">core</span>
                          ) : (
                            <span className="text-xs font-mono text-indigo-500 bg-indigo-500/10 rounded px-1.5 py-0.5 uppercase">teacher</span>
                          )}
                          {mod.class_name && (
                            <span className="text-xs text-gray-500 bg-white/5 rounded px-1.5 py-0.5 truncate max-w-[140px]">
                              {mod.class_name}
                            </span>
                          )}
                          {mod.class_id && classTeacherMap.has(mod.class_id) && (
                            <span className="text-xs text-gray-600">
                              by {classTeacherMap.get(mod.class_id)}
                            </span>
                          )}
                          {mod.exp_bonus_percent > 0 && (
                            <span className="text-xs text-green-400 font-semibold">
                              +{mod.exp_bonus_percent}% EXP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ─── Quest Log (per-module stats) ──────────────────────────────────── */}
        {moduleStats.length > 0 && (
          <section aria-labelledby="questlog-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="questlog-heading" className="text-sm font-semibold text-white">📋 Quest Log</h2>
              <Link href="/student/profile" className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
                Full history →
              </Link>
            </div>
            <div className="space-y-2">
              {moduleStats.slice(0, 5).map((ms, i) => {
                const acc = ms.bestAccuracy;
                const BAR = acc >= 90 ? 'bg-amber-400' : acc >= 75 ? 'bg-cyan-400' : acc >= 60 ? 'bg-orange-400' : 'bg-red-400';
                return (
                  <motion.div
                    key={ms.module_id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3"
                  >
                    <span className="text-base flex-shrink-0">{MEDAL_BADGE[ms.bestMedal] ?? '—'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ms.module_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${BAR}`} style={{ width: `${acc}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">{acc.toFixed(0)}% best</span>
                        <span className="text-gray-700">·</span>
                        <span className="text-[10px] font-mono text-gray-600">{ms.attempts}x played</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-green-400">{ms.totalXp} XP</span>
                      <Link
                        href={`/quiz/session/${ms.module_id}`}
                        className="text-[11px] text-amber-400 hover:text-amber-300 border border-amber-500/20 rounded px-2 py-0.5 transition-colors"
                      >
                        Replay
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Badges ────────────────────────────────────────────────────────── */}
        <section aria-labelledby="badges-heading">
          <div className="flex items-center justify-between mb-1">
            <h2 id="badges-heading" className="text-sm font-semibold text-white">Badges</h2>
            <Link href="/leaderboard" className="text-xs text-cyan-400 hover:text-cyan-300">
              Leaderboard →
            </Link>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            {badges.length} / 5 unlocked
          </p>
          <BadgeShowcase earnedBadges={badges} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
