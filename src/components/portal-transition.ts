/**
 * portal-transition.ts
 *
 * Manages the portal open/close animation timeline.
 * Drives the `progress` value (0–1) used by the rim shader and interior.
 *
 * State machine:
 *   CLOSED ──[open()]──► OPENING ──[done]──► OPEN
 *   OPEN   ──[close()]─► CLOSING ──[done]──► CLOSED
 *
 * The shape of the progress curve varies per activation type:
 *   - 'iris'      : smooth easeInOut
 *   - 'iris-fast' : ease with quick start
 *   - 'shatter'   : stepped (waits for shards to clear, then snaps)
 */

export type TransitionState = 'closed' | 'opening' | 'open' | 'closing';
export type ActivationType  = 'iris' | 'iris-fast' | 'shatter';

export interface TransitionConfig {
  type:       ActivationType;
  durationMs: number;
  onProgress?: (p: number) => void;  // called each frame with 0..1
  onOpen?:     () => void;            // called when fully open
  onClose?:    () => void;            // called when fully closed
}

export class PortalTransition {
  private state:     TransitionState = 'closed';
  private progress:  number = 0;
  private elapsed:   number = 0;
  private direction: 1 | -1 = 1;
  private config:    TransitionConfig;

  constructor(cfg: TransitionConfig) {
    this.config = cfg;
  }

  get currentProgress(): number { return this.progress; }
  get currentState():    TransitionState { return this.state; }
  get isActive():        boolean { return this.state === 'opening' || this.state === 'closing'; }

  open(): void {
    if (this.state === 'open' || this.state === 'opening') return;
    this.state     = 'opening';
    this.direction = 1;
    // Preserve current progress so re-opening mid-close is smooth
  }

  close(): void {
    if (this.state === 'closed' || this.state === 'closing') return;
    this.state     = 'closing';
    this.direction = -1;
  }

  /**
   * Advance the transition by `deltaMs` milliseconds.
   * Called from portal-core's tick().
   * @returns current progress value (0–1)
   */
  tick(deltaMs: number): number {
    if (!this.isActive) return this.progress;

    // Advance elapsed proportionally to duration
    this.elapsed += deltaMs * this.direction;
    const t = Math.max(0, Math.min(1, this.elapsed / this.config.durationMs));

    // Apply easing curve depending on activation type
    this.progress = this.applyEasing(t, this.config.type);

    // Fire progress callback
    this.config.onProgress?.(this.progress);

    // Check completion
    if (this.direction === 1 && t >= 1) {
      this.progress = 1;
      this.state    = 'open';
      this.elapsed  = this.config.durationMs;
      this.config.onOpen?.();
    } else if (this.direction === -1 && t <= 0) {
      this.progress = 0;
      this.state    = 'closed';
      this.elapsed  = 0;
      this.config.onClose?.();
    }

    return this.progress;
  }

  private applyEasing(t: number, type: ActivationType): number {
    switch (type) {
      case 'iris':
        // Smooth cubic easeInOut
        return t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

      case 'iris-fast':
        // Ease-out cubic: fast start, slow finish
        return 1 - Math.pow(1 - t, 3);

      case 'shatter': {
        // Stepped: brief pause while cracks propagate, then fast clear
        // Phase 0: cracks spread (0–40% of time, progress 0–0.5)
        // Phase 1: shards dissolve (40–100% of time, progress 0.5–1)
        if (t < 0.4) {
          const phase = t / 0.4;
          return easeInOut(phase) * 0.5;
        } else {
          const phase = (t - 0.4) / 0.6;
          return 0.5 + easeOut(phase) * 0.5;
        }
      }
    }
  }
}

// ─── Easing helpers ───────────────────────────────────────────────────────────

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2);
}
