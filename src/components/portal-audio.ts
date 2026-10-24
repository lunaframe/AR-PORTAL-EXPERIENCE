/**
 * portal-audio.ts — Spatial audio for portal themes
 *
 * Uses the Web Audio API directly (PannerNode for 3D spatialization)
 * rather than A-Frame's sound component, giving us precise control over
 * distance model, rolloff, and fade timing.
 *
 * Each portal gets one PortalAudioController instance.
 * It manages:
 *   - An ambient loop tied to the portal's world position
 *   - A one-shot stinger played on activation
 *
 * Audio files are expected in /public/assets/audio/.
 * Missing files are silently skipped (graceful degradation).
 */

const BASE_AUDIO_PATH = '/assets/audio/';

// Shared AudioContext (one per page, resumed on first user gesture)
let _ctx: AudioContext | null = null;
let _gestureListenersAttached = false;

function initGestureListeners(): void {
  if (_gestureListenersAttached || typeof window === 'undefined') return;
  _gestureListenersAttached = true;

  const onUserGesture = () => {
    if (_ctx && _ctx.state === 'suspended') {
      _ctx.resume().catch(() => {});
    }
  };

  ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, onUserGesture, { passive: true });
  });
}

export function getAudioContext(): AudioContext | null {
  initGestureListeners();
  if (!_ctx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      _ctx = new AudioCtx();
    }
  }

  if (_ctx && _ctx.state === 'suspended') {
    _ctx.resume().catch(() => {/* ignore */});
  }
  return _ctx;
}

// Buffer cache to avoid re-fetching the same audio file
const _bufferCache = new Map<string, AudioBuffer>();

async function loadBuffer(filename?: string): Promise<AudioBuffer | null> {
  if (!filename) return null;
  if (_bufferCache.has(filename)) return _bufferCache.get(filename)!;

  try {
    const ctx = getAudioContext();
    if (!ctx) return null;

    const resp = await fetch(BASE_AUDIO_PATH + filename).catch(() => null);
    if (!resp || !resp.ok) return null;

    const arrayBuf = await resp.arrayBuffer().catch(() => null);
    if (!arrayBuf) return null;

    const audioBuf = await ctx.decodeAudioData(arrayBuf).catch(() => null);
    if (audioBuf) {
      _bufferCache.set(filename, audioBuf);
    }
    return audioBuf;
  } catch {
    // Missing file or decode error degrades silently (no throw)
    return null;
  }
}

// ─── PortalAudioController ────────────────────────────────────────────────────

export interface AudioConfig {
  ambient?: string;  // filename in /public/assets/audio/
  stinger?: string;
  enabled:  boolean;
}

export class PortalAudioController {
  private config:      AudioConfig;
  private panner:      PannerNode | null = null;
  private ambientNode: AudioBufferSourceNode | null = null;
  private gainNode:    GainNode | null = null;
  private isPlaying:   boolean = false;
  private worldPos:    { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  constructor(cfg: AudioConfig) {
    this.config = cfg;
    initGestureListeners();
  }

  /**
   * Start loading audio assets (non-blocking).
   * Call this when the portal is created.
   */
  async preload(): Promise<void> {
    if (!this.config.enabled) return;
    try {
      if (this.config.ambient) await loadBuffer(this.config.ambient);
      if (this.config.stinger) await loadBuffer(this.config.stinger);
    } catch {
      // Degrade silently
    }
  }

  /**
   * Begin playing the ambient loop, spatialized at the portal's world position.
   * Fades in smoothly over `fadeMs` milliseconds.
   */
  async playAmbient(fadeMs = 800): Promise<void> {
    if (!this.config.enabled || !this.config.ambient || this.isPlaying) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const buf = await loadBuffer(this.config.ambient);
      if (!buf) return;

      this._setupPanner(ctx);
      if (!this.panner || !this.gainNode) return;

      this.gainNode.gain.setValueAtTime(0, ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + fadeMs / 1000);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop   = true;
      src.connect(this.panner);
      src.start();
      this.ambientNode = src;
      this.isPlaying   = true;
    } catch {
      // Degrade silently
    }
  }

  /**
   * Play the activation stinger (one-shot, non-spatialized).
   */
  async playStinger(): Promise<void> {
    if (!this.config.enabled || !this.config.stinger) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const buf = await loadBuffer(this.config.stinger);
      if (!buf) return;

      const gain = ctx.createGain();
      gain.gain.value = 0.8;
      gain.connect(ctx.destination);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      src.start();
    } catch {
      // Degrade silently
    }
  }

  /**
   * Fade out and stop the ambient loop.
   */
  stopAmbient(fadeMs = 600): void {
    if (!this.ambientNode || !this.gainNode) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
      const node = this.ambientNode;
      setTimeout(() => {
        try {
          node.stop();
          node.disconnect();
        } catch { /* ignore */ }
      }, fadeMs + 50);
    } catch {
      // ignore
    } finally {
      this.ambientNode = null;
      this.isPlaying   = false;
    }
  }

  /**
   * Update the spatial position of the portal audio source.
   * Call from portal-core's tick() with the portal's world position.
   */
  updatePosition(x: number, y: number, z: number): void {
    this.worldPos = { x, y, z };
    if (!this.panner) return;
    if (this.panner.positionX) {
      this.panner.positionX.value = x;
      this.panner.positionY.value = y;
      this.panner.positionZ.value = z;
    } else {
      (this.panner as any).setPosition?.(x, y, z);
    }
  }

  /**
   * Update listener position and orientation (call with camera world transform each tick).
   */
  static updateListenerPosition(
    x: number, y: number, z: number,
    fwdX: number, fwdY: number, fwdZ: number,
  ): void {
    if (!_ctx) return;
    const l = _ctx.listener;
    if (!l) return;

    if (l.positionX !== undefined) {
      l.positionX.value = x;
      l.positionY.value = y;
      l.positionZ.value = z;
      l.forwardX.value  = fwdX;
      l.forwardY.value  = fwdY;
      l.forwardZ.value  = fwdZ;
      if (l.upX !== undefined) {
        l.upX.value = 0;
        l.upY.value = 1;
        l.upZ.value = 0;
      }
    } else {
      // Older Web Audio API fallback
      (l as any).setPosition?.(x, y, z);
      (l as any).setOrientation?.(fwdX, fwdY, fwdZ, 0, 1, 0);
    }
  }

  destroy(): void {
    this.stopAmbient(0);
    try {
      this.panner?.disconnect();
      this.gainNode?.disconnect();
    } catch {
      // ignore
    }
    this.panner    = null;
    this.gainNode  = null;
    this.isPlaying = false;
  }

  private _setupPanner(ctx: AudioContext): void {
    if (this.panner) return;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(ctx.destination);

    this.panner = ctx.createPanner();
    this.panner.panningModel    = 'HRTF';       // head-related transfer function
    this.panner.distanceModel   = 'inverse';
    this.panner.refDistance     = 0.5;          // full volume at 0.5m
    this.panner.maxDistance     = 8;            // inaudible at 8m+
    this.panner.rolloffFactor   = 1.5;
    if (this.panner.positionX) {
      this.panner.positionX.value = this.worldPos.x;
      this.panner.positionY.value = this.worldPos.y;
      this.panner.positionZ.value = this.worldPos.z;
    } else {
      (this.panner as any).setPosition?.(this.worldPos.x, this.worldPos.y, this.worldPos.z);
    }
    this.panner.connect(this.gainNode);
  }
}
