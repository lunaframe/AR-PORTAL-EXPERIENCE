/**
 * ribbonTrail.js — Effect 15: Phone Motion Ribbon Trail
 * Smooth luminous ribbon mesh snaking through 3D world space following the user's phone trajectory.
 */

import * as THREE from 'three';

export class RibbonTrailEffect {
  constructor(scene) {
    this.scene = scene;
    this.maxPoints = 48;
    this.history = [];
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.intensity = 1.0;
    this.sampleTimer = 0;
  }

  init(scene, camera, renderer) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Dynamic ribbon triangle strip geometry
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxPoints * 2 * 3);
    const uvs = new Float32Array(this.maxPoints * 2 * 2);
    const colors = new Float32Array(this.maxPoints * 2 * 3);

    // Indices for triangle strip
    const indices = [];
    for (let i = 0; i < this.maxPoints - 1; i++) {
      const p1 = i * 2;
      const p2 = i * 2 + 1;
      const p3 = (i + 1) * 2;
      const p4 = (i + 1) * 2 + 1;
      indices.push(p1, p2, p3);
      indices.push(p2, p4, p3);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);

    this.material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.group.add(this.mesh);
  }

  setIntensity(val) {
    this.intensity = val;
  }

  setQuality(level) {
    if (this.mesh) {
      this.mesh.visible = (level !== 'low');
    }
  }

  setTheme(theme) {
    this.theme = theme;
  }

  update(dt, time, state) {
    if (!this.mesh || !this.camera) return;

    this.sampleTimer += dt;
    if (this.sampleTimer > 0.04) {
      this.sampleTimer = 0;

      // Sample camera tip position (offset slightly downward from center)
      const tip = new THREE.Vector3(0, -0.15, -0.4).applyMatrix4(this.camera.matrixWorld);

      this.history.unshift(tip);
      if (this.history.length > this.maxPoints) {
        this.history.pop();
      }
    }

    if (this.history.length < 2) return;

    const pos = this.geometry.attributes.position;
    const col = this.geometry.attributes.color;
    const count = this.history.length;

    const ribbonWidth = 0.035;
    const cTeal = new THREE.Color(0x14f1d9);
    const cMagenta = new THREE.Color(0xff3cac);

    for (let i = 0; i < count; i++) {
      const pt = this.history[i];
      const nextPt = i < count - 1 ? this.history[i + 1] : pt;

      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(ribbonWidth);

      // Left & right vertex of ribbon strip
      pos.setXYZ(i * 2, pt.x + side.x, pt.y + side.y, pt.z + side.z);
      pos.setXYZ(i * 2 + 1, pt.x - side.x, pt.y - side.y, pt.z - side.z);

      // Fade alpha with distance along history
      const life = 1.0 - (i / count);
      const fadeColor = new THREE.Color().lerpColors(cTeal, cMagenta, i / count).multiplyScalar(life * this.intensity);

      col.setXYZ(i * 2, fadeColor.r, fadeColor.g, fadeColor.b);
      col.setXYZ(i * 2 + 1, fadeColor.r, fadeColor.g, fadeColor.b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.geometry.setDrawRange(0, (count - 1) * 6);
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.geometry.dispose();
      this.material.dispose();
      this.history = [];
      this.group = null;
    }
  }
}
