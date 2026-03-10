/**
 * app/quiz/session/[sessionId]/page.tsx — Active quiz session page for CyberShield LMS.
 * The [sessionId] param is the moduleId being quizzed (session is created server-side on completion).
 * Wraps the QuizInterface component; reads student identity from Supabase auth or dev session.
 * To test: navigate to /quiz/session/{moduleId} after logging in as a student.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QuizInterface } from '@/components/game/QuizInterface';
import type { User } from '@/types';

export default function QuizSessionPage() {
  const params = useParams();
  const moduleId = params?.sessionId as string; // sessionId param = moduleId

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
          if (data) { setUser(data as User); return; }
        }

        // Dev session fallback
        if (typeof sessionStorage !== 'undefined') {
          const devId = sessionStorage.getItem('dev_id');
          const devName = sessionStorage.getItem('dev_name');
          const devRole = sessionStorage.getItem('dev_role');
          if (devId && devRole === 'student') {
            setUser({
              id: devId,
              email: 'alice@cybershield.dev',
              name: devName ?? 'Alice',
              role: 'student',
              total_exp: 450,
              level: 2,
              created_at: new Date().toISOString(),
            });
            return;
          }
        }

        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    }
    resolveUser();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <LoadingSpinner size="lg" label="Preparing quiz…" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-gray-400">
            Please{' '}
            <Link href="/login" className="text-cyan-400 hover:underline">sign in</Link>{' '}
            to take a quiz.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header userRole="student" userName={user.name} />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {/* Back link */}
        <Link
          href={`/modules/${moduleId}`}
          className="text-xs text-gray-500 hover:text-cyan-400 transition-colors block mb-6"
        >
          ← Back to module
        </Link>

        <QuizInterface
          moduleId={moduleId}
          studentId={user.id}
          initialExp={user.total_exp}
          initialLevel={user.level}
        />
      </main>

      <Footer />
    </div>
  );
}
