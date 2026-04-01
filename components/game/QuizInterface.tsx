/**
 * components/game/QuizInterface.tsx — Main quiz session UI for CyberShield LMS.
 * Fetches questions from GET /api/quizzes/:moduleId, runs DigitalDecrypt reveal, handles
 * answer selection, tracks streaks, and submits attempt to POST /api/quizzes/:moduleId/attempt.
 * To test: render with a valid moduleId and studentId (with Supabase connected) and play through.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DigitalDecrypt } from './DigitalDecrypt';
import { ExpBar } from './ExpBar';
import { StreakCounter } from './StreakCounter';
import { MedalReveal } from './MedalReveal';
import { QuizMascot, type MascotMood } from './QuizMascot';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { shuffleOptions, selectQuestions } from '@/lib/quizEngine';
import { calculateRank } from '@/lib/expSystem';
import { playSound, isSoundEnabled, toggleSound } from '@/lib/sounds';
import type { StudentQuestion, QuestionOption, GameResult, AttemptAnswer } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'decrypt' | 'answering' | 'feedback' | 'results';

interface LocalAttempt extends AttemptAnswer {
  isCorrect: boolean;
}

interface QuizInterfaceProps {
  moduleId: string;
  studentId: string;
  initialExp: number;
  initialLevel: number;
  onComplete?: (result: GameResult) => void;
}

// ─── Option button styling ─────────────────────────────────────────────────────

function optionClass(
  optionKey: string,
  selected: string | null,
  feedbackCorrectKey: string | null
): string {
  const base =
    'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ';

  if (!selected) {
    return base + 'border-white/10 bg-gray-800/60 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-gray-200 cursor-pointer';
  }

  if (feedbackCorrectKey === optionKey) {
    return base + 'border-green-500 bg-green-500/15 text-green-300 cursor-default';
  }
  if (selected === optionKey && feedbackCorrectKey !== optionKey) {
    return base + 'border-red-500 bg-red-500/15 text-red-300 cursor-default';
  }
  return base + 'border-white/5 bg-gray-800/30 text-gray-500 cursor-default';
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function QuizInterface({
  moduleId,
  studentId,
  initialExp,
  initialLevel,
  onComplete,
}: QuizInterfaceProps) {
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Answer state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedbackCorrectKey, setFeedbackCorrectKey] = useState<string | null>(null);

  // Gamification state
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [attempts, setAttempts] = useState<LocalAttempt[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentExp, setCurrentExp] = useState(initialExp);
  const [currentLevel, setCurrentLevel] = useState(initialLevel);

  // Timer
  const questionStartTime = useRef<number>(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Explanation shown during feedback phase
  const [explanation, setExplanation] = useState<string | null>(null);

  // EXP + accuracy count-up for results screen
  const [displayExpGained, setDisplayExpGained] = useState(0);
  const [displayAccuracy, setDisplayAccuracy] = useState(0);

  // Screen shake + sound toggle
  const [shakeCard, setShakeCard] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  // Floating +XP particles
  const [xpParticles, setXpParticles] = useState<{ id: number; x: number }[]>([]);
  const particleId = useRef(0);

  const currentQ = questions[currentIndex];

  // ─── Fetch questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/quizzes/${moduleId}`);
        if (!res.ok) throw new Error('Failed to load quiz');
        const { questions: fetched } = await res.json();
        if (cancelled) return;
        // Select and shuffle question order
        const selected = selectQuestions(fetched as StudentQuestion[]);
        setQuestions(selected);
        setPhase('decrypt');
      } catch (e) {
        if (!cancelled) setErrorMsg(String((e as Error).message));
      }
    }
    fetchQuestions();
    return () => { cancelled = true; };
  }, [moduleId]);

  // ─── Shuffle options when question changes ────────────────────────────────────
  useEffect(() => {
    if (!currentQ) return;
    setShuffledOptions(shuffleOptions([...currentQ.question_options]));
    setSelectedOption(null);
    setFeedbackCorrectKey(null);
    setExplanation(null);
    questionStartTime.current = Date.now();
    setTimeElapsed(0);
  }, [currentIndex, currentQ]);

  // ─── Question timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'answering') { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setTimeElapsed(Date.now() - questionStartTime.current), 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ─── Decrypt complete → start answering ─────────────────────────────────────
  const handleDecryptComplete = useCallback(() => {
    setPhase('answering');
    questionStartTime.current = Date.now();
  }, []);

  // ─── Answer selection ─────────────────────────────────────────────────────────
  const handleSelectOption = useCallback(async (optionKey: string) => {
    if (phase !== 'answering' || selectedOption) return;

    const responseTimeMs = Date.now() - questionStartTime.current;
    setSelectedOption(optionKey);
    setPhase('feedback');

    // Ask server to validate — POST returns correctKey, isCorrect, etc.
    // For client-side dev flow (no server), check is_correct from option (stripped in student mode).
    // Since student mode strips is_correct, we POST and let the server validate at session end.
    // For immediate feedback, we mark as 'pending' and server confirms at submission.

    // Optimistic: mark as pending and move on; actual correctness computed at submission
    const newAttempt: LocalAttempt = {
      questionId: currentQ.question_id,
      selectedOption: optionKey as 'A' | 'B' | 'C' | 'D',
      responseTimeMs,
      streakAtAttempt: streak,
      isCorrect: false, // server will confirm at submission
    };

    // Try quick server validation for immediate feedback
    try {
      const res = await fetch(`/api/quizzes/${moduleId}?teacherView=true`);
      if (res.ok) {
        const { questions: teacherQs } = await res.json();
        const serverQ = teacherQs?.find((q: { question_id: string }) => q.question_id === currentQ.question_id);
        if (serverQ) {
          const correctOpt = serverQ.question_options?.find((o: { is_correct: boolean }) => o.is_correct);
          const isCorrect = correctOpt?.option_key === optionKey;
          newAttempt.isCorrect = isCorrect;
          setFeedbackCorrectKey(correctOpt?.option_key ?? null);
          if (serverQ.explanation) setExplanation(serverQ.explanation);

          const newStreak = isCorrect ? streak + 1 : 0;
          setStreak(newStreak);
          setMaxStreak((prev) => Math.max(prev, newStreak));
          // P4: sound + shake
          if (isCorrect) {
            playSound('correct');
            // Spawn +XP particle
            const id = ++particleId.current;
            setXpParticles((p) => [...p, { id, x: Math.random() * 60 - 30 }]);
            setTimeout(() => setXpParticles((p) => p.filter((pt) => pt.id !== id)), 900);
          }
          else { playSound('wrong'); setShakeCard(true); }
          newAttempt.streakAtAttempt = newStreak;
        }
      }
    } catch {
      // Silent fail: submit without per-question feedback
    }

    setAttempts((prev) => [...prev, newAttempt]);
  }, [phase, selectedOption, currentQ, streak, moduleId]);

  // ─── Next question ─────────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setPhase('decrypt');
    } else {
      // Submit session
      setPhase('loading');
      try {
        const payload = {
          studentId,
          answers: attempts.map((a) => ({
            questionId: a.questionId,
            selectedOption: a.selectedOption,
            responseTimeMs: a.responseTimeMs,
            streakAtAttempt: a.streakAtAttempt,
          })),
        };
        const res = await fetch(`/api/quizzes/${moduleId}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to submit quiz');
        const data = await res.json();
        const result: GameResult = { ...data.result, maxStreak };
        setGameResult(result);
        setCurrentExp(result.newTotalExp);
        setCurrentLevel(result.newLevel);
        setPhase('results');
        playSound('complete');
        onComplete?.(result);
      } catch (e) {
        setErrorMsg(String((e as Error).message));
      }
    }
  }, [currentIndex, questions.length, attempts, studentId, moduleId, maxStreak, onComplete]);

  // ─── Keyboard shortcuts A/B/C/D + Enter ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      if (phase === 'answering' && ['A', 'B', 'C', 'D'].includes(key)) {
        handleSelectOption(key);
      } else if (phase === 'feedback' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, handleSelectOption, handleNext]);

  // ─── EXP + accuracy count-up when results arrive ─────────────────────────────
  useEffect(() => {
    if (!gameResult) return;
    // EXP count-up
    const expTarget = gameResult.expAwarded;
    if (expTarget > 0) {
      const dur = 1200; const t0 = Date.now();
      const t1 = setInterval(() => {
        const p = Math.min((Date.now() - t0) / dur, 1);
        setDisplayExpGained(Math.round(expTarget * (1 - Math.pow(1 - p, 3))));
        if (p >= 1) clearInterval(t1);
      }, 16);
    }
    // Accuracy count-up — starts after a short delay (beat 1)
    const accTarget = gameResult.accuracy;
    const dur2 = 900; const t0b = Date.now();
    const t2 = setInterval(() => {
      const p = Math.min((Date.now() - t0b) / dur2, 1);
      setDisplayAccuracy(parseFloat((accTarget * (1 - Math.pow(1 - p, 3))).toFixed(1)));
      if (p >= 1) clearInterval(t2);
    }, 16);
    return () => { clearInterval(t2); };
  }, [gameResult]);

  // ─── Mascot mood ─────────────────────────────────────────────────────────────
  const mascotMood: MascotMood =
    phase === 'results'   ? 'celebrating' :
    phase === 'feedback' && selectedOption === feedbackCorrectKey ? 'correct' :
    phase === 'feedback'  ? 'wrong' :
    phase === 'decrypt'   ? 'thinking' : 'idle';

  // ─── Timer bar constants ──────────────────────────────────────────────────────
  const MAX_QUESTION_TIME = 30_000;
  const timeProgress = Math.min(timeElapsed / MAX_QUESTION_TIME, 1);
  const timerBarColor =
    timeProgress < 0.5 ? 'bg-green-500' : timeProgress < 0.83 ? 'bg-yellow-400' : 'bg-red-500';

  // ─── Render ────────────────────────────────────────────────────────────────────

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 text-center p-6">
        <span className="text-4xl">⚠️</span>
        <p className="text-red-400 font-medium">{errorMsg}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" label="Loading quiz…" />
      </div>
    );
  }

  if (phase === 'results' && gameResult) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">

        {/* ── Beat 1: Accuracy count-up ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="text-center py-2"
        >
          <div className="flex justify-center mb-3">
            <QuizMascot mood="celebrating" size={72} />
          </div>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Mission Complete</p>
          <p className="text-6xl font-black text-white tabular-nums leading-none">
            {displayAccuracy}<span className="text-3xl text-gray-500">%</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {gameResult.correctCount}/{gameResult.totalQuestions} correct
          </p>
        </motion.div>

        {/* ── Beat 2: Medal drops in ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 14 }}
        >
          <MedalReveal medal={gameResult.medal} accuracy={gameResult.accuracy} />
        </motion.div>

        {/* ── Beat 3: Stats + EXP cascade ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 text-center">
          {[
            { label: 'EXP Gained',  value: `+${displayExpGained}`, highlight: true  },
            { label: 'Max Streak',  value: `${gameResult.maxStreak}🔥`, highlight: false },
          ].map(({ label, value, highlight }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.1, duration: 0.3 }}
              className={`rounded-xl border p-4 ${highlight ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-gray-800/60 border-white/5'}`}
            >
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${highlight ? 'text-cyan-300' : 'text-white'}`}>{value}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <ExpBar
            totalExp={currentExp}
            level={currentLevel}
            rankName={calculateRank(currentLevel)}
            expGainedThisSession={gameResult.expAwarded}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.3 }}
          className="text-center"
        >
          <p className="text-sm text-gray-400 mb-4">
            Rank: <span className="text-cyan-400 font-semibold">{gameResult.rankName}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => window.location.href = '/student/dashboard'}>
              Dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>Play Again</Button>
          </div>
        </motion.div>

      </div>
    );
  }

  if (!currentQ) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-5 max-w-2xl mx-auto relative" role="main" aria-label="Quiz session">
      {/* Floating +XP particles */}
      {xpParticles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, y: 0, x: p.x }}
          animate={{ opacity: 0, y: -60, x: p.x + (Math.random() * 20 - 10) }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 z-20 text-sm font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
          aria-hidden="true"
        >
          +10 XP
        </motion.div>
      ))}
      {/* Progress bar + timer */}
      <div className="space-y-2">
        {/* Question progress */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className={`font-mono tabular-nums transition-colors ${timeProgress >= 0.83 ? 'text-red-400' : timeProgress >= 0.5 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {(timeElapsed / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemax={questions.length}>
          <motion.div
            className="h-full bg-cyan-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {/* Countdown timer bar */}
        {phase === 'answering' && (
          <div className="h-1 bg-gray-800/60 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors duration-500 ${timerBarColor}`}
              animate={{ width: `${(1 - timeProgress) * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      {phase === 'answering' && (
        <p className="text-[10px] font-mono text-gray-700 text-right -mb-2">
          press <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-600">A</kbd>–<kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-600">D</kbd> to answer
        </p>
      )}
      {phase === 'feedback' && (
        <p className="text-[10px] font-mono text-gray-700 text-right -mb-2">
          press <kbd className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-600">Enter</kbd> to continue
        </p>
      )}

      {/* Streak + EXP bar + mascot + sound toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <StreakCounter streak={streak} />
        <ExpBar totalExp={currentExp} level={currentLevel} className="flex-1 min-w-48" />
        <QuizMascot mood={mascotMood} size={36} />
        <button
          onClick={() => { const next = toggleSound(); setSoundOn(next); }}
          title={soundOn ? 'Mute sounds' : 'Enable sounds'}
          className="text-lg opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
          aria-label={soundOn ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.question_id}
          initial={{ opacity: 0, x: 20 }}
          animate={shakeCard
            ? { x: [0, -10, 10, -7, 7, -4, 4, 0], opacity: 1 }
            : { opacity: 1, x: 0 }
          }
          exit={{ opacity: 0, x: -20 }}
          transition={shakeCard
            ? { duration: 0.4, ease: 'easeOut' }
            : { duration: 0.25 }
          }
          onAnimationComplete={() => { if (shakeCard) setShakeCard(false); }}
          className="rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-sm p-6"
        >
          {/* Difficulty badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">
              Difficulty {Array.from({ length: currentQ.difficulty }, (_, i) => '◆').join('')}
              {Array.from({ length: 5 - currentQ.difficulty }, (_, i) => '◇').join('')}
            </span>
          </div>

          {/* Question text with DigitalDecrypt */}
          <h2 className="text-base sm:text-lg font-semibold text-white mb-6 leading-relaxed min-h-16">
            {(phase === 'decrypt') ? (
              <DigitalDecrypt text={currentQ.question_text} onComplete={handleDecryptComplete} />
            ) : (
              currentQ.question_text
            )}
          </h2>

          {/* Answer options */}
          <div
            className="space-y-2.5"
            role="radiogroup"
            aria-label="Answer options"
            aria-disabled={phase !== 'answering'}
          >
            {shuffledOptions.map((option) => (
              <button
                key={option.option_id}
                onClick={() => handleSelectOption(option.option_key)}
                disabled={phase !== 'answering'}
                aria-pressed={selectedOption === option.option_key}
                className={optionClass(option.option_key, selectedOption, feedbackCorrectKey)}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-700 text-xs font-bold mr-3 flex-shrink-0">
                  {option.option_key}
                </span>
                {option.option_text}
              </button>
            ))}
          </div>

          {/* Feedback row */}
          {phase === 'feedback' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QuizMascot mood={selectedOption === feedbackCorrectKey ? 'correct' : 'wrong'} size={40} />
                  <p className="text-sm font-semibold">
                    {selectedOption === feedbackCorrectKey ? (
                      <span className="text-green-400">Nice work! ✓</span>
                    ) : (
                      <span className="text-amber-400">Almost! Keep going ↗</span>
                    )}
                  </p>
                </div>
                <Button size="sm" onClick={handleNext}>
                  {currentIndex < questions.length - 1 ? 'Next →' : 'Finish'}
                </Button>
              </div>

              {/* Intel Recovered — wrong answer treatment */}
              {selectedOption !== feedbackCorrectKey && feedbackCorrectKey && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3"
                >
                  <p className="text-xs font-mono text-amber-500 uppercase tracking-widest mb-2">
                    ▸ Intel Recovered
                  </p>
                  <p className="text-xs text-gray-500 mb-1">Correct answer:</p>
                  <DigitalDecrypt
                    text={shuffledOptions.find((o) => o.option_key === feedbackCorrectKey)?.option_text ?? ''}
                  />
                </motion.div>
              )}

              {explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.25, duration: 0.25 }}
                  className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3"
                >
                  <p className="text-xs font-mono text-cyan-500 uppercase tracking-wider mb-1">// Analysis</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
