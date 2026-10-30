/**
 * gateFrame.js — Effect 1: Carved Dream Gate Arch & Emissive Runes
 * Tall carved archway with glowing ancient runes that illuminate in sequence.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../utils/textures.js';

export class GateFrameEffect {
  constructor(gateGroup) {
    this.gateGroup = gateGroup;
    this.frameMesh = null;
    this.runesGroup = null;
    this.runeSprites = [];
    this.haloSprite = null;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    this.gateGroup.add(this.group);

    // 1. Carved Arch Frame: Extruded or composite arch geometry (~2.2m tall, 1.2m wide)
    // Left pillar, right pillar, and curved top arch
    const pillarGeom = new THREE.BoxGeometry(0.14, 2.0, 0.16);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x120e3a,
      roughness: 0.7,
      metalness: 0.35,
      emissive: 0x1f1754,
      emissiveIntensity: 0.4,
    });

    const leftPillar = new THREE.Mesh(pillarGeom, archMat);
    leftPillar.position.set(-0.62, 1.0, 0);
    this.group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeom, archMat);
    rightPillar.position.set(0.62, 1.0, 0);
    this.group.add(rightPillar);

    // Curved Arch Crown (half-torus / cylinder segment)
    const crownGeom = new THREE.TorusGeometry(0.62, 0.08, 16, 32, Math.PI);
    const crown = new THREE.Mesh(crownGeom, archMat);
    crown.position.set(0, 2.0, 0);
    this.group.add(crown);

    // Arch base plinths
    const plinthGeom = new THREE.BoxGeometry(0.24, 0.12, 0.24);
    const leftPlinth = new THREE.Mesh(plinthGeom, archMat);
    leftPlinth.position.set(-0.62, 0.06, 0);
    this.group.add(leftPlinth);

    const rightPlinth = new THREE.Mesh(plinthGeom, archMat);
    rightPlinth.position.set(0.62, 0.06, 0);
    this.group.add(rightPlinth);

    // 2. Sequential Emissive Runes embedded along pillars and arch
    this.runesGroup = new THREE.Group();
    this.group.add(this.runesGroup);

    const runeTex = createSoftGlowTexture(128);
    const runeMat = new THREE.SpriteMaterial({
      map: runeTex,
      color: 0x3df2d0, // Aurora teal
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
    });

    const runePositions = [
      // Left pillar up
      [-0.62, 0.4, 0.09],
      [-0.62, 0.8, 0.09],
      [-0.62, 1.2, 0.09],
      [-0.62, 1.6, 0.09],
      // Arch curve
      [-0.42, 2.15, 0.09],
      [0.0, 2.35, 0.09],
      [0.42, 2.15, 0.09],
      // Right pillar down
      [0.62, 1.6, 0.09],
      [0.62, 1.2, 0.09],
      [0.62, 0.8, 0.09],
      [0.62, 0.4, 0.09],
    ];

    runePositions.forEach((pos, idx) => {
      const sprite = new THREE.Sprite(runeMat.clone());
      sprite.position.set(...pos);
      sprite.scale.set(0.12, 0.12, 1);
      this.runesGroup.add(sprite);
      this.runeSprites.push({
        sprite,
        index: idx,
        baseScale: 0.12,
        phase: (idx / runePositions.length) * Math.PI * 2,
      });
    });

    // 3. Ambient Crown Glow Halo
    const haloTex = createSoftGlowTexture(256);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: 0x7c4dff,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.haloSprite = new THREE.Sprite(haloMat);
    this.haloSprite.position.set(0, 2.1, 0.02);
    this.haloSprite.scale.set(1.8, 1.8, 1);
    this.group.add(this.haloSprite);
  }

  setIntensity(val) {
    this.intensity = val;
  }

  setQuality(level) {
    if (this.haloSprite) {
      this.haloSprite.visible = level !== 'low';
    }
  }

  setRealmTheme(colors) {
    if (!colors) return;
    this.runeSprites.forEach((r, idx) => {
      const c = idx % 2 === 0 ? colors.teal : colors.rose;
      r.sprite.material.color.set(c);
    });
    if (this.haloSprite) {
      this.haloSprite.material.color.set(colors.violet);
    }
  }

  update(dt, time, state) {
    const bass = state.audio?.bass || 0;
    const treble = state.audio?.treble || 0;

    // Runes illuminate sequentially around the arch with light travel wave
    this.runeSprites.forEach((r) => {
      const wave = Math.sin(time * 2.5 - r.index * 0.55);
      const bright = Math.pow(Math.max(0, wave), 3.0);
      const pulse = 0.5 + 0.5 * bright + treble * 0.8;

      r.sprite.material.opacity = (0.35 + 0.65 * pulse) * this.intensity;
      const s = r.baseScale * (1.0 + 0.4 * bright + bass * 0.3);
      r.sprite.scale.set(s, s, 1);
    });

    // Arch breathing halo glow
    if (this.haloSprite) {
      const breath = 0.5 + 0.25 * Math.sin(time * 1.8) + bass * 0.4;
      this.haloSprite.material.opacity = breath * this.intensity;
      const hs = 1.8 * (1.0 + bass * 0.25);
      this.haloSprite.scale.set(hs, hs, 1);
    }
  }

  dispose() {
    if (this.group) {
      this.gateGroup.remove(this.group);
      this.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      this.group = null;
    }
  }
}
