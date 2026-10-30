/**
 * fragments.js — Effect 26: Collectible Dream Fragments System
 * 7 glowing crystal shards hidden in each realm with orbiting particles,
 * distance detection, tap-collection, and ascending chime tones.
 */

import * as THREE from 'three';
import { createSoftGlowTexture, createSparkTexture } from '../utils/textures.js';
import { audioEngine } from '../audio/engine.js';

export class DreamFragmentsSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.fragments = [];
    this.totalFragments = 7;
    this.collectedCount = 0;
    this.onFragmentCollected = null;
    this.onAllCollected = null;
  }

  init(positions = []) {
    this.clear();

    const shardGeom = new THREE.OctahedronGeometry(0.12, 0);
    shardGeom.scale(0.8, 1.8, 0.8);

    const glowTex = createSoftGlowTexture(128);
    const sparkTex = createSparkTexture(128);

    // Default positions if none provided
    const defaultCoords = [
      [1.2, 1.1, -2.5],
      [-1.5, 1.3, -3.2],
      [0.0, 1.8, -4.5],
      [2.2, 1.0, -4.0],
      [-2.0, 1.5, -5.2],
      [1.0, 2.2, -6.0],
      [-0.8, 1.2, -6.8],
    ];

    const coords = positions.length === 7 ? positions : defaultCoords;

    coords.forEach((c, idx) => {
      const fGroup = new THREE.Group();
      fGroup.position.set(...c);

      // 1. Crystal Shard
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff9ecb, // Rose gold
        emissive: 0x3df2d0, // Aurora teal
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8,
        stencilWrite: false,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
      });

      const mesh = new THREE.Mesh(shardGeom, mat);
      fGroup.add(mesh);

      // 2. Halo sprite
      const haloMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xff9ecb,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        stencilWrite: false,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(0.65, 0.65, 1);
      fGroup.add(halo);

      // 3. Orbiting Sparkles
      const orbitCount = 4;
      const orbitSprites = [];
      for (let o = 0; o < orbitCount; o++) {
        const sMat = new THREE.SpriteMaterial({
          map: sparkTex,
          color: 0x3df2d0,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          stencilWrite: false,
          stencilRef: 1,
          stencilFunc: THREE.EqualStencilFunc,
        });
        const sp = new THREE.Sprite(sMat);
        sp.scale.set(0.08, 0.08, 1);
        fGroup.add(sp);
        orbitSprites.push({ sprite: sp, angle: (o / orbitCount) * Math.PI * 2 });
      }

      this.group.add(fGroup);

      this.fragments.push({
        id: idx + 1,
        group: fGroup,
        mesh,
        halo,
        orbitSprites,
        pos: new THREE.Vector3(...c),
        collected: false,
        collectedAnim: 0,
      });
    });

    this.collectedCount = 0;
  }

  collect(fragment) {
    if (fragment.collected) return;
    fragment.collected = true;
    this.collectedCount++;

    // Audio chime ascending with collection count
    audioEngine.playFragmentChime(this.collectedCount, fragment.pos);

    // Haptic vibration feedback
    if (navigator.vibrate) {
      try { navigator.vibrate([25, 40, 60]); } catch (e) {}
    }

    this.onFragmentCollected?.(this.collectedCount, this.totalFragments);

    if (this.collectedCount >= this.totalFragments) {
      this.onAllCollected?.();
    }
  }

  setStencilFunc(func) {
    this.fragments.forEach((f) => {
      f.mesh.material.stencilFunc = func;
      f.halo.material.stencilFunc = func;
      f.orbitSprites.forEach((o) => (o.sprite.material.stencilFunc = func));
    });
  }

  update(dt, time, isInsideVirtual) {
    const camPos = this.camera.position;

    this.fragments.forEach((f) => {
      if (f.collected) {
        if (f.collectedAnim < 1.0) {
          f.collectedAnim += dt * 3.0;
          const s = Math.max(0.001, (1.0 - f.collectedAnim) * (1.0 + f.collectedAnim * 2.0));
          f.group.scale.set(s, s, s);
          f.mesh.rotation.y += dt * 15.0;
          if (f.collectedAnim >= 1.0) f.group.visible = false;
        }
        return;
      }

      // Idle float & spin
      f.mesh.rotation.y = time * 1.5;
      f.mesh.rotation.x = Math.sin(time * 2.0) * 0.2;
      f.group.position.y = f.pos.y + Math.sin(time * 2.5 + f.id) * 0.08;

      // Orbiting particles
      f.orbitSprites.forEach((o) => {
        o.angle += dt * 2.5;
        const rad = 0.22;
        o.sprite.position.set(Math.cos(o.angle) * rad, Math.sin(o.angle * 2.0) * 0.08, Math.sin(o.angle) * rad);
      });

      // Proximity collection detection (within 0.85m when inside virtual realm)
      if (isInsideVirtual) {
        const dist = camPos.distanceTo(f.group.position);
        if (dist < 0.85) {
          this.collect(f);
        }
      }
    });
  }

  clear() {
    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
      obj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    this.fragments = [];
    this.collectedCount = 0;
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}
