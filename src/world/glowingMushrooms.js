/**
 * glowingMushrooms.js — Effect 25: Bioluminescent Mushroom Grove
 * InstancedMesh of glowing mushroom caps pulsing with a traveling wave through the twilight forest.
 */

import * as THREE from 'three';

export class GlowingMushroomsEffect {
  constructor() {
    this.count = 140;
    this.stalksMesh = null;
    this.capsMesh = null;
    this.dummy = new THREE.Object3D();
    this.mushrooms = [];
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();

    // 1. Stalk Geometry (slender cylinder)
    const stalkGeom = new THREE.CylinderGeometry(0.015, 0.025, 0.22, 8);
    stalkGeom.translate(0, 0.11, 0);
    const stalkMat = new THREE.MeshBasicMaterial({
      color: 0x4a3b7c,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
    });
    this.stalksMesh = new THREE.InstancedMesh(stalkGeom, stalkMat, this.count);

    // 2. Cap Geometry (squashed sphere dome)
    const capGeom = new THREE.SphereGeometry(0.065, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    capGeom.scale(1.0, 0.65, 1.0);
    capGeom.translate(0, 0.22, 0);

    const capMat = new THREE.MeshBasicMaterial({
      color: 0x14f1d9,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
    });
    this.capsMesh = new THREE.InstancedMesh(capGeom, capMat, this.count);

    // Distribute in groves behind the portal (Z from -0.8 to -8.0, X from -5 to +5)
    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 9.0;
      const z = -0.8 - Math.random() * 7.5;
      const y = -0.01;

      const scale = 0.6 + Math.random() * 0.9;
      const rotY = Math.random() * Math.PI * 2;
      const tiltX = (Math.random() - 0.5) * 0.2;

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(tiltX, rotY, 0);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();

      this.stalksMesh.setMatrixAt(i, this.dummy.matrix);
      this.capsMesh.setMatrixAt(i, this.dummy.matrix);

      const dist = Math.hypot(x, z);
      this.mushrooms.push({ dist, baseScale: scale });

      const col = (i % 2 === 0) ? new THREE.Color(0x14f1d9) : new THREE.Color(0xff3cac);
      this.capsMesh.setColorAt(i, col);
    }

    this.stalksMesh.instanceMatrix.needsUpdate = true;
    this.capsMesh.instanceMatrix.needsUpdate = true;
    this.capsMesh.instanceColor.needsUpdate = true;

    this.group.add(this.stalksMesh);
    this.group.add(this.capsMesh);
  }

  setStencilFunc(func) {
    if (this.stalksMesh) this.stalksMesh.material.stencilFunc = func;
    if (this.capsMesh) this.capsMesh.material.stencilFunc = func;
  }

  setQuality(level) {
    const lim = level === 'low' ? 45 : (level === 'medium' ? 85 : 140);
    if (this.stalksMesh) this.stalksMesh.count = lim;
    if (this.capsMesh) this.capsMesh.count = lim;
  }

  setTheme(theme) {
    if (!this.capsMesh || !theme) return;
    const c1 = new THREE.Color(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    const c2 = new THREE.Color(theme.accent2.r, theme.accent2.g, theme.accent2.b);
    for (let i = 0; i < this.count; i++) {
      this.capsMesh.setColorAt(i, i % 2 === 0 ? c1 : c2);
    }
    this.capsMesh.instanceColor.needsUpdate = true;
  }

  update(dt, time, state) {
    if (!this.capsMesh) return;

    const bass = state.audio?.bass || 0;
    const c1 = new THREE.Color(0x14f1d9);
    const c2 = new THREE.Color(0xff3cac);

    // Traveling wave pulse across the fungal network
    for (let i = 0; i < this.capsMesh.count; i++) {
      const m = this.mushrooms[i];
      const wave = Math.sin(m.dist * 1.8 - time * 2.5) * 0.5 + 0.5;
      const pulseCol = new THREE.Color().lerpColors(c1, c2, wave);
      pulseCol.multiplyScalar(0.6 + wave * 0.8 + bass * 0.6);

      this.capsMesh.setColorAt(i, pulseCol);
    }
    this.capsMesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      this.stalksMesh?.geometry.dispose();
      this.stalksMesh?.material.dispose();
      this.capsMesh?.geometry.dispose();
      this.capsMesh?.material.dispose();
      this.mushrooms = [];
      this.group = null;
    }
  }
}
