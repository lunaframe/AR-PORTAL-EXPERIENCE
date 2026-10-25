/**
 * orbitingRunes.js — Effect 3: Orbiting Runes
 * Ancient runic glyphs circling the portal aperture with glow trails and audio shimmer.
 */

import * as THREE from 'three';
import { createRuneTexture } from '../../utils/textures.js';

export class OrbitingRunesEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.runes = [];
    this.runeCount = 8;
    this.baseRadius = 1.12;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.runesGroup = new THREE.Group();
    this.runesGroup.position.set(0, 1.2, 0.02);
    this.portalGroup.add(this.runesGroup);

    for (let i = 0; i < this.runeCount; i++) {
      const tex = createRuneTexture(i, 128);

      // Main rune sprite
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: 0x14f1d9,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.22, 0.22, 1);

      // Trailing ghost sprite for glow trail
      const trailMat = new THREE.SpriteMaterial({
        map: tex,
        color: 0xff3cac,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const trailSprite = new THREE.Sprite(trailMat);
      trailSprite.scale.set(0.18, 0.18, 1);

      this.runesGroup.add(trailSprite);
      this.runesGroup.add(sprite);

      this.runes.push({
        sprite,
        trailSprite,
        baseAngle: (i / this.runeCount) * Math.PI * 2,
        speed: (0.45 + (i % 3) * 0.15) * (i % 2 === 0 ? 1 : -0.7),
        radius: this.baseRadius + (i % 3) * 0.07,
        zOffset: (Math.sin(i) * 0.04),
        pulseOffset: i * 1.3,
      });
    }
  }

  setIntensity(val) {
    this.intensity = val;
  }

  setTheme(theme) {
    if (!theme) return;
    this.runes.forEach((r, idx) => {
      const col = idx % 2 === 0 ? theme.accent1 : theme.accent2;
      r.sprite.material.color.setRGB(col.r, col.g, col.b);
      const trailCol = idx % 2 === 0 ? theme.accent2 : theme.secondary;
      r.trailSprite.material.color.setRGB(trailCol.r, trailCol.g, trailCol.b);
    });
  }

  setQuality(level) {
    if (level === 'low') {
      this.runes.forEach((r, idx) => {
        const visible = idx % 2 === 0;
        r.sprite.visible = visible;
        r.trailSprite.visible = false;
      });
    } else if (level === 'medium') {
      this.runes.forEach(r => {
        r.sprite.visible = true;
        r.trailSprite.visible = false;
      });
    } else {
      this.runes.forEach(r => {
        r.sprite.visible = true;
        r.trailSprite.visible = true;
      });
    }
  }

  update(dt, time, state) {
    if (!this.runesGroup) return;

    const treble = state.audio?.treble || 0;
    const bass = state.audio?.bass || 0;

    this.runes.forEach((r) => {
      const currentAngle = r.baseAngle + time * r.speed;

      // Position main sprite
      const x = Math.cos(currentAngle) * (r.radius + bass * 0.05);
      const y = Math.sin(currentAngle) * (r.radius + bass * 0.05);
      const z = r.zOffset + Math.sin(time * 2.0 + r.pulseOffset) * 0.02;
      r.sprite.position.set(x, y, z);

      // Trailing sprite delayed slightly
      const trailAngle = currentAngle - r.speed * 0.18;
      const tx = Math.cos(trailAngle) * r.radius;
      const ty = Math.sin(trailAngle) * r.radius;
      r.trailSprite.position.set(tx, ty, z - 0.01);

      // Opacity oscillation + audio reactivity
      const baseAlpha = 0.5 + 0.4 * Math.sin(time * 1.5 + r.pulseOffset);
      r.sprite.material.opacity = Math.min(1.0, (baseAlpha + treble * 0.5) * this.intensity);
      r.trailSprite.material.opacity = Math.min(0.6, (baseAlpha * 0.45) * this.intensity);
    });
  }

  dispose() {
    if (this.runesGroup) {
      this.portalGroup.remove(this.runesGroup);
      this.runes.forEach((r) => {
        r.sprite.material?.dispose();
        r.trailSprite.material?.dispose();
      });
      this.runes = [];
      this.runesGroup = null;
    }
  }
}
