/**
 * app/admin/dashboard/page.tsx — Admin dashboard for CyberShield LMS.
 * Shows system stats, all users, and allows role changes.
 * Only accessible by users with role = 'admin'.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ChapterBuilder } from '@/components/campaign/ChapterBuilder';
import type { User } from '@/types';

type SortField = 'name' | 'role' | 'total_exp' | 'created_at';
type AdminTab = 'users' | 'campaign' | 'modules';

// ── Types for module editor ──────────────────────────────────────────────────
interface QOption { option_key: string; option_text: string; is_correct: boolean; }
interface Question { question_id: string; question_text: string; difficulty: number; explanation: string; question_options: QOption[]; }
interface CoreModule { module_id: string; module_name: string; description: string; }

// ── Admin Module Editor ──────────────────────────────────────────────────────
interface AdminModule { module_id: string; module_name: string; description: string; module_type: string; exp_bonus_percent: number; question_count: number; }

function AdminModuleEditor({ adminId }: { adminId: string }) {
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [loadingQ, setLoadingQ] = useState<string | null>(null);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [deletingQId, setDeletingQId] = useState<string | null>(null);
  const [deletingModId, setDeletingModId] = useState<string | null>(null);

  // Edit module metadata state
  const [editingMod, setEditingMod] = useState<string | null>(null);
  const [editModForm, setEditModForm] = useState({ module_name: '', description: '', exp_bonus_percent: 0 });

  // Create module state
  const [showCreate, setShowCreate] = useState(false);
  const [newMod, setNewMod] = useState({ module_name: '', description: '', module_type: 'core', exp_bonus_percent: 0 });
  const [creatingMod, setCreatingMod] = useState(false);

  const [newQ, setNewQ] = useState<Omit<Question, 'question_id'>>({
    question_text: '', difficulty: 1, explanation: '',
    question_options: [
      { option_key: 'A', option_text: '', is_correct: true },
      { option_key: 'B', option_text: '', is_correct: false },
      { option_key: 'C', option_text: '', is_correct: false },
      { option_key: 'D', option_text: '', is_correct: false },
    ],
  });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };

  // ── Load all modules via API (service role) ──────────────────────────────
  const loadModules = useCallback(async () => {
    setLoadingModules(true);
    const res = await fetch(`/api/admin/modules?adminId=${adminId}`);
    if (res.ok) { const { modules: mods } = await res.json(); setModules(mods ?? []); }
    setLoadingModules(false);
  }, [adminId]);

  useEffect(() => { loadModules(); }, [loadModules]);

  // ── Load questions for a module ──────────────────────────────────────────
  const loadQuestions = async (moduleId: string, force = false) => {
    if (questions[moduleId] && !force) return;
    setLoadingQ(moduleId);
    const res = await fetch(`/api/admin/modules/${moduleId}?adminId=${adminId}`);
    if (res.ok) {
      const { module } = await res.json();
      setQuestions((prev) => ({ ...prev, [moduleId]: (module.questions ?? []) as Question[] }));
    }
    setLoadingQ(null);
  };

  const toggleModule = (moduleId: string) => {
    if (expanded === moduleId) { setExpanded(null); return; }
    setExpanded(moduleId);
    loadQuestions(moduleId);
  };

  // ── Create module ────────────────────────────────────────────────────────
  const handleCreateModule = async () => {
    if (!newMod.module_name.trim()) return;
    setCreatingMod(true);
    const res = await fetch('/api/admin/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, ...newMod }),
    });
    const json = await res.json();
    if (!res.ok) { flash(`✗ ${json.error ?? 'Failed to create'}`); }
    else {
      setNewMod({ module_name: '', description: '', module_type: 'core', exp_bonus_percent: 0 });
      setShowCreate(false);
      await loadModules();
      flash('✓ Module created');
    }
    setCreatingMod(false);
  };

  // ── Save module metadata ─────────────────────────────────────────────────
  const handleSaveMod = async (moduleId: string) => {
    setSaving(true);
    const res = await fetch(`/api/admin/modules/${moduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, ...editModForm }),
    });
    const json = await res.json();
    if (!res.ok) { flash(`✗ ${json.error ?? 'Failed to update'}`); }
    else {
      setModules((prev) => prev.map((m) => m.module_id === moduleId ? { ...m, ...editModForm } : m));
      setEditingMod(null);
      flash('✓ Module updated');
    }
    setSaving(false);
  };

  // ── Delete module ────────────────────────────────────────────────────────
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module? This cannot be undone.')) return;
    setDeletingModId(moduleId);
    const res = await fetch(`/api/admin/modules/${moduleId}?adminId=${adminId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) { flash(`✗ ${json.error ?? 'Delete failed'}`); }
    else {
      setModules((prev) => prev.filter((m) => m.module_id !== moduleId));
      if (expanded === moduleId) setExpanded(null);
      flash('✓ Module deleted');
    }
    setDeletingModId(null);
  };

  // ── Question operations (via /api/admin/questions routes) ────────────────
  const saveEdit = async () => {
    if (!editQ) return;
    setSaving(true);
    const modId = Object.entries(questions).find(([, qs]) => qs.some(q => q.question_id === editQ.question_id))?.[0];
    const res = await fetch(`/api/admin/questions/${editQ.question_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, question_text: editQ.question_text, difficulty: editQ.difficulty, explanation: editQ.explanation, options: editQ.question_options }),
    });
    const json = await res.json();
    if (!res.ok) { flash(`✗ ${json.error ?? 'Save failed'}`); }
    else { if (modId) await loadQuestions(modId, true); setEditQ(null); flash('✓ Question saved'); }
    setSaving(false);
  };

  const saveNewQuestion = async (moduleId: string) => {
    if (!newQ.question_text.trim()) return;
    setSaving(true);
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, moduleId, question_text: newQ.question_text, difficulty: newQ.difficulty, explanation: newQ.explanation, options: newQ.question_options }),
    });
    const json = await res.json();
    if (!res.ok) { flash(`✗ ${json.error ?? 'Failed to add'}`); }
    else {
      setNewQ({ question_text: '', difficulty: 1, explanation: '', question_options: [
        { option_key: 'A', option_text: '', is_correct: true },
        { option_key: 'B', option_text: '', is_correct: false },
        { option_key: 'C', option_text: '', is_correct: false },
        { option_key: 'D', option_text: '', is_correct: false },
      ]});
      setAddingTo(null);
      await loadQuestions(moduleId, true);
      // Update question count in module list
      setModules((prev) => prev.map((m) => m.module_id === moduleId ? { ...m, question_count: m.question_count + 1 } : m));
      flash('✓ Question added');
    }
    setSaving(false);
  };

  const deleteQuestion = async (questionId: string, moduleId: string) => {
    if (!confirm('Delete this question? Cannot be undone.')) return;
    setDeletingQId(questionId);
    const res = await fetch(`/api/admin/questions/${questionId}?adminId=${adminId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) { flash(`✗ ${json.error ?? 'Delete failed'}`); }
    else {
      setQuestions((prev) => ({ ...prev, [moduleId]: (prev[moduleId] ?? []).filter(q => q.question_id !== questionId) }));
      setModules((prev) => prev.map((m) => m.module_id === moduleId ? { ...m, question_count: Math.max(0, m.question_count - 1) } : m));
      flash('✓ Question deleted');
    }
    setDeletingQId(null);
  };

  const DIFF_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Hard' };
  const DIFF_COLORS: Record<number, string> = { 1: 'text-green-400', 2: 'text-green-400', 3: 'text-yellow-400', 4: 'text-red-400', 5: 'text-red-400' };

  if (loadingModules) return <div className="rounded-xl border border-white/5 bg-gray-900/40 p-6 animate-pulse h-24" />;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {modules.length} module{modules.length !== 1 ? 's' : ''} · click to expand questions
        </p>
        <button onClick={() => setShowCreate((v) => !v)}
          className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg px-3 py-1.5 transition-colors">
          {showCreate ? '✕ Cancel' : '+ New Module'}
        </button>
      </div>

      {msg && <p className={`text-xs font-semibold ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

      {/* Create Module Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
              <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest">▸ New Module</p>
              <div className="grid grid-cols-2 gap-3">
                <input value={newMod.module_name} onChange={(e) => setNewMod({ ...newMod, module_name: e.target.value })}
                  placeholder="Module name *" className="col-span-2 rounded-lg bg-gray-700 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
                <textarea value={newMod.description} onChange={(e) => setNewMod({ ...newMod, description: e.target.value })}
                  placeholder="Description…" rows={2}
                  className="col-span-2 rounded-lg bg-gray-700 border border-white/10 text-white text-sm px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Type:</label>
                  <select value={newMod.module_type} onChange={(e) => setNewMod({ ...newMod, module_type: e.target.value })}
                    className="rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none">
                    <option value="core">Core (story mode)</option>
                    <option value="teacher">Custom</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">EXP Bonus %:</label>
                  <input type="number" min={0} max={100} value={newMod.exp_bonus_percent}
                    onChange={(e) => setNewMod({ ...newMod, exp_bonus_percent: Number(e.target.value) })}
                    className="w-16 rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none" />
                </div>
              </div>
              <button onClick={handleCreateModule} disabled={creatingMod || !newMod.module_name.trim()}
                className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded px-4 py-1.5 disabled:opacity-50 transition-colors">
                {creatingMod ? 'Creating…' : '+ Create Module'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module List */}
      {modules.map((mod) => {
        const isOpen = expanded === mod.module_id;
        const qs = questions[mod.module_id] ?? [];
        const isEditingMeta = editingMod === mod.module_id;
        return (
          <div key={mod.module_id} className="rounded-xl border border-white/8 bg-gray-900/60 overflow-hidden">
            {/* Module header */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button onClick={() => toggleModule(mod.module_id)} className="flex-1 flex items-start gap-3 text-left min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{mod.module_name}</p>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${mod.module_type === 'core' ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
                      {mod.module_type}
                    </span>
                    <span className="text-[10px] text-gray-600">{mod.question_count} Qs</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate max-w-lg mt-0.5">{mod.description}</p>
                </div>
              </button>
              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setEditingMod(isEditingMeta ? null : mod.module_id); setEditModForm({ module_name: mod.module_name, description: mod.description ?? '', exp_bonus_percent: mod.exp_bonus_percent }); }}
                  className="text-xs text-gray-600 hover:text-cyan-400 transition-colors px-2 py-1">
                  {isEditingMeta ? 'Cancel' : 'Edit'}
                </button>
                <button onClick={() => handleDeleteModule(mod.module_id)} disabled={deletingModId === mod.module_id}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 disabled:opacity-50">
                  {deletingModId === mod.module_id ? '…' : 'Del'}
                </button>
                <button onClick={() => toggleModule(mod.module_id)} className={`text-gray-500 px-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</button>
              </div>
            </div>

            {/* Edit module metadata */}
            <AnimatePresence initial={false}>
              {isEditingMeta && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                  <div className="border-t border-white/5 px-4 py-3 space-y-2 bg-gray-800/40">
                    <input value={editModForm.module_name} onChange={(e) => setEditModForm({ ...editModForm, module_name: e.target.value })}
                      placeholder="Module name" className="w-full rounded bg-gray-700 border border-white/10 text-white text-sm px-3 py-1.5 focus:outline-none focus:border-cyan-500" />
                    <textarea value={editModForm.description} onChange={(e) => setEditModForm({ ...editModForm, description: e.target.value })}
                      placeholder="Description" rows={2} className="w-full rounded bg-gray-700 border border-white/10 text-white text-xs px-3 py-1.5 resize-none focus:outline-none focus:border-cyan-500" />
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-500">EXP Bonus %:</label>
                      <input type="number" min={0} max={100} value={editModForm.exp_bonus_percent}
                        onChange={(e) => setEditModForm({ ...editModForm, exp_bonus_percent: Number(e.target.value) })}
                        className="w-16 rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none" />
                      <button onClick={() => handleSaveMod(mod.module_id)} disabled={saving || !editModForm.module_name.trim()}
                        className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded px-3 py-1 disabled:opacity-50 transition-colors ml-auto">
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Questions panel */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="border-t border-white/5 px-5 pb-5 pt-3 space-y-3">
                    {loadingQ === mod.module_id ? (
                      <p className="text-xs text-gray-500 py-2">Loading questions…</p>
                    ) : qs.length === 0 ? (
                      <p className="text-xs text-gray-600 py-2">No questions yet.</p>
                    ) : (
                      qs.map((q, qi) => (
                        <div key={q.question_id} className="rounded-lg border border-white/5 bg-gray-800/50 p-3 space-y-2">
                          {editQ?.question_id === q.question_id ? (
                            <div className="space-y-3">
                              <textarea value={editQ.question_text} onChange={(e) => setEditQ({ ...editQ, question_text: e.target.value })}
                                className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500" rows={2} />
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-gray-500">Difficulty:</label>
                                <select value={editQ.difficulty} onChange={(e) => setEditQ({ ...editQ, difficulty: Number(e.target.value) })}
                                  className="rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none">
                                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {DIFF_LABELS[n]}</option>)}
                                </select>
                              </div>
                              <textarea value={editQ.explanation} onChange={(e) => setEditQ({ ...editQ, explanation: e.target.value })}
                                placeholder="Explanation…" className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600" rows={2} />
                              {editQ.question_options.map((opt, oi) => (
                                <div key={opt.option_key} className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-400 w-4">{opt.option_key}</span>
                                  <input value={opt.option_text}
                                    onChange={(e) => setEditQ({ ...editQ, question_options: editQ.question_options.map((o, i) => i === oi ? { ...o, option_text: e.target.value } : o) })}
                                    className="flex-1 rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none focus:border-cyan-500" />
                                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                                    <input type="radio" name={`correct-${q.question_id}`} checked={opt.is_correct}
                                      onChange={() => setEditQ({ ...editQ, question_options: editQ.question_options.map((o, i) => ({ ...o, is_correct: i === oi })) })}
                                      className="accent-green-500" />
                                    Correct
                                  </label>
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <button onClick={saveEdit} disabled={saving} className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded px-3 py-1 disabled:opacity-50">
                                  {saving ? 'Saving…' : 'Save'}
                                </button>
                                <button onClick={() => setEditQ(null)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 mb-1">
                                  <span className="font-mono text-gray-600">Q{qi + 1}</span>
                                  <span className={`ml-2 text-[10px] font-mono ${DIFF_COLORS[q.difficulty]}`}>{DIFF_LABELS[q.difficulty]}</span>
                                </p>
                                <p className="text-sm text-white">{q.question_text}</p>
                                <div className="mt-2 space-y-0.5">
                                  {q.question_options.map((opt) => (
                                    <p key={opt.option_key} className={`text-xs ${opt.is_correct ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                                      {opt.option_key}. {opt.option_text}{opt.is_correct ? ' ✓' : ''}
                                    </p>
                                  ))}
                                </div>
                                {q.explanation && <p className="text-[10px] text-cyan-700 mt-1 italic">{q.explanation}</p>}
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0 ml-2">
                                <button onClick={() => setEditQ({ ...q })} className="text-xs text-gray-600 hover:text-cyan-400 transition-colors">Edit</button>
                                <button onClick={() => deleteQuestion(q.question_id, mod.module_id)} disabled={deletingQId === q.question_id}
                                  className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50">
                                  {deletingQId === q.question_id ? '…' : 'Del'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {/* Add new question */}
                    {addingTo === mod.module_id ? (
                      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
                        <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest">▸ New Question</p>
                        <textarea value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })}
                          placeholder="Question text…" rows={2}
                          className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-gray-500">Difficulty:</label>
                          <select value={newQ.difficulty} onChange={(e) => setNewQ({ ...newQ, difficulty: Number(e.target.value) })}
                            className="rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none">
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {DIFF_LABELS[n]}</option>)}
                          </select>
                        </div>
                        <textarea value={newQ.explanation} onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                          placeholder="Explanation after wrong answer…" rows={2}
                          className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
                        {newQ.question_options.map((opt, oi) => (
                          <div key={opt.option_key} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 w-4">{opt.option_key}</span>
                            <input value={opt.option_text}
                              onChange={(e) => setNewQ({ ...newQ, question_options: newQ.question_options.map((o, i) => i === oi ? { ...o, option_text: e.target.value } : o) })}
                              placeholder={`Option ${opt.option_key}`}
                              className="flex-1 rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
                            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                              <input type="radio" name={`new-correct-${mod.module_id}`} checked={opt.is_correct}
                                onChange={() => setNewQ({ ...newQ, question_options: newQ.question_options.map((o, i) => ({ ...o, is_correct: i === oi })) })}
                                className="accent-green-500" />
                              Correct
                            </label>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveNewQuestion(mod.module_id)} disabled={saving || !newQ.question_text.trim()}
                            className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded px-3 py-1 disabled:opacity-50">
                            {saving ? 'Adding…' : '+ Add Question'}
                          </button>
                          <button onClick={() => setAddingTo(null)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(mod.module_id)}
                        className="text-xs text-cyan-500 hover:text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg px-3 py-2 w-full transition-colors">
                        + Add Question
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ id: string; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) { window.location.href = '/login'; return; }

    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!userData || userData.role !== 'admin') { window.location.href = '/'; return; }

    setAdmin(userData as User);

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, name, role, total_exp, level, created_at')
      .order('created_at', { ascending: false });

    setUsers((allUsers ?? []) as User[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    setStatusMsg(null);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (error) {
      setStatusMsg({ id: userId, msg: '✗ Failed to update role' });
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole as User['role'] } : u));
      setStatusMsg({ id: userId, msg: '✓ Role updated' });
    }
    setUpdatingId(null);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="admin" />
      <main className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" label="Loading admin panel…" />
      </main>
    </div>
  );

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'total_exp') return b.total_exp - a.total_exp;
    if (sortField === 'name') return a.name.localeCompare(b.name);
    if (sortField === 'role') return a.role.localeCompare(b.role);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const ROLE_COLORS: Record<string, string> = {
    admin: 'text-red-400 bg-red-500/10 border-red-500/20',
    teacher: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    student: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="admin" userName={admin?.name} onSignOut={handleSignOut} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-mono text-red-500 uppercase tracking-widest mb-1">Admin Panel</p>
          <h1 className="text-2xl font-bold text-white">System Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage users and monitor the platform</p>
        </div>

        {/* Tab Nav */}
        <div className="flex items-center gap-1 border-b border-white/5 pb-0">
          {([
            { id: 'users', label: '👥 Users' },
            { id: 'campaign', label: '🗺️ Campaign' },
            { id: 'modules', label: '📚 Modules' },
          ] as { id: AdminTab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all',
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-gray-500 hover:text-gray-400',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Campaign Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'campaign' && admin && (
          <ChapterBuilder adminId={admin.id} />
        )}

        {/* ── Modules Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'modules' && admin && (
          <AdminModuleEditor adminId={admin.id} />
        )}

        {/* ── Users Tab content below ───────────────────────────────────────── */}
        {activeTab === 'users' && (<>

        {/* System stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Users', value: users.length, icon: '👥' },
            { label: 'Students', value: roleCounts.student ?? 0, icon: '🎓' },
            { label: 'Teachers', value: roleCounts.teacher ?? 0, icon: '📚' },
            { label: 'Admins', value: roleCounts.admin ?? 0, icon: '🔑' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-gray-900/40 p-4 text-center">
              <p className="text-xl mb-1" aria-hidden="true">{icon}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* User management */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-sm font-semibold text-white">User Management</h2>
            <div className="flex items-center gap-3">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="created_at">Sort: Newest</option>
                <option value="name">Sort: Name</option>
                <option value="role">Sort: Role</option>
                <option value="total_exp">Sort: EXP</option>
              </select>
              <input
                type="text"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600 w-48"
              />
            </div>
          </div>

          <div className="space-y-2">
            {sorted.length === 0 && (
              <p className="text-sm text-gray-600">No users match your search.</p>
            )}
            {sorted.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 flex-wrap"
              >
                {/* Avatar */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-white flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>

                {/* Current role badge */}
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_COLORS[u.role] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>
                  {u.role}
                </span>

                {/* Stats */}
                <span className="text-xs text-gray-500 flex-shrink-0">
                  Lv.{u.level} · {u.total_exp} XP
                </span>

                {/* Role changer (can't change own role) */}
                {u.id !== admin?.id ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      defaultValue={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="admin">admin</option>
                    </select>
                    {statusMsg?.id === u.id && (
                      <span className={`text-xs ${statusMsg.msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                        {statusMsg.msg}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-600 flex-shrink-0">you</span>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        </>)}
      </main>

      <Footer />
    </div>
  );
}
