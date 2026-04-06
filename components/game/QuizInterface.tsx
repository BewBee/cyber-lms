/**
 * components/game/QuizInterface.tsx — Main quiz session UI for CyberShield LMS.
 * Supports normal mode and boss battle mode (isBoss=true).
 * Power-ups: 50/50, Shield, Skip — loaded from /api/student/powerups.
 * Fetches questions from GET /api/quizzes/:moduleId, submits to POST /api/quizzes/:moduleId/attempt.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DigitalDecrypt } from './DigitalDecrypt';
import { ExpBar } from './ExpBar';
import { StreakCounter } from './StreakCounter';
import { MedalReveal } from './MedalReveal';
import { QuizMascot, type MascotMood } from './QuizMascot';
import { BossIntro } from './BossIntro';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { shuffleOptions, selectQuestions } from '@/lib/quizEngine';
import { calculateRank } from '@/lib/expSystem';
import { playSound, isSoundEnabled, toggleSound } from '@/lib/sounds';
import type { StudentQuestion, QuestionOption, GameResult, AttemptAnswer } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'boss_intro' | 'decrypt' | 'answering' | 'feedback' | 'results';
export type PowerupType = 'fifty_fifty' | 'shield' | 'skip';

interface Powerup {
  powerup_type: PowerupType;
  quantity: number;
}

interface LocalAttempt extends AttemptAnswer {
  isCorrect: boolean;
}

interface QuizInterfaceProps {
  moduleId: string;
  studentId: string;
  initialExp: number;
  initialLevel: number;
  isBoss?: boolean;
  onComplete?: (result: GameResult) => void;
}

// ─── Option button styling ─────────────────────────────────────────────────────

function optionClass(
  optionKey: string,
  selected: string | null,
  feedbackCorrectKey: string | null,
  eliminated: string[],
  isBoss: boolean
): string {
  const base =
    'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ' +
    'focus-visible:outline-none focus-visible:ring-2 ';

  if (eliminated.includes(optionKey) && !selected) {
    return base + `focus-visible:ring-gray-500 border-white/5 bg-gray-800/20 text-gray-700 cursor-not-allowed line-through opacity-35`;
  }

  const ring = isBoss ? 'focus-visible:ring-red-500' : 'focus-visible:ring-cyan-500';
  const hoverStyle = isBoss
    ? 'hover:border-red-500/50 hover:bg-red-500/5'
    : 'hover:border-cyan-500/50 hover:bg-cyan-500/5';

  if (!selected) {
    return base + ring + ` border-white/10 bg-gray-800/60 ${hoverStyle} text-gray-200 cursor-pointer`;
  }

  if (feedbackCorrectKey === optionKey) {
    return base + ring + ' border-green-500 bg-green-500/15 text-green-300 cursor-default';
  }
  if (selected === optionKey && feedbackCorrectKey !== optionKey) {
    return base + ring + ' border-red-500 bg-red-500/15 text-red-300 cursor-default';
  }
  return base + ring + ' border-white/5 bg-gray-800/30 text-gray-500 cursor-default';
}

// ─── Power-up config ──────────────────────────────────────────────────────────

const POWERUP_CONFIG: Record<PowerupType, { icon: string; label: string; title: string }> = {
  fifty_fifty: { icon: '🎯', label: '50/50',  title: 'Eliminate 2 wrong answers' },
  shield:       { icon: '🛡',  label: 'Shield', title: 'Block the next wrong answer — no life lost' },
  skip:         { icon: '⏭',  label: 'Skip',   title: 'Skip this question, no penalty' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function QuizInterface({
  moduleId,
  studentId,
  initialExp,
  initialLevel,
  isBoss = false,
  onComplete,
}: QuizInterfaceProps) {
  // ── Quiz data ───────────────────────────────────────────────────────────────
  const [questions, setQuestions]           = useState<StudentQuestion[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [phase, setPhase]                   = useState<Phase>('loading');
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [moduleName, setModuleName]         = useState('');

  // ── Answer state ────────────────────────────────────────────────────────────
  const [selectedOption, setSelectedOption]       = useState<string | null>(null);
  const [feedbackCorrectKey, setFeedbackCorrectKey] = useState<string | null>(null);
  const [explanation, setExplanation]             = useState<string | null>(null);

  // ── Gamification ────────────────────────────────────────────────────────────
  const [streak, setStreak]       = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [attempts, setAttempts]   = useState<LocalAttempt[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentExp, setCurrentExp]     = useState(initialExp);
  const [currentLevel, setCurrentLevel] = useState(initialLevel);

  // ── Timer ───────────────────────────────────────────────────────────────────
  const questionStartTime = useRef<number>(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [displayExpGained, setDisplayExpGained] = useState(0);
  const [displayAccuracy, setDisplayAccuracy]   = useState(0);
  const [shakeCard, setShakeCard]               = useState(false);
  const [soundOn, setSoundOn]                   = useState(false);
  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  // ── Hearts ───────────────────────────────────────────────────────────────────
  const MAX_HEARTS = 3;
  const [hearts, setHearts]   = useState(MAX_HEARTS);
  const [gameOver, setGameOver] = useState(false);

  // ── Boss mode ─────────────────────────────────────────────────────────────────
  const [bossHp, setBossHp]     = useState(100);
  const [bossHit, setBossHit]   = useState(false);

  // ── Power-ups ────────────────────────────────────────────────────────────────
  const [powerups, setPowerups]               = useState<Powerup[]>([]);
  const [shieldActive, setShieldActive]       = useState(false);
  const [shieldBlocked, setShieldBlocked]     = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [powerupMsg, setPowerupMsg]           = useState<string | null>(null);

  // ── XP particles ─────────────────────────────────────────────────────────────
  const [xpParticles, setXpParticles] = useState<{ id: number; x: number }[]>([]);
  const particleId = useRef(0);

  const currentQ = questions[currentIndex];

  // ── Fetch questions ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/quizzes/${moduleId}`);
        if (!res.ok) throw new Error('Failed to load quiz');
        const { questions: fetched, module: mod } = await res.json();
        if (cancelled) return;
        const selected = selectQuestions(fetched as StudentQuestion[]);
        setQuestions(selected);
        setModuleName(mod?.module_name ?? 'Unknown');
        setPhase(isBoss ? 'boss_intro' : 'decrypt');
      } catch (e) {
        if (!cancelled) setErrorMsg(String((e as Error).message));
      }
    }
    fetchQuestions();
    return () => { cancelled = true; };
  }, [moduleId, isBoss]);

  // ── Load power-ups ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    async function loadPowerups() {
      try {
        const res = await fetch(`/api/student/powerups?studentId=${studentId}`);
        if (res.ok && !cancelled) {
          const { powerups: data } = await res.json();
          setPowerups(data ?? []);
        }
      } catch { /* silent */ }
    }
    loadPowerups();
    return () => { cancelled = true; };
  }, [studentId]);

  // ── Reset per-question state when question changes ────────────────────────────
  useEffect(() => {
    if (!currentQ) return;
    setShuffledOptions(shuffleOptions([...currentQ.question_options]));
    setSelectedOption(null);
    setFeedbackCorrectKey(null);
    setExplanation(null);
    setEliminatedOptions([]);
    questionStartTime.current = Date.now();
    setTimeElapsed(0);
  }, [currentIndex, currentQ]);

  // ── Question timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'answering') { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setTimeElapsed(Date.now() - questionStartTime.current), 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── EXP + accuracy count-up ───────────────────────────────────────────────────
  useEffect(() => {
    if (!gameResult) return;
    const expTarget = gameResult.expAwarded;
    if (expTarget > 0) {
      const dur = 1200; const t0 = Date.now();
      const t1 = setInterval(() => {
        const p = Math.min((Date.now() - t0) / dur, 1);
        setDisplayExpGained(Math.round(expTarget * (1 - Math.pow(1 - p, 3))));
        if (p >= 1) clearInterval(t1);
      }, 16);
    }
    const accTarget = gameResult.accuracy;
    const dur2 = 900; const t0b = Date.now();
    const t2 = setInterval(() => {
      const p = Math.min((Date.now() - t0b) / dur2, 1);
      setDisplayAccuracy(parseFloat((accTarget * (1 - Math.pow(1 - p, 3))).toFixed(1)));
      if (p >= 1) clearInterval(t2);
    }, 16);
    return () => { clearInterval(t2); };
  }, [gameResult]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleDecryptComplete = useCallback(() => {
    setPhase('answering');
    questionStartTime.current = Date.now();
  }, []);

  // Submit session — shared by handleNext and handleSkip
  const submitSession = useCallback(async () => {
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
  }, [studentId, attempts, moduleId, maxStreak, onComplete]);

  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1 && !gameOver) {
      setCurrentIndex((i) => i + 1);
      setPhase('decrypt');
    } else {
      await submitSession();
    }
  }, [currentIndex, questions.length, gameOver, submitSession]);

  // Answer selection
  const handleSelectOption = useCallback(async (optionKey: string) => {
    if (phase !== 'answering' || selectedOption) return;

    const responseTimeMs = Date.now() - questionStartTime.current;
    setSelectedOption(optionKey);
    setPhase('feedback');

    const newAttempt: LocalAttempt = {
      questionId: currentQ.question_id,
      selectedOption: optionKey as 'A' | 'B' | 'C' | 'D',
      responseTimeMs,
      streakAtAttempt: streak,
      isCorrect: false,
    };

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
          newAttempt.streakAtAttempt = newStreak;

          if (isCorrect) {
            playSound('correct');
            // +XP particle
            const id = ++particleId.current;
            setXpParticles((p) => [...p, { id, x: Math.random() * 60 - 30 }]);
            setTimeout(() => setXpParticles((p) => p.filter((pt) => pt.id !== id)), 900);
            // Boss takes damage
            if (isBoss) {
              const dmg = questions.length > 0 ? Math.ceil(100 / questions.length) : 10;
              setBossHp((hp) => Math.max(0, hp - dmg));
              setBossHit(true);
              setTimeout(() => setBossHit(false), 500);
              playSound('boss_hit');
            }
          } else {
            // Shield blocks life loss
            if (shieldActive) {
              setShieldActive(false);
              setShieldBlocked(true);
              setTimeout(() => setShieldBlocked(false), 1200);
              playSound('shield_block');
            } else {
              playSound('wrong');
              setShakeCard(true);
              setHearts((h) => {
                const next = h - 1;
                if (next <= 0) setGameOver(true);
                return next;
              });
            }
          }
        }
      }
    } catch { /* silent */ }

    setAttempts((prev) => [...prev, newAttempt]);
  }, [phase, selectedOption, currentQ, streak, moduleId, isBoss, shieldActive, questions.length]);

  // 50/50 power-up
  const handleFiftyFifty = useCallback(async () => {
    if (phase !== 'answering' || eliminatedOptions.length > 0) return;
    const pu = powerups.find((p) => p.powerup_type === 'fifty_fifty');
    if (!pu || pu.quantity <= 0) return;

    try {
      // Fetch correct key so we know which to keep
      const res = await fetch(`/api/quizzes/${moduleId}?teacherView=true`);
      if (!res.ok) return;
      const { questions: teacherQs } = await res.json();
      const serverQ = teacherQs?.find((q: { question_id: string }) => q.question_id === currentQ?.question_id);
      if (!serverQ) return;
      const correctKey = serverQ.question_options?.find((o: { is_correct: boolean }) => o.is_correct)?.option_key as string;
      const wrongKeys = shuffledOptions.map((o) => o.option_key).filter((k) => k !== correctKey);
      // Eliminate 2 wrong options (keep 1 wrong + 1 correct)
      const toEliminate = wrongKeys.sort(() => Math.random() - 0.5).slice(0, 2);
      setEliminatedOptions(toEliminate);

      // Consume power-up server-side
      await fetch(`/api/student/powerups?studentId=${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerupType: 'fifty_fifty' }),
      });
      setPowerups((prev) => prev.map((p) =>
        p.powerup_type === 'fifty_fifty' ? { ...p, quantity: p.quantity - 1 } : p
      ));
      playSound('powerup');
      setPowerupMsg('🎯 50/50 — two wrong answers eliminated!');
      setTimeout(() => setPowerupMsg(null), 2500);
    } catch { /* silent */ }
  }, [phase, eliminatedOptions, powerups, currentQ, shuffledOptions, moduleId, studentId]);

  // Shield power-up
  const handleShield = useCallback(async () => {
    if (shieldActive) return;
    const pu = powerups.find((p) => p.powerup_type === 'shield');
    if (!pu || pu.quantity <= 0) return;

    setShieldActive(true);
    try {
      await fetch(`/api/student/powerups?studentId=${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerupType: 'shield' }),
      });
    } catch { /* silent */ }
    setPowerups((prev) => prev.map((p) =>
      p.powerup_type === 'shield' ? { ...p, quantity: p.quantity - 1 } : p
    ));
    playSound('powerup');
    setPowerupMsg('🛡 Shield active — next wrong answer won\'t cost a life!');
    setTimeout(() => setPowerupMsg(null), 2500);
  }, [shieldActive, powerups, studentId]);

  // Skip power-up
  const handleSkip = useCallback(async () => {
    if (phase !== 'answering') return;
    const pu = powerups.find((p) => p.powerup_type === 'skip');
    if (!pu || pu.quantity <= 0) return;

    try {
      await fetch(`/api/student/powerups?studentId=${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerupType: 'skip' }),
      });
    } catch { /* silent */ }
    setPowerups((prev) => prev.map((p) =>
      p.powerup_type === 'skip' ? { ...p, quantity: p.quantity - 1 } : p
    ));
    playSound('powerup');
    setPowerupMsg('⏭ Question skipped!');
    setTimeout(() => setPowerupMsg(null), 1800);

    // Advance without recording an attempt
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setPhase('decrypt');
    } else {
      await submitSession();
    }
  }, [phase, powerups, studentId, currentIndex, questions.length, submitSession]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      if (phase === 'answering' && ['A', 'B', 'C', 'D'].includes(key)) {
        handleSelectOption(key);
      } else if (phase === 'feedback' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNext();
      } else if (phase === 'boss_intro' && e.key === 'Enter') {
        setPhase('decrypt');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, handleSelectOption, handleNext]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const mascotMood: MascotMood =
    phase === 'results'  ? 'celebrating' :
    phase === 'feedback' && selectedOption === feedbackCorrectKey ? 'correct' :
    phase === 'feedback' ? 'wrong' :
    phase === 'decrypt'  ? 'thinking' : 'idle';

  const MAX_QUESTION_TIME = 30_000;
  const timeProgress = Math.min(timeElapsed / MAX_QUESTION_TIME, 1);
  const timerBarColor = timeProgress < 0.5 ? 'bg-green-500' : timeProgress < 0.83 ? 'bg-yellow-400' : 'bg-red-500';
  const accentColor = isBoss ? 'red' : 'cyan';

  // ── Phase: error ─────────────────────────────────────────────────────────────
  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 text-center p-6">
        <span className="text-4xl">⚠️</span>
        <p className="text-red-400 font-medium">{errorMsg}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // ── Phase: loading ───────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" label={isBoss ? 'Preparing boss battle…' : 'Loading quiz…'} />
      </div>
    );
  }

  // ── Phase: boss intro ────────────────────────────────────────────────────────
  if (phase === 'boss_intro') {
    return (
      <AnimatePresence>
        <BossIntro
          bossName={moduleName}
          onStart={() => setPhase('decrypt')}
        />
      </AnimatePresence>
    );
  }

  // ── Phase: results ───────────────────────────────────────────────────────────
  if (phase === 'results' && gameResult) {
    const bossDefeated = isBoss && bossHp <= 0;
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Beat 1: accuracy */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="text-center py-2"
        >
          <div className="flex justify-center mb-3">
            <QuizMascot mood="celebrating" size={72} />
          </div>
          {isBoss && (
            <motion.p
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-xs font-mono font-black uppercase tracking-[0.3em] mb-2 ${
                bossDefeated ? 'text-green-400' : 'text-red-500'
              }`}
            >
              {bossDefeated ? '⚡ BOSS DEFEATED!' : '💀 BOSS WINS THIS ROUND'}
            </motion.p>
          )}
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">
            {isBoss ? 'Battle Complete' : 'Mission Complete'}
          </p>
          <p className="text-6xl font-black text-white tabular-nums leading-none">
            {displayAccuracy}<span className="text-3xl text-gray-500">%</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {gameResult.correctCount}/{gameResult.totalQuestions} correct
          </p>
        </motion.div>

        {/* Beat 2: medal */}
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 14 }}
        >
          <MedalReveal medal={gameResult.medal} accuracy={gameResult.accuracy} />
        </motion.div>

        {/* Beat 3: stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          {[
            { label: 'EXP Gained', value: `+${displayExpGained}`, highlight: true  },
            { label: 'Max Streak', value: `${gameResult.maxStreak}🔥`, highlight: false },
          ].map(({ label, value, highlight }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.1, duration: 0.3 }}
              className={`rounded-xl border p-4 ${
                highlight
                  ? isBoss
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-gray-800/60 border-white/5'
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${
                highlight ? (isBoss ? 'text-red-300' : 'text-cyan-300') : 'text-white'
              }`}>{value}</p>
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
            Rank: <span className={`font-semibold ${isBoss ? 'text-red-400' : 'text-cyan-400'}`}>
              {gameResult.rankName}
            </span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => window.location.href = '/student/dashboard'}>
              Dashboard
            </Button>
            <Button onClick={() => window.location.reload()}>
              {isBoss ? '⚔ Rematch' : 'Play Again'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentQ) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  // ── Phase: quiz (decrypt / answering / feedback) ──────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl mx-auto relative" role="main" aria-label="Quiz session">
      {/* Floating +XP particles */}
      {xpParticles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, y: 0, x: p.x }}
          animate={{ opacity: 0, y: -60, x: p.x + (Math.random() * 20 - 10) }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
          className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 z-20 text-sm font-black drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] ${
            isBoss ? 'text-red-300' : 'text-cyan-300'
          }`}
          aria-hidden="true"
        >
          +10 XP
        </motion.div>
      ))}

      {/* ── Boss HP bar ──────────────────────────────────────────────────────── */}
      {isBoss && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-red-700 uppercase tracking-[0.25em]">
              ⚠ BOSS HP
            </span>
            <motion.span
              key={bossHp}
              animate={bossHit ? { scale: [1, 1.4, 1], color: ['#ef4444', '#ffffff', '#ef4444'] } : {}}
              transition={{ duration: 0.3 }}
              className="text-xs font-mono font-bold text-red-500 tabular-nums"
            >
              {bossHp}%
            </motion.span>
          </div>
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-red-900/40">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-red-800 via-red-600 to-red-500"
              animate={{ width: `${bossHp}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
          {bossHit && (
            <motion.p
              key={`hit-${bossHp}`}
              initial={{ opacity: 1, x: -4 }}
              animate={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.5 }}
              className="text-[10px] font-mono text-red-400 uppercase tracking-widest"
            >
              ⚡ DAMAGE DEALT!
            </motion.p>
          )}
        </motion.div>
      )}

      {/* ── Progress bar + timer ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className={`font-mono tabular-nums transition-colors ${
            timeProgress >= 0.83 ? 'text-red-400' : timeProgress >= 0.5 ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {(timeElapsed / 1000).toFixed(1)}s
          </span>
        </div>
        <div
          className="h-1.5 bg-gray-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemax={questions.length}
        >
          <motion.div
            className={`h-full rounded-full ${isBoss ? 'bg-red-500' : 'bg-cyan-500'}`}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
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

      {/* ── Hearts + shield indicator ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" aria-label={`${hearts} lives remaining`}>
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <motion.span
                key={i}
                animate={
                  i >= hearts
                    ? { scale: [1, 1.3, 0.8, 1], opacity: 0.3 }
                    : shieldBlocked && i === hearts - 1
                    ? { scale: [1, 1.4, 1], filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'] }
                    : { opacity: 1 }
                }
                transition={{ duration: 0.35 }}
                className={`text-base leading-none select-none ${
                  i < hearts
                    ? 'drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]'
                    : 'grayscale opacity-30'
                }`}
              >
                ❤️
              </motion.span>
            ))}
          </div>
          {gameOver && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-1 text-xs font-mono text-red-400 uppercase tracking-widest"
            >
              💔 Out of lives!
            </motion.span>
          )}
          {shieldBlocked && (
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="ml-1 text-xs font-mono text-blue-300 uppercase tracking-wider"
            >
              🛡 BLOCKED!
            </motion.span>
          )}
          {shieldActive && !shieldBlocked && (
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="ml-1 text-xs font-mono text-blue-400"
            >
              🛡 Shield
            </motion.span>
          )}
        </div>

        {/* Sound toggle */}
        <button
          onClick={() => { const next = toggleSound(); setSoundOn(next); }}
          title={soundOn ? 'Mute sounds' : 'Enable sounds'}
          className="text-base opacity-40 hover:opacity-80 transition-opacity"
          aria-label={soundOn ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* ── Keyboard hint ─────────────────────────────────────────────────────── */}
      {phase === 'answering' && (
        <div className="flex justify-end -mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/80 border border-white/8 px-2.5 py-1">
            <span className="text-[10px] text-gray-500 font-mono">keyboard:</span>
            {['A','B','C','D'].map((k) => (
              <kbd key={k} className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-700 border border-gray-600 text-[10px] font-bold text-gray-300">{k}</kbd>
            ))}
            <span className="text-[10px] text-gray-500 font-mono">to answer</span>
          </span>
        </div>
      )}
      {phase === 'feedback' && (
        <div className="flex justify-end -mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/80 border border-white/8 px-2.5 py-1">
            <kbd className="inline-flex h-5 px-1.5 items-center justify-center rounded bg-gray-700 border border-gray-600 text-[10px] font-bold text-gray-300">Enter</kbd>
            <span className="text-[10px] text-gray-500 font-mono">to continue</span>
          </span>
        </div>
      )}

      {/* ── Streak + EXP bar + mascot ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <StreakCounter streak={streak} />
        <ExpBar totalExp={currentExp} level={currentLevel} className="flex-1 min-w-48" />
        <QuizMascot mood={mascotMood} size={36} />
      </div>

      {/* ── Question card ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.question_id}
          initial={{ opacity: 0, x: 20 }}
          animate={
            shakeCard
              ? { x: [0, -10, 10, -7, 7, -4, 4, 0], opacity: 1 }
              : { opacity: 1, x: 0 }
          }
          exit={{ opacity: 0, x: -20 }}
          transition={shakeCard ? { duration: 0.4, ease: 'easeOut' } : { duration: 0.25 }}
          onAnimationComplete={() => { if (shakeCard) setShakeCard(false); }}
          className={`rounded-2xl border backdrop-blur-sm p-6 ${
            isBoss
              ? 'border-red-500/20 bg-gray-900/85'
              : 'border-white/10 bg-gray-900/80'
          }`}
        >
          {/* Difficulty badge + boss label */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">
              Difficulty{' '}
              {Array.from({ length: currentQ.difficulty }, (_, i) => '◆').join('')}
              {Array.from({ length: 5 - currentQ.difficulty }, (_, i) => '◇').join('')}
            </span>
            {isBoss && (
              <span className="text-[9px] font-mono text-red-700 border border-red-900/50 rounded px-2 py-0.5 tracking-widest uppercase">
                ⚠ BOSS
              </span>
            )}
          </div>

          {/* Question text */}
          <h2 className="text-base sm:text-lg font-semibold text-white mb-6 leading-relaxed min-h-16">
            {phase === 'decrypt' ? (
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
            {shuffledOptions.map((option) => {
              const isEliminated = eliminatedOptions.includes(option.option_key);
              return (
                <motion.button
                  key={option.option_id}
                  onClick={() => handleSelectOption(option.option_key)}
                  disabled={phase !== 'answering' || isEliminated}
                  aria-pressed={selectedOption === option.option_key}
                  animate={isEliminated ? { opacity: 0.3, scale: 0.98 } : { opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={optionClass(
                    option.option_key,
                    selectedOption,
                    feedbackCorrectKey,
                    eliminatedOptions,
                    isBoss
                  )}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold mr-3 flex-shrink-0 ${
                    isEliminated ? 'bg-gray-800/50 text-gray-600' : 'bg-gray-700'
                  }`}>
                    {isEliminated ? '✕' : option.option_key}
                  </span>
                  <span className={isEliminated ? 'line-through text-gray-700' : ''}>
                    {option.option_text}
                  </span>
                </motion.button>
              );
            })}
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
                      <span className="text-green-400">
                        {isBoss ? '⚡ DAMAGE DEALT! ✓' : 'Nice work! ✓'}
                      </span>
                    ) : shieldBlocked ? (
                      <span className="text-blue-400">🛡 Shield absorbed the hit!</span>
                    ) : (
                      <span className="text-amber-400">
                        {isBoss ? '🔴 BOSS BLOCKS YOUR ATTACK!' : 'Almost! Keep going ↗'}
                      </span>
                    )}
                  </p>
                </div>
                <Button size="sm" onClick={handleNext}>
                  {currentIndex < questions.length - 1 ? 'Next →' : 'Finish'}
                </Button>
              </div>

              {/* Wrong answer reveal */}
              {selectedOption !== feedbackCorrectKey && feedbackCorrectKey && (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className={`rounded-lg border px-4 py-3 ${
                    isBoss
                      ? 'border-red-500/25 bg-red-500/5'
                      : 'border-amber-500/25 bg-amber-500/5'
                  }`}
                >
                  <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${
                    isBoss ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {isBoss ? '▸ VULNERABILITY LOG' : '▸ Intel Recovered'}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">Correct answer:</p>
                  <DigitalDecrypt
                    text={shuffledOptions.find((o) => o.option_key === feedbackCorrectKey)?.option_text ?? ''}
                  />
                </motion.div>
              )}

              {/* Explanation */}
              {explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.25, duration: 0.25 }}
                  className={`rounded-lg border px-4 py-3 ${
                    isBoss
                      ? 'border-red-500/15 bg-red-500/5'
                      : 'border-cyan-500/20 bg-cyan-500/5'
                  }`}
                >
                  <p className={`text-xs font-mono uppercase tracking-wider mb-1 ${
                    isBoss ? 'text-red-600' : 'text-cyan-500'
                  }`}>
                    {isBoss ? '// INTEL ANALYSIS' : '// Analysis'}
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Power-up bar ─────────────────────────────────────────────────────── */}
      {powerups.length > 0 && (
        <div className="space-y-2">
          {/* Power-up message toast */}
          <AnimatePresence>
            {powerupMsg && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-mono text-purple-300 text-center bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2"
              >
                {powerupMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">
              power-ups:
            </span>
            {powerups.map((pu) => {
              const cfg = POWERUP_CONFIG[pu.powerup_type as PowerupType];
              if (!cfg) return null;
              const used50 = pu.powerup_type === 'fifty_fifty' && eliminatedOptions.length > 0;
              const usedShield = pu.powerup_type === 'shield' && shieldActive;
              const unavailable = phase !== 'answering' && pu.powerup_type !== 'shield';
              const disabled = pu.quantity <= 0 || used50 || usedShield || unavailable;
              const handler =
                pu.powerup_type === 'fifty_fifty' ? handleFiftyFifty :
                pu.powerup_type === 'shield'       ? handleShield :
                handleSkip;

              return (
                <motion.button
                  key={pu.powerup_type}
                  onClick={handler}
                  disabled={disabled}
                  whileHover={!disabled ? { scale: 1.06 } : {}}
                  whileTap={!disabled ? { scale: 0.94 } : {}}
                  title={cfg.title}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 ${
                    disabled
                      ? 'border-white/5 bg-gray-900/20 text-gray-700 cursor-not-allowed'
                      : usedShield
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-300 cursor-default'
                      : 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/50 cursor-pointer'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  <span className={`text-[10px] font-mono rounded-full px-1 min-w-4 text-center ${
                    pu.quantity <= 0 ? 'text-gray-700 bg-gray-800' : 'text-purple-400 bg-purple-500/20'
                  }`}>
                    ×{pu.quantity}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Accent color used for TS — keeps `accentColor` from being unused */}
      <span className="sr-only" aria-hidden="true">{accentColor}</span>
    </div>
  );
}
