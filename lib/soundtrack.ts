/**
 * lib/soundtrack.ts — Procedural ambient soundtrack for CyberShield LMS.
 *
 * All audio is synthesized via Web Audio API — no files.
 * Respects the same 'cs_sound' localStorage opt-in as sounds.ts.
 *
 * Three scenes:
 *   'dashboard' — slow atmospheric drone + occasional glitch stab. Loops every ~90s.
 *   'quiz'      — pentatonic minor arpeggio over pulse bass. Procedurally varied, never repeats.
 *   'boss'      — distorted sawtooth bass + fast arpeggio. Higher tension.
 *
 * Streak layers (quiz scene only):
 *   tier 0 (streak 0-2):  base arpeggio only
 *   tier 1 (streak 3-5):  + pad layer (slow sustained chords)
 *   tier 2 (streak 6+):   + glitch percussion layer
 *
 * API:
 *   startSoundtrack(scene)       — begin or switch scene
 *   stopSoundtrack()             — fade out + stop all
 *   setStreakLayer(tier: 0|1|2)  — add/remove layers during quiz
 *   isSoundtrackPlaying()        — boolean check
 */

import { isSoundEnabled } from './sounds';

// ── Internal state ─────────────────────────────────────────────────────────────

let _ac: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _scene: 'dashboard' | 'quiz' | 'boss' | null = null;
let _streakTier = 0;

// Active node groups by layer name
const _layers: Map<string, { nodes: AudioNode[]; gain: GainNode }> = new Map();
// Scheduler intervals
const _intervals: ReturnType<typeof setInterval>[] = [];
// Pending timeouts for cleanup
const _timeouts: ReturnType<typeof setTimeout>[] = [];

type Scene = 'dashboard' | 'quiz' | 'boss';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ac || _ac.state === 'closed') {
    try { _ac = new AudioContext(); } catch { return null; }
  }
  if (_ac.state === 'suspended') _ac.resume().catch(() => {});
  return _ac;
}

function masterGain(): GainNode | null {
  const ac = getAC();
  if (!ac) return null;
  if (!_masterGain || _masterGain.context !== ac) {
    _masterGain = ac.createGain();
    _masterGain.gain.value = 0.55;
    _masterGain.connect(ac.destination);
  }
  return _masterGain;
}

function clearAllLayers() {
  _intervals.forEach(clearInterval);
  _intervals.length = 0;
  _timeouts.forEach(clearTimeout);
  _timeouts.length = 0;
  _layers.forEach(({ nodes }) => {
    nodes.forEach((n) => {
      try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ }
      try { n.disconnect(); } catch { /* already disconnected */ }
    });
  });
  _layers.clear();
}

function makeLayer(name: string, volume = 1): GainNode | null {
  const ac = getAC();
  const mg = masterGain();
  if (!ac || !mg) return null;
  const g = ac.createGain();
  g.gain.value = volume;
  g.connect(mg);
  _layers.set(name, { nodes: [g], gain: g });
  return g;
}

function addNode(layerName: string, node: AudioNode) {
  const layer = _layers.get(layerName);
  if (layer) layer.nodes.push(node);
}

function fadeLayer(name: string, targetVolume: number, durationSec = 1.5) {
  const ac = getAC();
  const layer = _layers.get(name);
  if (!ac || !layer) return;
  layer.gain.gain.setValueAtTime(layer.gain.gain.value, ac.currentTime);
  layer.gain.gain.linearRampToValueAtTime(targetVolume, ac.currentTime + durationSec);
}

function killLayer(name: string, fadeSec = 1.5) {
  const ac = getAC();
  const layer = _layers.get(name);
  if (!ac || !layer) return;
  fadeLayer(name, 0, fadeSec);
  const t = setTimeout(() => {
    layer.nodes.forEach((n) => {
      try { (n as OscillatorNode).stop?.(); } catch { /* ok */ }
      try { n.disconnect(); } catch { /* ok */ }
    });
    _layers.delete(name);
  }, fadeSec * 1000 + 100);
  _timeouts.push(t);
}

// ── Note helpers ───────────────────────────────────────────────────────────────

// Pentatonic minor scale in Hz starting at C3
const PENTATONIC_MINOR = [130.8, 155.6, 174.6, 196.0, 233.1, 261.6, 311.1, 349.2, 392.0, 466.2];

function randomNote(octaveShift = 0): number {
  const base = PENTATONIC_MINOR[Math.floor(Math.random() * PENTATONIC_MINOR.length)];
  return base * Math.pow(2, octaveShift);
}

function playNote(
  ac: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  gain: number,
  type: OscillatorType = 'sine',
): OscillatorNode {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.connect(g); g.connect(dest);
  osc.type = type;
  osc.frequency.value = freq;
  const attack = Math.min(0.05, duration * 0.1);
  const release = Math.min(0.15, duration * 0.4);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + attack);
  g.gain.setValueAtTime(gain, startTime + duration - release);
  g.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
  return osc;
}

// ── Scene: Dashboard ───────────────────────────────────────────────────────────

function startDashboard() {
  const ac = getAC();
  const mg = masterGain();
  if (!ac || !mg) return;

  // Drone — two detuned oscillators creating a slow beating effect
  const droneLg = makeLayer('drone', 0.35);
  if (droneLg) {
    [55, 55.5, 82.4, 110].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g); g.connect(droneLg);
      osc.type = i < 2 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      // Slow LFO vibrato
      const lfo = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.connect(lfoG); lfoG.connect(osc.frequency);
      lfo.frequency.value = 0.08 + i * 0.03;
      lfoG.gain.value = 0.6;
      lfo.start(); osc.start();
      g.gain.value = 0.06;
      addNode('drone', osc); addNode('drone', lfo); addNode('drone', g); addNode('drone', lfoG);
    });
  }

  // Occasional glitch stab every 8-18 seconds
  const glitchInterval = setInterval(() => {
    if (!isSoundEnabled() || _scene !== 'dashboard') return;
    const glitchLg = _layers.get('drone')?.gain;
    if (!glitchLg) return;
    const t = ac.currentTime;
    const freq = [880, 1320, 440][Math.floor(Math.random() * 3)];
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g); g.connect(glitchLg);
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.06);
    osc.start(t); osc.stop(t + 0.07);
  }, 8000 + Math.random() * 10000);
  _intervals.push(glitchInterval);
}

// ── Scene: Quiz ────────────────────────────────────────────────────────────────

function startQuiz() {
  const ac = getAC();
  const mg = masterGain();
  if (!ac || !mg) return;

  // Pulse bass — rhythmic low thud at ~90bpm
  const bassLg = makeLayer('bass', 0.45);
  if (bassLg) {
    const beatMs = 667; // ~90bpm
    const bassInterval = setInterval(() => {
      if (!isSoundEnabled() || _scene !== 'quiz') return;
      const t = ac.currentTime;
      const note = playNote(ac, bassLg, 55 + (Math.random() > 0.8 ? 10 : 0), t, 0.22, 0.55, 'sine');
      addNode('bass', note);
    }, beatMs);
    _intervals.push(bassInterval);
  }

  // Arpeggio — procedurally varied pentatonic minor, never the same phrase twice
  const arpLg = makeLayer('arp', 0.3);
  if (arpLg) {
    let step = 0;
    const arpInterval = setInterval(() => {
      if (!isSoundEnabled() || _scene !== 'quiz') return;
      const t = ac.currentTime;
      // Occasionally skip a step for rhythmic variation
      if (Math.random() < 0.15) { step++; return; }
      const octave = step % 16 < 8 ? 1 : 2;
      const freq = randomNote(octave);
      const dur = Math.random() < 0.2 ? 0.35 : 0.18;
      const note = playNote(ac, arpLg, freq, t, dur, 0.12, 'triangle');
      addNode('arp', note);
      step++;
    }, 160); // ~375bpm arpeggio feel
    _intervals.push(arpInterval);
  }
}

// ── Scene: Boss ────────────────────────────────────────────────────────────────

function startBoss() {
  const ac = getAC();
  const mg = masterGain();
  if (!ac || !mg) return;

  // Heavy distorted bass — sawtooth at fast tempo
  const bassLg = makeLayer('bass', 0.5);
  if (bassLg) {
    const beatMs = 500; // 120bpm
    let beat = 0;
    const bassInterval = setInterval(() => {
      if (!isSoundEnabled() || _scene !== 'boss') return;
      const t = ac.currentTime;
      // Syncopated pattern
      const pattern = [1, 0, 1, 1, 0, 1, 1, 0];
      if (!pattern[beat % pattern.length]) { beat++; return; }
      const note = playNote(ac, bassLg, beat % 4 === 0 ? 41.2 : 55, t, 0.18, 0.6, 'sawtooth');
      addNode('bass', note);
      beat++;
    }, beatMs / 2);
    _intervals.push(bassInterval);
  }

  // Fast menacing arpeggio — tritone intervals for tension
  const arpLg = makeLayer('arp', 0.25);
  if (arpLg) {
    const BOSS_NOTES = [146.8, 185.0, 155.6, 220.0, 174.6, 233.1]; // tritone-heavy
    let idx = 0;
    const arpInterval = setInterval(() => {
      if (!isSoundEnabled() || _scene !== 'boss') return;
      const t = ac.currentTime;
      const note = playNote(ac, arpLg, BOSS_NOTES[idx % BOSS_NOTES.length], t, 0.12, 0.14, 'square');
      addNode('arp', note);
      idx++;
    }, 120);
    _intervals.push(arpInterval);
  }

  // Low sub rumble
  const subLg = makeLayer('sub', 0.3);
  if (subLg) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g); g.connect(subLg);
    osc.type = 'sine';
    osc.frequency.value = 30;
    g.gain.value = 0.4;
    osc.start();
    addNode('sub', osc); addNode('sub', g);
  }
}

// ── Streak layers (quiz only) ──────────────────────────────────────────────────

function addPadLayer() {
  const ac = getAC();
  if (!ac || _layers.has('pad')) return;
  const padLg = makeLayer('pad', 0);
  if (!padLg) return;
  // Sustained slow chord — minor triad
  [130.8, 155.6, 196.0].forEach((freq) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g); g.connect(padLg);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.value = 0.06;
    osc.start();
    addNode('pad', osc); addNode('pad', g);
  });
  fadeLayer('pad', 0.4, 2);
}

function addPercLayer() {
  const ac = getAC();
  if (!ac || _layers.has('perc')) return;
  const percLg = makeLayer('perc', 0);
  if (!percLg) return;
  const percInterval = setInterval(() => {
    if (!isSoundEnabled() || _scene !== 'quiz') return;
    const t = ac.currentTime;
    if (Math.random() < 0.5) return; // sparse glitch hits
    // Noise burst — hi-hat style
    const buf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const filter = ac.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter); filter.connect(g); g.connect(percLg);
    filter.type = 'highpass'; filter.frequency.value = 3000;
    g.gain.setValueAtTime(0.15, t);
    g.gain.linearRampToValueAtTime(0, t + 0.04);
    src.start(t);
    addNode('perc', src); addNode('perc', g); addNode('perc', filter);
  }, 333);
  _intervals.push(percInterval);
  fadeLayer('perc', 0.5, 2);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function startSoundtrack(scene: Scene): void {
  if (!isSoundEnabled()) return;
  if (_scene === scene) return; // already playing this scene

  stopSoundtrack(0.5); // quick crossfade out

  _scene = scene;
  _streakTier = 0;

  const t = setTimeout(() => {
    if (_scene !== scene) return;
    if (scene === 'dashboard') startDashboard();
    else if (scene === 'quiz') startQuiz();
    else if (scene === 'boss') startBoss();
  }, 600);
  _timeouts.push(t);
}

export function stopSoundtrack(fadeSec = 2): void {
  _scene = null;
  const mg = _masterGain;
  const ac = getAC();
  if (mg && ac) {
    mg.gain.setValueAtTime(mg.gain.value, ac.currentTime);
    mg.gain.linearRampToValueAtTime(0, ac.currentTime + fadeSec);
  }
  const t = setTimeout(() => {
    clearAllLayers();
    // Reset master gain for next scene
    if (_masterGain && getAC()) {
      _masterGain.gain.setValueAtTime(0.55, getAC()!.currentTime);
    }
  }, fadeSec * 1000 + 100);
  _timeouts.push(t);
}

export function setStreakLayer(tier: 0 | 1 | 2): void {
  if (_scene !== 'quiz') return;
  if (tier === _streakTier) return;

  if (tier >= 1 && _streakTier < 1) addPadLayer();
  if (tier < 1 && _streakTier >= 1) killLayer('pad');
  if (tier >= 2 && _streakTier < 2) addPercLayer();
  if (tier < 2 && _streakTier >= 2) killLayer('perc');

  _streakTier = tier;
}

export function isSoundtrackPlaying(): boolean {
  return _scene !== null;
}
