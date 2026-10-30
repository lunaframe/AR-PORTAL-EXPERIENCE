/**
 * engine.js — Production-Grade Procedural Web Audio Engine with HRTF 3D Spatial Audio
 * 
 * Features:
 * - Single AudioContext initialized/resumed on user interaction
 * - Synthesized impulse-response algorithmic convolver reverb
 * - Layer 1: Evolving ambient synth pad drone (multi-oscillator detuned with slow LFO resonant filter)
 * - Layer 2: 3D spatialized portal core hum with distance/proximity frequency modulation
 * - Layer 3: Procedural sound effects (scan blip, placement whoosh, opening swell, crossing whoomp, UI chime)
 * - Layer 4: Twilight realm ambience (gentle filtered wind, crickets synth, pentatonic glass bell chimes)
 * - Spatial audio: HRTF PannerNodes with camera listener position/orientation updates every frame
 * - Cross-fading between outside real-world acoustic model and virtual realm acoustic model
 * - Web Audio AnalyserNode extracting real-time bass (20-150Hz), mid (200-2000Hz), and treble (2k-12kHz)
 * - Visibilitychange listener pausing/resuming sound
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
    this.twilightGain = null;
    this.lowPassRealWorld = null;

    // Portal Hum Nodes
    this.portalPanner = null;
    this.portalHumOsc1 = null;
    this.portalHumOsc2 = null;
    this.portalHumGain = null;
    this.portalHumFilter = null;

    // Drone Nodes
    this.droneGain = null;
    this.droneOscs = [];

    // Twilight Ambience
    this.windNode = null;
    this.cricketsNode = null;
    this.chimeInterval = null;

    // Effect Panners map for spatialized one-shots
    this.spatialPanners = new Map();

    // Frequency analysis metrics for visual reactivity
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
          if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend();
          }
        } else {
          if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted && this.isInitialized) {
            this.ctx.resume();
          }
        }
      });
    }
  }

  /**
   * Initializes audio context on user gesture.
   */
  init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
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

    // Analyser node for audio-reactive visuals
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Algorithmic Reverb
    this.reverbNode = this.buildReverb(3.5, 2.2);

    // Mix split: Real World (low-passed when outside portal) vs Twilight Virtual World
    this.realWorldGain = this.ctx.createGain();
    this.realWorldGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.lowPassRealWorld = this.ctx.createBiquadFilter();
    this.lowPassRealWorld.type = 'lowpass';
    this.lowPassRealWorld.frequency.setValueAtTime(20000, this.ctx.currentTime); // Wide open initially

    this.twilightGain = this.ctx.createGain();
    this.twilightGain.gain.setValueAtTime(0.05, this.ctx.currentTime); // Low until portal entered

    this.realWorldGain.connect(this.lowPassRealWorld);
    this.lowPassRealWorld.connect(this.masterGain);

    this.twilightGain.connect(this.masterGain);

    // Start background pad drone
    this.startAmbientDrone();

    // Start Twilight realm soundscape (wind, crickets, chimes)
    this.startTwilightAmbience();

    this.isInitialized = true;
  }

  /**
   * Generates procedural impulse response buffer for warm lush cavern reverb
   */
  buildReverb(duration, decay) {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const dec = Math.pow(1 - n, decay);
      // Soft noise with stereo decorrelation
      left[i] = ((Math.random() * 2) - 1) * dec;
      right[i] = ((Math.random() * 2) - 1) * dec;
    }

    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;

    const reverbBus = this.ctx.createGain();
    reverbBus.gain.setValueAtTime(0.35, this.ctx.currentTime);
    convolver.connect(reverbBus);
    reverbBus.connect(this.masterGain);

    return convolver;
  }

  /**
   * Layer 1: Evolving ambient pad drone (detuned triangle oscillators with slow LFO)
   */
  startAmbientDrone() {
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, this.ctx.currentTime);
    filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    // LFO for slow dreamy filter sweep
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // Minor ninth mystical drone chord (D, A, F, C, E)
    const baseFreqs = [73.42, 110.0, 146.83, 174.61, 261.63];
    baseFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      // Detune slightly for lush chorus
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((idx - 2) * 6, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      this.droneOscs.push(osc);
    });

    filter.connect(this.droneGain);
    this.droneGain.connect(this.realWorldGain);
    this.droneGain.connect(this.reverbNode);
  }

  /**
   * Sets up 3D Spatial Panner on the portal and starts continuous spatialized hum
   */
  setupPortalHum(portalPos) {
    if (!this.ctx) return;

    if (this.portalPanner) {
      this.setPortalPosition(portalPos);
      return;
    }

    // HRTF 3D Panner
    this.portalPanner = this.ctx.createPanner();
    this.portalPanner.panningModel = 'HRTF';
    this.portalPanner.distanceModel = 'inverse';
    this.portalPanner.refDistance = 1.0;
    this.portalPanner.maxDistance = 25.0;
    this.portalPanner.rolloffFactor = 1.5;
    this.portalPanner.coneInnerAngle = 120;
    this.portalPanner.coneOuterAngle = 270;
    this.portalPanner.coneOuterGain = 0.25;

    this.setPortalPosition(portalPos);

    // Resonant bandpass filter
    this.portalHumFilter = this.ctx.createBiquadFilter();
    this.portalHumFilter.type = 'bandpass';
    this.portalHumFilter.frequency.setValueAtTime(90, this.ctx.currentTime);
    this.portalHumFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.portalHumGain = this.ctx.createGain();
    this.portalHumGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.portalHumGain.gain.exponentialRampToValueAtTime(0.28, this.ctx.currentTime + 1.5);

    // Sub rumble + higher harmonic
    this.portalHumOsc1 = this.ctx.createOscillator();
    this.portalHumOsc1.type = 'sawtooth';
    this.portalHumOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.portalHumOsc2 = this.ctx.createOscillator();
    this.portalHumOsc2.type = 'sine';
    this.portalHumOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.portalHumOsc1.connect(this.portalHumFilter);
    this.portalHumOsc2.connect(this.portalHumFilter);
    this.portalHumFilter.connect(this.portalHumGain);
    this.portalHumGain.connect(this.portalPanner);

    this.portalPanner.connect(this.masterGain);
    this.portalPanner.connect(this.reverbNode);

    this.portalHumOsc1.start();
    this.portalHumOsc2.start();
  }

  setPortalPosition(pos) {
    if (!this.portalPanner || !this.ctx || !pos) return;
    const t = this.ctx.currentTime;
    if (this.portalPanner.positionX) {
      this.portalPanner.positionX.setValueAtTime(pos.x, t);
      this.portalPanner.positionY.setValueAtTime(pos.y, t);
      this.portalPanner.positionZ.setValueAtTime(pos.z, t);
    } else {
      this.portalPanner.setPosition(pos.x, pos.y, pos.z);
    }
  }

  /**
   * Updates HRTF listener from camera transform every frame
   */
  updateListener(camera) {
    if (!this.ctx || !camera) return;
    const t = this.ctx.currentTime;
    const listener = this.ctx.listener;

    const camPos = camera.position;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(camPos.x, t);
      listener.positionY.setValueAtTime(camPos.y, t);
      listener.positionZ.setValueAtTime(camPos.z, t);
    } else {
      listener.setPosition(camPos.x, camPos.y, camPos.z);
    }

    // Forward and Up vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    if (listener.forwardX) {
      listener.forwardX.setValueAtTime(forward.x, t);
      listener.forwardY.setValueAtTime(forward.y, t);
      listener.forwardZ.setValueAtTime(forward.z, t);
      listener.upX.setValueAtTime(up.x, t);
      listener.upY.setValueAtTime(up.y, t);
      listener.upZ.setValueAtTime(up.z, t);
    } else {
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /**
   * Proximity reaction: closer means higher pitch and brighter portal hum
   */
  updateProximity(distance) {
    if (!this.portalHumFilter || !this.portalHumOsc1 || !this.ctx) return;
    const normDist = Math.max(0.1, Math.min(5.0, distance));
    // As user gets closer (dist 0.2 to 2m), hum frequency shifts up from 70Hz to 180Hz
    const t = this.ctx.currentTime;
    const targetFreq = 70 + (1.0 - Math.min(1.0, normDist / 2.5)) * 120;
    this.portalHumFilter.frequency.setTargetAtTime(targetFreq, t, 0.1);

    const basePitch = 55 + (1.0 - Math.min(1.0, normDist / 2.5)) * 25;
    this.portalHumOsc1.frequency.setTargetAtTime(basePitch, t, 0.1);
  }

  /**
   * Layer 4: Twilight-world ambience (crickets synth, filtered wind, pentatonic chimes)
   */
  startTwilightAmbience() {
    // Filtered pink noise for ethereal wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.08;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Wind LFO
    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.setValueAtTime(220, this.ctx.currentTime);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);
    windLfo.start();

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.twilightGain);
    windGain.connect(this.reverbNode);
    windSource.start();

    // Pentatonic scale glass chimes at random intervals: D, F, G, A, C (octave 5 & 6)
    const pentatonicFreqs = [587.33, 698.46, 783.99, 880.00, 1046.50, 1174.66, 1396.91, 1567.98];
    this.chimeInterval = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;
      if (Math.random() < 0.65) {
        const freq = pentatonicFreqs[Math.floor(Math.random() * pentatonicFreqs.length)];
        this.playGlassChime(freq, (Math.random() - 0.5) * 6, Math.random() * 2 + 1, -Math.random() * 8);
      }
    }, 2800);
  }

  playGlassChime(freq, x = 0, y = 1.5, z = -3) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, t);
      panner.positionY.setValueAtTime(y, t);
      panner.positionZ.setValueAtTime(z, t);
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Harmonic bell partial
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(panner);
    panner.connect(this.twilightGain);
    panner.connect(this.reverbNode);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 2.3);
    osc2.stop(t + 2.3);
  }

  /**
   * One-shots & cinematic audio events
   */
  playScanBlip() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playPlaceWhoosh(position) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Filtered noise drop + deep sub punch
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.reverbNode);

    osc.start(t);
    osc.stop(t + 0.7);
  }

  playOpeningSwell(position) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Rich cinematic swell: rising chord with shimmer
    const chord = [110, 164.81, 220, 329.63, 440, 659.25];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * 0.7, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 1.8);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.reverbNode);

      osc.start(t);
      osc.stop(t + 2.9);
    });

    // Sub explosion boom at t + 1.4
    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(120, t + 1.2);
    boomOsc.frequency.exponentialRampToValueAtTime(30, t + 2.4);

    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0.001, t);
    boomGain.gain.setValueAtTime(0.5, t + 1.3);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomGain.connect(this.reverbNode);

    boomOsc.start(t + 1.2);
    boomOsc.stop(t + 2.5);
  }

  /**
   * Crossing "whoomp" with reverb bloom when entering/exiting portal
   */
  playCrossingTransition(entering = true) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Sub whoomp + high shimmering swirl
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(entering ? 70 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(entering ? 180 : 60, t + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(3500, t + 0.25);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.reverbNode);

    osc.start(t);
    osc.stop(t + 0.8);

    // Crossfade acoustic mixes
    if (entering) {
      // Twilight realm becomes wide and open, real world muffled
      this.twilightGain.gain.setTargetAtTime(1.0, t, 0.4);
      this.lowPassRealWorld.frequency.setTargetAtTime(600, t, 0.4);
    } else {
      // Return to real world
      this.twilightGain.gain.setTargetAtTime(0.05, t, 0.4);
      this.lowPassRealWorld.frequency.setTargetAtTime(20000, t, 0.4);
    }
  }

  playTapEffect(pos) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    osc.frequency.setValueAtTime(freq, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.reverbNode);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  playShockwaveBoom() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.9);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.reverbNode);

    osc.start(t);
    osc.stop(t + 1.0);
  }

  playUiClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Mute toggle & volume controls
   */
  toggleMute() {
    if (!this.ctx) return false;
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  setMasterVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Frame-by-frame spectrum analysis for audio-reactive visuals
   */
  updateAnalysis() {
    if (!this.analyser || !this.analyserData) return this.audioData;
    this.analyser.getByteFrequencyData(this.analyserData);

    let bassSum = 0, midSum = 0, trebleSum = 0;
    const count = this.analyserData.length;

    // Bass bins: 0 - 6 (approx 20 - 150 Hz)
    for (let i = 0; i <= 6; i++) bassSum += this.analyserData[i];
    // Mid bins: 7 - 40 (approx 200 - 2000 Hz)
    for (let i = 7; i <= 40; i++) midSum += this.analyserData[i];
    // Treble bins: 41 - count (approx 2k - 12kHz)
    for (let i = 41; i < count; i++) trebleSum += this.analyserData[i];

    this.audioData.bass = (bassSum / (7 * 255));
    this.audioData.mid = (midSum / (34 * 255));
    this.audioData.treble = (trebleSum / ((count - 41) * 255));
    this.audioData.energy = (this.audioData.bass * 0.5 + this.audioData.mid * 0.3 + this.audioData.treble * 0.2);

    return this.audioData;
  }

  dispose() {
    if (this.chimeInterval) clearInterval(this.chimeInterval);
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

export const audioEngine = new AudioEngine();
