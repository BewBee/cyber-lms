# CyberShield LMS — File Manifest

Complete list of all files created or modified in this project.

---

## Modified Files

| File | Change |
|------|--------|
| `app/page.tsx` | Replaced Next.js template with CyberShield landing page |
| `app/layout.tsx` | Updated metadata, title, and dark theme body class |
| `app/globals.css` | Replaced template CSS with CyberShield dark theme + Tailwind v4 @theme tokens |
| `lib/supabaseClient.ts` | Was empty placeholder; replaced with full anon + service client |
| `package.json` | Added test script, bumped version to 1.0.0 |
| `README.md` | Replaced create-next-app default with full project README |

---

## New Files

### Configuration & Environment

| File | Description |
|------|-------------|
| `lib/config.ts` | Central business config: EXP values, medal thresholds, ranks, animations |
| `.env.local` | Environment variable template (not committed) |
| `vitest.config.ts` | Vitest test runner config with @/ path alias |

### TypeScript Types

| File | Description |
|------|-------------|
| `types/index.ts` | All shared domain types: User, Module, Question, Session, Badge, etc. |

### Core Library

| File | Description |
|------|-------------|
| `lib/expSystem.ts` | calculateExpGained, calculateLevel, calculateRank, expToNextLevel, streakBonus |
| `lib/medalSystem.ts` | determineMedal, getMedalFromScore, MEDAL_META display config |
| `lib/quizEngine.ts` | selectQuestions, shuffleOptions, validateAnswer, toStudentQuestions, computeSessionStats |
| `lib/gamification.ts` | processSessionResult orchestrator, checkEarnedBadges |
| `lib/apiHelpers.ts` | API utilities: validation, auth extraction, pagination, role guards |

### Database

| File | Description |
|------|-------------|
| `sql/migrations/001_schema.sql` | Full 3NF Postgres schema: 12 tables + leaderboard view + indexes |
| `sql/seeds/seed_demo.sql` | Demo seed: 1 admin, 1 teacher, 2 students, modules, questions, badges |

### API Routes (pages/api/)

| File | Description |
|------|-------------|
| `pages/api/health.ts` | GET /api/health — returns { ok: true } |
| `pages/api/quizzes/index.ts` | GET /api/quizzes — list unlocked modules |
| `pages/api/quizzes/[id]/index.ts` | GET /api/quizzes/:id — module + student-safe questions |
| `pages/api/quizzes/[id]/attempt.ts` | POST /api/quizzes/:id/attempt — submit quiz session |
| `pages/api/leaderboard/index.ts` | GET /api/leaderboard — ranked students by EXP |
| `pages/api/teacher/modules/index.ts` | GET/POST /api/teacher/modules |
| `pages/api/teacher/modules/[id]/index.ts` | GET/PUT /api/teacher/modules/:id |
| `pages/api/teacher/analytics.ts` | GET /api/teacher/analytics — class stats + weak questions |
| `pages/api/admin/core-modules.ts` | GET/POST /api/admin/core-modules — admin only |

### UI Components

| File | Description |
|------|-------------|
| `components/ui/Button.tsx` | Accessible button: primary, secondary, ghost, danger variants |
| `components/ui/Card.tsx` | Dark-themed card container with optional header/action |
| `components/ui/Header.tsx` | Sticky nav header with role-based links and mobile menu |
| `components/ui/Footer.tsx` | Minimal site footer |
| `components/ui/BadgeDisplay.tsx` | Badge grid with icon fallbacks and overflow count |
| `components/shared/LoadingSpinner.tsx` | Accessible CSS spinner with aria-live |

### Game Components

| File | Description |
|------|-------------|
| `components/game/DigitalDecrypt.tsx` | requestAnimationFrame text scramble reveal animation |
| `components/game/ExpBar.tsx` | Framer Motion spring EXP progress bar |
| `components/game/StreakCounter.tsx` | Animated streak fire badge (shows at 2+ streak) |
| `components/game/MedalReveal.tsx` | Medal reveal with canvas-confetti for gold |
| `components/game/QuizInterface.tsx` | Full quiz session: fetch, decrypt, answer, submit, results |

### Teacher Components

| File | Description |
|------|-------------|
| `components/teacher/ModuleEditor.tsx` | Create/edit module form with questions |
| `components/teacher/QuestionForm.tsx` | Single question form with 4 options and radio correct-answer |
| `components/teacher/AssignmentUploader.tsx` | Drag-and-drop CSV/JSON question bank importer |

### App Pages

| File | Description |
|------|-------------|
| `app/login/page.tsx` | Supabase auth login + dev quick-login shortcuts |
| `app/student/dashboard/page.tsx` | Student dashboard: EXP bar, modules, sessions, badges |
| `app/teacher/dashboard/page.tsx` | Teacher dashboard: module editor, class analytics |
| `app/modules/[moduleId]/page.tsx` | Module detail: description, lessons, start quiz CTA |
| `app/quiz/session/[sessionId]/page.tsx` | Quiz session wrapper using QuizInterface |
| `app/leaderboard/page.tsx` | Animated leaderboard table with rank positions |

### Tests

| File | Description |
|------|-------------|
| `tests/expSystem.test.ts` | 20+ unit tests: EXP formula, level, rank, medal, streak |

### Assets

| File | Description |
|------|-------------|
| `public/assets/badge-placeholder.svg` | Generic badge SVG icon placeholder |
| `public/assets/icon-shield.svg` | CyberShield logo shield icon SVG |

### Documentation

| File | Description |
|------|-------------|
| `README.md` | Setup, commands, API reference, deployment guide |
| `MAINTENANCE.md` | How to change config rules, add badges, adjust schema |
| `CHANGELOG.md` | Version history initialized at 1.0.0 |
| `FILE_MANIFEST.md` | This file — complete file listing |
