/**
 * app/modules/[moduleId]/page.tsx — Module landing page for CyberShield LMS.
 * Shows module details, lesson content (if any), and a "Start Quiz" button.
 * To test: navigate to /modules/{coreModuleId} after logging in as a student.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { browserSupabase as supabase } from '@/lib/browserClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { Module, Assignment, Submission } from '@/types';

interface ModuleDetail extends Module {
  question_count: number;
  lessons: { lesson_id: string; lesson_title: string; content: string }[];
}

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params?.moduleId as string;

  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Student identity (from Supabase auth or dev session)
  const [studentId, setStudentId] = useState<string | null>(null);

  // Assignments for this module
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  // My submissions keyed by assignment_id
  const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});
  // Per-assignment URL input state
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!moduleId) return;
    async function load() {
      try {
        // Resolve student identity
        const { data: { user: authUser } } = await supabase.auth.getUser();
        let resolvedStudentId: string | null = authUser?.id ?? null;
        if (!resolvedStudentId && typeof sessionStorage !== 'undefined') {
          const devRole = sessionStorage.getItem('dev_role');
          if (devRole === 'student') {
            resolvedStudentId = sessionStorage.getItem('dev_id');
          }
        }
        setStudentId(resolvedStudentId);

        const res = await fetch(`/api/quizzes/${moduleId}?teacherView=false`);
        if (!res.ok) throw new Error('Module not found');
        const { module, questions } = await res.json();

        // Fetch lessons
        const { data: lessons } = await supabase
          .from('lessons')
          .select('lesson_id, lesson_title, content')
          .eq('module_id', moduleId)
          .order('lesson_id');

        setModuleDetail({
          ...module,
          question_count: questions?.length ?? 0,
          lessons: lessons ?? [],
        });

        // Fetch assignments for this module
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select('id, module_id, title, instructions, due_date, created_by, created_at')
          .eq('module_id', moduleId)
          .order('created_at', { ascending: true });

        setAssignments((assignmentData ?? []) as Assignment[]);

        // Fetch student's existing submissions
        if (resolvedStudentId && (assignmentData ?? []).length > 0) {
          const assignmentIds = (assignmentData ?? []).map((a: Assignment) => a.id);
          const { data: subData } = await supabase
            .from('submissions')
            .select('id, assignment_id, student_id, file_url, grade, feedback, submitted_at')
            .in('assignment_id', assignmentIds)
            .eq('student_id', resolvedStudentId);

          const submissionsMap: Record<string, Submission> = {};
          (subData ?? []).forEach((s: Submission) => {
            submissionsMap[s.assignment_id] = s;
          });
          setMySubmissions(submissionsMap);
        }
      } catch (e) {
        setErrorMsg(String((e as Error).message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [moduleId]);

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (!studentId) return;
    setSubmitting(assignmentId);
    setSubmitMsg((prev) => ({ ...prev, [assignmentId]: '' }));
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, file_url: fileUrls[assignmentId] ?? '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Submission failed');
      setMySubmissions((prev) => ({ ...prev, [assignmentId]: json.submission }));
      setSubmitMsg((prev) => ({ ...prev, [assignmentId]: '✓ Submitted!' }));
    } catch (e) {
      setSubmitMsg((prev) => ({ ...prev, [assignmentId]: String((e as Error).message) }));
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  if (errorMsg || !moduleDetail) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-1 items-center justify-center gap-4 flex-col text-center p-6">
          <p className="text-red-400">{errorMsg ?? 'Module not found.'}</p>
          <Link href="/student/dashboard">
            <Button variant="secondary">← Back to Dashboard</Button>
          </Link>
        </main>
      </div>
    );
  }

  const mod = moduleDetail;

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 space-y-8">
        {/* Back link */}
        <Link
          href="/student/dashboard"
          className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
        >
          ← Dashboard
        </Link>

        {/* Module header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-500/20 bg-gray-900/80 p-8"
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl flex-shrink-0" aria-hidden="true">
              {mod.module_type === 'core' ? '🏛️' : '📝'}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-cyan-600 uppercase tracking-widest">
                  {mod.module_type}
                </span>
                {mod.exp_bonus_percent > 0 && (
                  <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                    +{mod.exp_bonus_percent}% EXP
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">{mod.module_name}</h1>
              {mod.description && (
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">{mod.description}</p>
              )}
              <p className="text-xs text-gray-600 mt-3">
                {mod.question_count} question{mod.question_count !== 1 ? 's' : ''} in this module
              </p>
            </div>
          </div>
        </motion.div>

        {/* Lessons */}
        {mod.lessons && mod.lessons.length > 0 && (
          <section aria-labelledby="lessons-heading">
            <h2 id="lessons-heading" className="text-sm font-semibold text-white mb-3">
              Learning Material
            </h2>
            <div className="space-y-3">
              {mod.lessons.map((lesson, i) => (
                <motion.div
                  key={lesson.lesson_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-white/5 bg-gray-900/40 p-5"
                >
                  <h3 className="text-sm font-semibold text-white mb-2">{lesson.lesson_title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {lesson.content}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Assignments */}
        {assignments.length > 0 && (
          <section aria-labelledby="assignments-heading">
            <h2 id="assignments-heading" className="text-sm font-semibold text-white mb-3">
              Assignments
            </h2>
            <div className="space-y-4">
              {assignments.map((a) => {
                const existing = mySubmissions[a.id];
                const msg = submitMsg[a.id];
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-xl border border-white/5 bg-gray-900/40 p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {a.due_date && (() => {
                          const isOverdue = new Date(a.due_date) < new Date();
                          return (
                            <span className={[
                              'text-xs font-mono px-2 py-0.5 rounded-full border',
                              isOverdue
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                            ].join(' ')}>
                              {isOverdue ? 'Overdue' : `Due ${new Date(a.due_date).toLocaleDateString()}`}
                            </span>
                          );
                        })()}
                        {existing?.grade && (
                          <span className="text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                            Grade: {existing.grade}
                          </span>
                        )}
                      </div>
                    </div>

                    {a.instructions && (
                      <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {a.instructions}
                      </p>
                    )}

                    {existing?.feedback && (
                      <p className="text-xs text-cyan-400 bg-cyan-500/5 border border-cyan-500/15 rounded-lg px-3 py-2">
                        Feedback: {existing.feedback}
                      </p>
                    )}

                    {studentId ? (
                      existing ? (
                        <div className="space-y-2">
                          {existing.file_url && (
                            <a
                              href={existing.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                            >
                              📎 Your submission
                            </a>
                          )}
                          <div className="flex gap-2 items-center flex-wrap">
                            <input
                              type="url"
                              placeholder="Update submission URL…"
                              value={fileUrls[a.id] ?? ''}
                              onChange={(e) =>
                                setFileUrls((prev) => ({ ...prev, [a.id]: e.target.value }))
                              }
                              className="flex-1 min-w-[200px] rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={submitting === a.id}
                              onClick={() => handleSubmitAssignment(a.id)}
                            >
                              Resubmit
                            </Button>
                          </div>
                          {msg && (
                            <p className={`text-xs ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                              {msg}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 items-center flex-wrap">
                            <input
                              type="url"
                              placeholder="Paste your submission URL (Google Drive, GitHub, etc.)"
                              value={fileUrls[a.id] ?? ''}
                              onChange={(e) =>
                                setFileUrls((prev) => ({ ...prev, [a.id]: e.target.value }))
                              }
                              className="flex-1 min-w-[200px] rounded-lg bg-gray-800 border border-white/10 text-white text-xs px-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                            />
                            <Button
                              size="sm"
                              loading={submitting === a.id}
                              onClick={() => handleSubmitAssignment(a.id)}
                            >
                              Submit
                            </Button>
                          </div>
                          {msg && (
                            <p className={`text-xs ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                              {msg}
                            </p>
                          )}
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-gray-600">Log in to submit this assignment.</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quiz CTA */}
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-8 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Ready to test your knowledge?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Complete the quiz to earn EXP and a medal. {mod.question_count > 10 ? `${mod.question_count} questions available (10 selected randomly).` : ''}
          </p>
          <Button
            size="lg"
            onClick={() => router.push(`/quiz/session/${moduleId}`)}
            disabled={mod.question_count === 0}
          >
            {mod.question_count === 0 ? 'No questions yet' : 'Start Quiz →'}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
