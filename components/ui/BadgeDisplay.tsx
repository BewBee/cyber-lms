/**
 * components/ui/BadgeDisplay.tsx — Renders a student's earned badges in a grid.
 * Each badge shows icon + display name with a tooltip-style title on hover.
 * To test: render <BadgeDisplay badges={[{ badge_key, badge_display_name, badge_icon }]} />
 */

'use client';

import type { Badge } from '@/types';

interface BadgeDisplayProps {
  badges: Badge[];
  maxVisible?: number;
}

const DEFAULT_ICONS: Record<string, string> = {
  first_mission: '🎯',
  perfect_strike: '🏆',
  hot_streak: '🔥',
  veteran_operator: '🎖️',
  flawless: '💎',
};

export function BadgeDisplay({ badges, maxVisible }: BadgeDisplayProps) {
  if (!badges || badges.length === 0) {
    return (
      <p className="text-sm text-gray-600 italic">No badges earned yet. Complete quizzes to earn badges!</p>
    );
  }

  const visible = maxVisible ? badges.slice(0, maxVisible) : badges;
  const hidden = maxVisible ? Math.max(0, badges.length - maxVisible) : 0;

  return (
    <div className="flex flex-wrap gap-3" role="list" aria-label="Earned badges">
      {visible.map((badge) => {
        const icon = badge.badge_icon?.startsWith('/') ? null : DEFAULT_ICONS[badge.badge_key] ?? '🏅';
        return (
          <div
            key={badge.badge_id}
            role="listitem"
            title={badge.badge_display_name}
            className="group flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-800/60 border border-white/5 hover:border-cyan-500/30 transition-all w-20"
          >
            {icon ? (
              <span className="text-2xl" aria-hidden="true">{icon}</span>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={badge.badge_icon}
                alt=""
                aria-hidden="true"
                className="h-8 w-8 object-contain"
              />
            )}
            <span className="text-center text-xs text-gray-400 leading-tight group-hover:text-cyan-400 transition-colors line-clamp-2">
              {badge.badge_display_name}
            </span>
          </div>
        );
      })}
      {hidden > 0 && (
        <div
          role="listitem"
          className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gray-800/40 border border-white/5 w-20"
        >
          <span className="text-xl text-gray-500">+{hidden}</span>
          <span className="text-xs text-gray-600">more</span>
        </div>
      )}
    </div>
  );
}
