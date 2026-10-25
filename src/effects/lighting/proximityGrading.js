/**
 * proximityGrading.js — Effect 20: Proximity Color Grading
 * Smoothly shifts screen atmosphere from neutral real-world into deep twilight as camera approaches.
 */

export class ProximityGradingEffect {
  constructor() {
    this.overlay = document.getElementById('vignette-overlay');
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {}

  setIntensity(val) {
    this.intensity = val;
  }

  setQuality(level) {}

  setTheme(theme) {}

  update(dt, time, state) {
    if (!this.overlay) return;

    // state.proximity is [0, 1] where 1 is touching portal
    const prox = state.proximity || 0;
    const bass = state.audio?.bass || 0;

    // Adjust vignette radial gradient
    const outerAlpha = (0.45 + prox * 0.45 + bass * 0.15) * this.intensity;
    const innerRadius = Math.max(20, 50 - prox * 25);

    this.overlay.style.background = `radial-gradient(circle at center, transparent ${innerRadius}%, rgba(27, 20, 100, ${outerAlpha}) 95%)`;
  }

  dispose() {
    if (this.overlay) {
      this.overlay.style.background = '';
    }
  }
}
