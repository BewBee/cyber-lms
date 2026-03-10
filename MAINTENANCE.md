# CyberShield LMS — Maintenance Guide

This document explains how to change all business rules, game parameters, and schema without modifying application logic files.

---

## Central Configuration — `lib/config.ts`

**All tunable game rules live in this one file.** Never scatter magic numbers across the codebase — always add new tunable constants here.

### EXP Values

```typescript
EXP_PER_CORRECT: 10,      // EXP for each correct answer
EXP_PER_COMPLETION: 50,   // Flat bonus for finishing any quiz
EXP_PER_PERFECT: 100,     // Extra bonus for 100% accuracy
LEVEL_XP: 300,            // EXP required to advance one level
```

**To make leveling faster:** Lower `LEVEL_XP` (e.g., 200).
**To reward accuracy more:** Increase `EXP_PER_PERFECT`.
**To reward effort:** Increase `EXP_PER_COMPLETION`.

### Medal Thresholds

```typescript
MEDAL_THRESHOLDS: {
  gold: 90,    // accuracy % needed for Gold
  silver: 75,  // accuracy % needed for Silver
  bronze: 60,  // accuracy % needed for Bronze
}
```

**To make Gold easier:** Lower `gold` (e.g., 85).
**To remove Bronze:** Set `bronze: 101` (unreachable).

> After changing medal thresholds, **previously stored session data is not affected** — only new sessions use the new thresholds.

### Rank Names

```typescript
RANKS: [
  { minLevel: 1,  name: 'Script Kiddie' },
  { minLevel: 3,  name: 'Packet Rat' },
  { minLevel: 5,  name: 'Firewall Hopper' },
  { minLevel: 8,  name: 'Exploit Dev' },
  { minLevel: 12, name: 'Red Team Operator' },
  { minLevel: 17, name: 'Zero-Day Hunter' },
  { minLevel: 23, name: 'Cyber Warlord' },
  { minLevel: 30, name: 'Shadow Architect' },
]
```

**To rename a rank:** Change the `name` string.
**To add a rank:** Insert a new `{ minLevel, name }` entry (sorted order is enforced at runtime).
**To remove a rank:** Delete its entry — students at that level will display the previous lower rank.

### Quiz Engine

```typescript
QUESTIONS_PER_SESSION: 10,  // questions randomly selected per quiz
MAX_STREAK_BONUS: 50,       // max extra EXP from answer streaks
```

### Animations

```typescript
ANIMATION_SETTINGS: {
  decryptDuration: 700,           // ms for the DigitalDecrypt scramble
  expBarSpring: { ... },          // Framer Motion spring config
  confettiEnabled: true,          // set false to disable confetti globally
}
```

**To disable confetti sitewide:** Set `confettiEnabled: false`.
**Users can also disable confetti:** Via localStorage key `disable_confetti = "true"`.

---

## Adding New Badges

1. **Insert the badge into the database:**
   ```sql
   INSERT INTO badges (badge_key, badge_display_name, badge_icon)
   VALUES ('my_new_badge', 'Badge Display Name', '/assets/my-badge.svg');
   ```

2. **Add the award logic in `lib/gamification.ts`** inside `checkEarnedBadges()`:
   ```typescript
   if (someCondition) earned.push('my_new_badge');
   ```

3. **Add an SVG icon** to `public/assets/my-badge.svg`.

4. **Add a fallback emoji** in `components/ui/BadgeDisplay.tsx` inside `DEFAULT_ICONS`:
   ```typescript
   my_new_badge: '🔑',
   ```

No other files need changing.

---

## Core Modules vs Teacher Modules

| Feature | Core Module | Teacher Module |
|---------|-------------|----------------|
| Created by | Admin | Teacher |
| `module_type` | `'core'` | `'teacher'` |
| `is_locked` | `TRUE` | `FALSE` |
| Editable by teachers | No | Yes (own modules only) |
| Editable via API | PUT blocked | PUT allowed |

**To convert a teacher module to core:**
```sql
UPDATE modules SET module_type = 'core', is_locked = TRUE WHERE module_id = '...';
```

---

## Adjusting the Database Schema

For any schema change beyond business rules:

1. Create a new migration file: `sql/migrations/002_your_change.sql`
2. Run it in Supabase SQL Editor
3. Update `types/index.ts` to reflect new columns
4. Update any affected API routes

Never edit `001_schema.sql` after it has been run in production — always add new migrations.

---

## Leaderboard Performance

The leaderboard uses a database **VIEW** (`leaderboard_view`). For high traffic:

1. Convert to a `MATERIALIZED VIEW`:
   ```sql
   CREATE MATERIALIZED VIEW leaderboard_cache AS
   SELECT * FROM leaderboard_view;
   CREATE UNIQUE INDEX ON leaderboard_cache (id);
   ```

2. Refresh periodically (e.g., via a Supabase Edge Function cron):
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
   ```

---

## Rate Limiting

The `config.RATE_LIMIT_RPM` value is informational only. To enforce it in production:

1. Install `@upstash/ratelimit` and `@upstash/redis`
2. Add a rate-limit check at the top of sensitive API routes
3. Return HTTP 429 when the limit is exceeded

---

## Environment Variables Checklist

| Variable | Where used | Required |
|----------|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Yes |
| `SUPABASE_SERVICE_KEY` | Server only (API routes) | Yes (for mutations) |
| `NEXT_PUBLIC_APP_URL` | Optional canonical URL | No |
