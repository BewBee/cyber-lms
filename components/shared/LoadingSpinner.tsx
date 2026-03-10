/**
 * components/shared/LoadingSpinner.tsx — Accessible animated loading indicator.
 * Degrades gracefully: uses CSS animation (no JS required) with aria-live region.
 * To test: render <LoadingSpinner /> and verify spinner animation and aria-label.
 */

'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function LoadingSpinner({ size = 'md', label = 'Loading…', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={['flex flex-col items-center justify-center gap-3', className].join(' ')}
    >
      <svg
        className={['animate-spin text-cyan-500', sizeMap[size]].join(' ')}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
