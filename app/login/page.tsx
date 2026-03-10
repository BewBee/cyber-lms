/**
 * app/login/page.tsx — Authentication page for CyberShield LMS.
 * Uses Supabase auth.signInWithPassword(). On success, reads user role from the users table
 * and redirects to the appropriate dashboard.
 * To test: enter alice@cybershield.dev / any password (if Supabase configured). Without Supabase,
 *          click "Dev Login" shortcuts to mock a session.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/ui/Footer';

const DEV_CREDENTIALS: Record<string, { email: string; redirect: string }> = {
  admin:   { email: 'dev-admin@cybershield.dev',   redirect: '/admin/dashboard'   },
  teacher: { email: 'dev-teacher@cybershield.dev', redirect: '/teacher/dashboard' },
  student: { email: 'dev-student@cybershield.dev', redirect: '/student/dashboard' },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign in via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Login failed. No user returned.');

      // 2. Fetch role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        // Fallback: check email suffix
        throw new Error('User profile not found. Contact your administrator.');
      }

      // 3. Redirect based on role
      const role = userData.role as string;
      if (role === 'student') router.push('/student/dashboard');
      else if (role === 'teacher') router.push('/teacher/dashboard');
      else if (role === 'admin') router.push('/admin/dashboard');
      else router.push('/');
    } catch (e) {
      setErrorMsg(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  };


  const handleDevLogin = async (role: string) => {
    setDevLoading(role);
    setErrorMsg(null);
    try {
      // Ensure dev accounts exist (idempotent — fast no-op after first call)
      await fetch('/api/dev/ensure-users', { method: 'POST' });

      const cred = DEV_CREDENTIALS[role];
      const { error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: 'CyberDev@1',
      });
      if (error) throw new Error(error.message);
      router.push(cred.redirect);
    } catch (e) {
      setErrorMsg(String((e as Error).message));
    } finally {
      setDevLoading(null);
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

          {/* Card */}
          <div className="rounded-2xl border border-white/8 bg-gray-900/80 backdrop-blur-sm p-8">
            <h1 className="text-xl font-bold text-white mb-1 text-center">Sign in</h1>
            <p className="text-xs text-gray-500 text-center mb-6">Enter your credentials to access your account</p>

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
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

              <div>
                <label htmlFor="password" className="block text-xs text-gray-400 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-gray-800 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
                  {errorMsg}
                </p>
              )}

              <Button type="submit" loading={loading} fullWidth size="lg">
                Sign in
              </Button>

              <p className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-xs text-gray-600 hover:text-cyan-400 transition-colors"
                >
                  Forgot your password?
                </Link>
              </p>
            </form>

            {/* Dev quick login — only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="pt-4 border-t border-white/8">
                <p className="text-xs text-gray-600 text-center mb-2">⚡ Dev Quick Login</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'teacher', 'student'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleDevLogin(role)}
                      disabled={devLoading !== null}
                      className="rounded-lg border border-white/10 bg-gray-800 text-xs text-gray-300 py-2 px-2 capitalize hover:border-cyan-500/50 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {devLoading === role ? '…' : role}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 underline">
              Sign up
            </Link>
          </p>
          <p className="text-center text-xs text-gray-600 mt-2">
            <Link href="/" className="text-gray-500 hover:text-cyan-400 transition-colors">
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
