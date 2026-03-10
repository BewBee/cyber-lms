/**
 * app/teacher/dashboard/page.tsx — Teacher dashboard for CyberShield LMS.
 * Shows teacher's modules, class management, assignment manager, and class analytics.
 * Includes ModuleEditor for creating and editing modules.
 * To test: log in as Teacher (dev quick login) and create/edit a module.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ModuleEditor } from '@/components/teacher/ModuleEditor';
import { AssignmentManager } from '@/components/teacher/AssignmentManager';
import type { User, Module, Class, ModuleFormData, OptionKey } from '@/types';

interface TeacherData {
  teacher: User;
  modules: Module[];
  classes: Class[];
}


export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Edit module state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleData, setEditingModuleData] = useState<ModuleFormData | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id ?? null;

      if (!userId) { window.location.href = '/login'; return; }

      const { data: userData, error: uErr } = await supabase
        .from('users').select('*').eq('id', userId).single();

      if (uErr || !userData) { window.location.href = '/login'; return; }

      const teacher: User = userData;

      const { data: modules } = await supabase
        .from('modules')
        .select('module_id, module_name, description, module_type, is_locked, exp_bonus_percent, created_at')
        .eq('created_by', teacher.id)
        .order('created_at', { ascending: false });

      const { data: classes } = await supabase
        .from('classes')
        .select('class_id, class_name, teacher_id, created_at')
        .eq('teacher_id', teacher.id);

      setData({
        teacher,
        modules: (modules ?? []) as Module[],
        classes: (classes ?? []) as Class[],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const loadAnalytics = async (classId: string) => {
    if (!data?.teacher.id) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(
        `/api/teacher/analytics?classId=${classId}&teacherId=${data.teacher.id}`
      );
      const json = await res.json();
      setAnalytics(json);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleEditModule = async (moduleId: string) => {
    setEditLoadingId(moduleId);
    try {
      const res = await fetch(`/api/teacher/modules/${moduleId}`);
      if (!res.ok) return;
      const { module } = await res.json();

      const formData: ModuleFormData = {
        module_name: module.module_name,
        description: module.description ?? '',
        exp_bonus_percent: module.exp_bonus_percent,
        lesson: module.lesson
          ? { lesson_title: module.lesson.lesson_title ?? '', content: module.lesson.content ?? '' }
          : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: (module.questions ?? []).map((q: any) => ({
          question_id: q.question_id,
          question_text: q.question_text,
          difficulty: q.difficulty,
          explanation: q.explanation ?? '',
          options: [...(q.question_options ?? [])]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => a.option_key.localeCompare(b.option_key))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((o: any) => ({
              option_key: o.option_key as OptionKey,
              option_text: o.option_text,
              is_correct: Boolean(o.is_correct),
            })),
        })),
      };

      setEditingModuleId(moduleId);
      setEditingModuleData(formData);
      setShowEditor(false); // close create panel if open
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header userRole="teacher" />
        <main className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-red-400">Could not load teacher dashboard.</p>
        </main>
      </div>
    );
  }

  const { teacher, modules, classes } = data;

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="teacher" userName={teacher.name} onSignOut={handleSignOut} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Welcome, {teacher.name}</p>
          </div>
          <Button
            onClick={() => {
              setShowEditor((v) => !v);
              setEditingModuleId(null);
              setEditingModuleData(null);
            }}
          >
            {showEditor ? '✕ Cancel' : '+ New Module'}
          </Button>
        </div>

        {/* Create Module Panel */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card title="Create New Module" variant="highlight">
                <ModuleEditor
                  teacherId={teacher.id}
                  onSaved={() => {
                    setShowEditor(false);
                    loadData();
                  }}
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'My Modules', value: modules.length, icon: '📚' },
            { label: 'My Classes', value: classes.length, icon: '🏫' },
            { label: 'Questions', value: '—', icon: '❓' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-gray-900/40 p-4 text-center">
              <p className="text-xl mb-1" aria-hidden="true">{icon}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Modules list */}
        <section aria-labelledby="my-modules-heading">
          <h2 id="my-modules-heading" className="text-sm font-semibold text-white mb-3">My Modules</h2>
          {modules.length === 0 ? (
            <p className="text-sm text-gray-600">No modules yet. Create your first module above.</p>
          ) : (
            <div className="space-y-2">
              {modules.map((mod) => (
                <div
                  key={mod.module_id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{mod.module_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-gray-600 uppercase">{mod.module_type}</span>
                      {mod.exp_bonus_percent > 0 && (
                        <span className="text-xs text-green-400">+{mod.exp_bonus_percent}% EXP</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-600">
                      {new Date(mod.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={editLoadingId === mod.module_id}
                      onClick={() => handleEditModule(mod.module_id)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Edit Module Panel */}
        <AnimatePresence>
          {editingModuleId && editingModuleData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card
                title={`Editing: ${editingModuleData.module_name}`}
                variant="highlight"
                action={
                  <button
                    onClick={() => { setEditingModuleId(null); setEditingModuleData(null); }}
                    className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1"
                    aria-label="Close editor"
                  >
                    ✕ Close
                  </button>
                }
              >
                <ModuleEditor
                  teacherId={teacher.id}
                  editModuleId={editingModuleId}
                  initialData={editingModuleData}
                  onSaved={() => {
                    setEditingModuleId(null);
                    setEditingModuleData(null);
                    loadData();
                  }}
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Classes & Analytics */}
        <section aria-labelledby="classes-heading">
          <h2 id="classes-heading" className="text-sm font-semibold text-white mb-3">My Classes</h2>
          {classes.length === 0 ? (
            <p className="text-sm text-gray-600">No classes found.</p>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <Card key={cls.class_id} title={cls.class_name} action={
                  <Button size="sm" variant="secondary" onClick={() => loadAnalytics(cls.class_id)} loading={analyticsLoading}>
                    View Analytics
                  </Button>
                }>
                  <p className="text-xs text-gray-600">
                    Created {new Date(cls.created_at).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Assignments */}
        <section aria-labelledby="assignments-heading">
          <AssignmentManager
            teacherId={teacher.id}
            modules={modules}
          />
        </section>

        {/* Analytics results */}
        <AnimatePresence>
          {analytics && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-labelledby="analytics-heading"
            >
              <Card
                title="Class Analytics"
                variant="highlight"
                action={
                  <button
                    onClick={() => setAnalytics(null)}
                    className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1"
                    aria-label="Close analytics"
                  >
                    ✕ Close
                  </button>
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Students', value: String(analytics.totalStudents) },
                    { label: 'Sessions', value: String(analytics.completedSessions) },
                    { label: 'Avg Score', value: String(analytics.avgScore) },
                    { label: 'Avg Accuracy', value: `${analytics.avgAccuracy}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center rounded-lg bg-gray-800/60 p-3">
                      <p className="text-lg font-bold text-white">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                {Array.isArray(analytics.weakQuestions) && analytics.weakQuestions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                      Weakest Questions
                    </h4>
                    <div className="space-y-1.5">
                      {(analytics.weakQuestions as Array<{ question_text: string; accuracy_pct: number }>).map((q, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/40 px-3 py-2">
                          <p className="text-xs text-gray-300 truncate flex-1">{q.question_text}</p>
                          <span className="text-xs font-semibold text-red-400 flex-shrink-0">
                            {q.accuracy_pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
