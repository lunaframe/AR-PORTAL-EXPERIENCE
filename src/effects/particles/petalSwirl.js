/**
 * petalSwirl.js — Effect 13: Petal & Leaf Vortex Swirl
 * InstancedMesh of glowing mystical flora petals caught in an interdimensional vortex wind.
 */

import * as THREE from 'three';

export class PetalSwirlEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.count = 120;
    this.instancedMesh = null;
    this.petals = [];
    this.dummy = new THREE.Object3D();
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    this.group.position.set(0, 1.2, 0.02);
    this.portalGroup.add(this.group);

    // Curved petal geometry
    const geom = new THREE.PlaneGeometry(0.06, 0.09, 3, 3);
    // Curl vertices slightly for organic flutter
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, (x * x - y * y) * 0.4);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: 0x14f1d9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.instancedMesh = new THREE.InstancedMesh(geom, mat, this.count);
    this.group.add(this.instancedMesh);

    const cTeal = new THREE.Color(0x14f1d9);
    const cMagenta = new THREE.Color(0xff3cac);

    for (let i = 0; i < this.count; i++) {
      const radius = 0.75 + Math.random() * 0.65;
      const angle = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 0.4;

      this.petals.push({
        radius,
        angle,
        z,
        angularSpeed: (0.8 + Math.random() * 1.4) * (Math.random() < 0.5 ? 1 : 0.8),
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        rotSpeedX: 1.5 + Math.random() * 2.5,
        rotSpeedY: 1.2 + Math.random() * 2.0,
      });

      this.instancedMesh.setColorAt(i, i % 2 === 0 ? cTeal : cMagenta);
    }
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.instancedMesh) this.instancedMesh.material.opacity = 0.75 * val;
  }

  setQuality(level) {
    if (this.instancedMesh) {
      this.instancedMesh.count = level === 'low' ? 35 : (level === 'medium' ? 70 : 120);
    }
  }

  setTheme(theme) {
    if (!this.instancedMesh || !theme) return;
    const c1 = new THREE.Color(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    const c2 = new THREE.Color(theme.accent2.r, theme.accent2.g, theme.accent2.b);
    for (let i = 0; i < this.count; i++) {
      this.instancedMesh.setColorAt(i, i % 2 === 0 ? c1 : c2);
    }
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  update(dt, time, state) {
    if (!this.instancedMesh) return;

    const bass = state.audio?.bass || 0;
    const windSpeed = 1.0 + bass * 0.8;

    for (let i = 0; i < this.instancedMesh.count; i++) {
      const p = this.petals[i];

      p.angle += p.angularSpeed * dt * windSpeed;
      p.rotX += p.rotSpeedX * dt;
      p.rotY += p.rotSpeedY * dt;

      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      const z = p.z + Math.sin(time * 2.0 + i) * 0.05;

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(p.rotX, p.rotY, p.angle);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      this.portalGroup.remove(this.group);
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
      this.petals = [];
      this.group = null;
    }
  }
}
