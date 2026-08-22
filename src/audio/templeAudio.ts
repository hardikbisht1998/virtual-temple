/* ── Vedic Temple Web Audio Synthesis Engine ────────────────────────
   Zero external audio files; 100% offline, procedural sound generation.
   ─────────────────────────────────────────────────────────────────── */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Resonant Temple Bell (Ghanta) synthesis
 * Uses layered harmonic partials with authentic bell envelope decay.
 */
export function playGhantaSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const baseFreq = 880; // A5 root

    // Harmonic partial ratios characteristic of brass temple bells
    const partials = [
      { ratio: 0.5, gain: 0.25, decay: 2.8 },  // Hum note
      { ratio: 1.0, gain: 0.60, decay: 2.4 },  // Prime
      { ratio: 1.2, gain: 0.35, decay: 2.0 },  // Tierce (minor third)
      { ratio: 1.5, gain: 0.40, decay: 2.2 },  // Quint (fifth)
      { ratio: 2.0, gain: 0.30, decay: 1.6 },  // Nominal
      { ratio: 2.76, gain: 0.18, decay: 1.2 }, // Decime
      { ratio: 3.5, gain: 0.10, decay: 0.8 },  // Supernominal
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.connect(ctx.destination);

    // Initial strike transient (metallic impact click)
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200, now);
    noiseFilter.Q.setValueAtTime(3, now);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(masterGain);
    noiseSource.start(now);

    partials.forEach(({ ratio, gain: partGain, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      // Slight random detune for natural warmth
      const detune = (Math.random() - 0.5) * 4;
      osc.frequency.setValueAtTime(baseFreq * ratio + detune, now);

      gainNode.gain.setValueAtTime(partGain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(now);
      osc.stop(now + decay + 0.1);
    });
  } catch {
    // Audio unavailable
  }
}

/**
 * Sacred Conch Shell (Shankhnaad) sound synthesis
 * Recreates the deep harmonic trumpet-like resonant swell of a Shankh.
 */
export function playShankhSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 3.6;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    // Dynamic crescendo and long decrescendo
    masterGain.gain.linearRampToValueAtTime(0.55, now + 0.8);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    masterGain.connect(ctx.destination);

    // Conch base fundamental frequency with pitch vibrato & slight breath swell
    const fundamental = 220; // A3

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(fundamental * 0.96, now);
    osc1.frequency.linearRampToValueAtTime(fundamental, now + 0.6);
    osc1.frequency.linearRampToValueAtTime(fundamental * 1.02, now + 2.0);
    osc1.frequency.linearRampToValueAtTime(fundamental * 0.98, now + duration);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(fundamental * 2, now);
    osc2.frequency.linearRampToValueAtTime(fundamental * 2.01, now + 1.0);

    // Formant vocal filter modeling the acoustic cavity of the shell
    const formantFilter = ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(480, now);
    formantFilter.frequency.linearRampToValueAtTime(650, now + 0.8);
    formantFilter.frequency.linearRampToValueAtTime(440, now + duration);
    formantFilter.Q.setValueAtTime(4.5, now);

    // Breath turbulence / air rush
    const breathBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const breathData = breathBuffer.getChannelData(0);
    for (let i = 0; i < breathData.length; i++) {
      breathData[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const breathSource = ctx.createBufferSource();
    breathSource.buffer = breathBuffer;

    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.setValueAtTime(800, now);
    breathFilter.Q.setValueAtTime(2.0, now);

    breathSource.connect(breathFilter);
    breathFilter.connect(masterGain);

    osc1.connect(formantFilter);
    osc2.connect(formantFilter);
    formantFilter.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    breathSource.start(now);

    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
    breathSource.stop(now + duration + 0.1);
  } catch {
    // Audio unavailable
  }
}

/**
 * Holy Water / Abhishekam trickle sound synthesis
 */
export function playAbhishekamSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 2.0;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.3, now + 0.3);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    masterGain.connect(ctx.destination);

    // Water droplet blips
    for (let i = 0; i < 7; i++) {
      const dropTime = now + 0.15 + i * 0.22 + Math.random() * 0.08;
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();

      const startFreq = 1200 + Math.random() * 600;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, dropTime);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.6, dropTime + 0.08);

      dropGain.gain.setValueAtTime(0.2, dropTime);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, dropTime + 0.12);

      osc.connect(dropGain);
      dropGain.connect(masterGain);

      osc.start(dropTime);
      osc.stop(dropTime + 0.15);
    }
  } catch {
    // Audio unavailable
  }
}

/**
 * Gentle Japa Mala Bead Click sound
 */
export function playBeadClickSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Audio unavailable
  }
}

/* ── Continuous Om / Tanpura Drone Engine ────────────────────────── */

interface DroneState {
  isPlaying: boolean;
  gainNode: GainNode | null;
  nodes: (OscillatorNode | AudioNode)[];
}

const droneState: DroneState = {
  isPlaying: false,
  gainNode: null,
  nodes: [],
};

/**
 * Start continuous meditative Om Tanpura drone
 */
export function startOmDrone(volume = 0.22): void {
  if (droneState.isPlaying) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(volume, now + 2.5);
    masterGain.connect(ctx.destination);

    droneState.gainNode = masterGain;
    droneState.nodes = [];

    // Sacred Vedic Tanpura chord in C# / C#3 (138.59 Hz)
    // Pa (G#3 - 207.65 Hz), Sa (C#4 - 277.18 Hz), Sa (C#4), Kharaj Sa (C#3 - 138.59 Hz)
    const notes = [
      { freq: 138.59, type: 'sawtooth' as const, gain: 0.16 }, // Deep Kharaj root
      { freq: 207.65, type: 'sine' as const,     gain: 0.20 }, // Pa fifth
      { freq: 277.18, type: 'sine' as const,     gain: 0.22 }, // Sa tonic
      { freq: 415.30, type: 'sine' as const,     gain: 0.08 }, // High Pa
      { freq: 554.37, type: 'sine' as const,     gain: 0.06 }, // Shimmer
    ];

    // Lowpass filter for warm, soothing temple acoustics
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);
    filter.Q.setValueAtTime(2.0, now);
    filter.connect(masterGain);
    droneState.nodes.push(filter);

    // Slow LFO for gentle atmospheric breathing pulsation (0.12 Hz)
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(120, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    droneState.nodes.push(lfo, lfoGain);

    notes.forEach(({ freq, type, gain: noteGain }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = type;
      // Natural microtonal detuning
      const detune = (Math.random() - 0.5) * 3.5;
      osc.frequency.setValueAtTime(freq + detune, now);

      g.gain.setValueAtTime(noteGain, now);

      osc.connect(g);
      g.connect(filter);
      osc.start(now);

      droneState.nodes.push(osc, g);
    });

    droneState.isPlaying = true;
  } catch {
    // Audio unavailable
  }
}

/**
 * Stop Om drone with smooth fade out
 */
export function stopOmDrone(): void {
  if (!droneState.isPlaying || !droneState.gainNode) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    droneState.gainNode.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    setTimeout(() => {
      droneState.nodes.forEach(node => {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          try { (node as OscillatorNode).stop(); } catch { /* ignore */ }
        }
        try { node.disconnect(); } catch { /* ignore */ }
      });
      droneState.nodes = [];
      droneState.gainNode = null;
      droneState.isPlaying = false;
    }, 1300);
  } catch {
    droneState.isPlaying = false;
  }
}

export function isOmDronePlaying(): boolean {
  return droneState.isPlaying;
}
