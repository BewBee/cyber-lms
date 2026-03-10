# CyberShield LMS — Gamified Cybersecurity Learning Platform

A production-ready, gamified LMS built with Next.js, TypeScript, Tailwind CSS, Supabase, and Framer Motion.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- A Supabase project (free tier works)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Edit `.env.local` and fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

Get these from: Supabase Dashboard → Settings → API

### 3. Run the database migration

In Supabase Dashboard → SQL Editor, paste and run:
```
sql/migrations/001_schema.sql
```

Then seed demo data:
```
sql/seeds/seed_demo.sql
```

### 4. Start dev server

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Dev quick login (no Supabase auth needed)

On the login page in development mode, click **"Student (Alice)"** or **"Teacher (Ada)"** to bypass auth.

---

## Project Structure

```
cyber-lms/
├── app/                          Next.js App Router pages
│   ├── page.tsx                  Landing page
│   ├── login/page.tsx            Auth page
│   ├── student/dashboard/        Student dashboard
│   ├── teacher/dashboard/        Teacher dashboard
│   ├── modules/[moduleId]/       Module detail + lesson viewer
│   ├── quiz/session/[sessionId]/ Active quiz session
│   └── leaderboard/              Global leaderboard
├── pages/api/                    API routes (Next.js Pages Router)
│   ├── health.ts
│   ├── quizzes/
│   ├── teacher/
│   ├── leaderboard/
│   └── admin/
├── components/
│   ├── game/                     Quiz UI, EXP bar, medals, decryption
│   ├── ui/                       Buttons, cards, header, footer, badges
│   ├── teacher/                  Module editor, question form, uploader
│   └── shared/                   LoadingSpinner
├── lib/
│   ├── config.ts                 CENTRAL BUSINESS RULES - edit this
│   ├── supabaseClient.ts         DB client factory
│   ├── expSystem.ts              EXP + level + rank logic
│   ├── medalSystem.ts            Medal determination
│   ├── quizEngine.ts             Question selection + validation
│   ├── gamification.ts           Session result orchestrator
│   └── apiHelpers.ts             API route utilities
├── types/index.ts                All shared TypeScript types
├── sql/
│   ├── migrations/001_schema.sql
│   └── seeds/seed_demo.sql
├── tests/
│   └── expSystem.test.ts         Unit tests
└── public/assets/                Badge icons (SVG placeholders)
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Watch mode |
| `npm run type-check` | TypeScript checking |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/quizzes | List modules |
| GET | /api/quizzes/:id | Module + questions |
| POST | /api/quizzes/:id/attempt | Submit quiz attempt |
| GET | /api/leaderboard | Global leaderboard |
| GET | /api/teacher/modules | Teacher modules |
| POST | /api/teacher/modules | Create module |
| PUT | /api/teacher/modules/:id | Update module |
| GET | /api/teacher/analytics | Class analytics |
| GET/POST | /api/admin/core-modules | Admin core modules |

---

## Deployment on Vercel

1. Push this repo to GitHub
2. Import project in Vercel Dashboard
3. Add the three environment variables
4. Deploy

Static assets in `public/` are served by Vercel CDN automatically.

---

## Changing Business Rules

All tunable parameters live in `lib/config.ts`. See `MAINTENANCE.md` for the full guide.

---

## Tech Stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4
- Animations: Framer Motion 12, canvas-confetti
- Database: Supabase (Postgres)
- Auth: Supabase Auth
- Testing: vitest
