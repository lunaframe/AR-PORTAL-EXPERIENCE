/**
 * quality.js — Dynamic Quality Manager & Performance Monitor
 * Measures live rendering FPS, manages Low / Medium / High tiers,
 * and automatically downgrades when FPS drops below 45.
 */

export class QualityManager {
  constructor(renderer) {
    this.renderer = renderer;
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.currentQuality = isMobile ? 'low' : 'high';
    this.autoAdjust = true;
    this.listeners = new Set();

    // FPS tracking
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.currentFps = 60;
    this.fpsHistory = [];
    this.lowFpsDuration = 0;

    // Quality profiles
    this.profiles = {
      low: {
        name: 'Low',
        particleScale: 0.35,
        maxDpr: 1.0,
        enableBloom: false,
        enableVolumetrics: false,
        shadows: false,
        shaderLOD: 1,
      },
      medium: {
        name: 'Medium',
        particleScale: 0.7,
        maxDpr: 1.5,
        enableBloom: true,
        enableVolumetrics: true,
        shadows: false,
        shaderLOD: 2,
      },
      high: {
        name: 'High',
        particleScale: 1.0,
        maxDpr: Math.min(window.devicePixelRatio || 1, 2.0),
        enableBloom: true,
        enableVolumetrics: true,
        shadows: true,
        shaderLOD: 3,
      },
    };

    this.applyProfile(this.currentQuality);
  }

  onQualityChange(fn) {
    this.listeners.add(fn);
    fn(this.currentQuality, this.getProfile());
    return () => this.listeners.delete(fn);
  }

  getProfile() {
    return this.profiles[this.currentQuality];
  }

  getQuality() {
    return this.currentQuality;
  }

  setQuality(level, manual = true) {
    if (!this.profiles[level]) return;
    if (manual) {
      this.autoAdjust = false; // User explicitly selected
    }
    this.currentQuality = level;
    this.applyProfile(level);
    this.notify();
  }

  enableAutoAdjust(enabled = true) {
    this.autoAdjust = enabled;
  }

  applyProfile(level) {
    const profile = this.profiles[level];
    if (this.renderer) {
      const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr);
      this.renderer.setPixelRatio(dpr);
    }
  }

  notify() {
    const profile = this.getProfile();
    for (const fn of this.listeners) {
      try {
        fn(this.currentQuality, profile);
      } catch (err) {
        console.error('Error in quality change callback:', err);
      }
    }
  }

  update(dt) {
    this.frameCount++;
    const now = performance.now();
    const elapsed = (now - this.lastTime) / 1000;

    if (elapsed >= 0.5) {
      this.currentFps = Math.round((this.frameCount / elapsed));
      this.frameCount = 0;
      this.lastTime = now;

      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();

      // Check auto-downgrade if below 45 FPS
      if (this.autoAdjust) {
        if (this.currentFps < 45) {
          this.lowFpsDuration += elapsed;
          if (this.lowFpsDuration > 3.0) {
            // Downgrade quality tier
            if (this.currentQuality === 'high') {
              console.warn('[QualityManager] FPS < 45 for 3s. Downgrading to Medium.');
              this.currentQuality = 'medium';
              this.applyProfile('medium');
              this.notify();
              this.lowFpsDuration = 0;
            } else if (this.currentQuality === 'medium') {
              console.warn('[QualityManager] FPS < 45 for 3s. Downgrading to Low.');
              this.currentQuality = 'low';
              this.applyProfile('low');
              this.notify();
              this.lowFpsDuration = 0;
            }
          }
        } else {
          this.lowFpsDuration = Math.max(0, this.lowFpsDuration - elapsed);
        }
      }
    }
  }
}
