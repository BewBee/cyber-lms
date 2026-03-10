/**
 * types/index.ts — Shared TypeScript types for CyberShield LMS.
 * All domain models live here; import from '@/types' everywhere else.
 * To test: used by the compiler — run `npx tsc --noEmit` to verify.
 */

// ─── Auth & Users ──────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  total_exp: number;
  level: number;
  /** Equipped badge icon shown on leaderboard. Separate from earned badges in student_badges. */
  badge_icon?: string | null;
  created_at: string;
}

// ─── Courses & Modules ─────────────────────────────────────────────────────

export interface Course {
  course_id: string;
  course_name: string;
  description?: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export type ModuleType = 'core' | 'teacher';

export interface Module {
  module_id: string;
  course_id?: string | null;
  module_name: string;
  description?: string | null;
  created_by: string;
  module_type: ModuleType;
  is_locked: boolean;
  exp_bonus_percent: number;
  created_at: string;
  /** Joined data (optional) */
  question_count?: number;
}

// ─── Lessons ───────────────────────────────────────────────────────────────

export interface Lesson {
  lesson_id: string;
  module_id: string;
  lesson_title?: string | null;
  content?: string | null;
}

// ─── Questions & Options ───────────────────────────────────────────────────

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  option_id: string;
  question_id: string;
  option_key: OptionKey;
  option_text: string;
  /** Present for teacher/admin views; omitted in student-facing responses */
  is_correct?: boolean;
}

export interface Question {
  question_id: string;
  module_id: string;
  question_text: string;
  difficulty: number;
  explanation?: string | null;
  created_by: string;
  created_at: string;
  question_options: QuestionOption[];
}

/** Student-safe question (correct flags stripped) */
export type StudentQuestion = Omit<Question, 'explanation'> & {
  question_options: Omit<QuestionOption, 'is_correct'>[];
};

// ─── Classes & Enrollments ─────────────────────────────────────────────────

export interface Class {
  class_id: string;
  class_name: string;
  teacher_id: string;
  created_at: string;
}

export type EnrollmentStatus = 'pending' | 'approved' | 'dropped';

export interface Enrollment {
  enrollment_id: string;
  class_id: string;
  student_id: string;
  status: EnrollmentStatus;
  joined_at: string;
}

// ─── Game Sessions & Attempts ──────────────────────────────────────────────

export type Medal = 'gold' | 'silver' | 'bronze' | 'none';

export interface GameSession {
  session_id: string;
  module_id: string;
  class_id?: string | null;
  student_id: string;
  started_at: string;
  finished_at?: string | null;
  total_score: number;
  accuracy: number;
  medal_awarded: Medal;
  exp_awarded: number;
  average_response_time: number;
}

export interface Attempt {
  attempt_id: string;
  session_id: string;
  question_id: string;
  selected_option: OptionKey;
  is_correct: boolean;
  response_time_ms: number;
  streak_at_attempt: number;
}

// ─── Badges ────────────────────────────────────────────────────────────────

export interface Badge {
  badge_id: string;
  badge_key: string;
  badge_display_name: string;
  badge_icon: string;
}

export interface StudentBadge {
  id: string;
  student_id: string;
  badge_id: string;
  awarded_at: string;
  /** Joined */
  badge?: Badge;
}

// ─── Leaderboard ───────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  name: string;
  total_exp: number;
  level: number;
  badge_icon?: string | null;
  total_sessions: number;
  avg_accuracy: number;
  rank_position: number;
}

// ─── API Payloads ──────────────────────────────────────────────────────────

export interface AttemptAnswer {
  questionId: string;
  selectedOption: OptionKey;
  responseTimeMs: number;
  /** Client may send this for UI purposes, but the server always recomputes it. */
  streakAtAttempt?: number;
}

export interface SubmitAttemptPayload {
  studentId: string;
  answers: AttemptAnswer[];
  classId?: string;
}

export interface GameResult {
  sessionId: string;
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  medal: Medal;
  expAwarded: number;
  newTotalExp: number;
  newLevel: number;
  rankName: string;
  averageResponseTime: number;
  maxStreak: number;
}

// ─── Teacher / Analytics ───────────────────────────────────────────────────

export interface QuestionStat {
  question_id: string;
  question_text: string;
  total_attempts: number;
  correct_attempts: number;
  accuracy_pct: number;
}

export interface AnalyticsSummary {
  classId: string;
  totalStudents: number;
  avgScore: number;
  avgAccuracy: number;
  completedSessions: number;
  weakQuestions: QuestionStat[];
}

// ─── Assignments & Submissions ─────────────────────────────────────────────

export interface Assignment {
  id: string;
  module_id: string;
  title: string;
  instructions?: string | null;
  due_date?: string | null;
  created_by: string;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url?: string | null;
  /** Denormalized cache — always reflects the most recent grade. */
  grade?: string | null;
  feedback?: string | null;
  submitted_at: string;
  /** Populated from grades table join: who did the latest grading and when. */
  graded_by_name?: string | null;
  graded_at?: string | null;
  /** Joined */
  student?: Pick<User, 'id' | 'name' | 'email'>;
}

// ─── Grades ────────────────────────────────────────────────────────────────

export interface Grade {
  grade_id: string;
  submission_id: string;
  graded_by: string;
  grade: string;
  feedback?: string | null;
  graded_at: string;
}

// ─── Form / Editor types ───────────────────────────────────────────────────

export interface QuestionFormData {
  /** Present when editing an existing question; omitted for new questions. */
  question_id?: string;
  question_text: string;
  difficulty: number;
  explanation?: string;
  options: {
    option_key: OptionKey;
    option_text: string;
    is_correct: boolean;
  }[];
}

export interface LessonFormData {
  lesson_title?: string;
  content?: string;
}

export interface ModuleFormData {
  module_name: string;
  description?: string;
  course_id?: string;
  exp_bonus_percent: number;
  /** Optional pre-quiz lesson block shown to students before the quiz. */
  lesson?: LessonFormData;
  questions: QuestionFormData[];
}
