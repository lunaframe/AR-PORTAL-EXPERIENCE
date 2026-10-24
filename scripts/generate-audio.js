/**
 * scripts/generate-audio.js
 * Synthesizes 11 high-fidelity spatial audio assets for the AR Portal Effect application.
 * Outputs standard 16-bit 44.1kHz stereo audio files into public/assets/audio/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/assets/audio');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const SAMPLE_RATE = 44100;

function createWavBuffer(samplesLeft, samplesRight) {
  const numSamples = samplesLeft.length;
  const buffer = Buffer.alloc(44 + numSamples * 4);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 4, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // Subchunk1Size
  buffer.writeUInt16LE(1, 20);           // AudioFormat = PCM
  buffer.writeUInt16LE(2, 22);           // NumChannels = 2 (Stereo)
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
  buffer.writeUInt32LE(SAMPLE_RATE * 4, 28); // ByteRate (SampleRate * 2 channels * 2 bytes)
  buffer.writeUInt16LE(4, 32);           // BlockAlign
  buffer.writeUInt16LE(16, 34);          // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 4, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp to -1.0 .. 1.0
    const l = Math.max(-1, Math.min(1, samplesLeft[i]));
    const r = Math.max(-1, Math.min(1, samplesRight[i]));

    const sL = l < 0 ? l * 0x8000 : l * 0x7FFF;
    const sR = r < 0 ? r * 0x8000 : r * 0x7FFF;

    buffer.writeInt16LE(Math.round(sL), offset);
    buffer.writeInt16LE(Math.round(sR), offset + 2);
    offset += 4;
  }

  return buffer;
}

// ── Pseudo-Random Seeded Noise ───────────────────────────────────────────────
function pseudoRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── 1. Wormhole Ambient (10s seamless loop) ──────────────────────────────────
function genWormholeAmbient() {
  const duration = 10;
  const n = duration * SAMPLE_RATE;
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(101);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const loopPhase = (2 * Math.PI * i) / n; // For seamless loop modulation

    // Deep sub drone
    const subL = Math.sin(2 * Math.PI * 46 * t);
    const subR = Math.sin(2 * Math.PI * 47.5 * t);

    // Harmonic cosmic resonance
    const midL = Math.sin(2 * Math.PI * 92 * t + 0.3 * Math.sin(loopPhase)) * 0.4;
    const midR = Math.sin(2 * Math.PI * 93.5 * t + 0.3 * Math.cos(loopPhase)) * 0.4;

    const highL = Math.sin(2 * Math.PI * 138 * t) * 0.2;
    const highR = Math.sin(2 * Math.PI * 140 * t) * 0.2;

    // Filtered deep void rumble noise
    const noise = (rand() * 2 - 1) * 0.08 * (0.8 + 0.2 * Math.sin(loopPhase * 3));

    left[i] = (subL * 0.5 + midL + highL + noise) * 0.6;
    right[i] = (subR * 0.5 + midR + highR + noise) * 0.6;
  }
  return [left, right];
}

// ── 2. Glass Ambient (8s seamless loop) ───────────────────────────────────────
function genGlassAmbient() {
  const duration = 8;
  const n = duration * SAMPLE_RATE;
  const left = new Float32Array(n);
  const right = new Float32Array(n);

  const freqs = [1046.5, 1318.5, 1567.98, 2093.0, 2637.0]; // C6, E6, G6, C7, E7

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let sumL = 0;
    let sumR = 0;

    freqs.forEach((f, idx) => {
      const lfoL = 0.5 + 0.5 * Math.sin((2 * Math.PI * (idx + 1) * i) / n);
      const lfoR = 0.5 + 0.5 * Math.cos((2 * Math.PI * (idx + 1) * i) / n);
      sumL += Math.sin(2 * Math.PI * f * t) * lfoL * 0.15;
      sumR += Math.sin(2 * Math.PI * (f * 1.002) * t) * lfoR * 0.15;
    });

    left[i] = sumL;
    right[i] = sumR;
  }
  return [left, right];
}

// ── 3. Nature Ambient (10s seamless loop) ────────────────────────────────────
function genNatureAmbient() {
  const duration = 10;
  const n = duration * SAMPLE_RATE;
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(303);

  // Bird chirps timestamps
  const birds = [
    { time: 1.5, f: 2800, dur: 0.15 },
    { time: 1.7, f: 3200, dur: 0.12 },
    { time: 4.2, f: 2600, dur: 0.2 },
    { time: 6.8, f: 3400, dur: 0.18 },
    { time: 7.1, f: 3100, dur: 0.14 },
  ];

  let pinkL = 0;
  let pinkR = 0;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const loopPhase = (2 * Math.PI * i) / n;

    // Pink-ish wind rustle
    const w = (rand() * 2 - 1);
    pinkL = pinkL * 0.95 + w * 0.05;
    pinkR = pinkR * 0.95 + (rand() * 2 - 1) * 0.05;

    const windMod = 0.15 * (1 + 0.6 * Math.sin(loopPhase * 2));
    let sL = pinkL * windMod;
    let sR = pinkR * windMod;

    // Birdsong overlay
    for (const b of birds) {
      if (t >= b.time && t < b.time + b.dur) {
        const bt = (t - b.time) / b.dur;
        const env = Math.sin(Math.PI * bt);
        const pitch = b.f * (1 + 0.3 * Math.sin(bt * Math.PI * 4));
        const chirp = Math.sin(2 * Math.PI * pitch * t) * env * 0.25;
        sL += chirp * 0.8;
        sR += chirp * 0.6;
      }
    }

    left[i] = sL;
    right[i] = sR;
  }
  return [left, right];
}

// ── 4. Fire Ambient (10s seamless loop) ──────────────────────────────────────
function genFireAmbient() {
  const duration = 10;
  const n = duration * SAMPLE_RATE;
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(404);

  let lowPassL = 0;
  let lowPassR = 0;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Roar base
    const raw = (rand() * 2 - 1);
    lowPassL = lowPassL * 0.98 + raw * 0.02;
    lowPassR = lowPassR * 0.98 + (rand() * 2 - 1) * 0.02;

    let sL = lowPassL * 0.6;
    let sR = lowPassR * 0.6;

    // Crackle pops
    if (rand() < 0.0008) {
      const pop = (rand() * 2 - 1) * 0.45;
      sL += pop;
      sR += pop * 0.8;
    }

    left[i] = sL;
    right[i] = sR;
  }
  return [left, right];
}

// ── 5. Sci-Fi Ambient (8s seamless loop) ─────────────────────────────────────
function genSciFiAmbient() {
  const duration = 8;
  const n = duration * SAMPLE_RATE;
  const left = new Float32Array(n);
  const right = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const loopPhase = (2 * Math.PI * i) / n;

    // Power core hum (55Hz, 110Hz, 220Hz)
    const hum55 = Math.sin(2 * Math.PI * 55 * t);
    const hum110 = Math.sin(2 * Math.PI * 110 * t) * 0.4;
    const hum220 = Math.sin(2 * Math.PI * 220 * t + Math.sin(loopPhase)) * 0.2;

    // Servo pulse modulation
    const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2 * t);
    const carrier = Math.sin(2 * Math.PI * 880 * t) * 0.04 * pulse;

    left[i] = (hum55 * 0.4 + hum110 + hum220 + carrier) * 0.6;
    right[i] = (hum55 * 0.4 + hum110 + hum220 - carrier) * 0.6;
  }
  return [left, right];
}

// ── 6. Wormhole Open (2.5s stinger) ──────────────────────────────────────────
function genWormholeOpen() {
  const duration = 2.5;
  const n = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(606);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration; // 0 to 1
    const env = Math.sin(Math.PI * Math.pow(p, 0.4));

    // Pitch drops from 600Hz down to 40Hz
    const freq = 600 * Math.exp(-3.2 * p) + 40;
    const wave = Math.sin(2 * Math.PI * freq * t);
    const whooshNoise = (rand() * 2 - 1) * 0.2 * env;

    const val = (wave * 0.6 + whooshNoise) * env;
    left[i] = val * (1 - p * 0.5);
    right[i] = val * (0.5 + p * 0.5);
  }
  return [left, right];
}

// ── 7. Glass Shatter (2s stinger) ────────────────────────────────────────────
function genGlassShatter() {
  const duration = 2.0;
  const n = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(707);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Fast initial crack
    let s = 0;
    if (t < 0.05) {
      s += (rand() * 2 - 1) * Math.exp(-t * 80);
    }
    // High shards resonance
    const shardDecay = Math.exp(-t * 3.5);
    const shard1 = Math.sin(2 * Math.PI * 3135 * t) * 0.25 * shardDecay;
    const shard2 = Math.sin(2 * Math.PI * 4400 * t) * 0.2 * shardDecay;
    const shard3 = Math.sin(2 * Math.PI * 1864 * t) * 0.3 * shardDecay;

    const noise = (rand() * 2 - 1) * 0.15 * shardDecay;

    left[i] = (s + shard1 + shard2 + noise) * 0.7;
    right[i] = (s + shard2 + shard3 + noise) * 0.7;
  }
  return [left, right];
}

// ── 8. Nature Open (2s stinger) ──────────────────────────────────────────────
function genNatureOpen() {
  const duration = 2.0;
  const n = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(808);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const env = Math.pow(Math.sin(Math.PI * p), 0.8);

    // Leafy rustle whoosh
    const rustle = (rand() * 2 - 1) * env * 0.35;
    // Harmonic bloom chord (Maj 7)
    const bloom = (
      Math.sin(2 * Math.PI * 523.25 * t) * 0.2 + // C5
      Math.sin(2 * Math.PI * 659.25 * t) * 0.18 + // E5
      Math.sin(2 * Math.PI * 783.99 * t) * 0.16 + // G5
      Math.sin(2 * Math.PI * 987.77 * t) * 0.12   // B5
    ) * Math.exp(-p * 2.5);

    left[i] = rustle * 0.6 + bloom;
    right[i] = rustle * 0.4 + bloom;
  }
  return [left, right];
}

// ── 9. Fire Whoosh (2s stinger) ──────────────────────────────────────────────
function genFireWhoosh() {
  const duration = 2.0;
  const n = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(909);

  let filt = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const env = Math.sin(Math.PI * Math.pow(p, 0.6));

    const raw = rand() * 2 - 1;
    filt = filt * 0.92 + raw * 0.08;

    const sub = Math.sin(2 * Math.PI * (90 * (1 - p * 0.5)) * t) * 0.4;
    const total = (filt * 0.8 + sub) * env;

    left[i] = total * 0.7;
    right[i] = total * 0.7;
  }
  return [left, right];
}

// ── 10. Chevron Lock (1.5s stinger) ──────────────────────────────────────────
function genChevronLock() {
  const duration = 1.5;
  const n = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(1010);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Hydraulic spin up (0 - 0.5s)
    let spin = 0;
    if (t < 0.5) {
      const sp = t / 0.5;
      spin = Math.sin(2 * Math.PI * (200 + sp * 600) * t) * 0.25 * sp;
    }

    // Heavy mechanical CLANK at t = 0.5s
    let clank = 0;
    if (t >= 0.5) {
      const dt = t - 0.5;
      const decay = Math.exp(-dt * 15);
      const metalRing = Math.sin(2 * Math.PI * 440 * dt) * 0.5 + Math.sin(2 * Math.PI * 120 * dt) * 0.7;
      const impactNoise = (rand() * 2 - 1) * Math.exp(-dt * 60);
      clank = (metalRing + impactNoise) * decay;
    }

    const val = (spin + clank) * 0.8;
    left[i] = val;
    right[i] = val;
  }
  return [left, right];
}

// ── 11. Generic Whoosh (1.5s stinger) ────────────────────────────────────────
function genWhoosh() {
  const duration = 1.5;
  const n = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = pseudoRandom(1111);

  let fL = 0;
  let fR = 0;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / duration;
    const env = Math.sin(Math.PI * p);

    fL = fL * 0.9 + (rand() * 2 - 1) * 0.1;
    fR = fR * 0.9 + (rand() * 2 - 1) * 0.1;

    // Stereo sweep from left to right
    const panL = 1 - p;
    const panR = p;

    left[i] = fL * env * panL * 1.8;
    right[i] = fR * env * panR * 1.8;
  }
  return [left, right];
}

// ── Generation Manifest ──────────────────────────────────────────────────────
const AUDIO_GENERATORS = [
  { file: 'wormhole-ambient.mp3', fn: genWormholeAmbient },
  { file: 'glass-ambient.mp3',    fn: genGlassAmbient },
  { file: 'nature-ambient.mp3',   fn: genNatureAmbient },
  { file: 'fire-ambient.mp3',     fn: genFireAmbient },
  { file: 'scifi-ambient.mp3',    fn: genSciFiAmbient },
  { file: 'wormhole-open.mp3',    fn: genWormholeOpen },
  { file: 'glass-shatter.mp3',    fn: genGlassShatter },
  { file: 'nature-open.mp3',      fn: genNatureOpen },
  { file: 'fire-whoosh.mp3',      fn: genFireWhoosh },
  { file: 'chevron-lock.mp3',     fn: genChevronLock },
  { file: 'whoosh.mp3',           fn: genWhoosh },
];

console.log('Generating audio files in:', OUT_DIR);
for (const item of AUDIO_GENERATORS) {
  const [l, r] = item.fn();
  const buffer = createWavBuffer(l, r);
  const outPath = path.join(OUT_DIR, item.file);
  fs.writeFileSync(outPath, buffer);
  console.log(` ✓ Generated ${item.file} (${(buffer.length / 1024).toFixed(1)} KB)`);
}
console.log('All 11 spatial audio assets successfully generated!');
