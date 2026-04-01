# CyberShield LMS — Claude Context

This file is auto-loaded by Claude Code on every session. It gives full project context to any collaborator on any machine with any account.

---

## What This Project Is

CyberShield LMS is a gamified cybersecurity learning platform built for students aged 10–12. Think "Duolingo meets souls-like RPG for cybersecurity." Students earn EXP, level up through ranks, complete campaign chapters, earn badges, and take quizzes. Teachers manage classes, modules, and grade assignments. Admins manage users and build campaign chapters.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router for pages, Pages Router for API routes) |
| Language | TypeScript 5 — strict mode, `tsc --noEmit` must pass before every commit |
| Styling | Tailwind CSS v4 — config is inline in `app/globals.css`, NO `tailwind.config.js` |
| Database | Supabase (PostgreSQL) — service role server-side, anon client browser-side |
| Animations | Framer Motion v12 |
| Audio | Web Audio API — synthesized sounds, no audio files |
| Runtime | Node.js, port 3000 |

---

## Key File Map

```
app/                          ← App Router pages (UI)
  page.tsx                    ← Landing page
  login/page.tsx              ← Login
  signup/page.tsx             ← Signup
  student/dashboard/page.tsx  ← Student home (CampaignMap hero + stats)
  admin/dashboard/page.tsx    ← Admin panel (Users tab + Campaign tab)
  teacher/dashboard/page.tsx  ← Teacher panel (modules, classes, assignments)
  modules/[moduleId]/page.tsx ← Module briefing + quiz launch
  quiz/session/[sessionId]/   ← Active quiz (sessionId param = moduleId)
  quiz/review/[sessionId]/    ← Post-quiz review
  student/profile/page.tsx    ← Student profile + stats
  leaderboard/page.tsx        ← Global leaderboard

pages/api/                    ← API routes (Pages Router)
  quizzes/[id]/index.ts       ← GET questions
  quizzes/[id]/attempt.ts     ← POST submit attempt → compute EXP, medals
  student/modules.ts          ← GET modules filtered by class enrollment
  enrollments/index.ts        ← GET/POST/DELETE class enrollments
  classes/index.ts            ← GET all classes
  leaderboard/index.ts        ← GET leaderboard
  teacher/modules/index.ts    ← GET/POST teacher modules
  teacher/modules/[id]/       ← PUT teacher module (edit + questions)
  teacher/analytics.ts        ← GET weak questions analytics
  teacher/assignments/        ← GET/POST assignments
  assignments/[id]/submissions/ ← GET/POST/PUT submissions + grades
  sessions/[sessionId]/review ← GET session review data
  admin/core-modules.ts       ← GET core modules (read-only)
  admin/chapters/index.ts     ← GET/POST chapters
  admin/chapters/[chapterId]  ← PUT/DELETE chapter
  admin/chapters/missions/    ← POST/DELETE chapter missions
  campaign/progress.ts        ← GET student campaign progress

components/
  ui/Header.tsx               ← Global header (role-aware, sign out)
  ui/Footer.tsx               ← Global footer
  ui/Card.tsx                 ← Reusable card
  ui/Button.tsx               ← Reusable button
  ui/BadgeShowcase.tsx        ← All 5 badges (earned=glow, locked=dim)
  game/QuizInterface.tsx      ← Main quiz engine (3-beat results, mascot, sounds)
  game/QuizMascot.tsx         ← Shield mascot SVG (5 moods)
  game/ExpBar.tsx             ← EXP progress bar (urgency nudge at ≤50 XP)
  game/StreakCounter.tsx      ← Streak fire badge
  game/MedalReveal.tsx        ← Medal spring animation
  game/DigitalDecrypt.tsx     ← Matrix scramble text reveal
  game/TerminalRain.tsx       ← Canvas matrix rain (quiz session background)
  campaign/CampaignMap.tsx    ← Campaign progress map (student hero element)
  campaign/ChapterBuilder.tsx ← Admin chapter/mission manager
  teacher/ModuleEditor.tsx    ← Teacher module + question editor
  teacher/AssignmentManager.tsx ← Teacher assignment manager
  shared/LoadingSpinner.tsx   ← Loading indicator

lib/
  browserClient.ts            ← browserSupabase (anon key, client-side)
  supabaseClient.ts           ← getServiceClient() (service role, server-side API only)
  config.ts                   ← All tunable constants (EXP, medals, ranks, questions per session)
  expSystem.ts                ← calculateRank(), expToNextLevel()
  gamification.ts             ← computeMedal(), applyStreakBonus()
  quizEngine.ts               ← selectQuestions(), shuffleOptions(), computeSessionStats()
  apiHelpers.ts               ← isValidUUID(), isNonEmptyString(), err()
  sounds.ts                   ← Web Audio synth: playSound(), toggleSound(), isSoundEnabled()

types/index.ts                ← ALL domain interfaces (User, Module, Question, etc.)

sql/
  migrations/                 ← Run these in order in Supabase SQL Editor
    001_schema.sql            ← Core tables + leaderboard VIEW
    003_grades_table.sql      ← Grades audit table
    004_auth_trigger.sql      ← Auto-creates public.users on auth signup
    005_rls.sql               ← Row Level Security policies
  seeds/
    seed_demo.sql             ← Demo users (Alice student, Bob teacher, Carol admin)
    seed_core_modules.sql     ← Core cybersecurity modules
    campaign_seed.sql         ← Ch1 unlocked, Ch2 locked, Ch3-5 coming soon, titles
```

---

## Database Schema (Supabase)

### Core tables
- `users` — id, email, name, role (student/teacher/admin), total_exp, level, created_at
- `modules` — module_id, module_name, description, module_type (core/teacher), exp_bonus_percent, created_by
- `questions` — question_id, module_id, question_text, difficulty (1-5), explanation
- `question_options` — option_id, question_id, option_key (A/B/C/D), option_text, is_correct
- `classes` — class_id, class_name, teacher_id
- `class_modules` — class_id, module_id (many-to-many)
- `enrollments` — enrollment_id, class_id, student_id, status (pending/approved/dropped)
- `game_sessions` — session_id, student_id, module_id, total_score, accuracy, medal_awarded, exp_awarded, finished_at
- `attempts` — attempt_id, session_id, question_id, selected_option, is_correct, response_time_ms, streak_at_attempt
- `badges` + `student_badges` — badge system
- `lessons` — lesson_id, module_id, lesson_title, content
- `assignments` — id, module_id, title, instructions, due_date, created_by
- `submissions` — id, assignment_id, student_id, file_url, grade (cache), feedback (cache), submitted_at
- `grades` — grade_id, submission_id, graded_by, grade, feedback, graded_at (audit trail)

### Campaign tables (migration: campaign_system)
- `chapters` — chapter_id, chapter_number, title, subtitle, lore_text, is_unlocked, is_coming_soon
- `chapter_missions` — id, chapter_id, module_id, mission_order, is_boss
- `chapter_completions` — id, student_id, chapter_id, completed_at
- `titles` — title_id, chapter_id, title_name, title_color
- `student_titles` — student_id, title_id, earned_at
- `student_powerups` — student_id, powerup_type, quantity (ready for future power-ups feature)

### Views
- `leaderboard` — SECURITY INVOKER view, aggregates user stats

### FK policy
All foreign keys use `ON DELETE RESTRICT` — never SET NULL. This prevents orphaned data.

---

## Architecture Rules

### MUST follow
1. **API routes** → always use `getServiceClient()` from `lib/supabaseClient.ts` (service role)
2. **Browser/client code** → always use `browserSupabase` from `lib/browserClient.ts` (anon key)
3. **Never mix clients** — service role key must never reach the browser
4. **tsc --noEmit** must show 0 errors before every commit
5. **No hardcoded module arrays** in frontend — always fetch from DB
6. **Core modules** (`module_type='core'`) are read-only for teachers — API guard enforces this

### Router split
- Pages live in `app/` (App Router)
- API routes live in `pages/api/` (Pages Router)
- This is intentional — do not move API routes to `app/api/`

### Dev quick login
Stored in `sessionStorage`: `dev_role`, `dev_id`, `dev_name`
Used as fallback when Supabase auth session is not available locally.

---

## Validation Protocol (owner-mandated)

Before any structural change:
1. Check if deps already exist before adding new ones
2. Confirm target files exist and DB schema supports the change
3. Present plan: files modified, new files, DB changes, risks
4. Wait for approval on large structural changes
5. Post-change: `npx tsc --noEmit` must show 0 errors, preview must load

---

## Completed Features (v1)

- Auth: login, signup, password reset, session guard, role-based routing
- Student dashboard: CampaignMap hero, mascot greeting, last operation card, stats, badges, modules, classes
- Campaign system: chapters, missions, boss unlock, title rewards, chapter lore
- Admin: user management (role change), campaign chapter builder
- Teacher: module creation/editing, question management, class management, assignment creation, grading with feedback
- Student: module briefing (mission framing), quiz sessions, results, EXP/level/rank, badges, profile, leaderboard
- Quiz engine: 10 random questions, streak tracking, server-side scoring (tamper-proof), 3-beat results screen
- Immersion: QuizMascot (5 moods), terminal rain background, floating +XP particles, screen shake, Web Audio sounds, keyboard shortcuts A-D
- Polish: ExpBar urgency nudge, DigitalDecrypt text reveal, medal spring animation, streak fire badge

---

## Future Works (not started)

| Feature | Notes |
|---------|-------|
| Hearts/lives system | 3 lives per quiz, no DB change needed |
| Boss Battle quiz mode | Detect boss flag from campaign, dramatic intro |
| Power-ups (50/50, Shield, Freeze) | `student_powerups` table already exists |
| Codename/handle | Add `users.codename` nullable column |
| Daily login streak | Needs `users.streak_days` + `last_active_date` DB columns |
| Daily challenge 2× EXP | Needs DB table + cron |
| Locked chapters (Ch3-5) | Already seeded as `is_coming_soon=true`, just need content |

---

## Environment Variables

Required in `.env.local` (never commit this file):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Get these from: Supabase Dashboard → Project Settings → API

---

## Known Intentional Limitations

- `buildDevQuestions()` in quiz API uses `any[]` type — this is a dev fallback, production DB-connected path won't hit it
- Question deletion is blocked in edit mode — to remove a question with attempt history, use a SQL migration
- `submissions.grade` and `submissions.feedback` are denormalized cache fields; `grades` table is the audit trail
- Leaderboard is a VIEW (not a table) — do not try to INSERT into it
