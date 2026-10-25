/**
 * lightEstimation.js — Effect 23: WebXR Real-World Light Estimation Integration
 * Adapts scene ambient and directional lighting to match physical room color temperature and luminosity.
 */

import * as THREE from 'three';

export class LightEstimationEffect {
  constructor(scene) {
    this.scene = scene;
    this.ambientLight = null;
    this.dirLight = null;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    // Ambient light for general scene fill
    this.ambientLight = new THREE.AmbientLight(0x282050, 0.85);
    this.scene.add(this.ambientLight);

    // Directional light representing primary physical light source
    this.dirLight = new THREE.DirectionalLight(0xe8f7ff, 0.7);
    this.dirLight.position.set(2, 4, 3);
    this.scene.add(this.dirLight);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.ambientLight) this.ambientLight.intensity = 0.85 * val;
    if (this.dirLight) this.dirLight.intensity = 0.7 * val;
  }

  setQuality(level) {}

  setTheme(theme) {
    if (!theme) return;
    if (this.ambientLight) {
      this.ambientLight.color.setRGB(theme.primary.r * 2.5, theme.primary.g * 2.5, theme.primary.b * 2.5);
    }
  }

  update(dt, time, state) {
    if (state.estimatedLightColor && this.ambientLight) {
      this.ambientLight.color.lerp(state.estimatedLightColor, 0.05);
      if (this.dirLight) {
        this.dirLight.color.lerp(state.estimatedLightColor, 0.05);
      }
    }
  }

  dispose() {
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight.dispose?.();
      this.ambientLight = null;
    }
    if (this.dirLight) {
      this.scene.remove(this.dirLight);
      this.dirLight.dispose?.();
      this.dirLight = null;
    }
  }
}
