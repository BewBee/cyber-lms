/**
 * components/campaign/ChapterBuilder.tsx — Admin UI for managing campaign chapters.
 * Allows creating/editing chapters, assigning missions (modules), setting boss missions,
 * toggling unlock/coming-soon states, and deleting chapters.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChapterMission {
  id: string;
  module_id: string;
  mission_order: number;
  is_boss: boolean;
  modules: { module_name: string } | null;
}

interface ChapterData {
  chapter_id: string;
  chapter_number: number;
  title: string;
  subtitle: string;
  lore_text: string;
  is_unlocked: boolean;
  is_coming_soon: boolean;
  chapter_missions: ChapterMission[];
}

interface CoreModule {
  module_id: string;
  module_name: string;
  question_count: number;
}

interface ChapterBuilderProps {
  adminId: string;
}

const EMPTY_CHAPTER = {
  title: '',
  subtitle: '',
  lore_text: '',
  chapter_number: 1,
  is_unlocked: false,
  is_coming_soon: false,
};

export function ChapterBuilder({ adminId }: ChapterBuilderProps) {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [modules, setModules] = useState<CoreModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState(EMPTY_CHAPTER);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<ChapterData>>({});

  // Add mission form state
  const [missionForm, setMissionForm] = useState<{
    chapterId: string;
    moduleId: string;
    missionOrder: number;
    isBoss: boolean;
  } | null>(null);

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const loadChapters = useCallback(async () => {
    const res = await fetch('/api/admin/chapters');
    if (res.ok) {
      const { chapters: ch } = await res.json();
      setChapters(ch ?? []);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await loadChapters();
      const modRes = await fetch(`/api/admin/core-modules?adminId=${adminId}`);
      if (modRes.ok) {
        const { modules: mods } = await modRes.json();
        setModules(mods ?? []);
      }
      setLoading(false);
    }
    init();
  }, [adminId, loadChapters]);

  // ── Create Chapter ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.chapter_number) {
      flash('✗ Title and chapter number are required');
      return;
    }
    setBusyId('create');
    const res = await fetch('/api/admin/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    setBusyId(null);
    if (res.ok) {
      await loadChapters();
      setCreateForm(EMPTY_CHAPTER);
      setShowCreate(false);
      flash('✓ Chapter created');
    } else {
      const j = await res.json();
      flash(`✗ ${j.error ?? 'Failed to create'}`);
    }
  };

  // ── Save Edit ───────────────────────────────────────────────────────────────
  const handleSaveEdit = async (chapterId: string) => {
    setBusyId(chapterId);
    const res = await fetch(`/api/admin/chapters/${chapterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setBusyId(null);
    if (res.ok) {
      await loadChapters();
      setEditingId(null);
      flash('✓ Chapter updated');
    } else {
      const j = await res.json();
      flash(`✗ ${j.error ?? 'Failed to update'}`);
    }
  };

  // ── Delete Chapter ──────────────────────────────────────────────────────────
  const handleDelete = async (chapterId: string) => {
    setBusyId(chapterId);
    const res = await fetch(`/api/admin/chapters/${chapterId}`, { method: 'DELETE' });
    setBusyId(null);
    setDeleteConfirm(null);
    if (res.ok) {
      setChapters((prev) => prev.filter((c) => c.chapter_id !== chapterId));
      flash('✓ Chapter deleted');
    } else {
      const j = await res.json();
      flash(`✗ ${j.error ?? 'Failed to delete'}`);
    }
  };

  // ── Add Mission ─────────────────────────────────────────────────────────────
  const handleAddMission = async () => {
    if (!missionForm) return;
    setBusyId('mission');
    const res = await fetch('/api/admin/chapters/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter_id: missionForm.chapterId,
        module_id: missionForm.moduleId,
        mission_order: missionForm.missionOrder,
        is_boss: missionForm.isBoss,
      }),
    });
    setBusyId(null);
    if (res.ok) {
      await loadChapters();
      setMissionForm(null);
      flash('✓ Mission added');
    } else {
      const j = await res.json();
      flash(`✗ ${j.error ?? 'Failed to add mission'}`);
    }
  };

  // ── Remove Mission ──────────────────────────────────────────────────────────
  const handleRemoveMission = async (chapterId: string, moduleId: string) => {
    setBusyId(`rm-${moduleId}`);
    const res = await fetch(`/api/admin/chapters/missions?chapterId=${chapterId}&moduleId=${moduleId}`, {
      method: 'DELETE',
    });
    setBusyId(null);
    if (res.ok) {
      await loadChapters();
      flash('✓ Mission removed');
    } else {
      flash('✗ Failed to remove mission');
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-white/5 bg-gray-900/40 p-6 animate-pulse h-32" />;
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-xs font-mono px-4 py-2 rounded-lg border ${
              statusMsg.startsWith('✓')
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {statusMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest">Campaign Builder</p>
          <p className="text-sm text-gray-400">{chapters.length} chapters · {chapters.reduce((n, c) => n + c.chapter_missions.length, 0)} total missions</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
            showCreate
              ? 'bg-gray-800 border-white/10 text-gray-400'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
          }`}
        >
          {showCreate ? '✕ Cancel' : '+ New Chapter'}
        </button>
      </div>

      {/* Create Chapter Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">New Chapter</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Chapter Number *</label>
                  <input
                    type="number"
                    value={createForm.chapter_number}
                    onChange={(e) => setCreateForm((p) => ({ ...p, chapter_number: Number(e.target.value) }))}
                    className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Breach Protocol"
                    value={createForm.title}
                    onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. Infiltrate the network"
                    value={createForm.subtitle}
                    onChange={(e) => setCreateForm((p) => ({ ...p, subtitle: e.target.value }))}
                    className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Lore Text</label>
                  <input
                    type="text"
                    placeholder="Short story flavour text..."
                    value={createForm.lore_text}
                    onChange={(e) => setCreateForm((p) => ({ ...p, lore_text: e.target.value }))}
                    className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.is_unlocked}
                    onChange={(e) => setCreateForm((p) => ({ ...p, is_unlocked: e.target.checked }))}
                    className="rounded accent-cyan-500"
                  />
                  <span className="text-xs text-gray-400">Unlocked from start</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.is_coming_soon}
                    onChange={(e) => setCreateForm((p) => ({ ...p, is_coming_soon: e.target.checked }))}
                    className="rounded accent-cyan-500"
                  />
                  <span className="text-xs text-gray-400">Coming Soon</span>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={busyId === 'create'}
                  className="text-xs font-bold px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition-all disabled:opacity-50"
                >
                  {busyId === 'create' ? 'Creating…' : 'Create Chapter'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter List */}
      <div className="space-y-3">
        {chapters.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-8">No chapters yet. Create one above.</p>
        )}
        {chapters.map((ch) => {
          const isExpanded = expandedId === ch.chapter_id;
          const isEditing = editingId === ch.chapter_id;

          return (
            <motion.div
              key={ch.chapter_id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/8 bg-gray-900/50 overflow-hidden"
            >
              {/* Chapter row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Chapter number badge */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 ${
                  ch.is_coming_soon ? 'bg-gray-800 text-gray-600' :
                  ch.is_unlocked ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'
                }`}>
                  {ch.is_coming_soon ? '🔒' : ch.chapter_number}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{ch.title}</p>
                    {ch.is_coming_soon && (
                      <span className="text-[10px] font-mono text-gray-600 border border-gray-700 rounded px-1.5">COMING SOON</span>
                    )}
                    {!ch.is_coming_soon && ch.is_unlocked && (
                      <span className="text-[10px] font-mono text-cyan-600 border border-cyan-700/40 rounded px-1.5">UNLOCKED</span>
                    )}
                    {!ch.is_coming_soon && !ch.is_unlocked && (
                      <span className="text-[10px] font-mono text-gray-600 border border-gray-700 rounded px-1.5">LOCKED</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{ch.subtitle} · {ch.chapter_missions.length} missions</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (isEditing) { setEditingId(null); } else {
                        setEditingId(ch.chapter_id);
                        setEditForm({
                          title: ch.title, subtitle: ch.subtitle, lore_text: ch.lore_text,
                          is_unlocked: ch.is_unlocked, is_coming_soon: ch.is_coming_soon,
                        });
                      }
                      setExpandedId(ch.chapter_id);
                    }}
                    className="text-xs text-cyan-500 hover:text-cyan-400 px-2 py-1 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  {deleteConfirm === ch.chapter_id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500">Sure?</span>
                      <button
                        onClick={() => handleDelete(ch.chapter_id)}
                        disabled={busyId === ch.chapter_id}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg border border-red-500/20 transition-all"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-gray-500 hover:text-gray-400 px-2 py-1 rounded-lg border border-white/5 transition-all"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(ch.chapter_id)}
                      className="text-xs text-gray-600 hover:text-red-400 px-2 py-1 rounded-lg border border-white/5 hover:border-red-500/20 transition-all"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ch.chapter_id)}
                    className="text-gray-600 text-xs w-6 h-6 flex items-center justify-center rounded hover:text-gray-400 transition-colors"
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="px-4 py-4 space-y-4">

                      {/* Edit Form */}
                      {isEditing && (
                        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 space-y-3">
                          <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest">Edit Chapter</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'title', label: 'Title', placeholder: 'Chapter title' },
                              { key: 'subtitle', label: 'Subtitle', placeholder: 'Short subtitle' },
                              { key: 'lore_text', label: 'Lore Text', placeholder: 'Story flavour text' },
                            ].map(({ key, label, placeholder }) => (
                              <div key={key} className={key === 'lore_text' ? 'col-span-2' : ''}>
                                <label className="text-[10px] text-gray-600 block mb-1">{label}</label>
                                <input
                                  type="text"
                                  placeholder={placeholder}
                                  value={(editForm[key as keyof typeof editForm] as string) ?? ''}
                                  onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                                  className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!editForm.is_unlocked}
                                onChange={(e) => setEditForm((p) => ({ ...p, is_unlocked: e.target.checked }))}
                                className="rounded accent-cyan-500"
                              />
                              <span className="text-xs text-gray-400">Unlocked</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!editForm.is_coming_soon}
                                onChange={(e) => setEditForm((p) => ({ ...p, is_coming_soon: e.target.checked }))}
                                className="rounded accent-cyan-500"
                              />
                              <span className="text-xs text-gray-400">Coming Soon</span>
                            </label>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSaveEdit(ch.chapter_id)}
                              disabled={busyId === ch.chapter_id}
                              className="text-xs font-bold px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition-all disabled:opacity-50"
                            >
                              {busyId === ch.chapter_id ? 'Saving…' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mission List */}
                      <div>
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Missions</p>
                        {ch.chapter_missions.length === 0 ? (
                          <p className="text-xs text-gray-600 italic">No missions assigned yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {[...ch.chapter_missions]
                              .sort((a, b) => (a.is_boss ? 1 : 0) - (b.is_boss ? 1 : 0) || a.mission_order - b.mission_order)
                              .map((m) => (
                                <div
                                  key={m.id}
                                  className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                                    m.is_boss
                                      ? 'border-amber-500/20 bg-amber-500/5'
                                      : 'border-white/5 bg-gray-800/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">{m.is_boss ? '⚔️' : `${m.mission_order}.`}</span>
                                    <span className="text-xs text-gray-300">{m.modules?.module_name}</span>
                                    {m.is_boss && <span className="text-[10px] text-amber-400 font-mono">BOSS</span>}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveMission(ch.chapter_id, m.module_id)}
                                    disabled={busyId === `rm-${m.module_id}`}
                                    className="text-[10px] text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30"
                                  >
                                    {busyId === `rm-${m.module_id}` ? '…' : 'remove'}
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Add Mission Form */}
                      {missionForm?.chapterId === ch.chapter_id ? (
                        <div className="rounded-lg border border-white/8 bg-gray-800/40 p-3 space-y-2">
                          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Add Mission</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="text-[10px] text-gray-600 block mb-1">Module</label>
                              <select
                                value={missionForm.moduleId}
                                onChange={(e) => setMissionForm((p) => p ? { ...p, moduleId: e.target.value } : p)}
                                className="w-full rounded-lg bg-gray-900 border border-white/10 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                              >
                                <option value="">— pick a module —</option>
                                {modules.map((mod) => (
                                  <option key={mod.module_id} value={mod.module_id}>
                                    {mod.module_name} ({mod.question_count}q)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-600 block mb-1">Order</label>
                              <input
                                type="number"
                                value={missionForm.missionOrder}
                                onChange={(e) => setMissionForm((p) => p ? { ...p, missionOrder: Number(e.target.value) } : p)}
                                className="w-full rounded-lg bg-gray-900 border border-white/10 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={missionForm.isBoss}
                              onChange={(e) => setMissionForm((p) => p ? { ...p, isBoss: e.target.checked } : p)}
                              className="rounded accent-amber-500"
                            />
                            <span className="text-xs text-gray-400">Boss Mission ⚔️</span>
                          </label>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setMissionForm(null)}
                              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddMission}
                              disabled={!missionForm.moduleId || busyId === 'mission'}
                              className="text-xs font-bold px-4 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 transition-all disabled:opacity-30"
                            >
                              {busyId === 'mission' ? 'Adding…' : 'Add Mission'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setMissionForm({
                            chapterId: ch.chapter_id,
                            moduleId: '',
                            missionOrder: ch.chapter_missions.filter((m) => !m.is_boss).length + 1,
                            isBoss: false,
                          })}
                          className="w-full text-xs text-gray-500 hover:text-cyan-400 border border-dashed border-white/10 hover:border-cyan-500/30 rounded-lg py-2 transition-all"
                        >
                          + Assign Mission
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
