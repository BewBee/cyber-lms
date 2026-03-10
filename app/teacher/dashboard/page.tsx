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

interface ClassWithCount extends Class {
  student_count: number;
}

interface TeacherData {
  teacher: User;
  modules: Module[];
  classes: ClassWithCount[];
  totalQuestions: number;
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

  // Class management state
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  // Class-module assignment state
  const [managingClassId, setManagingClassId] = useState<string | null>(null);
  const [classModulesMap, setClassModulesMap] = useState<Record<string, Module[]>>({});
  const [moduleMgmtLoading, setModuleMgmtLoading] = useState(false);
  const [addModuleSelections, setAddModuleSelections] = useState<Record<string, string>>({});

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

      // Count total questions across all teacher modules
      const moduleIds = (modules ?? []).map((m) => m.module_id);
      let totalQuestions = 0;
      if (moduleIds.length > 0) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .in('module_id', moduleIds);
        totalQuestions = count ?? 0;
      }

      // Use API to get classes with student_count
      const classRes = await fetch(`/api/classes?teacherId=${teacher.id}`);
      const classJson = classRes.ok ? await classRes.json() : { classes: [] };

      setData({
        teacher,
        modules: (modules ?? []) as Module[],
        classes: (classJson.classes ?? []) as ClassWithCount[],
        totalQuestions,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!data?.teacher.id || !newClassName.trim()) return;
    setCreatingClass(true);
    setClassError(null);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: data.teacher.id, class_name: newClassName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setClassError(json.error ?? 'Failed to create class'); return; }
      setNewClassName('');
      await loadData();
    } catch {
      setClassError('Network error');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!data?.teacher.id) return;
    if (!confirm('Delete this class? Students will lose their enrollment.')) return;
    setDeletingClassId(classId);
    try {
      const res = await fetch(`/api/classes?classId=${classId}&teacherId=${data.teacher.id}`, {
        method: 'DELETE',
      });
      if (res.ok) { await loadData(); }
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleOpenModuleMgmt = async (classId: string) => {
    if (managingClassId === classId) { setManagingClassId(null); return; }
    setManagingClassId(classId);
    // Only fetch if not already cached
    if (classModulesMap[classId] !== undefined) return;
    setModuleMgmtLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/modules?teacherId=${data?.teacher.id}`);
      if (res.ok) {
        const { modules: clsMods } = await res.json();
        setClassModulesMap((prev) => ({ ...prev, [classId]: clsMods ?? [] }));
      }
    } finally {
      setModuleMgmtLoading(false);
    }
  };

  const handleAssignModule = async (classId: string) => {
    if (!data?.teacher.id) return;
    const moduleId = addModuleSelections[classId];
    if (!moduleId) return;
    const res = await fetch(`/api/classes/${classId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: data.teacher.id, moduleId }),
    });
    if (res.ok) {
      const assignedMod = data.modules.find((m) => m.module_id === moduleId);
      if (assignedMod) {
        setClassModulesMap((prev) => ({ ...prev, [classId]: [...(prev[classId] ?? []), assignedMod] }));
        setAddModuleSelections((prev) => ({ ...prev, [classId]: '' }));
      }
    }
  };

  const handleUnassignModule = async (classId: string, moduleId: string) => {
    if (!data?.teacher.id) return;
    const res = await fetch(
      `/api/classes/${classId}/modules?teacherId=${data.teacher.id}&moduleId=${moduleId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      setClassModulesMap((prev) => ({
        ...prev,
        [classId]: (prev[classId] ?? []).filter((m) => m.module_id !== moduleId),
      }));
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

  const { teacher, modules, classes, totalQuestions } = data;

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="teacher" userName={teacher.name} onSignOut={handleSignOut} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950/30 p-6 flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-1">Instructor</p>
            <h1 className="text-2xl font-bold text-white">Welcome back, {teacher.name.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{modules.length} module{modules.length !== 1 ? 's' : ''} · {classes.length} class{classes.length !== 1 ? 'es' : ''} · {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}</p>
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
        </motion.div>

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
            { label: 'My Modules',  value: modules.length,  icon: '📚', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/5' },
            { label: 'My Classes',  value: classes.length,  icon: '🏫', color: 'text-cyan-400',   border: 'border-cyan-500/20',   bg: 'bg-cyan-500/5'   },
            { label: 'Questions',   value: totalQuestions,  icon: '❓', color: 'text-amber-400',  border: 'border-amber-500/20',  bg: 'bg-amber-500/5'  },
          ].map(({ label, value, icon, color, border, bg }) => (
            <div key={label} className={`rounded-xl border ${border} ${bg} p-4 text-center`}>
              <p className="text-xl mb-1" aria-hidden="true">{icon}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
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
          <div className="flex items-center justify-between mb-3">
            <h2 id="classes-heading" className="text-sm font-semibold text-white">My Classes</h2>
          </div>

          {/* Create Class Form */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateClass(); }}
              placeholder="New class name…"
              maxLength={80}
              className="flex-1 rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
            />
            <Button
              size="sm"
              onClick={handleCreateClass}
              loading={creatingClass}
              disabled={!newClassName.trim()}
            >
              + Create Class
            </Button>
          </div>
          {classError && <p className="text-xs text-red-400 mb-3">{classError}</p>}

          {classes.length === 0 ? (
            <p className="text-sm text-gray-600">No classes yet. Create one above so students can enroll.</p>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <Card key={cls.class_id} title={cls.class_name} action={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenModuleMgmt(cls.class_id)}
                    >
                      {managingClassId === cls.class_id ? 'Hide Modules' : 'Modules'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => loadAnalytics(cls.class_id)} loading={analyticsLoading}>
                      Analytics
                    </Button>
                    <button
                      onClick={() => handleDeleteClass(cls.class_id)}
                      disabled={deletingClassId === cls.class_id}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 disabled:opacity-50"
                      aria-label={`Delete class ${cls.class_name}`}
                    >
                      {deletingClassId === cls.class_id ? '…' : '✕'}
                    </button>
                  </div>
                }>
                  <p className="text-xs text-gray-600">
                    Created {new Date(cls.created_at).toLocaleDateString()}
                  </p>

                  {/* Module assignment panel */}
                  {managingClassId === cls.class_id && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Assigned Modules
                      </p>
                      {moduleMgmtLoading ? (
                        <p className="text-xs text-gray-600">Loading…</p>
                      ) : (classModulesMap[cls.class_id] ?? []).length === 0 ? (
                        <p className="text-xs text-gray-600 mb-3">No modules assigned yet.</p>
                      ) : (
                        <div className="space-y-1 mb-3">
                          {(classModulesMap[cls.class_id] ?? []).map((mod) => (
                            <div
                              key={mod.module_id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-gray-800/60 px-3 py-1.5"
                            >
                              <span className="text-xs text-gray-300 truncate">{mod.module_name}</span>
                              <button
                                onClick={() => handleUnassignModule(cls.class_id, mod.module_id)}
                                className="text-xs text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                                title="Remove from class"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add module selector */}
                      {(() => {
                        const assignedIds = new Set((classModulesMap[cls.class_id] ?? []).map((m) => m.module_id));
                        const unassigned = modules.filter((m) => !assignedIds.has(m.module_id));
                        if (unassigned.length === 0) {
                          return (
                            <p className="text-xs text-gray-600">All your modules are assigned to this class.</p>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <select
                              value={addModuleSelections[cls.class_id] ?? ''}
                              onChange={(e) =>
                                setAddModuleSelections((prev) => ({ ...prev, [cls.class_id]: e.target.value }))
                              }
                              className="flex-1 text-xs rounded-lg bg-gray-800 border border-white/10 text-white px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                            >
                              <option value="">Select module…</option>
                              {unassigned.map((m) => (
                                <option key={m.module_id} value={m.module_id}>{m.module_name}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              disabled={!addModuleSelections[cls.class_id]}
                              onClick={() => handleAssignModule(cls.class_id)}
                            >
                              + Assign
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
