/**
 * app/student/profile/page.tsx — Student profile page for CyberShield LMS.
 * Shows full stats, all earned badges, session history, and rank progress.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { TerminalRain } from '@/components/game/TerminalRain';
import { BadgeShowcase } from '@/components/ui/BadgeShowcase';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateRank, expToNextLevel } from '@/lib/expSystem';
import type { User, Badge, GameSession } from '@/types';

type ProfileTab = 'overview' | 'sessions' | 'loadout' | 'intel';
type SessionFilter = 'all' | 'gold' | 'silver' | 'bronze';
type SessionSort = 'recent' | 'best' | 'worst';

interface Powerup { powerup_type: string; quantity: number; }
const POWERUP_META: Record<string, { icon: string; name: string; desc: string; label: string }> = {
  fifty_fifty:    { icon: '🎯', name: 'NMAP SCAN',      label: '50/50',  desc: 'Eliminates 2 wrong answers'   },
  shield:         { icon: '🛡', name: 'FIREWALL.EXE',   label: 'SHIELD', desc: 'Blocks one wrong answer'       },
  skip:           { icon: '⏭', name: 'ZERO-DAY EXPLOIT',label: 'SKIP',   desc: 'Skip question, no penalty'    },
  packet_sniffer: { icon: '📡', name: 'PACKET SNIFFER', label: 'FREEZE', desc: 'Preserves streak on miss'      },
};

const MEDAL_EMOJI: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '✅' };

interface ProfileData {
  user: User;
  badges: Badge[];
  sessions: (GameSession & { module_name?: string })[];
  stats: {
    totalSessions: number;
    goldCount: number;
    silverCount: number;
    bronzeCount: number;
    avgAccuracy: number;
    totalExp: number;
  };
}

export default function StudentProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [powerups, setPowerups] = useState<Powerup[]>([]);
  const [editingCodename, setEditingCodename] = useState(false);
  const [codenameInput, setCodenameInput] = useState('');
  const [codenameMsg, setCodenameMsg] = useState<string | null>(null);
  const [savingCodename, setSavingCodename] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
  const [sessionSort, setSessionSort] = useState<SessionSort>('recent');

  useEffect(() => {
    async function load() {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const userId = authSession?.user.id;
        if (!userId) { window.location.href = '/login'; return; }

        // Fetch user
        const { data: userData, error: uErr } = await supabase
          .from('users').select('*').eq('id', userId).single();
        if (uErr || !userData) { window.location.href = '/login'; return; }

        // Fetch badges
        const { data: studentBadges } = await supabase
          .from('student_badges')
          .select('badges ( badge_id, badge_key, badge_display_name, badge_icon )')
          .eq('student_id', userId);

        const badges = (studentBadges ?? [])
          .map((sb: Record<string, unknown>) => sb.badges)
          .filter(Boolean) as Badge[];

        // Fetch all completed sessions with module names
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('session_id, module_id, total_score, accuracy, medal_awarded, exp_awarded, finished_at, average_response_time, modules ( module_name )')
          .eq('student_id', userId)
          .not('finished_at', 'is', null)
          .order('finished_at', { ascending: false })
          .limit(50);

        // Build name map from join result
        const moduleNameMap = new Map<string, string>();
        (sessions ?? []).forEach((s: Record<string, unknown>) => {
          const mod = s.modules as { module_name: string } | null;
          if (mod?.module_name && s.module_id) moduleNameMap.set(s.module_id as string, mod.module_name);
        });

        // Batch-resolve any orphaned module IDs (module deleted after session recorded)
        const unknownIds = (sessions ?? [])
          .filter((s: Record<string, unknown>) => !moduleNameMap.has(s.module_id as string) && s.module_id)
          .map((s: Record<string, unknown>) => s.module_id as string);
        if (unknownIds.length > 0) {
          const { data: extraMods } = await supabase
            .from('modules').select('module_id, module_name').in('module_id', unknownIds);
          (extraMods ?? []).forEach((m: { module_id: string; module_name: string }) =>
            moduleNameMap.set(m.module_id, m.module_name)
          );
        }

        const resolvedSessions = (sessions ?? [])
          .map((s: Record<string, unknown>) => ({
            ...(s as unknown as GameSession),
            module_name: moduleNameMap.get(s.module_id as string) ?? 'Unknown',
          }))
          .filter((s) => s.module_name !== 'Unknown');

        const totalSessions = resolvedSessions.length;
        const goldCount = resolvedSessions.filter((s) => s.medal_awarded === 'gold').length;
        const silverCount = resolvedSessions.filter((s) => s.medal_awarded === 'silver').length;
        const bronzeCount = resolvedSessions.filter((s) => s.medal_awarded === 'bronze').length;
        const avgAccuracy = totalSessions > 0
          ? resolvedSessions.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) / totalSessions
          : 0;

        setData({
          user: userData as User,
          badges,
          sessions: resolvedSessions,
          stats: {
            totalSessions,
            goldCount,
            silverCount,
            bronzeCount,
            avgAccuracy,
            totalExp: userData.total_exp,
          },
        });

        // Load power-up inventory
        const puRes = await fetch(`/api/student/powerups?studentId=${userId}`);
        if (puRes.ok) {
          const { powerups: inv } = await puRes.json();
          setPowerups(inv ?? []);
        }
      } catch (e) {
        setErrorMsg(String((e as Error).message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveCodename = async () => {
    if (!data) return;
    setSavingCodename(true); setCodenameMsg(null);
    const trimmed = codenameInput.trim().slice(0, 24);
    const { error } = await supabase
      .from('users')
      .update({ codename: trimmed || null })
      .eq('id', data.user.id);
    if (error) { setCodenameMsg('✗ Failed to save'); }
    else {
      setData((prev) => prev ? { ...prev, user: { ...prev.user, codename: trimmed || null } } : prev);
      setCodenameMsg('✓ Saved!');
      setEditingCodename(false);
    }
    setSavingCodename(false);
    setTimeout(() => setCodenameMsg(null), 3000);
  };

  if (loading) return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" />
      <main className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" label="Loading profile…" />
      </main>
    </div>
  );

  if (errorMsg || !data) return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" />
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-red-400">{errorMsg ?? 'Could not load profile.'}</p>
      </main>
    </div>
  );

  const { user, badges, sessions, stats } = data;
  const rankName = calculateRank(user.level);
  const xp = expToNextLevel(user.total_exp);
  const xpPct = Math.min(100, Math.round((xp.current / xp.needed) * 100));

  const filteredSessions = sessions
    .filter(s => sessionFilter === 'all' || s.medal_awarded === sessionFilter)
    .sort((a, b) => {
      if (sessionSort === 'best') return (b.accuracy ?? 0) - (a.accuracy ?? 0);
      if (sessionSort === 'worst') return (a.accuracy ?? 0) - (b.accuracy ?? 0);
      return new Date(b.finished_at ?? 0).getTime() - new Date(a.finished_at ?? 0).getTime();
    });

  const TABS: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: '// OVERVIEW' },
    { id: 'sessions', label: '// SESSIONS' },
    { id: 'loadout',  label: '// LOADOUT'  },
    { id: 'intel',    label: '// INTEL'    },
  ];

  const STAT_LINES = [
    { key: 'OPERATOR',         val: user.name },
    { key: 'CODENAME',         val: user.codename ? `@${user.codename}` : 'UNSET' },
    { key: 'CLEARANCE_LEVEL',  val: String(user.level).padStart(2,'0') },
    { key: 'RANK',             val: rankName },
    { key: 'TOTAL_EXP',        val: `${user.total_exp} XP` },
    { key: 'MISSIONS_COMPLETE',val: String(stats.totalSessions) },
    { key: 'GOLD_MEDALS',      val: String(stats.goldCount).padStart(2,'0') },
    { key: 'SILVER_MEDALS',    val: String(stats.silverCount).padStart(2,'0') },
    { key: 'BRONZE_MEDALS',    val: String(stats.bronzeCount).padStart(2,'0') },
    { key: 'AVG_ACCURACY',     val: `${stats.avgAccuracy.toFixed(1)}%` },
    { key: 'BADGES_UNLOCKED',  val: `${badges.length} / 5` },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#080c14]">
      <TerminalRain className="opacity-30" />
      <Header userRole="student" userName={user.name} />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 space-y-5">

        {/* ─── IDENTITY CARD ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/50 via-gray-900 to-gray-950 overflow-hidden"
          style={{ boxShadow: '0 0 40px rgba(0,212,255,0.07)' }}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-cyan-500/15 bg-cyan-500/5">
            <span className="text-[10px] font-mono text-cyan-700 tracking-[0.2em] uppercase">// OPERATIVE PROFILE</span>
            <Link href="/student/dashboard" className="text-[10px] font-mono text-gray-600 hover:text-cyan-400 transition-colors">← BACK TO BASE</Link>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-5 mb-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl font-black text-cyan-400 bg-cyan-500/15 border-2 border-cyan-500/40"
                  style={{ boxShadow: '0 0 20px rgba(0,212,255,0.2)' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 text-[10px] font-mono bg-gray-900 border border-cyan-500/40 text-cyan-400 rounded px-1">
                  L{user.level}
                </div>
              </div>

              {/* Name + rank + codename */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-white tracking-tight">{user.name}</h1>
                <p className="text-xs font-mono text-cyan-500 uppercase tracking-widest mt-0.5"
                  style={{ textShadow: '0 0 8px rgba(0,212,255,0.4)' }}>{rankName}</p>

                {/* Codename inline edit */}
                <div className="flex items-center gap-2 mt-1.5">
                  {editingCodename ? (
                    <>
                      <span className="text-xs font-mono text-green-600">@</span>
                      <input value={codenameInput}
                        onChange={e => setCodenameInput(e.target.value.replace(/\s/g,'_').slice(0,24))}
                        onKeyDown={e => { if (e.key==='Enter') handleSaveCodename(); if (e.key==='Escape') setEditingCodename(false); }}
                        placeholder="your_handle" maxLength={24} autoFocus
                        className="rounded bg-black/60 border border-green-500/40 text-green-300 text-xs px-2 py-0.5 w-32 focus:outline-none focus:border-green-500 font-mono placeholder-green-900" />
                      <button onClick={handleSaveCodename} disabled={savingCodename}
                        className="text-[10px] font-mono bg-green-500/20 border border-green-500/40 text-green-400 rounded px-2 py-0.5 hover:bg-green-500/30 transition-colors disabled:opacity-50">
                        {savingCodename ? '…' : 'SAVE'}
                      </button>
                      <button onClick={() => setEditingCodename(false)} className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors">✕</button>
                    </>
                  ) : (
                    <button onClick={() => { setCodenameInput(user.codename ?? ''); setEditingCodename(true); }}
                      className="flex items-center gap-1 group" title="Set hacker handle">
                      <span className="text-xs font-mono text-green-700 group-hover:text-green-500 transition-colors">@</span>
                      <span className={`text-xs font-mono transition-colors ${user.codename ? 'text-green-500 group-hover:text-green-400' : 'text-gray-600 group-hover:text-gray-400 italic'}`}>
                        {user.codename ?? 'set_codename'}
                      </span>
                      <span className="text-[10px] text-gray-700 group-hover:text-gray-500 ml-1 transition-colors">✎</span>
                    </button>
                  )}
                  {codenameMsg && <span className={`text-[10px] font-mono ${codenameMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{codenameMsg}</span>}
                </div>
              </div>

              {/* Credits */}
              <div className="text-right flex-shrink-0">
                <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">CREDITS</p>
                <p className="text-2xl font-black text-yellow-400 font-mono leading-none">{user.coins ?? 0}</p>
                <p className="text-[9px] font-mono text-yellow-700">CR</p>
              </div>
            </div>

            {/* XP bar */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[9px] font-mono text-gray-600 tracking-widest uppercase">XP — {rankName}</span>
                <span className="text-[9px] font-mono text-green-600">{xp.current} / {xp.needed}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-green-400 to-cyan-400"
                  initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  style={{ boxShadow: '0 0 10px rgba(0,212,255,0.6)' }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── TABS ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-xl border border-white/8 bg-gray-950/80 p-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-[11px] font-mono py-2 rounded-lg transition-all duration-200 tracking-wider ${
                activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TAB CONTENT ───────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="rounded-xl border border-green-500/15 bg-gray-950/80 overflow-hidden"
                style={{ boxShadow: '0 0 20px rgba(34,197,94,0.04)' }}>
                <div className="px-4 py-2 border-b border-green-500/10 bg-green-500/5">
                  <span className="text-[10px] font-mono text-green-700 tracking-widest">SYSTEM STATUS — OPERATIVE INTEL</span>
                </div>
                <div className="p-4 font-mono space-y-1">
                  {STAT_LINES.map((line, i) => (
                    <motion.div key={line.key}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 py-0.5">
                      <span className="text-[11px] text-green-800 w-48 flex-shrink-0">&gt; {line.key}</span>
                      <span className="text-[11px] text-green-700 flex-shrink-0">........</span>
                      <span className={`text-[11px] font-bold ${
                        line.key === 'RANK' ? 'text-cyan-400' :
                        line.key === 'GOLD_MEDALS' ? 'text-amber-400' :
                        line.key === 'AVG_ACCURACY' ? 'text-purple-400' :
                        line.key === 'CODENAME' && user.codename ? 'text-green-400' :
                        'text-white'
                      }`}>{line.val}</span>
                    </motion.div>
                  ))}
                  <motion.div className="flex items-center gap-2 pt-2 border-t border-green-500/10 mt-2"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: STAT_LINES.length * 0.04 }}>
                    <span className="text-[11px] text-green-800">&gt;</span>
                    <motion.span className="text-[11px] text-green-500"
                      animate={{ opacity: [1,0,1] }} transition={{ duration: 1, repeat: Infinity }}>█</motion.span>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ── SESSIONS ── */}
            {activeTab === 'sessions' && (
              <div className="space-y-3">
                {/* Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1 rounded-lg border border-white/8 bg-gray-950/80 p-1">
                    {(['all','gold','silver','bronze'] as SessionFilter[]).map(f => (
                      <button key={f} onClick={() => setSessionFilter(f)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded transition-colors ${
                          sessionFilter === f ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'
                        }`}>
                        {f === 'all' ? 'ALL' : f === 'gold' ? '🥇' : f === 'silver' ? '🥈' : '🥉'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 rounded-lg border border-white/8 bg-gray-950/80 p-1 ml-auto">
                    {([['recent','RECENT'],['best','BEST'],['worst','WORST']] as [SessionSort,string][]).map(([s,l]) => (
                      <button key={s} onClick={() => setSessionSort(s)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded transition-colors ${
                          sessionSort === s ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'
                        }`}>{l}</button>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-gray-700">{filteredSessions.length} records</span>
                </div>

                {/* Session list */}
                {filteredSessions.length === 0 ? (
                  <div className="rounded-xl border border-white/5 py-12 text-center">
                    <p className="text-xs font-mono text-gray-600">// NO RECORDS MATCH FILTER</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5">
                    {filteredSessions.map((s) => {
                      const acc = s.accuracy ?? 0;
                      const medal = s.medal_awarded ?? 'none';
                      const barColor = acc >= 90 ? 'bg-amber-400' : acc >= 75 ? 'bg-cyan-400' : acc >= 60 ? 'bg-orange-400' : 'bg-red-400';
                      const leftBorder = acc >= 90 ? 'border-l-amber-400' : acc >= 75 ? 'border-l-cyan-400' : acc >= 60 ? 'border-l-orange-400' : 'border-l-red-500';
                      const dateStr = s.finished_at
                        ? new Date(s.finished_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
                        : '—';
                      return (
                        <div key={s.session_id}
                          className={`flex items-center gap-3 bg-gray-900/20 hover:bg-gray-900/60 px-4 py-3 border-l-2 ${leftBorder} transition-colors`}>
                          <span className="text-lg flex-shrink-0">{MEDAL_EMOJI[medal]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{s.module_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${acc}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-gray-500">{acc.toFixed(0)}%</span>
                              <span className="text-[10px] font-mono text-gray-700">{dateStr}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-black text-green-400">+{s.exp_awarded}<span className="text-[9px] text-green-800 ml-0.5">XP</span></span>
                            <Link href={`/quiz/review/${s.session_id}`}
                              className="text-[10px] font-mono text-cyan-600 hover:text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded px-2 py-1 transition-colors">
                              REVIEW
                            </Link>
                            <Link href={`/quiz/session/${s.module_id}`}
                              className="text-[10px] font-mono text-amber-600 hover:text-amber-400 border border-amber-500/20 hover:border-amber-500/40 rounded px-2 py-1 transition-colors">
                              REPLAY
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── LOADOUT ── */}
            {activeTab === 'loadout' && (
              <div className="space-y-4">
                {/* Credits panel */}
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4 flex items-center justify-between"
                  style={{ boxShadow: '0 0 20px rgba(234,179,8,0.05)' }}>
                  <div>
                    <p className="text-[10px] font-mono text-yellow-700 tracking-widest mb-1">CREDIT BALANCE</p>
                    <p className="text-4xl font-black text-yellow-400 font-mono leading-none">{user.coins ?? 0}
                      <span className="text-sm font-bold text-yellow-700 ml-2">CR</span>
                    </p>
                  </div>
                  <Link href="/student/store"
                    className="text-xs font-mono text-green-400 border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 rounded-lg px-4 py-2 transition-colors"
                    style={{ boxShadow: '0 0 12px rgba(34,197,94,0.08)' }}>
                    EXPLOIT.MARKET →
                  </Link>
                </div>

                {/* Powerup grid */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(POWERUP_META).map(([type, meta]) => {
                    const qty = powerups.find(p => p.powerup_type === type)?.quantity ?? 0;
                    return (
                      <div key={type}
                        className={`rounded-xl border p-4 transition-all ${
                          qty > 0
                            ? 'border-purple-500/30 bg-purple-500/8'
                            : 'border-white/5 bg-gray-900/30'
                        }`}
                        style={qty > 0 ? { boxShadow: '0 0 16px rgba(168,85,247,0.06)' } : {}}>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">{meta.icon}</span>
                          <span className={`text-2xl font-black font-mono leading-none ${qty > 0 ? 'text-purple-400' : 'text-gray-800'}`}>
                            ×{qty}
                          </span>
                        </div>
                        <p className={`text-xs font-mono font-bold truncate ${qty > 0 ? 'text-white' : 'text-gray-600'}`}>{meta.name}</p>
                        <p className="text-[10px] font-mono text-gray-600 mt-0.5">{meta.desc}</p>
                        <div className={`mt-2 text-[9px] font-mono tracking-widest ${qty > 0 ? 'text-purple-600' : 'text-gray-800'}`}>
                          {meta.label} — {qty > 0 ? 'STOCKED' : 'EMPTY'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── INTEL (badges) ── */}
            {activeTab === 'intel' && (
              <div className="rounded-xl border border-amber-500/15 bg-gray-950/80 overflow-hidden"
                style={{ boxShadow: '0 0 20px rgba(251,191,36,0.04)' }}>
                <div className="px-4 py-2 border-b border-amber-500/10 bg-amber-500/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-700 tracking-widest">ACHIEVEMENT REGISTRY</span>
                  <span className="text-[10px] font-mono text-amber-600 border border-amber-500/30 bg-amber-500/10 rounded-full px-2 py-0.5">{badges.length} / 5 UNLOCKED</span>
                </div>
                <div className="p-5">
                  <BadgeShowcase earnedBadges={badges} />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </main>
      <Footer />
    </div>
  );
}
