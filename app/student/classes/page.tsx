'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface ClassModule {
  module_id: string;
  module_name: string;
  description: string | null;
  module_type: string;
  exp_bonus_percent: number;
  question_count?: number;
}

interface EnrolledClass {
  class_id: string;
  class_name: string;
  teacher_name: string;
  status: string;
  modules: ClassModule[];
}

interface AvailableClass {
  class_id: string;
  class_name: string;
  teacher_name: string;
}

export default function StudentClassesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledClass[]>([]);
  const [available, setAvailable] = useState<AvailableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowser, setShowBrowser] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) { window.location.href = '/login'; return; }
      setUserId(uid);

      // Fetch user name
      const { data: userData } = await supabase.from('users').select('name').eq('id', uid).single();
      if (userData?.name) setUserName(userData.name);

      // Fetch enrollments
      const enrollRes = await fetch(`/api/enrollments?studentId=${uid}`);
      const { enrollments } = enrollRes.ok ? await enrollRes.json() : { enrollments: [] };
      const active: typeof enrollments = (enrollments ?? []).filter((e: { status: string }) => e.status !== 'dropped');

      // For each class, fetch its modules
      const withModules = await Promise.all(
        active.map(async (cls: { class_id: string; class_name: string; teacher_name: string; status: string }) => {
          const { data: classModules } = await supabase
            .from('class_modules')
            .select('modules ( module_id, module_name, description, module_type, exp_bonus_percent )')
            .eq('class_id', cls.class_id);

          const modules = (classModules ?? [])
            .map((cm: Record<string, unknown>) => cm.modules)
            .filter(Boolean) as ClassModule[];

          return { ...cls, modules };
        })
      );

      setEnrolled(withModules);
      // Auto-expand first class
      if (withModules.length > 0) setExpandedClass(withModules[0].class_id);
      setLoading(false);
    }
    load();
  }, []);

  const loadAvailable = async () => {
    const res = await fetch('/api/classes');
    if (!res.ok) return;
    const { classes } = await res.json();
    const enrolledIds = new Set(enrolled.map((e) => e.class_id));
    setAvailable((classes ?? []).filter((c: AvailableClass) => !enrolledIds.has(c.class_id)));
    setShowBrowser(true);
  };

  const handleJoin = async (classId: string) => {
    if (!userId) return;
    setEnrollingId(classId);
    const res = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: userId, classId }),
    });
    if (res.ok) {
      const joined = available.find((c) => c.class_id === classId);
      if (joined) {
        setEnrolled((prev) => [...prev, { ...joined, status: 'approved', modules: [] }]);
        setAvailable((prev) => prev.filter((c) => c.class_id !== classId));
      }
    }
    setEnrollingId(null);
  };

  const handleDrop = async (classId: string) => {
    if (!userId) return;
    setDroppingId(classId);
    await fetch(`/api/enrollments?studentId=${userId}&classId=${classId}`, { method: 'DELETE' });
    setEnrolled((prev) => prev.filter((e) => e.class_id !== classId));
    if (expandedClass === classId) setExpandedClass(null);
    setDroppingId(null);
  };

  if (loading) return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" userName={userName} />
      <main className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" label="Loading classes…" />
      </main>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" userName={userName} />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 space-y-8">
        {/* Page header */}
        <div>
          <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest mb-1">Student Portal</p>
          <h1 className="text-2xl font-bold text-white">My Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your enrolled classes and available side quests</p>
        </div>

        {/* Enrolled classes */}
        {enrolled.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-gray-900/40 px-5 py-8 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm text-gray-400 font-medium">You haven&apos;t joined any classes yet.</p>
            <p className="text-xs text-gray-600 mt-1">Browse available classes below to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enrolled.map((cls) => {
              const isExpanded = expandedClass === cls.class_id;
              return (
                <motion.div
                  key={cls.class_id}
                  layout
                  className="rounded-xl border border-white/8 bg-gray-900/60 overflow-hidden"
                >
                  {/* Class header row */}
                  <button
                    onClick={() => setExpandedClass(isExpanded ? null : cls.class_id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-sm font-bold text-cyan-400 flex-shrink-0">
                        {cls.class_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{cls.class_name}</p>
                        <p className="text-xs text-gray-500">Instructor: {cls.teacher_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 hidden sm:block">
                        {cls.modules.length} module{cls.modules.length !== 1 ? 's' : ''}
                      </span>
                      <span className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        ▾
                      </span>
                    </div>
                  </button>

                  {/* Expandable modules */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/5 px-5 pb-4 pt-3 space-y-2">
                          {/* Section label */}
                          <p className="text-[10px] font-mono text-cyan-700 uppercase tracking-widest mb-3">
                            ▸ Side Quests — {cls.modules.length} available
                          </p>

                          {cls.modules.length === 0 ? (
                            <p className="text-xs text-gray-600 py-2">No modules assigned yet.</p>
                          ) : (
                            cls.modules.map((mod) => (
                              <Link
                                key={mod.module_id}
                                href={`/modules/${mod.module_id}`}
                                className="flex items-center gap-3 rounded-lg border border-white/5 bg-gray-800/50 hover:border-cyan-500/25 hover:bg-cyan-500/5 px-3 py-2.5 transition-all group"
                              >
                                <span className="text-base flex-shrink-0">
                                  {mod.module_type === 'core' ? '🏛️' : '📝'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                                    {mod.module_name}
                                  </p>
                                  {mod.description && (
                                    <p className="text-xs text-gray-600 truncate mt-0.5">{mod.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {mod.exp_bonus_percent > 0 && (
                                    <span className="text-[10px] font-mono text-green-400 bg-green-500/10 rounded px-1.5 py-0.5">
                                      +{mod.exp_bonus_percent}% XP
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-gray-600 uppercase">
                                    {mod.module_type}
                                  </span>
                                  <span className="text-gray-600 group-hover:text-cyan-500 transition-colors text-xs">→</span>
                                </div>
                              </Link>
                            ))
                          )}

                          {/* Drop class */}
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleDrop(cls.class_id)}
                              disabled={droppingId === cls.class_id}
                              className="text-xs text-gray-700 hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              {droppingId === cls.class_id ? 'Dropping…' : 'Drop this class'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Browse & Join */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Browse Available Classes</h2>
            {!showBrowser && (
              <Button size="sm" variant="secondary" onClick={loadAvailable}>
                + Find a Class
              </Button>
            )}
            {showBrowser && (
              <button onClick={() => setShowBrowser(false)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                ✕ Close
              </button>
            )}
          </div>

          <AnimatePresence>
            {showBrowser && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2"
              >
                {available.length === 0 ? (
                  <p className="text-sm text-gray-600 py-3">No other classes available right now.</p>
                ) : (
                  available.map((cls) => (
                    <div
                      key={cls.class_id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{cls.class_name}</p>
                        <p className="text-xs text-gray-500">Instructor: {cls.teacher_name}</p>
                      </div>
                      <Button
                        size="sm"
                        loading={enrollingId === cls.class_id}
                        onClick={() => handleJoin(cls.class_id)}
                      >
                        Join
                      </Button>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <Footer />
    </div>
  );
}
