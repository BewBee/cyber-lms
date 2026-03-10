/**
 * components/ui/Header.tsx — Global navigation header for CyberShield LMS.
 * Displays branding, nav links, and user info based on the active role.
 * Role is resolved from props when provided; otherwise falls back to the
 * current Supabase session so public pages never show wrong role links.
 * ARIA: nav landmark with aria-label; active links marked with aria-current.
 * To test: render with role="student" and verify correct nav links appear.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { browserSupabase as supabase } from '@/lib/browserClient';
import type { UserRole } from '@/types';

interface NavLink {
  href: string;
  label: string;
  roles: UserRole[];
}

const NAV_LINKS: NavLink[] = [
  { href: '/student/dashboard', label: 'Dashboard', roles: ['student'] },
  { href: '/leaderboard', label: 'Leaderboard', roles: ['student', 'teacher', 'admin'] },
  { href: '/teacher/dashboard', label: 'My Modules', roles: ['teacher'] },
  { href: '/admin/dashboard',   label: 'Admin Panel', roles: ['admin'] },
];

interface HeaderProps {
  userRole?: UserRole;
  userName?: string;
  onSignOut?: () => void;
}

export function Header({ userRole: roleProp, userName, onSignOut }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [resolvedRole, setResolvedRole] = useState<UserRole | undefined>(roleProp);

  // When no role prop is given, read the active session so public pages
  // (leaderboard, home, etc.) never accidentally show wrong role-specific links.
  useEffect(() => {
    if (roleProp) {
      setResolvedRole(roleProp);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setResolvedRole(undefined); return; }
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data?.role) setResolvedRole(data.role as UserRole);
    })();
  }, [roleProp]);

  // Only show links whose roles include the resolved role.
  // When role is still unknown (loading / logged-out), show nothing role-specific.
  const visibleLinks = resolvedRole
    ? NAV_LINKS.filter((l) => l.roles.includes(resolvedRole))
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          aria-label="CyberShield LMS home"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500 text-black font-bold text-sm">
            CS
          </span>
          <span className="hidden sm:block font-bold text-white text-sm tracking-wide group-hover:text-cyan-400 transition-colors">
            CyberShield
            <span className="ml-1 text-cyan-500 font-normal text-xs">LMS</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
          {visibleLinks.map((link) => {
            const isActive = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden sm:block text-xs text-gray-500">
              {userName}
            </span>
          )}
          {onSignOut ? (
            <button
              onClick={onSignOut}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded"
              aria-label="Sign out"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/30 hover:border-cyan-400 px-3 py-1.5 rounded-md"
            >
              Sign in
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="md:hidden border-t border-white/5 bg-gray-950 px-4 py-2"
        >
          {visibleLinks.map((link) => {
            const isActive = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={[
                  'block px-3 py-2 rounded-md text-sm mb-1 transition-colors',
                  isActive ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5',
                ].join(' ')}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
