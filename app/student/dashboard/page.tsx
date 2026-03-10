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
import { Button } from '@/components/ui/Button';
import { BadgeDisplay } from '@/components/ui/BadgeDisplay';
import { ExpBar } from '@/components/game/ExpBar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateRank } from '@/lib/expSystem';
import type { User, Module, Badge, GameSession } from '@/types';

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

interface DashboardData {
  user: User;
  modules: Module[];
  badges: Badge[];
  recentSessions: GameSession[];
}



export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [showClassBrowser, setShowClassBrowser] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

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

        // Fetch modules
        const { data: modules } = await supabase
          .from('modules')
          .select('module_id, module_name, description, module_type, is_locked, exp_bonus_percent')
          .eq('is_locked', false)
          .order('created_at');

        // Fetch badges
        const { data: studentBadges } = await supabase
          .from('student_badges')
          .select('badges ( badge_id, badge_key, badge_display_name, badge_icon )')
          .eq('student_id', userId);

        const badges = (studentBadges ?? [])
          .map((sb: Record<string, unknown>) => sb.badges)
          .filter(Boolean) as Badge[];

        // Fetch recent sessions
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('session_id, module_id, total_score, accuracy, medal_awarded, exp_awarded, finished_at')
          .eq('student_id', userId)
          .not('finished_at', 'is', null)
          .order('finished_at', { ascending: false })
          .limit(5);

        const resolvedModules = (modules ?? []) as Module[];

        // Fetch enrolled classes
        const enrollRes = await fetch(`/api/enrollments?studentId=${userId}`);
        if (enrollRes.ok) {
          const { enrollments } = await enrollRes.json();
          setEnrolledClasses(enrollments ?? []);
        }

        setData({
          user,
          modules: resolvedModules,
          badges,
          recentSessions: (sessions ?? []) as GameSession[],
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

  const { user, modules, badges, recentSessions } = data;
  const rankName = calculateRank(user.level);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const loadAvailableClasses = async () => {
    const res = await fetch('/api/classes');
    if (!res.ok) return;
    const { classes } = await res.json();
    // Filter out already-enrolled classes
    const enrolledIds = new Set(enrolledClasses.map((e) => e.class_id));
    setAvailableClasses((classes ?? []).filter((c: AvailableClass) => !enrolledIds.has(c.class_id)));
    setShowClassBrowser(true);
  };

  const handleJoinClass = async (classId: string) => {
    if (!data?.user.id) return;
    setEnrollingId(classId);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: data.user.id, classId }),
      });
      if (res.ok) {
        const joined = availableClasses.find((c) => c.class_id === classId);
        if (joined) {
          setEnrolledClasses((prev) => [...prev, { enrollment_id: '', class_id: classId, class_name: joined.class_name, teacher_name: joined.teacher_name, status: 'approved' }]);
          setAvailableClasses((prev) => prev.filter((c) => c.class_id !== classId));
        }
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDropClass = async (classId: string) => {
    if (!data?.user.id) return;
    await fetch(`/api/enrollments?studentId=${data.user.id}&classId=${classId}`, { method: 'DELETE' });
    setEnrolledClasses((prev) => prev.filter((e) => e.class_id !== classId));
  };

  const MEDAL_EMOJI: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '✅' };

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" userName={user.name} onSignOut={handleSignOut} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* ─── Hero row ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/8 bg-gray-900/60 p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest mb-1">
                {rankName}
              </p>
              <h1 className="text-2xl font-bold text-white">Welcome back, {user.name.split(' ')[0]}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{user.total_exp} total XP earned</p>
              <Link href="/student/profile" className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors mt-1 inline-block">
                View profile →
              </Link>
            </div>
            <div className="sm:w-64">
              <ExpBar totalExp={user.total_exp} level={user.level} rankName={rankName} />
            </div>
          </div>
        </motion.div>

        {/* ─── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Level', value: user.level, icon: '⚡' },
            { label: 'Badges', value: badges.length, icon: '🎖️' },
            { label: 'Sessions', value: recentSessions.length, icon: '🎮' },
            { label: 'Modules', value: modules.length, icon: '📚' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-gray-900/40 p-4 text-center">
              <p className="text-xl mb-1" aria-hidden="true">{icon}</p>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ─── Modules grid ──────────────────────────────────────────────────── */}
        <section aria-labelledby="modules-heading">
          <h2 id="modules-heading" className="text-sm font-semibold text-white mb-3">
            Available Modules
          </h2>
          {modules.length === 0 ? (
            <p className="text-sm text-gray-600">No modules available yet.</p>
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
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-mono text-gray-600 uppercase">
                            {mod.module_type}
                          </span>
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

        {/* ─── Recent sessions ───────────────────────────────────────────────── */}
        <section aria-labelledby="sessions-heading">
          <h2 id="sessions-heading" className="text-sm font-semibold text-white mb-3">
            Recent Sessions
          </h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-gray-600">No sessions yet. Start a quiz above!</p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <div
                  key={s.session_id}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3"
                >
                  <span className="text-xl" aria-hidden="true">
                    {MEDAL_EMOJI[s.medal_awarded ?? 'none']}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 font-medium">
                      {s.accuracy?.toFixed(1)}% accuracy
                    </p>
                    <p className="text-xs text-gray-600">
                      {s.finished_at ? new Date(s.finished_at).toLocaleDateString() : 'In progress'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-green-400 font-semibold">+{s.exp_awarded} XP</span>
                    <Link href={`/quiz/review/${s.session_id}`} className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── My Classes ────────────────────────────────────────────────────── */}
        <section aria-labelledby="classes-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="classes-heading" className="text-sm font-semibold text-white">My Classes</h2>
            <Button size="sm" variant="secondary" onClick={showClassBrowser ? () => setShowClassBrowser(false) : loadAvailableClasses}>
              {showClassBrowser ? '✕ Close' : '+ Join a Class'}
            </Button>
          </div>

          {/* Enrolled classes list */}
          {enrolledClasses.filter(e => e.status !== 'dropped').length === 0 ? (
            <p className="text-sm text-gray-600">You haven&apos;t joined any classes yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {enrolledClasses.filter(e => e.status !== 'dropped').map((cls) => (
                <div key={cls.class_id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{cls.class_name}</p>
                    <p className="text-xs text-gray-500">Teacher: {cls.teacher_name}</p>
                  </div>
                  <button
                    onClick={() => handleDropClass(cls.class_id)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                  >
                    Drop
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Browse available classes */}
          {showClassBrowser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
              <p className="text-xs text-gray-500 mb-2">Available classes to join:</p>
              {availableClasses.length === 0 ? (
                <p className="text-xs text-gray-600">No other classes available right now.</p>
              ) : (
                availableClasses.map((cls) => (
                  <div key={cls.class_id} className="flex items-center justify-between gap-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{cls.class_name}</p>
                      <p className="text-xs text-gray-500">Teacher: {cls.teacher_name}</p>
                    </div>
                    <Button size="sm" loading={enrollingId === cls.class_id} onClick={() => handleJoinClass(cls.class_id)}>
                      Join
                    </Button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </section>

        {/* ─── Badges ────────────────────────────────────────────────────────── */}
        <section aria-labelledby="badges-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="badges-heading" className="text-sm font-semibold text-white">Badges</h2>
            <Link href="/leaderboard" className="text-xs text-cyan-400 hover:text-cyan-300">
              Leaderboard →
            </Link>
          </div>
          <BadgeDisplay badges={badges} maxVisible={6} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
