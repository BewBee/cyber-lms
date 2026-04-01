/**
 * lib/sounds.ts — Web Audio API sound cues for CyberShield LMS.
 * All sounds are synthesized (no audio files needed).
 * Respects the user's opt-in preference stored in localStorage ('cs_sound' = '1').
 * To test: call playSound('correct') in the browser console after enabling sounds.
 */

const SOUND_KEY = 'cs_sound';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_KEY) === '1';
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  localStorage.setItem(SOUND_KEY, next ? '1' : '0');
  return next;
}

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try { return new AudioContext(); } catch { return null; }
}

export type SoundType = 'correct' | 'wrong' | 'complete';

export function playSound(type: SoundType): void {
  if (!isSoundEnabled()) return;
  const ac = ctx();
  if (!ac) return;

  const now = ac.currentTime;

  if (type === 'correct') {
    // Short ascending 2-tone chime
    [440, 660].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.09;
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    });
  }

  if (type === 'wrong') {
    // Gentle descending "boing" — not punishing
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now); osc.stop(now + 0.22);
  }

  if (type === 'complete') {
    // Triumphant 3-tone sequence
    [440, 554, 660].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.13;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    });
  }
}
