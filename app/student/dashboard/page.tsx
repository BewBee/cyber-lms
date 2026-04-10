/**
 * app/student/dashboard/page.tsx — Student home dashboard for CyberShield LMS.
 * Loads user profile, available modules, recent sessions, and earned badges from Supabase.
 * Reads dev session from sessionStorage if Supabase auth is not configured.
 * To test: log in as Alice (dev quick login) and verify modules and EXP bar display.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { Button } from '@/components/ui/Button';
import { BadgeShowcase } from '@/components/ui/BadgeShowcase';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateRank, expToNextLevel } from '@/lib/expSystem';
import { CampaignMap } from '@/components/campaign/CampaignMap';
import { QuizMascot } from '@/components/game/QuizMascot';
import { startSoundtrack, stopSoundtrack } from '@/lib/soundtrack';
import { TerminalRain } from '@/components/game/TerminalRain';
import type { User, Module, Badge } from '@/types';

const BADGE_META = [
  { key: 'first_mission',    icon: '/assets/badge-first-mission.svg',    name: 'First Mission'    },
  { key: 'perfect_strike',   icon: '/assets/badge-perfect-strike.svg',   name: 'Perfect Strike'   },
  { key: 'hot_streak',       icon: '/assets/badge-hot-streak.svg',       name: 'Hot Streak'       },
  { key: 'veteran_operator', icon: '/assets/badge-veteran-operator.svg', name: 'Veteran Operator' },
  { key: 'flawless',         icon: '/assets/badge-flawless.svg',         name: 'Flawless'         },
];

const SESSION_PAGE_SIZE = 5;

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

interface AvailableClass {
  class_id: string;
  class_name: string;
  teacher_name: string;
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
  const [allClasses, setAllClasses] = useState<AvailableClass[]>([]);
  const [classSearch, setClassSearch] = useState('');
  const [joiningClassId, setJoiningClassId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<{
    module_id: string; module_name: string; weak_tier: number;
    weak_accuracy: number; reason: string;
  } | null>(null);
  const [joinMessages, setJoinMessages] = useState<Record<string, { text: string; ok: boolean }>>({});
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [sessionPage, setSessionPage] = useState(0);

  useEffect(() => {
    startSoundtrack('dashboard');
    return () => { stopSoundtrack(1.5); };
  }, []);

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

        // Resolve names for any session module not currently in the student's module list
        // (e.g. modules from classes they've left, or deleted teacher modules)
        const resolvedModuleIds = new Set(resolvedModules.map((m) => m.module_id));
        const sessionModuleIds = [...new Set((sessions ?? []).map((s) => s.module_id))];
        const unknownIds = sessionModuleIds.filter((id) => !resolvedModuleIds.has(id));
        const moduleNameMap = new Map<string, string>(resolvedModules.map((m) => [m.module_id, m.module_name]));
        if (unknownIds.length > 0) {
          const { data: extraMods } = await supabase
            .from('modules')
            .select('module_id, module_name')
            .in('module_id', unknownIds);
          (extraMods ?? []).forEach((m: { module_id: string; module_name: string }) =>
            moduleNameMap.set(m.module_id, m.module_name)
          );
        }

        // Build per-module stats — group by module_id, keep best accuracy + total XP
        const statsMap = new Map<string, ModuleStats>();
        for (const s of sessions ?? []) {
          const existing = statsMap.get(s.module_id);
          const modName = moduleNameMap.get(s.module_id) ?? 'Unknown';
          if (!existing) {
            statsMap.set(s.module_id, {
              module_id: s.module_id,
              module_name: modName,
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

        // Fetch all available classes for search
        const allClassesRes = await fetch('/api/classes');
        if (allClassesRes.ok) {
          const { classes: cls } = await allClassesRes.json();
          setAllClasses(cls ?? []);
        }

        // Fetch adaptive module recommendation
        const recRes = await fetch(`/api/student/recommended-module?studentId=${userId}`);
        if (recRes.ok) {
          const { recommendation: rec } = await recRes.json();
          if (rec) setRecommendation(rec);
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

  const handleJoinClass = async (classId: string) => {
    if (!data?.user.id || joiningClassId) return;
    setJoiningClassId(classId);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: data.user.id, classId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setJoinMessages((prev) => ({ ...prev, [classId]: { text: json.error ?? 'Failed', ok: false } }));
      } else {
        const cls = allClasses.find((c) => c.class_id === classId);
        const newEnrollment: EnrolledClass = {
          enrollment_id: json.enrollment_id ?? classId,
          class_id: classId,
          class_name: cls?.class_name ?? '',
          teacher_name: cls?.teacher_name ?? '',
          status: 'pending',
        };
        setEnrolledClasses((prev) => [...prev, newEnrollment]);
        setJoinMessages((prev) => ({ ...prev, [classId]: { text: '✓ Request sent! Waiting for teacher approval.', ok: true } }));
        setClassSearch('');
        setTimeout(() => setJoinMessages((prev) => { const n = { ...prev }; delete n[classId]; return n; }), 4000);
      }
    } catch {
      setJoinMessages((prev) => ({ ...prev, [classId]: { text: 'Network error', ok: false } }));
    } finally {
      setJoiningClassId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };


  const activeClasses = enrolledClasses.filter(e => e.status !== 'dropped');
  const earnedBadgeKeys = new Set(badges.map(b => b.badge_key));
  const xp = expToNextLevel(user.total_exp);
  const xpPct = Math.min(100, Math.round((xp.current / xp.needed) * 100));
  const filteredStats = moduleStats.filter(ms => ms.module_name !== 'Unknown');
  const totalPages = Math.max(1, Math.ceil(filteredStats.length / SESSION_PAGE_SIZE));
  const pageStats = filteredStats.slice(sessionPage * SESSION_PAGE_SIZE, (sessionPage + 1) * SESSION_PAGE_SIZE);

  return (
    <div className="flex flex-col min-h-screen">
      <TerminalRain className="opacity-40" />
      <Header userRole="student" userName={user.name} onSignOut={handleSignOut} />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 space-y-5">

        {/* ─── HERO ──────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/40 via-gray-900 to-gray-900 px-6 py-5"
          style={{ boxShadow: '0 0 40px rgba(0,212,255,0.07)' }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: mascot + identity */}
            <div className="flex items-center gap-4">
              <QuizMascot mood="idle" size={52} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest"
                    style={{ textShadow: '0 0 8px rgba(0,212,255,0.5)' }}>
                    {rankName}
                  </span>
                  {globalRank && (
                    <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                      className="text-[10px] font-mono bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 rounded-full px-2 py-0.5">
                      #{globalRank} globally
                    </motion.span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-white leading-tight mb-2">{getMascotGreeting(user.name.split(' ')[0])}</h1>
                {/* Compact badge icons row */}
                <div className="flex items-center gap-1.5" role="list" aria-label="Earned badges">
                  {BADGE_META.map((b, i) => {
                    const earned = earnedBadgeKeys.has(b.key);
                    return (
                      <motion.div key={b.key} role="listitem"
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.06 }}
                        title={earned ? b.name : `🔒 ${b.name}`}
                        className="relative"
                      >
                        <Image src={b.icon} alt={b.name} width={26} height={26}
                          className={`transition-all ${earned
                            ? 'drop-shadow-[0_0_5px_rgba(0,212,255,0.6)]'
                            : 'opacity-15 grayscale'}`}
                        />
                        {earned && (
                          <motion.div className="absolute -inset-0.5 rounded-full border border-cyan-400/40"
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }} />
                        )}
                      </motion.div>
                    );
                  })}
                  <span className="text-[10px] font-mono text-gray-600 ml-1">{badges.length}/5</span>
                </div>
              </div>
            </div>
            {/* Right: quick nav */}
            <div className="flex items-center gap-2">
              <Link href="/student/store"
                className="text-xs font-mono text-purple-300 hover:text-purple-200 transition-colors border border-purple-500/40 hover:border-purple-400/60 bg-purple-500/10 rounded-lg px-3 py-1.5"
                style={{ boxShadow: '0 0 12px rgba(168,85,247,0.1)' }}>
                🏪 STORE
              </Link>
              <Link href="/student/profile"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/40 hover:border-cyan-400/60 bg-cyan-500/10 rounded-lg px-3 py-1.5">
                PROFILE →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ─── GAME HUD ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/10 bg-gray-950/90 overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}>
          {/* Stat strip */}
          <div className="grid grid-cols-5 divide-x divide-white/8">
            {[
              { label: 'LEVEL',    value: String(user.level).padStart(2,'0'), color: 'text-cyan-400',   glow: '0 0 10px rgba(0,212,255,0.3)'  },
              { label: 'BADGES',   value: `${badges.length} / 5`,             color: 'text-amber-300',  glow: '0 0 10px rgba(251,191,36,0.3)' },
              { label: 'SESSIONS', value: String(totalSessions),              color: 'text-purple-300', glow: '0 0 10px rgba(168,85,247,0.3)' },
              { label: 'MODULES',  value: String(modules.length),             color: 'text-green-400',  glow: '0 0 10px rgba(34,197,94,0.3)'  },
              { label: 'GLOBAL',   value: globalRank ? `#${globalRank}` : '—', color: 'text-rose-400', glow: '0 0 10px rgba(251,113,133,0.3)' },
            ].map(({ label, value, color, glow }) => (
              <div key={label} className="flex flex-col items-center py-3 px-2">
                <span className={`text-2xl font-black tracking-tight ${color}`} style={{ textShadow: glow }}>{value}</span>
                <span className="text-[9px] font-mono text-gray-600 tracking-[0.15em] mt-0.5">{label}</span>
              </div>
            ))}
          </div>
          {/* XP progress bar */}
          <div className="border-t border-white/5 px-4 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-gray-600 tracking-widest uppercase">XP Progress — {rankName}</span>
              <span className="text-[9px] font-mono text-green-600">{xp.current} / {xp.needed} XP</span>
            </div>
            <div className="w-full h-2 bg-gray-800/80 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-green-400 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                style={{ boxShadow: '0 0 8px rgba(0,212,255,0.5)' }}
              />
            </div>
          </div>
        </motion.div>

        {/* ─── CAMPAIGN MAP ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CampaignMap studentId={user.id} />
        </motion.div>

        {/* ─── ACTION STRIP: Last Op + Recommendation ────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lastSession && (() => {
            const mod = modules.find((m) => m.module_id === lastSession.module_id);
            if (!mod) return null;
            return (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/8 px-4 py-3"
                style={{ boxShadow: '0 0 16px rgba(245,158,11,0.08)' }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-0.5">↩ Last Operation</p>
                  <p className="text-sm font-bold text-white truncate">{mod.module_name}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{lastSession.accuracy.toFixed(0)}% accuracy</p>
                </div>
                <Link href={`/quiz/session/${lastSession.module_id}`}
                  className="flex-shrink-0 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 border border-amber-500/40 hover:border-amber-400 bg-amber-500/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Replay ↗
                </Link>
              </motion.div>
            );
          })()}

          {recommendation && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/35 bg-purple-500/8 px-4 py-3"
              style={{ boxShadow: '0 0 16px rgba(168,85,247,0.08)' }}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-0.5">🎯 Recommended</p>
                <p className="text-sm font-bold text-white truncate">{recommendation.module_name}</p>
                <p className="text-[10px] text-gray-500 font-mono">{recommendation.weak_accuracy}% on tier {recommendation.weak_tier}</p>
              </div>
              <Link href={`/modules/${recommendation.module_id}`}
                className="flex-shrink-0 text-xs font-mono font-bold text-purple-400 hover:text-purple-300 border border-purple-500/40 hover:border-purple-400 bg-purple-500/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                Train ↗
              </Link>
            </motion.div>
          )}
        </div>

        {/* ─── MY SQUADS ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="classes-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="classes-heading" className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-widest">// My Squads</h2>
            <Link href="/student/classes" className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors">
              + Find Squad →
            </Link>
          </div>
          {activeClasses.length === 0 ? (
            <Link href="/student/classes"
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-4 text-xs font-mono text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors"
            >
              No squads yet — click to find one
            </Link>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeClasses.map((cls) => (
                <div key={cls.enrollment_id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    cls.status === 'approved'
                      ? 'border-cyan-500/30 bg-cyan-500/8 text-cyan-300'
                      : 'border-yellow-500/30 bg-yellow-500/8 text-yellow-400'
                  }`}
                >
                  <span className="text-xs font-mono font-semibold truncate max-w-[160px]">{cls.class_name}</span>
                  {cls.status === 'pending' && (
                    <span className="text-[9px] font-mono text-yellow-600 border border-yellow-500/20 rounded px-1">PENDING</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── SIDE QUESTS ───────────────────────────────────────────────────── */}
        <section aria-labelledby="modules-heading">
          <div className="flex items-center gap-3 mb-3">
            <h2 id="modules-heading" className="text-sm font-mono font-bold text-white uppercase tracking-widest">⚔ Side Quests</h2>
            <span className="text-[10px] font-mono text-gray-600 border border-gray-700/60 rounded px-1.5 py-0.5">OPTIONAL</span>
          </div>
          {modules.length === 0 ? (
            <TerminalStandby />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod, i) => (
                <motion.div key={mod.module_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/modules/${mod.module_id}`}>
                    <div className={`group h-full rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                      mod.module_type === 'core'
                        ? 'border-green-500/30 bg-green-500/8 hover:border-green-500/50 hover:bg-green-500/12'
                        : 'border-indigo-500/25 bg-indigo-500/5 hover:border-indigo-500/45 hover:bg-indigo-500/10'
                    }`}
                    style={{ boxShadow: mod.module_type === 'core' ? '0 0 16px rgba(34,197,94,0.06)' : '0 0 16px rgba(99,102,241,0.06)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl" aria-hidden="true">
                          {mod.module_type === 'core' ? '🔓' : '📝'}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate leading-tight">{mod.module_name}</h3>
                          <p className="text-[10px] font-mono text-gray-600 mt-0.5 truncate">
                            {mod.module_type === 'core' ? '// open access' : mod.class_name ?? '// class module'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {mod.module_type === 'core' ? (
                          <span className="text-[10px] font-mono text-green-500 border border-green-500/30 rounded px-1.5 py-0.5">OPEN</span>
                        ) : (
                          <span className="text-[10px] font-mono text-indigo-400 border border-indigo-500/30 rounded px-1.5 py-0.5">ASSIGNED</span>
                        )}
                        {mod.exp_bonus_percent > 0 && (
                          <span className="text-[10px] font-mono font-bold text-green-400">+{mod.exp_bonus_percent}% XP</span>
                        )}
                        <span className="text-[10px] font-mono text-gray-600 group-hover:text-cyan-500 transition-colors">ENTER →</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ─── QUEST LOG (paginated) ─────────────────────────────────────────── */}
        {filteredStats.length > 0 && (
          <section aria-labelledby="questlog-heading">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 id="questlog-heading" className="text-sm font-mono font-bold text-white uppercase tracking-widest">📋 Quest Log</h2>
                <span className="text-[10px] font-mono text-gray-600 border border-gray-700/50 rounded px-1.5 py-0.5">
                  {filteredStats.length} modules
                </span>
              </div>
              <Link href="/student/profile" className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors">
                Full history →
              </Link>
            </div>

            <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5">
              <AnimatePresence mode="wait">
                <motion.div key={sessionPage}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                  {pageStats.map((ms) => {
                    const acc = ms.bestAccuracy;
                    const barColor = acc >= 90 ? 'bg-amber-400' : acc >= 75 ? 'bg-cyan-400' : acc >= 60 ? 'bg-orange-400' : 'bg-red-400';
                    const leftBorder = acc >= 90 ? 'border-l-amber-400' : acc >= 75 ? 'border-l-cyan-400' : acc >= 60 ? 'border-l-orange-400' : 'border-l-red-500';
                    return (
                      <div key={ms.module_id}
                        className={`flex items-center gap-4 bg-gray-900/30 hover:bg-gray-900/60 px-4 py-3 border-l-2 ${leftBorder} transition-colors`}>
                        <span className="text-xl flex-shrink-0">{MEDAL_BADGE[ms.bestMedal] ?? '—'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{ms.module_name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${acc}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-gray-500">{acc.toFixed(0)}%</span>
                            <span className="text-[10px] font-mono text-gray-700">{ms.attempts}× played</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-black text-green-400">{ms.totalXp}
                            <span className="text-[10px] font-normal text-green-700 ml-0.5">XP</span>
                          </span>
                          <Link href={`/quiz/session/${ms.module_id}`}
                            className="text-[10px] font-mono text-amber-500 hover:text-amber-400 border border-amber-500/25 hover:border-amber-500/50 rounded px-2 py-1 transition-colors">
                            REPLAY
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-2 px-1">
                <button
                  onClick={() => setSessionPage(p => Math.max(0, p - 1))}
                  disabled={sessionPage === 0}
                  className="text-[10px] font-mono text-gray-500 hover:text-cyan-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors px-2 py-1 border border-white/8 rounded"
                >
                  ← PREV
                </button>
                <span className="text-[10px] font-mono text-gray-600">
                  {sessionPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setSessionPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={sessionPage === totalPages - 1}
                  className="text-[10px] font-mono text-gray-500 hover:text-cyan-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors px-2 py-1 border border-white/8 rounded"
                >
                  NEXT →
                </button>
              </div>
            )}
          </section>
        )}

        {/* ─── BADGES ────────────────────────────────────────────────────────── */}
        <section aria-labelledby="badges-heading">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 id="badges-heading" className="text-sm font-mono font-bold text-white uppercase tracking-widest">Badges</h2>
              <span className="text-[10px] font-mono text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-full px-2 py-0.5">
                {badges.length} / 5
              </span>
            </div>
            <Link href="/leaderboard" className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors">
              Leaderboard →
            </Link>
          </div>
          <BadgeShowcase earnedBadges={badges} />
        </section>

      </main>

      <Footer />
    </div>
  );
}
