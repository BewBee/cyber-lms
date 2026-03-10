/**
 * lib/quizEngine.ts — Question selection, randomization, and session creation helpers.
 * Stateless functions used by both API routes and client-side quiz flow.
 * To test: import and call selectQuestions([...], 5) and verify it returns 5 shuffled items.
 */

import { config } from './config';
import type { Question, QuestionOption, StudentQuestion, OptionKey } from '@/types';

// ─── Question Selection ───────────────────────────────────────────────────────

/**
 * Randomly selects `count` questions from a pool using Fisher-Yates shuffle.
 * Defaults to config.QUESTIONS_PER_SESSION if count is not provided.
 *
 * @param questions - Full pool of available questions
 * @param count - Number of questions to select (defaults to QUESTIONS_PER_SESSION)
 * @returns Shuffled subset of questions
 */
export function selectQuestions(questions: Question[], count?: number): Question[] {
  const n = count ?? config.QUESTIONS_PER_SESSION;
  const arr = [...questions];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

/**
 * Shuffles the options array for a single question using Fisher-Yates.
 * Call this on each question before rendering to randomize option order.
 *
 * @param options - Array of QuestionOption objects
 * @returns New shuffled array (original is not mutated)
 */
export function shuffleOptions<T extends QuestionOption>(options: T[]): T[] {
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Answer Validation ────────────────────────────────────────────────────────

/**
 * Validates a selected option against the question's correct option.
 * Server-side use only (requires options with is_correct field).
 *
 * @param question - Full question with is_correct flags
 * @param selectedOption - The option key the student selected ('A'–'D')
 * @returns true if correct, false otherwise
 */
export function validateAnswer(question: Question, selectedOption: OptionKey): boolean {
  const correctOption = question.question_options.find((o) => o.is_correct);
  if (!correctOption) return false;
  return correctOption.option_key === selectedOption;
}

/**
 * Finds the correct option key for a question.
 * Returns null if no option is marked correct (data integrity issue).
 */
export function getCorrectOptionKey(question: Question): OptionKey | null {
  return question.question_options.find((o) => o.is_correct)?.option_key ?? null;
}

// ─── Student-Safe Stripping ───────────────────────────────────────────────────

/**
 * Strips is_correct flags and explanation from questions before sending to students.
 * Call this in GET /api/quizzes/:id route.
 *
 * @param questions - Full questions from DB (teacher view)
 * @returns Student-safe questions without correct answer metadata
 */
export function toStudentQuestions(questions: Question[]): StudentQuestion[] {
  return questions.map((q) => ({
    ...q,
    explanation: undefined,
    question_options: q.question_options.map(({ option_id, question_id, option_key, option_text }) => ({
      option_id,
      question_id,
      option_key,
      option_text,
    })),
  }));
}

// ─── Score Computation ────────────────────────────────────────────────────────

/**
 * Computes quiz session statistics from a list of attempt results.
 *
 * @param results - Array of per-question correctness and response time
 * @returns { correctCount, totalQuestions, accuracy, averageResponseTime }
 */
export function computeSessionStats(
  results: { isCorrect: boolean; responseTimeMs: number }[]
): {
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  averageResponseTime: number;
} {
  const totalQuestions = results.length;
  if (totalQuestions === 0) {
    return { correctCount: 0, totalQuestions: 0, accuracy: 0, averageResponseTime: 0 };
  }
  const correctCount = results.filter((r) => r.isCorrect).length;
  const accuracy = Math.round((correctCount / totalQuestions) * 10000) / 100;
  const averageResponseTime =
    results.reduce((sum, r) => sum + r.responseTimeMs, 0) / totalQuestions;
  return { correctCount, totalQuestions, accuracy, averageResponseTime };
}
