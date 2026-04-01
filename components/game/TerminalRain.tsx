'use client';

import { useEffect, useRef } from 'react';

/**
 * TerminalRain — Ambient matrix-style falling characters canvas.
 * Renders behind quiz content as a fixed, low-opacity background.
 * Uses requestAnimationFrame; pauses when tab is not visible.
 */
export function TerminalRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CHARS = '01アイウエオカキクケコABCDEF><{}[]#$%&';
    const FONT_SIZE = 13;
    let cols = 0;
    let drops: number[] = [];
    let rafId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / FONT_SIZE);
      drops = Array.from({ length: cols }, () => Math.random() * -50);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = 'rgba(13, 27, 42, 0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const y = drops[i] * FONT_SIZE;
        // Lead char brighter
        ctx.fillStyle = y > 0 ? 'rgba(0,200,180,0.55)' : 'rgba(0,200,180,0)';
        ctx.fillStyle = 'rgba(0,200,180,0.18)';
        if (drops[i] > 0 && drops[i] < 2) ctx.fillStyle = 'rgba(180,255,240,0.65)';
        ctx.fillText(char, i * FONT_SIZE, y);
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.35;
      }
      rafId = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVisibility);
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-60"
    />
  );
}
