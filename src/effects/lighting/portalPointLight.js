/**
 * portalPointLight.js — Effect 18: Breathing Portal PointLight
 * Dynamic light source that casts breathing, audio-responsive teal-violet illumination.
 */

import * as THREE from 'three';

export class PortalPointLightEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.light = null;
    this.baseIntensity = 2.4;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    // PointLight(color, intensity, distance, decay)
    this.light = new THREE.PointLight(0x14f1d9, this.baseIntensity, 5.0, 1.8);
    this.light.position.set(0, 1.2, 0.15);
    this.portalGroup.add(this.light);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.light) this.light.intensity = this.baseIntensity * val;
  }

  setQuality(level) {
    if (this.light) {
      this.light.distance = level === 'low' ? 3.0 : (level === 'medium' ? 4.5 : 6.0);
    }
  }

  setTheme(theme) {
    if (!this.light || !theme) return;
    this.light.color.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
  }

  update(dt, time, state) {
    if (!this.light) return;

    const bass = state.audio?.bass || 0;
    // Breathing wave + subtle noise jitter
    const breath = 0.8 + 0.3 * Math.sin(time * 2.2) + Math.sin(time * 9.7) * 0.05;
    const audioPunch = bass * 1.8;

    this.light.intensity = this.baseIntensity * (breath + audioPunch) * this.intensity;
  }

  dispose() {
    if (this.light) {
      this.portalGroup.remove(this.light);
      this.light.dispose?.();
      this.light = null;
    }
  }
}
