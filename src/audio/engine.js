/**
 * engine.js — Procedural Web Audio Engine for "Dream Gate"
 * 
 * Part 2 Fixes:
 * - Single AudioContext resumed on first user tap & XR sessionstart with statechange handling
 * - Signal chain: voices/submixes → masterGain → DynamicsCompressor (limiter) → destination
 * - Audio graphs (ambient, gate hum, realm buses) built ONCE behind guard flags to eliminate duplicate loops and phasing
 * - Parameter updates use setTargetAtTime(..., ctx.currentTime, 0.05..0.2) to eliminate clicks
 * - Spatial listener and proximity throttled to ~15 Hz with smoothed AudioParam transitions
 * - Lookahead scheduler (~25ms ticker scheduling ~100ms ahead) capping simultaneous one-shot voices at 12
 * - Impulse response and noise buffers generated once and cached
 * - Clean pause/resume on visibilitychange and teardown
 */

import * as THREE from 'three';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.limiter = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.analyser = null;
    this.analyserData = null;

    this.isMuted = false;
    this.volume = 0.8;
    this.isInitialized = false;

    this.listenerForward = new THREE.Vector3();

    // Guard flags to prevent duplicate graph construction
    this.hasAmbientGraph = false;
    this.hasGateHumGraph = false;
    this.hasRealmGraph = false;

    // Sub-mix gains
    this.realWorldGain = null;
    this.dreamWorldGain = null;
    this.lowPassRealWorld = null;

    // Gate Hum graph nodes
    this.gatePanner = null;
    this.gateHumGain = null;
    this.gateHumOsc = null;
    this.gateShimmerOsc = null;
    this.gateHumFilter = null;

    // Ambient Pad & Lookahead Scheduler
    this.currentRealm = 'skyGarden';
    this.ambientGain = null;
    this.schedulerTimer = null;
    this.nextNoteTime = 0;
    this.activeVoices = [];
    this.maxOneShotVoices = 12;

    // Cached Buffers
    this.cachedReverbBuffer = null;
    this.cachedNoiseBuffer = null;

    // Rate-limiting for frame updates (~15 Hz = 0.066s interval)
    this.lastListenerTime = 0;
    this.lastProximityTime = 0;
    this.lastProximityVal = 2.0;

    // Visual Reactivity Data
    this.audioData = {
      bass: 0,
      mid: 0,
      treble: 0,
      energy: 0,
    };

    // Tab visibility handling
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });
    }
  }

  /**
   * Initializes AudioContext on user interaction
   */
  init() {
    if (this.isInitialized && this.ctx) {
      this.resume();
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported on this browser.');
      return;
    }

    // 1. Single AudioContext
    this.ctx = new AudioContextClass();

    this.ctx.addEventListener('statechange', () => {
      // Keep track of audio state
      if (this.ctx && this.ctx.state === 'running' && !this.schedulerTimer) {
        this.startLookaheadScheduler();
      }
    });

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // 2. Signal Chain: voices -> masterGain -> DynamicsCompressor (limiter) -> destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-6, this.ctx.currentTime); // Limiter ceiling
    this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(20, this.ctx.currentTime); // Hard limiter ratio
    this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);

    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    // 3. Cached Reverb Convolver
    this.cachedReverbBuffer = this.buildImpulseResponse(2.5, 2.0);
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.cachedReverbBuffer;
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    // 4. Cached Noise Buffer (for impacts/cracks)
    this.cachedNoiseBuffer = this.buildNoiseBuffer(0.25);

    // 5. Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
    this.masterGain.connect(this.analyser);

    // 6. Realm Buses (built once)
    this.buildRealmGraph();

    // 7. Ambient Graph (built once)
    this.buildAmbientGraph();

    // 8. Start Lookahead Scheduler for musical chimes
    this.startLookaheadScheduler();

    this.isInitialized = true;
  }

  resume() {
    if (!this.ctx) {
      this.init();
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.schedulerTimer) {
      this.startLookaheadScheduler();
    }
  }

  pause() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /**
   * Pre-generates impulse response once
   */
  buildImpulseResponse(duration, decay) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = this.ctx.createBuffer(2, len, rate);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);

    for (let i = 0; i < len; i++) {
      const n = i / len;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return buf;
  }

  /**
   * Pre-generates a white noise buffer once
   */
  buildNoiseBuffer(duration) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /**
   * Builds realm submixes ONCE behind guard flag
   */
  buildRealmGraph() {
    if (this.hasRealmGraph || !this.ctx) return;
    this.hasRealmGraph = true;

    this.lowPassRealWorld = this.ctx.createBiquadFilter();
    this.lowPassRealWorld.type = 'lowpass';
    this.lowPassRealWorld.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.realWorldGain = this.ctx.createGain();
    this.realWorldGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.dreamWorldGain = this.ctx.createGain();
    this.dreamWorldGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.lowPassRealWorld.connect(this.realWorldGain);
    this.realWorldGain.connect(this.masterGain);
    this.dreamWorldGain.connect(this.masterGain);
  }

  /**
   * Builds gate hum graph ONCE behind guard flag
   */
  setupGateHum(pos) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    if (!this.hasGateHumGraph) {
      this.hasGateHumGraph = true;

      this.gatePanner = this.ctx.createPanner();
      this.gatePanner.panningModel = 'HRTF';
      this.gatePanner.distanceModel = 'inverse';
      this.gatePanner.refDistance = 1.0;
      this.gatePanner.maxDistance = 20.0;
      this.gatePanner.rolloffFactor = 1.0;

      this.gateHumGain = this.ctx.createGain();
      this.gateHumGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      this.gateHumFilter = this.ctx.createBiquadFilter();
      this.gateHumFilter.type = 'bandpass';
      this.gateHumFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.gateHumFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      // Deep root drone
      this.gateHumOsc = this.ctx.createOscillator();
      this.gateHumOsc.type = 'triangle';
      this.gateHumOsc.frequency.setValueAtTime(65.4, this.ctx.currentTime); // C2

      // Shimmer octave
      this.gateShimmerOsc = this.ctx.createOscillator();
      this.gateShimmerOsc.type = 'sine';
      this.gateShimmerOsc.frequency.setValueAtTime(130.8, this.ctx.currentTime); // C3

      const shimmerGain = this.ctx.createGain();
      shimmerGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.gateHumOsc.connect(this.gateHumFilter);
      this.gateShimmerOsc.connect(shimmerGain);
      shimmerGain.connect(this.gateHumFilter);

      this.gateHumFilter.connect(this.gateHumGain);
      this.gateHumGain.connect(this.gatePanner);
      this.gatePanner.connect(this.realWorldGain);
      if (this.reverbNode) this.gatePanner.connect(this.reverbNode);

      this.gateHumOsc.start();
      this.gateShimmerOsc.start();
    }

    if (pos && this.gatePanner) {
      const now = this.ctx.currentTime;
      if (this.gatePanner.positionX) {
        this.gatePanner.positionX.setTargetAtTime(pos.x, now, 0.08);
        this.gatePanner.positionY.setTargetAtTime(pos.y, now, 0.08);
        this.gatePanner.positionZ.setTargetAtTime(pos.z, now, 0.08);
      }
    }

    // Smoothly fade in gate hum
    if (this.gateHumGain) {
      this.gateHumGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.2);
    }
  }

  /**
   * Builds ambient graph ONCE behind guard flag
   */
  buildAmbientGraph() {
    if (this.hasAmbientGraph || !this.ctx) return;
    this.hasAmbientGraph = true;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.ambientGain.connect(this.dreamWorldGain);
    if (this.reverbNode) this.ambientGain.connect(this.reverbNode);
  }

  /**
   * Lookahead Scheduler (~25ms interval, scheduling ~100ms ahead)
   * Caps simultaneous voices at 12 to eliminate audio thread contention
   */
  startLookaheadScheduler() {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    if (!this.ctx) return;

    this.nextNoteTime = this.ctx.currentTime + 0.1;

    this.schedulerTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;

      const scheduleAhead = 0.100; // 100 ms lookahead
      const currentTime = this.ctx.currentTime;

      // Clean up finished voices
      this.activeVoices = this.activeVoices.filter((v) => v.endTime > currentTime);

      while (this.nextNoteTime < currentTime + scheduleAhead) {
        this.scheduleAmbientNote(this.nextNoteTime);
        // Interval between gentle notes (2.2s to 3.0s)
        this.nextNoteTime += 2.2 + Math.random() * 0.8;
      }
    }, 25);
  }

  scheduleAmbientNote(time) {
    if (!this.ctx || !this.ambientGain) return;

    // Prune oldest voice if voice cap reached
    if (this.activeVoices.length >= this.maxOneShotVoices) {
      const oldest = this.activeVoices.shift();
      try {
        oldest.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.02);
        oldest.osc.stop(this.ctx.currentTime + 0.05);
      } catch (e) {}
    }

    const realmScales = {
      skyGarden: [174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00], // F Major
      midnightOcean: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66], // C Major
      starLibrary: [146.83, 164.81, 185.00, 220.00, 246.94, 293.66, 329.63], // D Dorian
    };

    const scale = realmScales[this.currentRealm] || realmScales.skyGarden;
    const freq = scale[Math.floor(Math.random() * scale.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = this.currentRealm === 'starLibrary' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.5, time);

    const dur = 3.8;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.setTargetAtTime(0.12, time, 0.2);
    gain.gain.setTargetAtTime(0.0001, time + 0.9, 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(time);
    osc.stop(time + dur);

    this.activeVoices.push({ osc, gain, endTime: time + dur });
  }

  setRealm(realmName) {
    this.currentRealm = realmName;
  }

  /**
   * Sound Effect: Sky-Whale Low Call (Realm 1)
   */
  playSkyWhaleCall(position = null) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(80, now + 3.0);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, now);
    filter.Q.setValueAtTime(2.0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setTargetAtTime(0.18, now, 0.25);
    gain.gain.setTargetAtTime(0.0001, now + 1.2, 0.6);

    osc.connect(filter);
    filter.connect(gain);

    if (position && this.ctx.createPanner) {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.positionX.setValueAtTime(position.x, now);
      panner.positionY.setValueAtTime(position.y, now);
      panner.positionZ.setValueAtTime(position.z, now);
      gain.connect(panner);
      panner.connect(this.dreamWorldGain || this.masterGain);
      if (this.reverbNode) panner.connect(this.reverbNode);
    } else {
      gain.connect(this.dreamWorldGain || this.masterGain);
      if (this.reverbNode) gain.connect(this.reverbNode);
    }

    osc.start(now);
    osc.stop(now + 3.2);
    this.activeVoices.push({ osc, gain, endTime: now + 3.2 });
  }

  /**
   * Sound Effect: Gate Summon Sequence
   */
  playGateSummon(pos) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Floor crack from cached noise buffer
    if (this.cachedNoiseBuffer) {
      const crackNode = this.ctx.createBufferSource();
      crackNode.buffer = this.cachedNoiseBuffer;
      const crackGain = this.ctx.createGain();
      crackGain.gain.setValueAtTime(0.3, now);
      crackGain.gain.setTargetAtTime(0.0001, now + 0.04, 0.03);
      crackNode.connect(crackGain);
      crackGain.connect(this.masterGain);
      crackNode.start(now);
    }

    // 2. Rising harmonic swell
    const swellOsc = this.ctx.createOscillator();
    const swellGain = this.ctx.createGain();
    const swellFilter = this.ctx.createBiquadFilter();

    swellOsc.type = 'sawtooth';
    swellOsc.frequency.setValueAtTime(60, now);
    swellOsc.frequency.exponentialRampToValueAtTime(300, now + 1.1);

    swellFilter.type = 'lowpass';
    swellFilter.frequency.setValueAtTime(200, now);
    swellFilter.frequency.exponentialRampToValueAtTime(1400, now + 1.1);

    swellGain.gain.setValueAtTime(0.001, now);
    swellGain.gain.setTargetAtTime(0.28, now, 0.25);
    swellGain.gain.setTargetAtTime(0.0001, now + 0.9, 0.3);

    swellOsc.connect(swellFilter);
    swellFilter.connect(swellGain);
    swellGain.connect(this.masterGain);
    if (this.reverbNode) swellGain.connect(this.reverbNode);

    swellOsc.start(now);
    swellOsc.stop(now + 1.6);
  }

  /**
   * Sound Effect: Dream Fragment Collection (Ascending chimes 1 to 7)
   */
  playFragmentChime(index = 1, pos = null) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const pitches = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25];
    const baseFreq = pitches[Math.min(pitches.length - 1, Math.max(0, index - 1))];

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.setTargetAtTime(0.25, now, 0.02);
    gain.gain.setTargetAtTime(0.0001, now + 0.3, 0.5);

    osc1.connect(gain);
    osc2.connect(gain);

    if (pos && this.ctx.createPanner) {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.positionX.setValueAtTime(pos.x, now);
      panner.positionY.setValueAtTime(pos.y, now);
      panner.positionZ.setValueAtTime(pos.z, now);
      gain.connect(panner);
      panner.connect(this.masterGain);
      if (this.reverbNode) panner.connect(this.reverbNode);
    } else {
      gain.connect(this.masterGain);
      if (this.reverbNode) gain.connect(this.reverbNode);
    }

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.0);
    osc2.stop(now + 2.0);
  }

  /**
   * Sound Effect: Wake-Up Pulse
   */
  playWakeUpSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const heartOsc = this.ctx.createOscillator();
    const heartGain = this.ctx.createGain();
    heartOsc.type = 'sine';
    heartOsc.frequency.setValueAtTime(75, now);
    heartOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    heartGain.gain.setValueAtTime(0.4, now);
    heartGain.gain.setTargetAtTime(0.0001, now + 0.15, 0.1);

    heartOsc.connect(heartGain);
    heartGain.connect(this.masterGain);
    heartOsc.start(now);
    heartOsc.stop(now + 0.4);

    setTimeout(() => {
      if (!this.ctx) return;
      const bellTime = this.ctx.currentTime;
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(587.33, bellTime); // D5
      bellGain.gain.setValueAtTime(0.25, bellTime);
      bellGain.gain.setTargetAtTime(0.0001, bellTime + 0.4, 0.8);
      bellOsc.connect(bellGain);
      bellGain.connect(this.masterGain);
      if (this.reverbNode) bellGain.connect(this.reverbNode);
      bellOsc.start(bellTime);
      bellOsc.stop(bellTime + 2.8);
    }, 280);
  }

  /**
   * Crossing transition cross-fade
   */
  playCrossingTransition(entering) {
    if (!this.ctx || !this.dreamWorldGain || !this.realWorldGain) return;
    const now = this.ctx.currentTime;

    if (entering) {
      this.dreamWorldGain.gain.setTargetAtTime(1.0, now, 0.2);
      this.realWorldGain.gain.setTargetAtTime(0.3, now, 0.2);
    } else {
      this.dreamWorldGain.gain.setTargetAtTime(0.2, now, 0.2);
      this.realWorldGain.gain.setTargetAtTime(1.0, now, 0.2);
    }
  }

  /**
   * Updates 3D audio listener orientation from camera (rate-limited to ~15 Hz)
   */
  updateListener(camera) {
    if (!this.ctx || !camera) return;
    const now = performance.now();
    // Throttled to ~15 Hz (66 ms)
    if (now - this.lastListenerTime < 66) return;
    this.lastListenerTime = now;

    const t = this.ctx.currentTime;
    const tc = 0.08;
    const p = camera.position;
    const l = this.ctx.listener;

    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, tc);
      l.positionY.setTargetAtTime(p.y, t, tc);
      l.positionZ.setTargetAtTime(p.z, t, tc);
    } else if (l.setPosition) {
      l.setPosition(p.x, p.y, p.z);
    }

    const forward = camera.getWorldDirection(this.listenerForward);
    const up = camera.up;
    if (l.forwardX) {
      l.forwardX.setTargetAtTime(forward.x, t, tc);
      l.forwardY.setTargetAtTime(forward.y, t, tc);
      l.forwardZ.setTargetAtTime(forward.z, t, tc);
      l.upX.setTargetAtTime(up.x, t, tc);
      l.upY.setTargetAtTime(up.y, t, tc);
      l.upZ.setTargetAtTime(up.z, t, tc);
    } else if (l.setOrientation) {
      l.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /**
   * Updates gate proximity hum (rate-limited to ~15 Hz)
   */
  updateProximity(distance) {
    if (!this.gateHumGain || !this.ctx) return;
    const now = performance.now();
    // Throttled to ~15 Hz
    if (now - this.lastProximityTime < 66) return;
    this.lastProximityTime = now;

    const factor = Math.max(0, Math.min(1.0, 1.0 - distance / 3.8));
    const targetGain = 0.05 + factor * 0.35;
    const t = this.ctx.currentTime;

    this.gateHumGain.gain.setTargetAtTime(targetGain, t, 0.1);
    if (this.gateHumFilter) {
      this.gateHumFilter.frequency.setTargetAtTime(90 + factor * 220, t, 0.1);
    }
  }

  /**
   * Computes FFT energy for visual reactivity
   */
  updateAnalysis() {
    if (!this.analyser || !this.analyserData) return this.audioData;
    this.analyser.getByteFrequencyData(this.analyserData);

    let bSum = 0, mSum = 0, tSum = 0;
    const binCount = this.analyserData.length;

    for (let i = 0; i < 8; i++) bSum += this.analyserData[i];
    for (let i = 8; i < 40; i++) mSum += this.analyserData[i];
    for (let i = 40; i < binCount; i++) tSum += this.analyserData[i];

    this.audioData.bass = bSum / (8 * 255);
    this.audioData.mid = mSum / (32 * 255);
    this.audioData.treble = tSum / ((binCount - 40) * 255);
    this.audioData.energy = (this.audioData.bass + this.audioData.mid + this.audioData.treble) / 3;

    return this.audioData;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, t, 0.05);
    }
    return !this.isMuted;
  }

  playTapEffect(pos) {
    this.playFragmentChime(Math.floor(Math.random() * 5) + 1, pos);
  }

  playUiClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(1050, now + 0.035);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.setTargetAtTime(0.0001, now + 0.02, 0.02);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  teardown() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    for (const v of this.activeVoices) {
      try {
        v.osc.stop();
        v.osc.disconnect();
      } catch (e) {}
    }
    this.activeVoices = [];

    if (this.gateHumOsc) {
      try {
        this.gateHumOsc.stop();
        this.gateHumOsc.disconnect();
      } catch (e) {}
    }
    if (this.gateShimmerOsc) {
      try {
        this.gateShimmerOsc.stop();
        this.gateShimmerOsc.disconnect();
      } catch (e) {}
    }
    this.hasAmbientGraph = false;
    this.hasGateHumGraph = false;
    this.hasRealmGraph = false;
  }
}

export const audioEngine = new AudioEngine();
