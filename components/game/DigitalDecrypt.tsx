/**
 * components/game/DigitalDecrypt.tsx — Text scramble/reveal animation for quiz questions.
 * Uses requestAnimationFrame to cycle random characters then reveals real text over decryptDuration ms.
 * Respects prefers-reduced-motion by skipping directly to final text.
 * To test: render <DigitalDecrypt text="Hello World" /> and watch it animate on mount.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>/?';

interface DigitalDecryptProps {
  text: string;
  onComplete?: () => void;
  className?: string;
}

export function DigitalDecrypt({ text, onComplete, className = '' }: DigitalDecryptProps) {
  const [displayText, setDisplayText] = useState<string>('');
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    const prefersReduced = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    // Skip animation for users who prefer reduced motion
    if (prefersReduced) {
      setDisplayText(text);
      onComplete?.();
      return;
    }

    const duration = config.ANIMATION_SETTINGS.decryptDuration;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Reveal characters left-to-right as progress increases
      const revealedCount = Math.floor(progress * text.length);

      const scrambled = text
        .split('')
        .map((char, i) => {
          if (char === ' ' || char === '\n') return char; // preserve whitespace
          if (i < revealedCount) return char;             // already revealed
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [text, onComplete]);

  return (
    <span
      className={['font-mono', className].filter(Boolean).join(' ')}
      aria-label={text}
      aria-live="off"
    >
      {displayText || '\u00A0' /* nbsp placeholder to avoid layout shift */}
    </span>
  );
}
