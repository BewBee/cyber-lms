'use client';

/**
 * app/signup/page.tsx — CyberShield LMS registration page.
 * Security features:
 *  - Real-time password strength meter (entropy-based scoring)
 *  - Enforced requirements: 8+ chars, uppercase, lowercase, digit, special char
 *  - Confirm-password equality check
 *  - Email format validation
 *  - Rate-limit feedback (tracks submission attempts client-side)
 *  - All error/success messages announced via aria-live
 *  - Supabase auth.signUp() with email confirmation flow
 */

import { useState, useId, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserSupabase as supabase } from '@/lib/browserClient';

// ---------------------------------------------------------------------------
// Password strength utilities
// ---------------------------------------------------------------------------

interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4; // 0 = very weak … 4 = strong
  label: string;
  color: string;
  met: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    digit: boolean;
    special: boolean;
  };
}

function assessPassword(pw: string): StrengthResult {
  const met = {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };

  const passedCount = Object.values(met).filter(Boolean).length;

  let score: 0 | 1 | 2 | 3 | 4;
  let label: string;
  let color: string;

  if (passedCount <= 1) { score = 0; label = 'Very Weak'; color = '#ef4444'; }
  else if (passedCount === 2) { score = 1; label = 'Weak'; color = '#f97316'; }
  else if (passedCount === 3) { score = 2; label = 'Fair'; color = '#eab308'; }
  else if (passedCount === 4) { score = 3; label = 'Strong'; color = '#22c55e'; }
  else { score = 4; label = 'Very Strong'; color = '#00f5c4'; }

  return { score, label, color, met };
}

function isPasswordValid(result: StrengthResult): boolean {
  return Object.values(result.met).every(Boolean);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000; // 1 minute client-side lockout

export default function SignupPage() {
  const uid = useId();
  const router = useRouter();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Rate limiting
  const attemptCount = useRef(0);
  const lockedUntil = useRef<number | null>(null);

  // Derived
  const strength = assessPassword(password);
  const passwordValid = isPasswordValid(strength);
  const confirmMatch = confirmPassword === '' || confirmPassword === password;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Field IDs
  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const pwId = `${uid}-pw`;
  const confirmId = `${uid}-confirm`;
  const termsId = `${uid}-terms`;
  const statusId = `${uid}-status`;

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMsg('');
      setSuccessMsg('');

      // Client-side rate limiting
      const now = Date.now();
      if (lockedUntil.current && now < lockedUntil.current) {
        const secsLeft = Math.ceil((lockedUntil.current - now) / 1000);
        setErrorMsg(`Too many attempts. Please wait ${secsLeft} seconds before trying again.`);
        return;
      }

      // Validation
      if (!displayName.trim()) { setErrorMsg('Display name is required.'); return; }
      if (displayName.trim().length < 2) { setErrorMsg('Display name must be at least 2 characters.'); return; }
      if (!emailValid) { setErrorMsg('Please enter a valid email address.'); return; }
      if (!passwordValid) { setErrorMsg('Password does not meet all requirements.'); return; }
      if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
      if (!agreedToTerms) { setErrorMsg('You must agree to the Terms of Service to continue.'); return; }

      setIsLoading(true);
      attemptCount.current += 1;

      if (attemptCount.current >= MAX_ATTEMPTS) {
        lockedUntil.current = Date.now() + LOCKOUT_MS;
        attemptCount.current = 0;
      }

      try {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          // Map Supabase error codes to user-friendly messages
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            setErrorMsg('An account with this email already exists. Try logging in instead.');
          } else if (error.message.includes('rate limit')) {
            setErrorMsg('Too many sign-up attempts. Please try again later.');
          } else if (error.message.includes('invalid email')) {
            setErrorMsg('This email address is not valid.');
          } else {
            setErrorMsg(error.message);
          }
          return;
        }

        // If email confirmation is disabled in Supabase, session is immediately available
        if (signUpData.session) {
          router.replace('/student/dashboard');
          return;
        }

        setSuccessMsg(
          'Account created! Check your email for a confirmation link before logging in.',
        );
        // Clear sensitive fields
        setPassword('');
        setConfirmPassword('');
      } catch {
        setErrorMsg('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [displayName, email, emailValid, password, confirmPassword, passwordValid, agreedToTerms],
  );

  const strengthBarWidth = `${(strength.score / 4) * 100}%`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0f1a]">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#00f5c4 1px, transparent 1px), linear-gradient(90deg, #00f5c4 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/icon-shield.svg"
              alt=""
              className="w-10 h-10 group-hover:scale-110 transition-transform"
            />
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#00f5c4', textShadow: '0 0 20px rgba(0,245,196,0.4)' }}
            >
              CyberShield
            </span>
          </Link>
          <p className="mt-2 text-sm text-gray-400">Create your account to start learning</p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8 border"
          style={{
            background: 'rgba(10, 15, 26, 0.95)',
            borderColor: 'rgba(0,245,196,0.2)',
            boxShadow: '0 0 40px rgba(0,245,196,0.05)',
          }}
        >
          <h1 className="text-xl font-semibold text-white mb-6">Create Account</h1>

          {/* Aria-live status region */}
          <div
            id={statusId}
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
          >
            {errorMsg || successMsg}
          </div>

          {/* Error banner */}
          {errorMsg && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg text-sm border flex items-start gap-2"
              style={{
                background: 'rgba(239,68,68,0.1)',
                borderColor: 'rgba(239,68,68,0.3)',
                color: '#fca5a5',
              }}
            >
              <span aria-hidden="true" className="mt-0.5 shrink-0">⚠</span>
              {errorMsg}
            </div>
          )}

          {/* Success banner */}
          {successMsg && (
            <div
              role="status"
              className="mb-4 p-4 rounded-lg text-sm border"
              style={{
                background: 'rgba(0,245,196,0.08)',
                borderColor: 'rgba(0,245,196,0.3)',
                color: '#00f5c4',
              }}
            >
              <p className="font-semibold mb-1">Registration successful!</p>
              <p className="text-gray-300">{successMsg}</p>
              <Link
                href="/login"
                className="mt-3 inline-block underline text-cyan-400 hover:text-cyan-300"
              >
                Go to login →
              </Link>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit} noValidate>
              {/* Display name */}
              <div className="mb-4">
                <label
                  htmlFor={nameId}
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Display Name <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                  id={nameId}
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alice Chen"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,196,0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              {/* Email */}
              <div className="mb-4">
                <label
                  htmlFor={emailId}
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Email Address <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  aria-describedby={email && !emailValid ? `${emailId}-err` : undefined}
                  aria-invalid={email ? !emailValid : undefined}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${email && !emailValid ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,196,0.5)')}
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      email && !emailValid ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)')
                  }
                />
                {email && !emailValid && (
                  <p id={`${emailId}-err`} className="mt-1 text-xs text-red-400">
                    Enter a valid email address.
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="mb-2">
                <label
                  htmlFor={pwId}
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Password <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id={pwId}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    aria-describedby={`${pwId}-strength ${pwId}-reqs`}
                    aria-invalid={password ? !passwordValid : undefined}
                    className="w-full px-3 py-2 pr-10 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,196,0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">Password strength</span>
                      <span
                        id={`${pwId}-strength`}
                        className="text-xs font-medium"
                        style={{ color: strength.color }}
                        aria-live="polite"
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                      role="progressbar"
                      aria-valuenow={strength.score}
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-label={`Password strength: ${strength.label}`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: strengthBarWidth, background: strength.color }}
                      />
                    </div>
                  </div>
                )}

                {/* Requirements checklist */}
                <ul
                  id={`${pwId}-reqs`}
                  className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5"
                  aria-label="Password requirements"
                >
                  {(
                    [
                      { key: 'length', label: '8+ characters' },
                      { key: 'uppercase', label: 'Uppercase letter' },
                      { key: 'lowercase', label: 'Lowercase letter' },
                      { key: 'digit', label: 'Number' },
                      { key: 'special', label: 'Special character' },
                    ] as const
                  ).map(({ key, label }) => (
                    <li
                      key={key}
                      className="flex items-center gap-1 text-xs"
                      style={{
                        color: strength.met[key]
                          ? '#00f5c4'
                          : password
                          ? '#ef4444'
                          : '#6b7280',
                      }}
                    >
                      <span aria-hidden="true">{strength.met[key] ? '✓' : '✗'}</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confirm password */}
              <div className="mb-5">
                <label
                  htmlFor={confirmId}
                  className="block text-sm font-medium text-gray-300 mb-1 mt-3"
                >
                  Confirm Password <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id={confirmId}
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    aria-describedby={
                      confirmPassword && !confirmMatch ? `${confirmId}-err` : undefined
                    }
                    aria-invalid={confirmPassword ? !confirmMatch : undefined}
                    className="w-full px-3 py-2 pr-10 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${
                        confirmPassword && !confirmMatch
                          ? 'rgba(239,68,68,0.5)'
                          : confirmPassword && confirmMatch
                          ? 'rgba(0,245,196,0.4)'
                          : 'rgba(255,255,255,0.1)'
                      }`,
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,245,196,0.5)')}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor =
                        confirmPassword && !confirmMatch
                          ? 'rgba(239,68,68,0.5)'
                          : confirmPassword && confirmMatch
                          ? 'rgba(0,245,196,0.4)'
                          : 'rgba(255,255,255,0.1)')
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showConfirm ? '🙈' : '👁'}
                  </button>
                </div>
                {confirmPassword && !confirmMatch && (
                  <p id={`${confirmId}-err`} className="mt-1 text-xs text-red-400">
                    Passwords do not match.
                  </p>
                )}
                {confirmPassword && confirmMatch && (
                  <p className="mt-1 text-xs" style={{ color: '#00f5c4' }}>
                    Passwords match.
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="mb-6 flex items-start gap-3">
                <input
                  id={termsId}
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-cyan-400 cursor-pointer"
                  required
                />
                <label htmlFor={termsId} className="text-sm text-gray-400 cursor-pointer">
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    className="underline text-cyan-400 hover:text-cyan-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    className="underline text-cyan-400 hover:text-cyan-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isLoading
                    ? 'rgba(0,245,196,0.3)'
                    : 'rgba(0,245,196,0.15)',
                  border: '1px solid rgba(0,245,196,0.5)',
                  color: '#00f5c4',
                  boxShadow: isLoading ? 'none' : '0 0 20px rgba(0,245,196,0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading)
                    e.currentTarget.style.background = 'rgba(0,245,196,0.25)';
                }}
                onMouseLeave={(e) => {
                  if (!isLoading)
                    e.currentTarget.style.background = 'rgba(0,245,196,0.15)';
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    Creating account…
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {/* Divider + login link */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 underline">
              Log in
            </Link>
          </div>
        </div>

        {/* Security note */}
        <p className="mt-4 text-center text-xs text-gray-600">
          🔒 Your password is never stored in plain text. All communication is encrypted.
        </p>
      </div>
    </div>
  );
}
