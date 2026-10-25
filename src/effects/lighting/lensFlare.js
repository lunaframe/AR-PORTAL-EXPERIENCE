/**
 * lensFlare.js — Effect 21: Anamorphic Lens Flare & Halo
 * Flaring optical streaks and soft halo sprites triggered when portal faces the camera directly.
 */

import * as THREE from 'three';
import { createSoftGlowTexture, createFlareStreakTexture } from '../../utils/textures.js';

export class LensFlareEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.group = null;
    this.haloSprite = null;
    this.streakSprite = null;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.position.set(0, 1.2, 0.04);
    this.portalGroup.add(this.group);

    // 1. Soft Circular Flare Glare
    const haloTex = createSoftGlowTexture(256);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: 0x14f1d9,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.haloSprite = new THREE.Sprite(haloMat);
    this.haloSprite.scale.set(2.4, 2.4, 1);
    this.group.add(this.haloSprite);

    // 2. Anamorphic Horizontal Streak Flare
    const streakTex = createFlareStreakTexture(512, 64);
    const streakMat = new THREE.SpriteMaterial({
      map: streakTex,
      color: 0xff3cac,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.streakSprite = new THREE.Sprite(streakMat);
    this.streakSprite.scale.set(4.2, 0.45, 1);
    this.group.add(this.streakSprite);
  }

  setIntensity(val) {
    this.intensity = val;
  }

  setQuality(level) {
    if (this.group) {
      this.group.visible = level !== 'low';
    }
  }

  setTheme(theme) {
    if (!theme) return;
    if (this.haloSprite) this.haloSprite.material.color.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    if (this.streakSprite) this.streakSprite.material.color.setRGB(theme.accent2.r, theme.accent2.g, theme.accent2.b);
  }

  update(dt, time, state) {
    if (!this.group || !this.camera) return;

    // Normal vector of portal (+Z rotated into world)
    const portalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.portalGroup.quaternion).normalize();

    // Direction vector from portal to camera
    const toCam = new THREE.Vector3().subVectors(this.camera.position, this.portalGroup.position).normalize();

    // Dot product alignment: 1 when directly facing, <= 0 when to the side or behind
    const dot = portalNormal.dot(toCam);
    const flareFactor = Math.pow(Math.max(0, dot), 3.0);

    const treble = state.audio?.treble || 0;
    const finalOpacity = flareFactor * (0.8 + treble * 0.4) * this.intensity;

    this.haloSprite.material.opacity = finalOpacity * 0.7;
    this.streakSprite.material.opacity = finalOpacity * 0.85;

    // Subtle breathing width of streak
    const streakW = 4.2 * (0.9 + 0.2 * Math.sin(time * 3.0) + flareFactor * 0.3);
    this.streakSprite.scale.set(streakW, 0.45, 1);
  }

  dispose() {
    if (this.group) {
      this.portalGroup.remove(this.group);
      this.haloSprite.material.dispose();
      this.streakSprite.material.dispose();
      this.group = null;
    }
  }
}
