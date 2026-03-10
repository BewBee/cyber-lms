/**
 * app/reset-password/page.tsx — Set a new password after clicking the reset link.
 * The user arrives here already authenticated via the recovery session established
 * in /auth/callback. Calls supabase.auth.updateUser({ password }) to set new password.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/ui/Footer';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Verify the user arrived here via a valid recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setDone(true);
      // Redirect to login after 2 seconds
      setTimeout(() => router.push('/login'), 2000);
    } catch (e) {
      setErrorMsg(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  // Still checking session
  if (hasSession === null) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-black font-bold text-lg">
              CS
            </span>
            <span className="text-lg font-bold text-white">CyberShield</span>
          </Link>

          <div className="rounded-2xl border border-white/8 bg-gray-900/80 backdrop-blur-sm p-8">
            {!hasSession ? (
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-xl font-bold text-white mb-2">Link expired</h1>
                <p className="text-sm text-gray-400 mb-4">
                  This password reset link has expired or already been used.
                </p>
                <Link href="/forgot-password">
                  <Button fullWidth>Request a new link</Button>
                </Link>
              </div>
            ) : done ? (
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <h1 className="text-xl font-bold text-white mb-2">Password updated!</h1>
                <p className="text-sm text-gray-400">Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-white mb-1 text-center">New password</h1>
                <p className="text-xs text-gray-500 text-center mb-6">Choose a strong password</p>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="password" className="block text-xs text-gray-400 mb-1.5">
                      New password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm" className="block text-xs text-gray-400 mb-1.5">
                      Confirm password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                    />
                  </div>

                  {errorMsg && (
                    <p
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                      role="alert"
                    >
                      {errorMsg}
                    </p>
                  )}

                  <Button type="submit" loading={loading} fullWidth size="lg">
                    Update password
                  </Button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
