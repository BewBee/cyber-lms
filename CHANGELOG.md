# Changelog — CyberShield LMS

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-03-10

### Added
- Complete gamified LMS codebase for CyberShield
- **Database schema** (`sql/migrations/001_schema.sql`): 12 normalized tables + leaderboard view
- **Demo seed data** (`sql/seeds/seed_demo.sql`): admin, teacher, 2 students, modules, questions, badges
- **Central config** (`lib/config.ts`): all EXP values, medal thresholds, rank names, animation settings
- **EXP system** (`lib/expSystem.ts`): calculateExpGained, calculateLevel, calculateRank, streakBonus
- **Medal system** (`lib/medalSystem.ts`): determineMedal, getMedalFromScore, MEDAL_META display config
- **Quiz engine** (`lib/quizEngine.ts`): selectQuestions, shuffleOptions, validateAnswer, toStudentQuestions
- **Gamification orchestrator** (`lib/gamification.ts`): processSessionResult, checkEarnedBadges
- **API helpers** (`lib/apiHelpers.ts`): validation, auth extraction, pagination, role guards
- **Supabase client** (`lib/supabaseClient.ts`): anon client + server-only service client
- **API routes** (Pages Router): health, quizzes list/detail/attempt, leaderboard, teacher modules/analytics, admin core-modules
- **UI components**: Header (responsive, ARIA nav), Footer, Button (4 variants), Card (3 variants), BadgeDisplay
- **Game components**: DigitalDecrypt (requestAnimationFrame scramble reveal), ExpBar (Framer Motion spring), StreakCounter (AnimatePresence), MedalReveal (canvas-confetti on gold)
- **QuizInterface**: full quiz session flow with feedback, streak tracking, server submission
- **Teacher components**: ModuleEditor, QuestionForm, AssignmentUploader (CSV/JSON import)
- **App pages**: Landing, Login (dev shortcuts), Student Dashboard, Teacher Dashboard, Module Detail, Quiz Session, Leaderboard
- **Unit tests** (`tests/expSystem.test.ts`): 20+ assertions covering EXP, level, rank, medal logic
- **Documentation**: README.md, MAINTENANCE.md, FILE_MANIFEST.md, CHANGELOG.md
- Dark cyberpunk theme via Tailwind v4 `@theme` tokens
- Accessibility: ARIA roles, focus-visible styles, prefers-reduced-motion support

### Security
- Correct answers never returned to student-facing API endpoints
- Service role key used server-side only; never exposed to browser
- All API payloads validated server-side before DB writes
- Core modules blocked from teacher edits (module_type check)

---

## [Unreleased]

### Planned
- Spaced repetition for question review scheduling
- Assignment grading workflow (file submission + teacher review)
- Multiple question types (true/false, drag-and-drop)
- Supabase RLS policies for production security
- Rate limiting middleware (Upstash)
- Email notifications via Resend
- Class invitation system
