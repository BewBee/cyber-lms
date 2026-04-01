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
function AdminModuleEditor({ adminId }: { adminId: string }) {
  const [modules, setModules] = useState<CoreModule[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [loadingMod, setLoadingMod] = useState<string | null>(null);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [deletingQId, setDeletingQId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState<Omit<Question, 'question_id'>>({
    question_text: '', difficulty: 1, explanation: '',
    question_options: [
      { option_key: 'A', option_text: '', is_correct: true },
      { option_key: 'B', option_text: '', is_correct: false },
      { option_key: 'C', option_text: '', is_correct: false },
      { option_key: 'D', option_text: '', is_correct: false },
    ],
  });

  // Create new module state
  const [showCreate, setShowCreate] = useState(false);
  const [newMod, setNewMod] = useState({ module_name: '', description: '', exp_bonus_percent: 0 });
  const [creatingMod, setCreatingMod] = useState(false);

  const loadModules = () =>
    supabase.from('modules').select('module_id, module_name, description').eq('module_type', 'core').order('module_name')
      .then(({ data }) => setModules((data ?? []) as CoreModule[]));

  useEffect(() => { loadModules(); }, []);

  const handleCreateModule = async () => {
    if (!newMod.module_name.trim()) return;
    setCreatingMod(true); setMsg(null);
    const { error } = await supabase.from('modules').insert({
      module_name: newMod.module_name.trim(),
      description: newMod.description.trim(),
      module_type: 'core',
      exp_bonus_percent: newMod.exp_bonus_percent,
      created_by: adminId,
    });
    if (error) { setMsg('✗ Failed to create module'); }
    else {
      setMsg('✓ Module created');
      setNewMod({ module_name: '', description: '', exp_bonus_percent: 0 });
      setShowCreate(false);
      await loadModules();
    }
    setCreatingMod(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const loadQuestions = useCallback(async (moduleId: string) => {
    if (questions[moduleId]) return;
    setLoadingMod(moduleId);
    const { data } = await supabase
      .from('questions')
      .select('question_id, question_text, difficulty, explanation, question_options ( option_key, option_text, is_correct )')
      .eq('module_id', moduleId)
      .order('question_text');
    setQuestions((prev) => ({ ...prev, [moduleId]: (data ?? []) as Question[] }));
    setLoadingMod(null);
  }, [questions]);

  const toggleModule = (moduleId: string) => {
    if (expanded === moduleId) { setExpanded(null); return; }
    setExpanded(moduleId);
    loadQuestions(moduleId);
  };

  const saveEdit = async () => {
    if (!editQ) return;
    setSaving(true); setMsg(null);
    // Update question text + difficulty + explanation
    await supabase.from('questions').update({
      question_text: editQ.question_text,
      difficulty: editQ.difficulty,
      explanation: editQ.explanation,
    }).eq('question_id', editQ.question_id);
    // Update each option
    for (const opt of editQ.question_options) {
      await supabase.from('question_options')
        .update({ option_text: opt.option_text, is_correct: opt.is_correct })
        .eq('question_id', editQ.question_id)
        .eq('option_key', opt.option_key);
    }
    // Refresh questions for this module
    const modId = Object.entries(questions).find(([, qs]) => qs.some(q => q.question_id === editQ.question_id))?.[0];
    if (modId) {
      const { data } = await supabase
        .from('questions')
        .select('question_id, question_text, difficulty, explanation, question_options ( option_key, option_text, is_correct )')
        .eq('module_id', modId).order('question_text');
      setQuestions((prev) => ({ ...prev, [modId]: (data ?? []) as Question[] }));
    }
    setMsg('✓ Saved'); setSaving(false); setEditQ(null);
    setTimeout(() => setMsg(null), 3000);
  };

  const saveNewQuestion = async (moduleId: string) => {
    if (!newQ.question_text.trim()) return;
    setSaving(true); setMsg(null);
    const { data: qData } = await supabase.from('questions').insert({
      module_id: moduleId,
      question_text: newQ.question_text,
      difficulty: newQ.difficulty,
      explanation: newQ.explanation,
    }).select('question_id').single();
    if (qData) {
      for (const opt of newQ.question_options) {
        await supabase.from('question_options').insert({
          question_id: qData.question_id,
          option_key: opt.option_key,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
        });
      }
      // Reset + refresh
      setNewQ({ question_text: '', difficulty: 1, explanation: '', question_options: [
        { option_key: 'A', option_text: '', is_correct: true },
        { option_key: 'B', option_text: '', is_correct: false },
        { option_key: 'C', option_text: '', is_correct: false },
        { option_key: 'D', option_text: '', is_correct: false },
      ]});
      setAddingTo(null);
      const { data } = await supabase
        .from('questions')
        .select('question_id, question_text, difficulty, explanation, question_options ( option_key, option_text, is_correct )')
        .eq('module_id', moduleId).order('question_text');
      setQuestions((prev) => ({ ...prev, [moduleId]: (data ?? []) as Question[] }));
      setMsg('✓ Question added');
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const deleteQuestion = async (questionId: string, moduleId: string) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    setDeletingQId(questionId); setMsg(null);
    // Delete options first, then question
    await supabase.from('question_options').delete().eq('question_id', questionId);
    const { error } = await supabase.from('questions').delete().eq('question_id', questionId);
    if (error) {
      const isFk = error.code === '23503' || error.message?.includes('foreign key');
      setMsg(isFk ? '✗ Cannot delete — question has student attempt history' : '✗ Delete failed');
    } else {
      setQuestions((prev) => ({ ...prev, [moduleId]: (prev[moduleId] ?? []).filter(q => q.question_id !== questionId) }));
      setMsg('✓ Question deleted');
    }
    setDeletingQId(null);
    setTimeout(() => setMsg(null), 4000);
  };

  const DIFF_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Hard' };
  const DIFF_COLORS: Record<number, string> = { 1: 'text-green-400', 2: 'text-green-400', 3: 'text-yellow-400', 4: 'text-red-400', 5: 'text-red-400' };
  void adminId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Click a module to view and edit its questions.</p>
        <button onClick={() => setShowCreate((v) => !v)} className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg px-3 py-1.5 transition-colors">
          {showCreate ? '✕ Cancel' : '+ New Core Module'}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
          <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest">▸ Create Core Module</p>
          <input value={newMod.module_name} onChange={(e) => setNewMod({ ...newMod, module_name: e.target.value })}
            placeholder="Module name…"
            className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
          <textarea value={newMod.description} onChange={(e) => setNewMod({ ...newMod, description: e.target.value })}
            placeholder="Short description…"
            rows={2}
            className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-sm px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">EXP Bonus %:</label>
            <input type="number" min={0} max={100} value={newMod.exp_bonus_percent}
              onChange={(e) => setNewMod({ ...newMod, exp_bonus_percent: Number(e.target.value) })}
              className="w-20 rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none focus:border-cyan-500" />
          </div>
          <button onClick={handleCreateModule} disabled={creatingMod || !newMod.module_name.trim()}
            className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded px-4 py-1.5 disabled:opacity-50 transition-colors">
            {creatingMod ? 'Creating…' : '+ Create Module'}
          </button>
        </div>
      )}

      {msg && <p className={`text-xs font-semibold ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

      {modules.map((mod) => {
        const isOpen = expanded === mod.module_id;
        const qs = questions[mod.module_id] ?? [];
        return (
          <div key={mod.module_id} className="rounded-xl border border-white/8 bg-gray-900/60 overflow-hidden">
            <button
              onClick={() => toggleModule(mod.module_id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-semibold text-white">{mod.module_name}</p>
                <p className="text-xs text-gray-500 truncate max-w-lg">{mod.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {questions[mod.module_id] && (
                  <span className="text-xs text-gray-600">{qs.length} questions</span>
                )}
                <span className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="border-t border-white/5 px-5 pb-5 pt-3 space-y-3">
                    {loadingMod === mod.module_id ? (
                      <p className="text-xs text-gray-500 py-2">Loading questions…</p>
                    ) : qs.length === 0 ? (
                      <p className="text-xs text-gray-600 py-2">No questions yet.</p>
                    ) : (
                      qs.map((q, qi) => (
                        <div key={q.question_id} className="rounded-lg border border-white/5 bg-gray-800/50 p-3 space-y-2">
                          {editQ?.question_id === q.question_id ? (
                            // ── Edit mode ──────────────────────────────────
                            <div className="space-y-3">
                              <textarea
                                value={editQ.question_text}
                                onChange={(e) => setEditQ({ ...editQ, question_text: e.target.value })}
                                className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500"
                                rows={2}
                              />
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-gray-500">Difficulty:</label>
                                <select value={editQ.difficulty} onChange={(e) => setEditQ({ ...editQ, difficulty: Number(e.target.value) })}
                                  className="rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none">
                                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {DIFF_LABELS[n]}</option>)}
                                </select>
                              </div>
                              <textarea
                                value={editQ.explanation}
                                onChange={(e) => setEditQ({ ...editQ, explanation: e.target.value })}
                                placeholder="Explanation shown after wrong answer…"
                                className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                                rows={2}
                              />
                              {editQ.question_options.map((opt, oi) => (
                                <div key={opt.option_key} className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-400 w-4">{opt.option_key}</span>
                                  <input value={opt.option_text}
                                    onChange={(e) => setEditQ({ ...editQ, question_options: editQ.question_options.map((o, i) => i === oi ? { ...o, option_text: e.target.value } : o) })}
                                    className="flex-1 rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none focus:border-cyan-500"
                                  />
                                  <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                                    <input type="radio" name={`correct-${q.question_id}`} checked={opt.is_correct}
                                      onChange={() => setEditQ({ ...editQ, question_options: editQ.question_options.map((o, i) => ({ ...o, is_correct: i === oi })) })}
                                      className="accent-green-500"
                                    />
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
                            // ── View mode ──────────────────────────────────
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
                          placeholder="Question text…"
                          className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                          rows={2}
                        />
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-gray-500">Difficulty:</label>
                          <select value={newQ.difficulty} onChange={(e) => setNewQ({ ...newQ, difficulty: Number(e.target.value) })}
                            className="rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none">
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {DIFF_LABELS[n]}</option>)}
                          </select>
                        </div>
                        <textarea value={newQ.explanation} onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                          placeholder="Explanation shown after wrong answer…"
                          className="w-full rounded-lg bg-gray-700 border border-white/10 text-white text-xs px-3 py-2 resize-none focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                          rows={2}
                        />
                        {newQ.question_options.map((opt, oi) => (
                          <div key={opt.option_key} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 w-4">{opt.option_key}</span>
                            <input value={opt.option_text}
                              onChange={(e) => setNewQ({ ...newQ, question_options: newQ.question_options.map((o, i) => i === oi ? { ...o, option_text: e.target.value } : o) })}
                              placeholder={`Option ${opt.option_key}`}
                              className="flex-1 rounded bg-gray-700 border border-white/10 text-white text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                            />
                            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                              <input type="radio" name={`new-correct-${mod.module_id}`} checked={opt.is_correct}
                                onChange={() => setNewQ({ ...newQ, question_options: newQ.question_options.map((o, i) => ({ ...o, is_correct: i === oi })) })}
                                className="accent-green-500"
                              />
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
