/**
 * app/page.tsx — CyberShield LMS landing page.
 * Static server component; no auth required. Shows hero, feature cards, and CTAs.
 * To test: run `npm run dev` and visit http://localhost:3000 — should see CyberShield branding.
 */

import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/ui/Footer';
import { Header } from '@/components/ui/Header';

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Core Modules',
    description:
      'Curated cybersecurity curriculum covering network security, cryptography, ethical hacking, and more.',
  },
  {
    icon: '🎮',
    title: 'Gamified Quizzes',
    description:
      'Answer questions with real-time streak tracking, DigitalDecrypt reveals, and instant feedback.',
  },
  {
    icon: '🏆',
    title: 'Medals & EXP',
    description:
      'Earn Gold, Silver, or Bronze medals. Accumulate EXP to level up through 8 cyber-themed ranks.',
  },
  {
    icon: '📊',
    title: 'Live Leaderboard',
    description:
      'Compete with classmates on class and global leaderboards ranked by total EXP earned.',
  },
  {
    icon: '🎖️',
    title: 'Achievement Badges',
    description:
      'Unlock badges for milestones: First Mission, Perfect Strike, Hot Streak, and more.',
  },
  {
    icon: '📚',
    title: 'Teacher Studio',
    description:
      'Teachers create custom modules and quizzes, track class analytics, and identify weak areas.',
  },
];

const BADGES = [
  {
    key: 'first_mission',
    name: 'First Mission',
    icon: '/assets/badge-first-mission.svg',
    how: 'Complete your first quiz session',
  },
  {
    key: 'perfect_strike',
    name: 'Perfect Strike',
    icon: '/assets/badge-perfect-strike.svg',
    how: 'Earn a Gold medal on any quiz',
  },
  {
    key: 'hot_streak',
    name: 'Hot Streak',
    icon: '/assets/badge-hot-streak.svg',
    how: 'Get a streak of 5+ correct answers',
  },
  {
    key: 'veteran_operator',
    name: 'Veteran Operator',
    icon: '/assets/badge-veteran-operator.svg',
    how: 'Complete 10 or more quiz sessions',
  },
  {
    key: 'flawless',
    name: 'Flawless',
    icon: '/assets/badge-flawless.svg',
    how: 'Finish a quiz with 100% accuracy',
  },
];

const RANKS = [
  { name: 'Script Kiddie', level: '1' },
  { name: 'Packet Rat', level: '3' },
  { name: 'Firewall Hopper', level: '5' },
  { name: 'Exploit Dev', level: '8' },
  { name: 'Red Team Operator', level: '12' },
  { name: 'Zero-Day Hunter', level: '17' },
  { name: 'Cyber Warlord', level: '23' },
  { name: 'Shadow Architect', level: '30' },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* ─── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center">
          {/* Background glow */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(0,212,255,0.12), transparent)',
            }}
          />

          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-4 py-1.5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-cyan-400 tracking-wide uppercase">
                System Online — Initializing…
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Master{' '}
              <span className="text-neon-cyan">Cybersecurity</span>
              <br />
              Through Gameplay
            </h1>

            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
              CyberShield LMS turns cybersecurity education into an addictive game. Earn EXP, collect
              medals, climb leaderboards, and level up from Script Kiddie to Shadow Architect.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 text-sm transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]"
              >
                Start Learning →
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:border-cyan-500/40 text-gray-300 hover:text-white font-medium px-8 py-3 text-sm transition-all"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Features ─────────────────────────────────────────────────────── */}
        <section className="px-4 py-16 sm:py-20" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl">
            <h2
              id="features-heading"
              className="text-center text-2xl sm:text-3xl font-bold text-white mb-12"
            >
              Everything you need to
              <span className="text-cyan-400"> level up</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((feat) => (
                <div
                  key={feat.title}
                  className="group rounded-xl border border-white/5 hover:border-cyan-500/25 bg-gray-900/50 hover:bg-gray-900/80 p-6 transition-all"
                >
                  <span className="text-3xl mb-3 block" aria-hidden="true">{feat.icon}</span>
                  <h3 className="text-sm font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Rank ladder ──────────────────────────────────────────────────── */}
        <section className="px-4 py-16 sm:py-20" aria-labelledby="ranks-heading">
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="ranks-heading" className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Your Cyber Journey
            </h2>
            <p className="text-sm text-gray-500 mb-10">
              Progress from novice to elite through 8 ranks as you accumulate EXP
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RANKS.map((rank, i) => (
                <div
                  key={rank.name}
                  className="rounded-lg border border-white/5 bg-gray-900/40 px-3 py-2.5 text-center"
                >
                  <p className="text-xs font-mono text-cyan-600 mb-0.5">Lv.{rank.level}</p>
                  <p className="text-xs text-gray-300 font-medium">{rank.name}</p>
                </div>
              ))}
            </div>

            {/* ── Achievement Badges ─────────────────────────────────────────── */}
            <div className="mt-14">
              <div className="flex items-center gap-3 justify-center mb-1">
                <span className="h-px flex-1 max-w-[80px] bg-white/5" />
                <h3 className="text-lg font-bold text-white">Achievement Badges</h3>
                <span className="h-px flex-1 max-w-[80px] bg-white/5" />
              </div>
              <p className="text-xs text-gray-500 mb-8">
                Earn these by hitting milestones during your quiz sessions
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                {BADGES.map((badge) => (
                  <div
                    key={badge.key}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-white/5 hover:border-cyan-500/25 bg-gray-900/40 hover:bg-gray-900/70 px-5 py-4 w-36 transition-all"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full blur-md bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Image
                        src={badge.icon}
                        alt={badge.name}
                        width={56}
                        height={56}
                        className="relative drop-shadow-[0_0_6px_rgba(0,212,255,0.25)] group-hover:drop-shadow-[0_0_12px_rgba(0,212,255,0.4)] transition-all"
                      />
                    </div>
                    <p className="text-xs font-semibold text-white text-center leading-tight">
                      {badge.name}
                    </p>
                    <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                      {badge.how}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ──────────────────────────────────────────────────────────── */}
        <section className="px-4 py-16 text-center">
          <div className="mx-auto max-w-xl rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to begin your mission?</h2>
            <p className="text-sm text-gray-500 mb-6">Join today and start earning medals.</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 text-sm transition-all"
            >
              Get Started — It&apos;s Free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
