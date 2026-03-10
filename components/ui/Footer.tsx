/**
 * components/ui/Footer.tsx — Site footer for CyberShield LMS.
 * Minimal footer with branding, legal links, and version info.
 * To test: render and verify it displays branding text and legal links.
 */

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-gray-950 py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-600">
          &copy; {new Date().getFullYear()}{' '}
          <span className="text-gray-500">CyberShield LMS</span> — Gamified Cybersecurity Learning
        </p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="text-xs text-gray-700 hover:text-gray-400 transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-xs text-gray-700 hover:text-gray-400 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-xs text-gray-700 font-mono">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
