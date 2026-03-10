/**
 * app/admin/dashboard/page.tsx — Admin dashboard for CyberShield LMS.
 * Shows system stats, all users, and allows role changes.
 * Only accessible by users with role = 'admin'.
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { User } from '@/types';

type SortField = 'name' | 'role' | 'total_exp' | 'created_at';

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ id: string; msg: string } | null>(null);

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
      </main>

      <Footer />
    </div>
  );
}
