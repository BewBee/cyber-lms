/**
 * components/ui/Card.tsx — Reusable card container for CyberShield LMS.
 * Provides a dark-themed card with optional header, hover glow, and border variants.
 * To test: render <Card title="Test"> <p>content</p> </Card> and verify layout.
 */

'use client';

import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  variant?: 'default' | 'highlight' | 'danger';
  noPadding?: boolean;
  hoverable?: boolean;
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'border-white/10 bg-gray-900/60',
  highlight: 'border-cyan-500/40 bg-gray-900/80 shadow-[0_0_20px_rgba(0,212,255,0.08)]',
  danger: 'border-red-500/40 bg-red-900/10',
};

export function Card({
  title,
  subtitle,
  action,
  variant = 'default',
  noPadding = false,
  hoverable = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border backdrop-blur-sm',
        variantClasses[variant],
        hoverable
          ? 'transition-all duration-200 hover:border-cyan-500/30 hover:shadow-[0_0_16px_rgba(0,212,255,0.12)] cursor-pointer'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {(title || action) && (
        <div
          className={[
            'flex items-start justify-between gap-4',
            noPadding ? 'px-5 pt-5' : 'px-5 pt-5',
            !children ? 'pb-5' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {title && (
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
            </div>
          )}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : [title || action ? 'px-5 pb-5 pt-3' : 'p-5'].join('')}>
        {children}
      </div>
    </div>
  );
}
