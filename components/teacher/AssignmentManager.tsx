/**
 * components/teacher/AssignmentManager.tsx — Assignment creation and submission grading UI.
 * Teachers can create assignments linked to their modules, view student submissions, and grade them.
 * To test: render inside the teacher dashboard with teacherId and modules props.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Assignment, Module, Submission } from '@/types';

interface AssignmentManagerProps {
  teacherId: string;
  modules: Module[];
  onAssignmentCreated?: () => void;
}

interface SubmissionWithStudent extends Submission {
  student?: { id: string; name: string; email: string };
  graded_by_name?: string | null;
  graded_at?: string | null;
}

export function AssignmentManager({ teacherId, modules, onAssignmentCreated }: AssignmentManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formModuleId, setFormModuleId] = useState(modules[0]?.module_id ?? '');
  const [formTitle, setFormTitle] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Submissions panel state
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { grade: string; feedback: string }>>({});

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/teacher/assignments?teacherId=${teacherId}`);
      const json = await res.json();
      setAssignments(json.assignments ?? []);
    } catch {
      // silently fail — empty state shows
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => { loadAssignments(); }, [teacherId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTitle.trim()) { setFormError('Title is required'); return; }
    if (!formModuleId) { setFormError('Select a module'); return; }

    setFormSaving(true);
    try {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: formModuleId,
          title: formTitle,
          instructions: formInstructions,
          due_date: formDueDate || null,
          created_by: teacherId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create');
      setFormTitle('');
      setFormInstructions('');
      setFormDueDate('');
      setShowForm(false);
      await loadAssignments();
      onAssignmentCreated?.();
    } catch (e) {
      setFormError(String((e as Error).message));
    } finally {
      setFormSaving(false);
    }
  };

  const openSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}/submissions`);
      const json = await res.json();
      setSubmissions(json.submissions ?? []);
      // Seed grade inputs from existing grades
      const inputs: Record<string, { grade: string; feedback: string }> = {};
      (json.submissions ?? []).forEach((s: SubmissionWithStudent) => {
        inputs[s.id] = { grade: s.grade ?? '', feedback: s.feedback ?? '' };
      });
      setGradeInputs(inputs);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGrade = async (submissionId: string, assignmentId: string) => {
    const { grade, feedback } = gradeInputs[submissionId] ?? {};
    if (!grade?.trim()) return;
    setGradingId(submissionId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId, grade, feedback, graded_by: teacherId }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? { ...s, grade, feedback, graded_by_name: 'You', graded_at: now }
              : s
          )
        );
      }
    } finally {
      setGradingId(null);
    }
  };

  const moduleNameById = (id: string) =>
    modules.find((m) => m.module_id === id)?.module_name ?? id;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Assignments</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '✕ Cancel' : '+ New Assignment'}
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            onSubmit={handleCreate}
          >
            <div className="rounded-xl border border-cyan-500/20 bg-gray-900/60 p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Module</label>
                <select
                  value={formModuleId}
                  onChange={(e) => setFormModuleId(e.target.value)}
                  className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500"
                >
                  {modules.map((m) => (
                    <option key={m.module_id} value={m.module_id}>{m.module_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Firewall Configuration Report"
                  className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Instructions <span className="text-gray-600">(optional)</span></label>
                <textarea
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  rows={3}
                  placeholder="Describe what students need to do and submit…"
                  className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 placeholder-gray-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Due Date <span className="text-gray-600">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
              {formError && <p className="text-xs text-red-400" role="alert">{formError}</p>}
              <Button type="submit" loading={formSaving}>Create Assignment</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Assignments list */}
      {loadingAssignments ? (
        <p className="text-xs text-gray-600 animate-pulse">Loading assignments…</p>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-gray-600">No assignments yet. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500">{moduleNameById(a.module_id)}</span>
                  {a.due_date && (
                    <span className={[
                      'text-xs font-mono px-1.5 py-0.5 rounded',
                      new Date(a.due_date) < new Date()
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-yellow-500/10 text-yellow-400',
                    ].join(' ')}>
                      Due {new Date(a.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openSubmissions(a)}
              >
                Submissions
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Submissions drawer */}
      <AnimatePresence>
        {selectedAssignment && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-xl border border-white/10 bg-gray-900/60 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Submissions — {selectedAssignment.title}
              </h3>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="text-xs text-gray-500 hover:text-white transition-colors"
                aria-label="Close submissions"
              >
                ✕
              </button>
            </div>

            {loadingSubmissions ? (
              <p className="text-xs text-gray-600 animate-pulse">Loading…</p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-gray-600">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-lg border border-white/5 bg-gray-800/40 p-4 space-y-3"
                  >
                    {/* Student info */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {sub.student?.name ?? sub.student_id}
                        </p>
                        <p className="text-xs text-gray-500">{sub.student?.email}</p>
                      </div>
                      <span className={[
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        sub.grade
                          ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
                      ].join(' ')}>
                        {sub.grade ? `Graded: ${sub.grade}` : 'Pending'}
                      </span>
                    </div>

                    {/* Submission link */}
                    {sub.file_url && (
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                      >
                        📎 View submission
                      </a>
                    )}

                    {/* Submitted at + grader info */}
                    <p className="text-xs text-gray-600">
                      Submitted {new Date(sub.submitted_at).toLocaleString()}
                    </p>
                    {sub.graded_at && sub.graded_by_name && (
                      <p className="text-xs text-gray-600">
                        Graded by <span className="text-gray-400">{sub.graded_by_name}</span>
                        {' '}on {new Date(sub.graded_at).toLocaleString()}
                      </p>
                    )}

                    {/* Grade inputs */}
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Grade (e.g. A, 85/100)"
                        value={gradeInputs[sub.id]?.grade ?? ''}
                        onChange={(e) =>
                          setGradeInputs((prev) => ({
                            ...prev,
                            [sub.id]: { ...prev[sub.id], grade: e.target.value },
                          }))
                        }
                        className="flex-1 min-w-[120px] rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-500"
                      />
                      <input
                        type="text"
                        placeholder="Feedback (optional)"
                        value={gradeInputs[sub.id]?.feedback ?? ''}
                        onChange={(e) =>
                          setGradeInputs((prev) => ({
                            ...prev,
                            [sub.id]: { ...prev[sub.id], feedback: e.target.value },
                          }))
                        }
                        className="flex-1 min-w-[180px] rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-500"
                      />
                      <Button
                        size="sm"
                        loading={gradingId === sub.id}
                        onClick={() => handleGrade(sub.id, selectedAssignment.id)}
                      >
                        Save Grade
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
