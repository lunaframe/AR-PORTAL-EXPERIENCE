/**
 * twilightMoon.js — Effect 31: Mystic Moon & Radiant Halo
 * Luminous celestial orb with soft atmospheric halo sprite in the twilight world sky.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../utils/textures.js';

export class TwilightMoonEffect {
  constructor() {
    this.group = null;
    this.moonMesh = null;
    this.haloSprite = null;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    // High in sky behind portal
    this.group.position.set(5.0, 15.0, -26.0);

    // 1. Moon Disk Mesh
    const moonGeom = new THREE.CircleGeometry(1.6, 48);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe8f7ff,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
    });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.moonMesh.lookAt(0, 1.2, 0); // Face viewer
    this.group.add(this.moonMesh);

    // 2. Large Soft Radiant Halo
    const haloTex = createSoftGlowTexture(256);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: 0x14f1d9,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.55,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
      depthWrite: false,
    });
    this.haloSprite = new THREE.Sprite(haloMat);
    this.haloSprite.scale.set(7.5, 7.5, 1);
    this.group.add(this.haloSprite);
  }

  setStencilFunc(func) {
    if (this.moonMesh) this.moonMesh.material.stencilFunc = func;
    if (this.haloSprite) this.haloSprite.material.stencilFunc = func;
  }

  setQuality(level) {}

  setTheme(theme) {
    if (!theme) return;
    if (this.haloSprite) {
      this.haloSprite.material.color.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    }
  }

  update(dt, time, state) {
    if (!this.group) return;

    // Gentle breathing pulse
    const pulse = 0.95 + 0.05 * Math.sin(time * 1.5);
    if (this.haloSprite) {
      this.haloSprite.scale.set(7.5 * pulse, 7.5 * pulse, 1);
      this.haloSprite.material.opacity = 0.45 + 0.15 * Math.sin(time * 1.2);
    }
  }

  dispose() {
    if (this.group) {
      this.moonMesh?.geometry.dispose();
      this.moonMesh?.material.dispose();
      this.haloSprite?.material.dispose();
      this.group = null;
    }
  }
}
