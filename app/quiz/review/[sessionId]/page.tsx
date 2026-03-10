/**
 * app/quiz/review/[sessionId]/page.tsx — Post-quiz attempt review for CyberShield LMS.
 * Shows each question, the student's answer, the correct answer, and the explanation.
 * Only the student who completed the session may view this page.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface ReviewAttempt {
  attempt_id: string;
  selected_option: string;
  is_correct: boolean;
  response_time_ms: number;
  questions: {
    question_id: string;
    question_text: string;
    explanation: string | null;
    question_options: { option_key: string; option_text: string; is_correct: boolean }[];
  };
}

interface ReviewSession {
  session_id: string;
  module_id: string;
  module_name: string;
  finished_at: string;
  total_score: number;
  accuracy: number;
  medal_awarded: string;
  exp_awarded: number;
}

const MEDAL_EMOJI: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '—' };

export default function QuizReviewPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<ReviewSession | null>(null);
  const [attempts, setAttempts] = useState<ReviewAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    async function load() {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const studentId = authSession?.user.id;
        if (!studentId) { window.location.href = '/login'; return; }

        const res = await fetch(`/api/sessions/${sessionId}/review?studentId=${studentId}`);
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? 'Could not load review');
        }
        const json = await res.json();
        setSession(json.session);
        setAttempts(json.attempts ?? []);
      } catch (e) {
        setErrorMsg(String((e as Error).message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header userRole="student" />
        <main className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" label="Loading review…" />
        </main>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header userRole="student" />
        <main className="flex flex-1 items-center justify-center flex-col gap-4 p-6 text-center">
          <p className="text-red-400">{errorMsg ?? 'Session not found.'}</p>
          <Link href="/student/dashboard" className="text-xs text-cyan-400 hover:text-cyan-300">
            ← Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  const correctCount = attempts.filter((a) => a.is_correct).length;

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 space-y-8">
        {/* Back */}
        <Link href="/student/dashboard" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">
          ← Dashboard
        </Link>

        {/* Session summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-500/20 bg-gray-900/80 p-6"
        >
          <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest mb-1">Session Review</p>
          <h1 className="text-xl font-bold text-white mb-3">{session.module_name}</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Medal', value: MEDAL_EMOJI[session.medal_awarded ?? 'none'] },
              { label: 'Score', value: `${correctCount}/${attempts.length}` },
              { label: 'Accuracy', value: `${session.accuracy?.toFixed(1)}%` },
              { label: 'EXP', value: `+${session.exp_awarded}` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-gray-800/60 p-3 text-center">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Attempts */}
        <section>
          <h2 className="text-sm font-semibold text-white mb-4">
            Question Breakdown ({correctCount}/{attempts.length} correct)
          </h2>
          <div className="space-y-4">
            {attempts.map((attempt, i) => {
              const q = attempt.questions;
              const correctOption = q.question_options.find((o) => o.is_correct);
              return (
                <motion.div
                  key={attempt.attempt_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={[
                    'rounded-xl border p-5 space-y-3',
                    attempt.is_correct
                      ? 'border-green-500/25 bg-green-500/5'
                      : 'border-red-500/25 bg-red-500/5',
                  ].join(' ')}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 text-lg mt-0.5">
                      {attempt.is_correct ? '✅' : '❌'}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Q{i + 1}</p>
                      <p className="text-sm text-white font-medium leading-snug">{q.question_text}</p>
                    </div>
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      {(attempt.response_time_ms / 1000).toFixed(1)}s
                    </span>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-8">
                    {q.question_options
                      .slice()
                      .sort((a, b) => a.option_key.localeCompare(b.option_key))
                      .map((opt) => {
                        const isSelected = opt.option_key === attempt.selected_option;
                        const isCorrect = opt.is_correct;
                        let cls = 'rounded-lg px-3 py-1.5 text-xs border ';
                        if (isCorrect) cls += 'border-green-500/40 bg-green-500/10 text-green-300';
                        else if (isSelected && !isCorrect) cls += 'border-red-500/40 bg-red-500/10 text-red-300';
                        else cls += 'border-white/5 bg-gray-800/40 text-gray-500';
                        return (
                          <div key={opt.option_key} className={cls}>
                            <span className="font-mono font-semibold mr-1.5">{opt.option_key}.</span>
                            {opt.option_text}
                            {isSelected && !isCorrect && <span className="ml-1 text-red-400">← your answer</span>}
                            {isCorrect && <span className="ml-1 text-green-400">← correct</span>}
                          </div>
                        );
                      })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="pl-8">
                      <p className="text-xs text-cyan-400 bg-cyan-500/5 border border-cyan-500/15 rounded-lg px-3 py-2 leading-relaxed">
                        💡 {q.explanation}
                      </p>
                    </div>
                  )}

                  {/* Correct answer reminder (only shown on wrong answers with no explanation) */}
                  {!attempt.is_correct && !q.explanation && correctOption && (
                    <p className="pl-8 text-xs text-gray-500">
                      Correct answer: <span className="text-green-400 font-semibold">{correctOption.option_key}. {correctOption.option_text}</span>
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        <div className="text-center pt-4">
          <Link href="/student/dashboard">
            <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 text-sm transition-all">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
