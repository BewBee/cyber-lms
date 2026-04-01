/**
 * components/campaign/CampaignMap.tsx — Main campaign progress map for students.
 * Shows all chapters, mission progress, boss status, and locked/coming-soon chapters.
 * Auto-fetches progress for the given studentId.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Mission {
  id: string;
  module_id: string;
  mission_order: number;
  is_boss: boolean;
  completed: boolean;
  modules: { module_name: string; description?: string } | null;
}

interface ChapterTitle {
  title_id: string;
  title_name: string;
  title_color: string;
  earned: boolean;
}

interface Chapter {
  chapter_id: string;
  chapter_number: number;
  title: string;
  subtitle: string;
  lore_text: string;
  is_unlocked: boolean;
  is_coming_soon: boolean;
  missions: Mission[];
  progress: {
    completedNormal: number;
    totalNormal: number;
    bossCompleted: boolean;
    allNormalDone: boolean;
    chapterDone: boolean;
    bossUnlocked: boolean;
  };
  reward_title: ChapterTitle | null;
}

interface CampaignMapProps {
  studentId: string;
}

export function CampaignMap({ studentId }: CampaignMapProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/campaign/progress?studentId=${studentId}`)
      .then((r) => r.json())
      .then(({ chapters }) => {
        setChapters(chapters ?? []);
        // Auto-expand the first in-progress chapter
        const active = (chapters ?? []).find((c: Chapter) => c.is_unlocked && !c.progress?.chapterDone && !c.is_coming_soon);
        if (active) setExpanded(active.chapter_id);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gray-900/60 p-6 animate-pulse h-40" />
  );

  const activeChapter = chapters.find((c) => c.is_unlocked && !c.progress?.chapterDone && !c.is_coming_soon);
  const nextMission = activeChapter?.missions
    .filter((m) => !m.is_boss && !m.completed)
    .sort((a, b) => a.mission_order - b.mission_order)[0];

  return (
    <section aria-labelledby="campaign-heading" className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest">Main Campaign</p>
          <h2 id="campaign-heading" className="text-lg font-bold text-white">Operation: CyberShield</h2>
        </div>
        {nextMission && (
          <Link
            href={`/modules/${nextMission.module_id}`}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 text-sm transition-all shadow-[0_0_16px_rgba(0,212,255,0.3)] hover:shadow-[0_0_24px_rgba(0,212,255,0.5)]"
          >
            ▶ Continue Mission
          </Link>
        )}
      </div>

      {/* Chapter path */}
      <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
        {chapters.map((ch, i) => {
          const done = ch.progress?.chapterDone;
          const active = ch.is_unlocked && !done && !ch.is_coming_soon;
          return (
            <div key={ch.chapter_id} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setExpanded(expanded === ch.chapter_id ? null : ch.chapter_id)}
                className={[
                  'w-7 h-7 rounded-full border-2 font-bold text-xs transition-all',
                  done   ? 'bg-cyan-500 border-cyan-400 text-black' :
                  active ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse' :
                           'bg-gray-800 border-gray-700 text-gray-600',
                ].join(' ')}
              >
                {done ? '✓' : ch.is_coming_soon ? '?' : ch.chapter_number}
              </button>
              {i < chapters.length - 1 && (
                <div className={`h-0.5 w-6 ${done ? 'bg-cyan-500' : 'bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Chapter cards */}
      <div className="space-y-2">
        {chapters.map((ch) => {
          const isExpanded = expanded === ch.chapter_id;
          const done = ch.progress?.chapterDone;
          const active = ch.is_unlocked && !done && !ch.is_coming_soon;
          const locked = !ch.is_unlocked && !ch.is_coming_soon;

          return (
            <motion.div
              key={ch.chapter_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                'rounded-xl border transition-all overflow-hidden',
                done   ? 'border-cyan-500/30 bg-cyan-500/5' :
                active ? 'border-cyan-500/40 bg-gray-900/70' :
                ch.is_coming_soon ? 'border-white/5 bg-gray-900/20 opacity-50' :
                         'border-white/5 bg-gray-900/30 opacity-60',
              ].join(' ')}
            >
              {/* Chapter header row */}
              <button
                onClick={() => !ch.is_coming_soon && setExpanded(isExpanded ? null : ch.chapter_id)}
                disabled={ch.is_coming_soon}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={[
                    'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold flex-shrink-0',
                    done ? 'bg-cyan-500 text-black' : active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-600',
                  ].join(' ')}>
                    {done ? '✓' : ch.is_coming_soon ? '🔒' : locked ? '🔒' : `${ch.chapter_number}`}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{ch.title}</p>
                      {ch.is_coming_soon && <span className="text-[10px] font-mono text-gray-600 border border-gray-700 rounded px-1.5">COMING SOON</span>}
                      {done && ch.reward_title && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: ch.reward_title?.title_color ?? '#00d4ff', borderColor: ch.reward_title?.title_color ?? '#00d4ff', border: '1px solid' }}>{ch.reward_title?.title_name}</span>}
                    </div>
                    <p className="text-xs text-gray-500">{ch.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {!ch.is_coming_soon && !locked && (
                    <span className="text-xs text-gray-500 font-mono">
                      {ch.progress.completedNormal}/{ch.progress.totalNormal}
                    </span>
                  )}
                  {!ch.is_coming_soon && <span className="text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>}
                </div>
              </button>

              {/* Progress bar */}
              {!ch.is_coming_soon && !locked && ch.progress.totalNormal > 0 && (
                <div className="px-4 pb-2">
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-cyan-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(ch.progress.completedNormal / ch.progress.totalNormal) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* Expanded mission list */}
              {isExpanded && !ch.is_coming_soon && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3"
                >
                  <p className="text-xs text-gray-600 italic mb-2">"{ch.lore_text}"</p>

                  {ch.missions.filter((m) => !m.is_boss).sort((a, b) => a.mission_order - b.mission_order).map((m) => (
                    <div key={m.id} className={[
                      'flex items-center justify-between rounded-lg px-3 py-2 border',
                      m.completed ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-white/5 bg-gray-800/40',
                    ].join(' ')}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${m.completed ? 'text-cyan-400' : 'text-gray-600'}`}>
                          {m.completed ? '✓' : `${m.mission_order}.`}
                        </span>
                        <span className="text-xs text-gray-300">{m.modules?.module_name}</span>
                      </div>
                      {!m.completed && ch.is_unlocked && (
                        <Link href={`/modules/${m.module_id}`} className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
                          Start →
                        </Link>
                      )}
                    </div>
                  ))}

                  {/* Boss */}
                  {ch.missions.filter((m) => m.is_boss).map((boss) => (
                    <div key={boss.id} className={[
                      'flex items-center justify-between rounded-lg px-3 py-2 border',
                      boss.completed ? 'border-amber-500/30 bg-amber-500/5' :
                      ch.progress.bossUnlocked ? 'border-red-500/40 bg-red-500/5' :
                      'border-white/5 bg-gray-800/20 opacity-50',
                    ].join(' ')}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">⚔️</span>
                        <div>
                          <p className="text-xs font-bold text-amber-400">BOSS: {boss.modules?.module_name}</p>
                          {!ch.progress.allNormalDone && <p className="text-[10px] text-gray-600">Complete all missions to unlock</p>}
                        </div>
                      </div>
                      {boss.completed && <span className="text-xs text-amber-400">Defeated ✓</span>}
                      {ch.progress.bossUnlocked && !boss.completed && (
                        <Link href={`/modules/${boss.module_id}`} className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors">
                          Fight →
                        </Link>
                      )}
                    </div>
                  ))}

                  {/* Title reward */}
                  {ch.reward_title && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                      <span className="text-xs text-gray-600">Chapter reward:</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: ch.reward_title.title_color, borderColor: ch.reward_title.title_color }}>
                        {ch.reward_title.earned ? '✓ ' : '🔒 '}{ch.reward_title.title_name}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
