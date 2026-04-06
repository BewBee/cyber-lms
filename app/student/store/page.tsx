/**
 * app/student/store/page.tsx — Power-up store for CyberShield LMS.
 * Students spend Credits (CR) earned from quizzes to buy power-ups.
 * Power-ups are consumed in quiz sessions (50/50, Shield, Skip).
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { StoreItem } from '@/pages/api/student/store';

interface Powerup {
  powerup_type: string;
  quantity: number;
}

const POWERUP_ICONS: Record<string, string> = {
  fifty_fifty: '🎯',
  shield:       '🛡',
  skip:         '⏭',
};

export default function StorePage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [powerups, setPowerups] = useState<Powerup[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { text: string; ok: boolean }>>({});

  useEffect(() => {
    async function load() {
      try {
        // Resolve student identity
        const { data: { user: authUser } } = await supabase.auth.getUser();
        let uid: string | null = authUser?.id ?? null;
        let name = '';

        if (!uid && typeof sessionStorage !== 'undefined') {
          const devRole = sessionStorage.getItem('dev_role');
          if (devRole === 'student') {
            uid = sessionStorage.getItem('dev_id');
            name = sessionStorage.getItem('dev_name') ?? '';
          }
        }

        if (!uid) { window.location.href = '/login'; return; }
        setStudentId(uid);

        if (!name && authUser) {
          const { data: u } = await supabase.from('users').select('name').eq('id', uid).single();
          name = u?.name ?? '';
        }
        setStudentName(name);

        // Load store catalogue + coin balance
        const storeRes = await fetch(`/api/student/store?studentId=${uid}`);
        if (storeRes.ok) {
          const { coins: cr, items: catalogue } = await storeRes.json();
          setCoins(cr ?? 0);
          setItems(catalogue ?? []);
        }

        // Load power-up inventory
        const puRes = await fetch(`/api/student/powerups?studentId=${uid}`);
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

  const handleBuy = async (item: StoreItem) => {
    if (!studentId || buying) return;
    setBuying(item.id);
    setMessages((prev) => ({ ...prev, [item.id]: { text: '', ok: true } }));

    try {
      const res = await fetch(`/api/student/store?studentId=${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        setMessages((prev) => ({ ...prev, [item.id]: { text: json.error ?? 'Purchase failed', ok: false } }));
      } else {
        setCoins(json.newCoins);
        setPowerups((prev) => {
          const existing = prev.find((p) => p.powerup_type === item.powerup_type);
          if (existing) {
            return prev.map((p) =>
              p.powerup_type === item.powerup_type ? { ...p, quantity: json.newQuantity } : p
            );
          }
          return [...prev, { powerup_type: item.powerup_type, quantity: 1 }];
        });
        setMessages((prev) => ({ ...prev, [item.id]: { text: `✓ Purchased! You now own ×${json.newQuantity}`, ok: true } }));
        setTimeout(() => setMessages((prev) => { const n = { ...prev }; delete n[item.id]; return n; }), 3000);
      }
    } catch {
      setMessages((prev) => ({ ...prev, [item.id]: { text: 'Network error', ok: false } }));
    } finally {
      setBuying(null);
    }
  };

  const getOwnedQty = (powerupType: string) =>
    powerups.find((p) => p.powerup_type === powerupType)?.quantity ?? 0;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header userRole="student" />
        <main className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" label="Loading store…" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" userName={studentName} />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 space-y-8">
        {/* Back */}
        <Link href="/student/dashboard" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">
          ← Dashboard
        </Link>

        {/* Store header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-500/20 bg-purple-500/5 px-6 py-5 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-[10px] font-mono text-purple-600 uppercase tracking-[0.25em] mb-1">
              ▸ Operative Supply Depot
            </p>
            <h1 className="text-xl font-bold text-white">Power-Up Store</h1>
            <p className="text-xs text-gray-500 mt-0.5">Spend Credits earned from quizzes to restock your arsenal.</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Balance</p>
            <motion.p
              key={coins}
              initial={{ scale: 1.3, color: '#fbbf24' }}
              animate={{ scale: 1, color: '#fde68a' }}
              transition={{ duration: 0.4 }}
              className="text-2xl font-black font-mono"
            >
              💰 {coins} <span className="text-sm font-bold text-yellow-600">CR</span>
            </motion.p>
          </div>
        </motion.div>

        {/* Inventory */}
        {powerups.length > 0 && (
          <section>
            <h2 className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
              Your Inventory
            </h2>
            <div className="flex flex-wrap gap-3">
              {powerups.map((pu) => (
                <div
                  key={pu.powerup_type}
                  className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-2"
                >
                  <span className="text-xl">{POWERUP_ICONS[pu.powerup_type] ?? '🎁'}</span>
                  <div>
                    <p className="text-xs font-bold text-white capitalize">
                      {pu.powerup_type.replace('_', ' ')}
                    </p>
                    <p className="text-[10px] font-mono text-purple-400">×{pu.quantity} owned</p>
                  </div>
                </div>
              ))}
              {powerups.every((p) => p.quantity === 0) && (
                <p className="text-xs text-gray-600">No power-ups in stock — buy some below!</p>
              )}
            </div>
          </section>
        )}

        {/* Store items */}
        <section>
          <h2 className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
            Available Items
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {items.map((item, i) => {
              const owned = getOwnedQty(item.powerup_type);
              const canAfford = coins >= item.cost;
              const msg = messages[item.id];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200 ${
                    canAfford
                      ? 'border-purple-500/25 bg-purple-500/5 hover:border-purple-400/40'
                      : 'border-white/5 bg-gray-900/30'
                  }`}
                >
                  {/* Item header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{item.name}</p>
                        {owned > 0 && (
                          <p className="text-[10px] font-mono text-purple-400">×{owned} owned</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-right flex-shrink-0 px-2.5 py-1 rounded-lg border ${
                      canAfford ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-white/5 bg-gray-800/50'
                    }`}>
                      <p className={`text-sm font-black font-mono ${canAfford ? 'text-yellow-400' : 'text-gray-600'}`}>
                        {item.cost} CR
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs text-gray-300 leading-relaxed">{item.description}</p>
                    <p className="text-[10px] font-mono text-gray-600 italic">&ldquo;{item.flavour}&rdquo;</p>
                  </div>

                  {/* Buy button + message */}
                  <div className="space-y-2">
                    <Button
                      fullWidth
                      size="sm"
                      variant={canAfford ? 'primary' : 'secondary'}
                      disabled={!canAfford || buying === item.id}
                      loading={buying === item.id}
                      onClick={() => handleBuy(item)}
                    >
                      {canAfford ? `Buy for ${item.cost} CR` : `Need ${item.cost - coins} more CR`}
                    </Button>
                    <AnimatePresence>
                      {msg && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`text-[11px] text-center font-mono ${msg.ok ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {msg.text}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Earn more hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-white/5 bg-gray-900/30 p-4 text-center"
        >
          <p className="text-xs text-gray-600">
            Earn Credits by completing quizzes — better score = more CR.{' '}
            <Link href="/student/dashboard" className="text-cyan-500 hover:text-cyan-400 underline underline-offset-2">
              Go complete a mission →
            </Link>
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
