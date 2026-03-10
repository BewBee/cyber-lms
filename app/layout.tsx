/**
 * app/layout.tsx — Root layout for CyberShield LMS.
 * Sets global metadata, font variables, and wraps all pages with dark theme.
 * To test: run `npm run dev` and check the page title in the browser tab.
 */

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'CyberShield LMS — Gamified Cybersecurity Learning',
    template: '%s | CyberShield LMS',
  },
  description:
    'A gamified cybersecurity learning platform with quizzes, medals, EXP system, and leaderboards.',
  keywords: ['cybersecurity', 'LMS', 'gamified', 'learning', 'quizzes'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0f1a',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
