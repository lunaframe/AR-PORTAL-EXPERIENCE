/**
 * bioluminescentGrass.js — Effect 30: Bioluminescent Swaying Grass
 * Instanced blades of twilight flora swaying in the wind and lighting up when the camera approaches.
 */

import * as THREE from 'three';

export class BioluminescentGrassEffect {
  constructor() {
    this.count = 320;
    this.instancedMesh = null;
    this.dummy = new THREE.Object3D();
    this.blades = [];
  }

  init(scene, camera, renderer) {
    this.camera = camera;
    this.group = new THREE.Group();

    // Grass blade geometry: tapered triangle ribbon
    const geom = new THREE.PlaneGeometry(0.045, 0.35, 1, 3);
    geom.translate(0, 0.175, 0);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x14f1d9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
    });

    this.instancedMesh = new THREE.InstancedMesh(geom, mat, this.count);
    this.group.add(this.instancedMesh);

    const baseColor = new THREE.Color(0x281b5a);

    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 8.0;
      const z = -0.5 - Math.random() * 6.5;
      const y = -0.05;

      const scale = 0.7 + Math.random() * 0.7;
      const rotY = Math.random() * Math.PI;

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, rotY, 0);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, baseColor);

      this.blades.push({
        x, y, z,
        baseScale: scale,
        rotY,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1.8 + Math.random() * 1.5,
      });
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  setStencilFunc(func) {
    if (this.instancedMesh) this.instancedMesh.material.stencilFunc = func;
  }

  setQuality(level) {
    if (this.instancedMesh) {
      const active = level === 'low' ? 90 : (level === 'medium' ? 190 : 320);
      this.instancedMesh.count = active;
    }
  }

  setTheme(theme) {
    this.theme = theme;
  }

  update(dt, time, state) {
    if (!this.instancedMesh || !this.camera) return;

    const camPos = this.camera.position;
    const cDim = new THREE.Color(0x281b5a);
    const cLit = new THREE.Color(0x14f1d9);
    const bass = state.audio?.bass || 0;

    for (let i = 0; i < this.instancedMesh.count; i++) {
      const b = this.blades[i];

      // Proximity to camera
      const dx = camPos.x - b.x;
      const dz = camPos.z - b.z;
      const dist = Math.hypot(dx, dz);

      // Light up near camera (< 1.6m)
      const proximityLight = Math.max(0, 1.0 - dist / 1.6);
      const col = new THREE.Color().lerpColors(cDim, cLit, proximityLight * 0.9 + bass * 0.3);
      this.instancedMesh.setColorAt(i, col);

      // Wind sway bending
      const sway = Math.sin(time * b.swaySpeed + b.swayPhase) * 0.25;
      this.dummy.position.set(b.x, b.y, b.z);
      this.dummy.rotation.set(sway, b.rotY, sway * 0.5);
      this.dummy.scale.set(b.baseScale, b.baseScale, b.baseScale);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      this.instancedMesh?.geometry.dispose();
      this.instancedMesh?.material.dispose();
      this.blades = [];
      this.group = null;
    }
  }
}
