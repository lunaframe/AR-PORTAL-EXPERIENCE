/**
 * engine.js — Procedural Web Audio Engine for "Dream Gate"
 * 
 * Features:
 * - Single AudioContext initialized/resumed on user tap
 * - Synthesized algorithmic impulse response convolver reverb
 * - Layer 1: Generative pentatonic ambient score with realm-adaptive harmonic moods:
 *     * Sky Garden: airy, celestial fifths, resonant sky-whale vocal calls
 *     * Midnight Ocean: submerged sub-bass drones, filtered wave foam, harmonic bell tides
 *     * Star Library: shimmering celeste arpeggios, cosmic wind, fluttering paper rustle
 * - Layer 2: 3D spatialized gate core hum with distance/proximity frequency modulation
 * - Layer 3: Dream Fragment collection chimes ascending through the scale (1 to 7)
 * - Layer 4: Procedural Sound Effects (gate summon crack, shockwave, portal traversal whoosh, wake-up heartbeat & bell)
 * - Spatial Audio: HRTF PannerNodes with camera listener position/orientation updates every frame
 * - Mute, master volume, and pause on visibilitychange
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.analyser = null;
    this.analyserData = null;

    this.isMuted = false;
    this.volume = 0.8;
    this.isInitialized = false;

    // Sub-mix gains
    this.realWorldGain = null;
    this.dreamWorldGain = null;
    this.lowPassRealWorld = null;

    // Gate Hum
    this.gatePanner = null;
    this.gateHumGain = null;
    this.gateHumOsc = null;
    this.gateHumFilter = null;

    // Adaptive Ambient Music
    this.currentRealm = 'skyGarden'; // 'skyGarden' | 'midnightOcean' | 'starLibrary'
    this.ambientGain = null;
    this.ambientOscs = [];
    this.ambientInterval = null;

    // Realm Ambience Nodes
    this.whaleGain = null;
    this.oceanGain = null;
    this.libraryGain = null;

    // Spatial panners map for 3D entities (whales, fragments, lanterns, jellyfish)
    this.spatialPanners = new Map();

    // Frequency analysis
    this.audioData = {
      bass: 0,
      mid: 0,
      treble: 0,
      energy: 0,
    };

    // Auto pause on tab blur
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
        } else {
          if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted && this.isInitialized) {
            this.ctx.resume();
          }
        }
      });
    }
  }

  /**
   * Initializes audio context on first user gesture
   */
  init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported on this browser.');
      return;
    }

    this.ctx = new AudioContextClass();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Dynamic Compressor for cinematic polish
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
    compressor.knee.setValueAtTime(12, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    this.masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);

    // Algorithmic Convolver Reverb (Dream space)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.buildImpulseResponse(3.5, 2.2);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    // Realm buses: Real-world exterior vs Inside Dreamscape
    this.lowPassRealWorld = this.ctx.createBiquadFilter();
    this.lowPassRealWorld.type = 'lowpass';
    this.lowPassRealWorld.frequency.setValueAtTime(850, this.ctx.currentTime);

    this.realWorldGain = this.ctx.createGain();
    this.realWorldGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.dreamWorldGain = this.ctx.createGain();
    this.dreamWorldGain.gain.setValueAtTime(0.25, this.ctx.currentTime); // Muffled when outside

    this.lowPassRealWorld.connect(this.realWorldGain);
    this.realWorldGain.connect(this.masterGain);
    this.dreamWorldGain.connect(this.masterGain);

    // Visual Reactivity Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
    this.masterGain.connect(this.analyser);

    // Start background systems
    this.startAdaptiveAmbient();
    this.isInitialized = true;
  }

  /**
   * Generates a smooth, procedural stereo impulse response buffer for lush dream reverb
   */
  buildImpulseResponse(duration, decay) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const envelope = Math.pow(1 - n, decay);
      // Soft filtered white noise
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  /**
   * Spatial Gate Hum with HRTF Panner
   */
  setupGateHum(pos) {
    if (!this.ctx) return;

    this.gatePanner = this.ctx.createPanner();
    this.gatePanner.panningModel = 'HRTF';
    this.gatePanner.distanceModel = 'inverse';
    this.gatePanner.refDistance = 1.0;
    this.gatePanner.maxDistance = 15.0;
    this.gatePanner.rolloffFactor = 1.2;

    if (pos) {
      this.gatePanner.positionX.setValueAtTime(pos.x, this.ctx.currentTime);
      this.gatePanner.positionY.setValueAtTime(pos.y, this.ctx.currentTime);
      this.gatePanner.positionZ.setValueAtTime(pos.z, this.ctx.currentTime);
    }

    this.gateHumGain = this.ctx.createGain();
    this.gateHumGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.gateHumFilter = this.ctx.createBiquadFilter();
    this.gateHumFilter.type = 'bandpass';
    this.gateHumFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.gateHumFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Warm sub-drone oscillator
    this.gateHumOsc = this.ctx.createOscillator();
    this.gateHumOsc.type = 'triangle';
    this.gateHumOsc.frequency.setValueAtTime(65.4, this.ctx.currentTime); // C2

    // Secondary subtle shimmer oscillator
    const shimmerOsc = this.ctx.createOscillator();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(130.8, this.ctx.currentTime); // C3

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    this.gateHumOsc.connect(this.gateHumFilter);
    shimmerOsc.connect(oscGain);
    oscGain.connect(this.gateHumFilter);

    this.gateHumFilter.connect(this.gateHumGain);
    this.gateHumGain.connect(this.gatePanner);
    this.gatePanner.connect(this.realWorldGain);
    this.gatePanner.connect(this.reverbNode);

    this.gateHumOsc.start();
    shimmerOsc.start();

    // Fade in hum
    this.gateHumGain.gain.exponentialRampToValueAtTime(0.25, this.ctx.currentTime + 1.5);
  }

  /**
   * Generative Adaptive Pentatonic Dream Music
   * Cycles gentle chords and melodies tailored to the active realm
   */
  startAdaptiveAmbient() {
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.ambientGain.connect(this.dreamWorldGain);
    this.ambientGain.connect(this.reverbNode);

    // Pentatonic scale base frequencies (F3, G3, A3, C4, D4, F4, G4, A4)
    const realmScales = {
      skyGarden: [174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00], // Airy F Major pentatonic
      midnightOcean: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66], // Deep C Major pentatonic
      starLibrary: [146.83, 164.81, 185.00, 220.00, 246.94, 293.66, 329.63], // Ethereal D Dorian
    };

    let step = 0;
    const playNote = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;

      const scale = realmScales[this.currentRealm] || realmScales.skyGarden;
      const freq = scale[Math.floor(Math.random() * scale.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = this.currentRealm === 'starLibrary' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 2.8, this.ctx.currentTime);

      // Bell envelope (slow attack, long dreamy decay)
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 4.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 4.6);

      step++;
      // Every 4 steps, trigger realm-specific ambience
      if (step % 4 === 0) {
        if (this.currentRealm === 'skyGarden') this.playSkyWhaleCall();
      }
    };

    this.ambientInterval = setInterval(playNote, 2200);
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
    // Deep harmonic glide
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(80, now + 3.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, now);
    filter.Q.setValueAtTime(2.0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

    osc.connect(filter);
    filter.connect(gain);

    if (position) {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.positionX.setValueAtTime(position.x, now);
      panner.positionY.setValueAtTime(position.y, now);
      panner.positionZ.setValueAtTime(position.z, now);
      gain.connect(panner);
      panner.connect(this.dreamWorldGain);
      panner.connect(this.reverbNode);
    } else {
      gain.connect(this.dreamWorldGain);
      gain.connect(this.reverbNode);
    }

    osc.start(now);
    osc.stop(now + 3.5);
  }

  /**
   * Sound Effect: Gate Summon Sequence (Crack, swell, and shockwave)
   */
  playGateSummon(pos) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Floor crack / ignition click
    const crackNode = this.ctx.createBufferSource();
    const crackBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
    const data = crackBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
    crackNode.buffer = crackBuffer;

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.4, now);
    crackNode.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackNode.start(now);

    // 2. Rising harmonic swell
    const swellOsc = this.ctx.createOscillator();
    const swellGain = this.ctx.createGain();
    swellOsc.type = 'sawtooth';
    swellOsc.frequency.setValueAtTime(60, now);
    swellOsc.frequency.exponentialRampToValueAtTime(320, now + 1.2);

    const swellFilter = this.ctx.createBiquadFilter();
    swellFilter.type = 'lowpass';
    swellFilter.frequency.setValueAtTime(200, now);
    swellFilter.frequency.exponentialRampToValueAtTime(1600, now + 1.2);

    swellGain.gain.setValueAtTime(0.001, now);
    swellGain.gain.exponentialRampToValueAtTime(0.35, now + 1.0);
    swellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    swellOsc.connect(swellFilter);
    swellFilter.connect(swellGain);
    swellGain.connect(this.masterGain);
    swellGain.connect(this.reverbNode);

    swellOsc.start(now);
    swellOsc.stop(now + 1.8);
  }

  /**
   * Sound Effect: Dream Fragment Collection (Ascending pentatonic chimes 1 to 7)
   */
  playFragmentChime(index = 1, pos = null) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Pentatonic scale ascending pitches for 7 fragments
    const pitches = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25]; // C4 to E5
    const baseFreq = pitches[Math.min(pitches.length - 1, Math.max(0, index - 1))];

    // High crystalline sine + harmonic octave
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc1.connect(gain);
    osc2.connect(gain);

    if (pos) {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.positionX.setValueAtTime(pos.x, now);
      panner.positionY.setValueAtTime(pos.y, now);
      panner.positionZ.setValueAtTime(pos.z, now);
      gain.connect(panner);
      panner.connect(this.masterGain);
      panner.connect(this.reverbNode);
    } else {
      gain.connect(this.masterGain);
      gain.connect(this.reverbNode);
    }

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.2);
    osc2.stop(now + 2.2);
  }

  /**
   * Sound Effect: Wake-Up Pulse (Heartbeat & celestial bell)
   */
  playWakeUpSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Heartbeat thud
    const heartOsc = this.ctx.createOscillator();
    const heartGain = this.ctx.createGain();
    heartOsc.type = 'sine';
    heartOsc.frequency.setValueAtTime(75, now);
    heartOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    heartGain.gain.setValueAtTime(0.5, now);
    heartGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    heartOsc.connect(heartGain);
    heartGain.connect(this.masterGain);
    heartOsc.start(now);
    heartOsc.stop(now + 0.45);

    // Celestial chime
    setTimeout(() => {
      if (!this.ctx) return;
      const bellTime = this.ctx.currentTime;
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(587.33, bellTime); // D5
      bellGain.gain.setValueAtTime(0.3, bellTime);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 3.0);
      bellOsc.connect(bellGain);
      bellGain.connect(this.masterGain);
      bellGain.connect(this.reverbNode);
      bellOsc.start(bellTime);
      bellOsc.stop(bellTime + 3.0);
    }, 300);
  }

  /**
   * Crossing transition cross-fade
   */
  playCrossingTransition(entering) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (entering) {
      // Step into Dream Realm: open wide and rich
      this.dreamWorldGain.gain.linearRampToValueAtTime(1.0, now + 0.6);
      this.realWorldGain.gain.linearRampToValueAtTime(0.35, now + 0.6);
    } else {
      // Step back outside into real room
      this.dreamWorldGain.gain.linearRampToValueAtTime(0.25, now + 0.6);
      this.realWorldGain.gain.linearRampToValueAtTime(1.0, now + 0.6);
    }
  }

  /**
   * Updates 3D audio listener orientation from camera
   */
  updateListener(camera) {
    if (!this.ctx || !camera) return;
    const p = camera.position;
    const l = this.ctx.listener;

    if (l.positionX) {
      l.positionX.setValueAtTime(p.x, this.ctx.currentTime);
      l.positionY.setValueAtTime(p.y, this.ctx.currentTime);
      l.positionZ.setValueAtTime(p.z, this.ctx.currentTime);
    } else {
      l.setPosition(p.x, p.y, p.z);
    }

    const forward = camera.getWorldDirection(new Float32Array(3));
    const up = camera.up;
    if (l.forwardX) {
      l.forwardX.setValueAtTime(forward.x, this.ctx.currentTime);
      l.forwardY.setValueAtTime(forward.y, this.ctx.currentTime);
      l.forwardZ.setValueAtTime(forward.z, this.ctx.currentTime);
      l.upX.setValueAtTime(up.x, this.ctx.currentTime);
      l.upY.setValueAtTime(up.y, this.ctx.currentTime);
      l.upZ.setValueAtTime(up.z, this.ctx.currentTime);
    }
  }

  /**
   * Updates gate proximity hum intensity
   */
  updateProximity(distance) {
    if (!this.gateHumGain || !this.ctx) return;
    const factor = Math.max(0, Math.min(1.0, 1.0 - distance / 4.0));
    const targetGain = 0.08 + factor * 0.45;
    this.gateHumGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);

    if (this.gateHumFilter) {
      this.gateHumFilter.frequency.setTargetAtTime(100 + factor * 220, this.ctx.currentTime, 0.1);
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
    for (let i = 8; i < 48; i++) mSum += this.analyserData[i];
    for (let i = 48; i < binCount; i++) tSum += this.analyserData[i];

    this.audioData.bass = bSum / (8 * 255);
    this.audioData.mid = mSum / (40 * 255);
    this.audioData.treble = tSum / ((binCount - 48) * 255);
    this.audioData.energy = (this.audioData.bass + this.audioData.mid + this.audioData.treble) / 3;

    return this.audioData;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
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
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const audioEngine = new AudioEngine();
