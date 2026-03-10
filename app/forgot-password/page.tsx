/**
 * app/forgot-password/page.tsx — Request a password reset email.
 * Calls supabase.auth.resetPasswordForEmail(). Supabase emails a link that
 * routes through /auth/callback?next=/reset-password, then lands on /reset-password.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/ui/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/reset-password`
          : '/auth/callback?next=/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) throw new Error(error.message);
      setSent(true);
    } catch (e) {
      setErrorMsg(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

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
            {sent ? (
              <div className="text-center">
                <div className="text-4xl mb-4">📧</div>
                <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
                <p className="text-sm text-gray-400 leading-relaxed">
                  If <span className="text-cyan-400">{email}</span> is registered, you&apos;ll
                  receive a password reset link shortly. Check your spam folder if you don&apos;t
                  see it.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-6 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-white mb-1 text-center">Reset password</h1>
                <p className="text-xs text-gray-500 text-center mb-6">
                  Enter your email and we&apos;ll send you a reset link
                </p>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="block text-xs text-gray-400 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
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
                    Send reset link
                  </Button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            <Link href="/login" className="text-gray-500 hover:text-cyan-400 transition-colors">
              ← Back to sign in
            </Link>
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
