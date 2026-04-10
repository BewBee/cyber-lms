/**
 * app/student/store/page.tsx — EXPLOIT.MARKET
 * Underground hacker black market for power-up acquisition.
 * Terminal UI, level-locked items, transaction animation.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { playSound } from '@/lib/sounds';
import type { StoreItem } from '@/pages/api/student/store';

interface Powerup { powerup_type: string; quantity: number; }

// ── Transaction states ─────────────────────────────────────────────────────────
type TxPhase = 'idle' | 'tunnel' | 'processing' | 'complete' | 'error';

interface TxState {
  phase: TxPhase;
  item: StoreItem | null;
  errorMsg: string;
  newQty: number;
}

// ── Scanline overlay ───────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.4) 2px, rgba(0,255,0,0.4) 3px)',
      }}
    />
  );
}

// ── Blinking cursor ────────────────────────────────────────────────────────────
function Cursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity }}
      className="inline-block w-2 h-4 bg-green-500 align-middle ml-0.5"
    />
  );
}

// ── Transaction overlay ────────────────────────────────────────────────────────
function TransactionModal({ tx, onClose }: { tx: TxState; onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const linesRef = useRef<string[]>([]);

  useEffect(() => {
    if (tx.phase === 'idle') return;
    linesRef.current = [];
    setLines([]);

    const TUNNEL_LINES = [
      '> INITIALIZING SECURE TUNNEL...',
      '> ROUTING THROUGH TOR NODES...',
      '> IDENTITY MASKED',
      `> ITEM: ${tx.item?.name ?? '???'}`,
      `> COST: ${tx.item?.cost ?? 0} CR`,
      '> AWAITING CONFIRMATION...',
    ];

    const PROCESSING_LINES = [
      '> DECRYPTING VENDOR HANDSHAKE...',
      '> TRANSFERRING FUNDS...',
      '> VERIFYING BLOCKCHAIN RECEIPT...',
    ];

    const allLines = tx.phase === 'processing'
      ? [...TUNNEL_LINES, ...PROCESSING_LINES]
      : tx.phase === 'complete'
      ? [...TUNNEL_LINES, ...PROCESSING_LINES, '> TRANSACTION COMPLETE', `> ${tx.item?.name ?? ''} ADDED TO INVENTORY`, '> COVER YOUR TRACKS.']
      : tx.phase === 'error'
      ? [...TUNNEL_LINES, `> ERROR: ${tx.errorMsg}`]
      : TUNNEL_LINES;

    let i = 0;
    const interval = setInterval(() => {
      if (i >= allLines.length) { clearInterval(interval); return; }
      linesRef.current = [...linesRef.current, allLines[i]];
      setLines([...linesRef.current]);
      i++;
    }, tx.phase === 'complete' ? 80 : 120);

    return () => clearInterval(interval);
  }, [tx.phase, tx.item?.name, tx.item?.cost, tx.errorMsg]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg mx-4 rounded-xl border border-green-500/30 bg-black p-6 font-mono"
        style={{ boxShadow: '0 0 40px rgba(0,255,0,0.08), inset 0 0 40px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 border-b border-green-500/20 pb-3">
          <span className="text-[10px] text-green-600 uppercase tracking-[0.3em]">
            EXPLOIT.MARKET // SECURE CHANNEL
          </span>
          <div className="flex gap-1">
            {['bg-red-500', 'bg-yellow-500', 'bg-green-500'].map((c) => (
              <div key={c} className={`w-2.5 h-2.5 rounded-full ${c} opacity-60`} />
            ))}
          </div>
        </div>

        {/* Terminal output */}
        <div className="space-y-1.5 min-h-40 mb-6">
          {lines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
              className={`text-xs leading-relaxed ${
                line.startsWith('> ERROR')
                  ? 'text-red-400'
                  : line.includes('COMPLETE') || line.includes('ADDED')
                  ? 'text-green-300 font-bold'
                  : line.includes('COVER YOUR TRACKS')
                  ? 'text-amber-400'
                  : 'text-green-600'
              }`}
            >
              {line}
            </motion.p>
          ))}
          {(tx.phase === 'tunnel' || tx.phase === 'processing') && <Cursor />}
        </div>

        {/* Progress bar */}
        {(tx.phase === 'tunnel' || tx.phase === 'processing') && (
          <div className="h-1 bg-gray-900 rounded-full overflow-hidden border border-green-900/50 mb-5">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: tx.phase === 'processing' ? '75%' : '40%' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        )}

        {(tx.phase === 'complete' || tx.phase === 'error') && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={onClose}
            className={`w-full py-2.5 rounded-lg border font-mono text-sm font-bold uppercase tracking-widest transition-colors ${
              tx.phase === 'complete'
                ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                : 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
          >
            {tx.phase === 'complete' ? '// CLOSE TUNNEL //' : '// ABORT //'}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function StorePage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentLevel, setStudentLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [powerups, setPowerups] = useState<Powerup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<TxState>({ phase: 'idle', item: null, errorMsg: '', newQty: 0 });
  const [headerTyped, setHeaderTyped] = useState('');

  // Typewriter for header
  useEffect(() => {
    const full = 'EXPLOIT.MARKET';
    let i = 0;
    const t = setInterval(() => {
      if (i >= full.length) { clearInterval(t); return; }
      setHeaderTyped(full.slice(0, i + 1));
      i++;
    }, 80);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        let uid: string | null = authUser?.id ?? null;
        let name = '';

        if (!uid && typeof sessionStorage !== 'undefined') {
          if (sessionStorage.getItem('dev_role') === 'student') {
            uid = sessionStorage.getItem('dev_id');
            name = sessionStorage.getItem('dev_name') ?? '';
          }
        }
        if (!uid) { window.location.href = '/login'; return; }
        setStudentId(uid);

        if (!name && authUser) {
          const { data: u } = await supabase.from('users').select('name, level').eq('id', uid).single();
          name = u?.name ?? '';
          setStudentLevel(u?.level ?? 1);
        }
        setStudentName(name);

        const [storeRes, puRes] = await Promise.all([
          fetch(`/api/student/store?studentId=${uid}`),
          fetch(`/api/student/powerups?studentId=${uid}`),
        ]);
        if (storeRes.ok) {
          const { coins: cr, items: cat } = await storeRes.json();
          setCoins(cr ?? 0);
          setItems(cat ?? []);
        }
        if (puRes.ok) {
          const { powerups: inv } = await puRes.json();
          setPowerups(inv ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getOwnedQty = (pt: string) => powerups.find((p) => p.powerup_type === pt)?.quantity ?? 0;

  const handleBuy = async (item: StoreItem) => {
    if (!studentId || tx.phase !== 'idle') return;

    setTx({ phase: 'tunnel', item, errorMsg: '', newQty: 0 });
    playSound('powerup', 0.6);

    // Simulate tunnel phase
    await new Promise((r) => setTimeout(r, 1800));
    setTx((prev) => ({ ...prev, phase: 'processing' }));

    try {
      const res = await fetch(`/api/student/store?studentId=${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        setTx((prev) => ({ ...prev, phase: 'error', errorMsg: json.error ?? 'Transaction failed' }));
        playSound('wrong', 0.8);
      } else {
        setCoins(json.newCoins);
        setPowerups((prev) => {
          const existing = prev.find((p) => p.powerup_type === item.powerup_type);
          if (existing) return prev.map((p) => p.powerup_type === item.powerup_type ? { ...p, quantity: json.newQuantity } : p);
          return [...prev, { powerup_type: item.powerup_type, quantity: 1 }];
        });
        setTx((prev) => ({ ...prev, phase: 'complete', newQty: json.newQuantity }));
        playSound('complete', 0.9);
      }
    } catch {
      setTx((prev) => ({ ...prev, phase: 'error', errorMsg: 'Network error. Tunnel compromised.' }));
      playSound('wrong', 0.8);
    }
  };

  const closeTx = () => setTx({ phase: 'idle', item: null, errorMsg: '', newQty: 0 });

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-black">
        <Header userRole="student" />
        <main className="flex flex-1 items-center justify-center">
          <div className="font-mono text-green-500 text-sm space-y-2 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-green-700 mt-2">&gt; CONNECTING TO DARK MARKET...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#080808] relative">
      <Scanlines />

      <AnimatePresence>
        {tx.phase !== 'idle' && (
          <TransactionModal tx={tx} onClose={closeTx} />
        )}
      </AnimatePresence>

      <Header userRole="student" userName={studentName} />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 space-y-8 relative z-10">

        {/* Back nav */}
        <Link href="/student/dashboard" className="text-[10px] font-mono text-green-800 hover:text-green-600 transition-colors">
          ← /dashboard
        </Link>

        {/* ── Market header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-green-900/40 rounded-xl bg-black/60 p-6"
          style={{ boxShadow: '0 0 30px rgba(0,255,0,0.03)' }}
        >
          <p className="text-[9px] font-mono text-green-800 tracking-[0.4em] mb-2 uppercase">
            // CLASSIFIED CHANNEL — AUTHORIZED OPERATIVES ONLY
          </p>
          <h1 className="text-3xl sm:text-4xl font-black font-mono text-green-400 tracking-widest leading-none">
            {headerTyped}<Cursor />
          </h1>
          <p className="text-[10px] font-mono text-green-800 mt-2 tracking-widest">
            // Unauthorized items. Unmatched advantage. //
          </p>

          {/* Balance */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-green-900/30">
            <div>
              <p className="text-[9px] font-mono text-green-800 uppercase tracking-[0.3em]">OPERATIVE</p>
              <p className="text-sm font-mono text-green-500">{studentName || 'UNKNOWN'}</p>
              <p className="text-[9px] font-mono text-green-800 mt-0.5">CLEARANCE LEVEL: {studentLevel}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-mono text-green-800 uppercase tracking-[0.3em]">CREDIT BALANCE</p>
              <motion.p
                key={coins}
                initial={{ scale: 1.2, color: '#fbbf24' }}
                animate={{ scale: 1, color: '#86efac' }}
                transition={{ duration: 0.5 }}
                className="text-2xl font-black font-mono"
              >
                {coins} <span className="text-sm text-green-700">CR</span>
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* ── Inventory ─────────────────────────────────────────────────────── */}
        {powerups.filter(p => p.quantity > 0).length > 0 && (
          <section>
            <p className="text-[9px] font-mono text-green-800 uppercase tracking-[0.3em] mb-3">
              &gt; CURRENT LOADOUT
            </p>
            <div className="flex flex-wrap gap-2">
              {powerups.filter(p => p.quantity > 0).map((pu) => {
                const item = items.find((i) => i.powerup_type === pu.powerup_type);
                return (
                  <div
                    key={pu.powerup_type}
                    className="flex items-center gap-2 rounded-lg border border-green-900/40 bg-green-500/5 px-3 py-1.5"
                  >
                    <span className="text-base">{item?.icon ?? '🎁'}</span>
                    <div>
                      <p className="text-[10px] font-mono font-bold text-green-400">{item?.name ?? pu.powerup_type}</p>
                      <p className="text-[9px] font-mono text-green-700">×{pu.quantity} IN STOCK</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Catalogue ─────────────────────────────────────────────────────── */}
        <section>
          <p className="text-[9px] font-mono text-green-800 uppercase tracking-[0.3em] mb-4">
            &gt; AVAILABLE ACQUISITIONS — SESSION LIMIT: 1 PER ITEM
          </p>
          <div className="space-y-3">
            {items.map((item, i) => {
              const locked = studentLevel < item.level_required;
              const canAfford = coins >= item.cost && !locked;
              const owned = getOwnedQty(item.powerup_type);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: locked ? 0.35 : 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`rounded-xl border p-5 transition-colors duration-200 ${
                    locked
                      ? 'border-gray-800 bg-gray-900/20 cursor-not-allowed'
                      : canAfford
                      ? 'border-green-900/50 bg-green-500/3 hover:border-green-700/50'
                      : 'border-gray-800/80 bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: item info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <span className="text-3xl flex-shrink-0 mt-0.5">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className={`text-sm font-black font-mono tracking-wider ${locked ? 'text-gray-600' : 'text-green-300'}`}>
                            {item.name}
                          </p>
                          {locked && (
                            <span className="text-[9px] font-mono text-red-600 border border-red-900/50 rounded px-1.5 py-0.5 tracking-widest">
                              [LEVEL {item.level_required} REQUIRED]
                            </span>
                          )}
                          {owned > 0 && (
                            <span className="text-[9px] font-mono text-green-700 border border-green-900/40 rounded px-1.5 py-0.5">
                              ×{owned} OWNED
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mb-1.5 ${locked ? 'text-gray-700' : 'text-gray-400'}`}>
                          {item.description}
                        </p>
                        <p className={`text-[10px] font-mono italic ${locked ? 'text-gray-800' : 'text-green-800'}`}>
                          {item.flavour}
                        </p>
                      </div>
                    </div>

                    {/* Right: cost + buy */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className={`px-3 py-1.5 rounded-lg border font-mono font-black text-sm ${
                        locked
                          ? 'border-gray-800 bg-gray-900/50 text-gray-700'
                          : canAfford
                          ? 'border-green-700/40 bg-green-500/10 text-green-300'
                          : 'border-gray-700/50 bg-gray-800/30 text-gray-500'
                      }`}>
                        {item.cost} CR
                      </div>
                      <motion.button
                        whileHover={canAfford ? { scale: 1.04 } : {}}
                        whileTap={canAfford ? { scale: 0.96 } : {}}
                        onClick={() => !locked && handleBuy(item)}
                        disabled={!canAfford || tx.phase !== 'idle'}
                        className={`text-[10px] font-mono font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all duration-150 ${
                          locked
                            ? 'border-gray-800 text-gray-700 cursor-not-allowed'
                            : canAfford
                            ? 'border-green-600/50 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/60 cursor-pointer'
                            : 'border-gray-700/50 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {locked
                          ? `// LVL ${item.level_required} //`
                          : canAfford
                          ? '> ACQUIRE'
                          : `NEED ${item.cost - coins} CR`
                        }
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Footer hint ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-green-900/20 bg-black/40 p-4 font-mono"
        >
          <p className="text-[10px] text-green-800 leading-relaxed">
            &gt; Credits awarded on quiz completion — score higher, earn more.<br />
            &gt; Items persist in inventory and are consumed during quiz sessions.<br />
            &gt; Level-locked items unlock automatically as you progress.{' '}
            <Link href="/student/dashboard" className="text-green-600 hover:text-green-400 underline underline-offset-2">
              [ run a mission ]
            </Link>
          </p>
        </motion.div>

      </main>

      <Footer />
    </div>
  );
}
