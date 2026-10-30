/**
 * gateSigils.js — Effect 4: Realm Sigils
 * Three floating glowing interactive symbols on the gate corresponding to the three dream worlds.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../utils/textures.js';

export class GateSigilsEffect {
  constructor(gateGroup) {
    this.gateGroup = gateGroup;
    this.group = null;
    this.sigils = [];
    this.activeRealm = 'skyGarden';
    this.onRealmSelect = null;
  }

  init(scene, camera, renderer) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.position.set(0, 1.35, 0.08); // Floats at chest level in doorway
    this.gateGroup.add(this.group);

    const sigilDefs = [
      { id: 'skyGarden', name: 'Sky Garden', color: 0x3df2d0, x: -0.32 },
      { id: 'midnightOcean', name: 'Midnight Ocean', color: 0x7c4dff, x: 0.0 },
      { id: 'starLibrary', name: 'Star Library', color: 0xffd27a, x: 0.32 },
    ];

    const glowTex = createSoftGlowTexture(128);

    sigilDefs.forEach((def, idx) => {
      const sigilGroup = new THREE.Group();
      sigilGroup.position.set(def.x, 0, 0);

      // Core glyph sprite
      const mat = new THREE.SpriteMaterial({
        map: glowTex,
        color: def.color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: def.id === this.activeRealm ? 1.0 : 0.45,
      });

      const sprite = new THREE.Sprite(mat);
      const s = def.id === this.activeRealm ? 0.22 : 0.16;
      sprite.scale.set(s, s, 1);
      sigilGroup.add(sprite);

      // Ring around active sigil
      const ringGeom = new THREE.RingGeometry(0.1, 0.12, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: def.id === this.activeRealm ? 0.8 : 0.2,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      sigilGroup.add(ring);

      this.group.add(sigilGroup);

      this.sigils.push({
        id: def.id,
        group: sigilGroup,
        sprite,
        ring,
        baseX: def.x,
        phase: idx * 1.3,
      });
    });
  }

  selectRealm(realmId, triggerCallback = true) {
    this.activeRealm = realmId;
    this.sigils.forEach((s) => {
      const isActive = s.id === realmId;
      s.sprite.material.opacity = isActive ? 1.0 : 0.4;
      s.ring.material.opacity = isActive ? 0.85 : 0.15;
      const targetScale = isActive ? 0.22 : 0.15;
      s.sprite.scale.set(targetScale, targetScale, 1);
    });
    if (triggerCallback) {
      this.onRealmSelect?.(realmId);
    }
  }

  setQuality(level) {}

  update(dt, time, state) {
    if (!this.group) return;

    // Gentle dream drift & bob
    this.sigils.forEach((s) => {
      const bob = Math.sin(time * 2.2 + s.phase) * 0.03;
      s.group.position.y = bob;

      // Rotate ring
      s.ring.rotation.z = time * 0.8 + s.phase;
    });
  }

  dispose() {
    if (this.group) {
      this.gateGroup.remove(this.group);
      this.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.group = null;
    }
  }
}
