/**
 * lib/sounds.ts — Web Audio API sound cues for CyberShield LMS.
 * All sounds are synthesized (no audio files needed).
 * Respects the user's opt-in preference stored in localStorage ('cs_sound' = '1').
 * intensity (0–1): scales harmonic richness and emotional weight of each sound.
 * To test: call playSound('correct', 0.9) in the browser console after enabling sounds.
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

export type SoundType =
  | 'correct'
  | 'wrong'
  | 'complete'
  | 'powerup'
  | 'boss_hit'
  | 'shield_block'
  | 'combo_up'
  | 'clutch_enter'
  | 'streak_break';

/**
 * Play a synthesized sound cue.
 * @param type    — which cue to play
 * @param intensity — 0 (low stakes / early game) → 1 (high streak / clutch / boss)
 *                    scales harmonic richness and emotional weight
 */
export function playSound(type: SoundType, intensity = 0.5): void {
  if (!isSoundEnabled()) return;
  const ac = ctx();
  if (!ac) return;

  const now = ac.currentTime;
  // intensity-driven gain multiplier (soft floor so it's never silent)
  const gScale = 0.7 + intensity * 0.3;

  // ── correct ───────────────────────────────────────────────────────────────────
  if (type === 'correct') {
    // Base 2-tone chime always present
    const tones = [440, 660];
    // At intensity > 0.5 add a 3rd harmonic; at > 0.8 add a 4th (richer chord)
    if (intensity > 0.5) tones.push(880);
    if (intensity > 0.8) tones.push(1100);

    tones.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.08;
      const g = (0.09 * gScale) / (1 + i * 0.15); // slightly quieter per harmonic
      gain.gain.setValueAtTime(g, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t); osc.stop(t + 0.22);
    });
  }

  // ── wrong ─────────────────────────────────────────────────────────────────────
  if (type === 'wrong') {
    // Low intensity → gentle boing. High intensity (clutch) → deeper, more ominous
    const baseFreq = 320 - intensity * 80; // 320 Hz normal → 240 Hz clutch
    const endFreq  = 180 - intensity * 60; // 180 Hz normal → 120 Hz clutch
    const g        = (0.07 + intensity * 0.05) * gScale;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.28);
    gain.gain.setValueAtTime(g, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.start(now); osc.stop(now + 0.28);

    // At high intensity add a low sub-bass thud for drama
    if (intensity > 0.7) {
      const sub = ac.createOscillator();
      const subGain = ac.createGain();
      sub.connect(subGain); subGain.connect(ac.destination);
      sub.type = 'sine';
      sub.frequency.value = 60;
      subGain.gain.setValueAtTime(0.12 * gScale, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      sub.start(now); sub.stop(now + 0.18);
    }
  }

  // ── complete ──────────────────────────────────────────────────────────────────
  if (type === 'complete') {
    // Triumphant 3-tone sequence
    [440, 554, 660].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.13;
      gain.gain.setValueAtTime(0.1 * gScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  // ── powerup ───────────────────────────────────────────────────────────────────
  if (type === 'powerup') {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
    gain.gain.setValueAtTime(0.07 * gScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now); osc.stop(now + 0.22);
  }

  // ── boss_hit ──────────────────────────────────────────────────────────────────
  if (type === 'boss_hit') {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    gain.gain.setValueAtTime(0.18 * gScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
    // Overtone layer
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.connect(gain2); gain2.connect(ac.destination);
    osc2.type = 'sine';
    osc2.frequency.value = 180;
    gain2.gain.setValueAtTime(0.06 * gScale, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.start(now); osc2.stop(now + 0.2);
  }

  // ── shield_block ──────────────────────────────────────────────────────────────
  if (type === 'shield_block') {
    [800, 1200, 600].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.04;
      gain.gain.setValueAtTime(0.08 * gScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  // ── combo_up — ascending arpeggio burst when entering a new combo tier ────────
  if (type === 'combo_up') {
    // Pentatonic minor arpeggio, rapid and bright
    const freqs = [523, 659, 784, 1047]; // C5, E5, G5, C6
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0.06 * gScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    });
  }

  // ── clutch_enter — ominous low 3-note descent when lives hit 1 ────────────────
  if (type === 'clutch_enter') {
    const freqs = [220, 185, 147]; // descending minor
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0.1 * gScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
    });
    // Heavy sub pulse underneath
    const sub = ac.createOscillator();
    const subG = ac.createGain();
    sub.connect(subG); subG.connect(ac.destination);
    sub.type = 'sine';
    sub.frequency.value = 55;
    subG.gain.setValueAtTime(0.15, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    sub.start(now); sub.stop(now + 0.6);
  }

  // ── streak_break — deflating "whomp" distinct from wrong ─────────────────────
  if (type === 'streak_break') {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    gain.gain.setValueAtTime(0.1 * gScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  }
}
