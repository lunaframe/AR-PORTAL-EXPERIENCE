/**
 * floatingJellyfish.js — Effect 26: Floating Bioluminescent Jellyfish
 * Translucent bobbing bodies with swaying tentacles that contract to the bass pulse.
 */

import * as THREE from 'three';

export class FloatingJellyfishEffect {
  constructor() {
    this.group = null;
    this.jellyfish = [];
    this.count = 8;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();

    // Bell body geometry (dome)
    const bellGeom = new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    bellGeom.scale(1.0, 0.7, 1.0);

    const bellMat = new THREE.MeshBasicMaterial({
      color: 0x14f1d9,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
      depthWrite: false,
    });

    const tentacleMat = new THREE.LineBasicMaterial({
      color: 0xff3cac,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
    });

    for (let j = 0; j < this.count; j++) {
      const jGroup = new THREE.Group();

      const bell = new THREE.Mesh(bellGeom, bellMat.clone());
      jGroup.add(bell);

      // 5 swaying tentacle lines per jellyfish
      const tentacles = [];
      const numTentacles = 5;
      for (let t = 0; t < numTentacles; t++) {
        const segCount = 10;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(segCount * 3);
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const line = new THREE.Line(geom, tentacleMat.clone());
        jGroup.add(line);

        const angle = (t / numTentacles) * Math.PI * 2;
        tentacles.push({
          line,
          baseX: Math.cos(angle) * 0.12,
          baseZ: Math.sin(angle) * 0.12,
          phaseOffset: t * 0.8,
        });
      }

      // Position floating in realm
      const x = (Math.random() - 0.5) * 6.0;
      const y = 1.2 + Math.random() * 2.2;
      const z = -2.0 - Math.random() * 5.0;
      jGroup.position.set(x, y, z);

      this.group.add(jGroup);

      this.jellyfish.push({
        group: jGroup,
        bell,
        tentacles,
        baseY: y,
        bobSpeed: 0.8 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05),
      });
    }
  }

  setStencilFunc(func) {
    this.jellyfish.forEach((j) => {
      j.bell.material.stencilFunc = func;
      j.tentacles.forEach((t) => (t.line.material.stencilFunc = func));
    });
  }

  setQuality(level) {
    const limit = level === 'low' ? 3 : (level === 'medium' ? 5 : 8);
    this.jellyfish.forEach((j, idx) => {
      j.group.visible = idx < limit;
    });
  }

  setTheme(theme) {
    if (!theme) return;
    this.jellyfish.forEach((j, idx) => {
      const c1 = idx % 2 === 0 ? theme.accent1 : theme.accent2;
      const c2 = idx % 2 === 0 ? theme.accent2 : theme.accent1;
      j.bell.material.color.setRGB(c1.r, c1.g, c1.b);
      j.tentacles.forEach((t) => t.line.material.color.setRGB(c2.r, c2.g, c2.b));
    });
  }

  update(dt, time, state) {
    if (!this.group) return;

    const bass = state.audio?.bass || 0;

    this.jellyfish.forEach((j) => {
      // Periodic propulsion pulse: contract bell, glide up, then settle
      const swimCycle = Math.sin(time * j.bobSpeed + j.phase);
      const isPushing = swimCycle > 0.4 || bass > 0.35;

      // Bell contraction & expansion
      const squash = isPushing ? 0.75 : (1.0 + 0.15 * Math.sin(time * 3.0));
      const stretch = isPushing ? 1.25 : 1.0;
      j.bell.scale.set(squash, stretch, squash);

      // Bobbing position
      j.group.position.y = j.baseY + swimCycle * 0.35 + (isPushing ? 0.15 : 0);
      j.group.position.x += j.velocity.x * dt;
      j.group.position.z += j.velocity.z * dt;

      // Sway tentacles
      j.tentacles.forEach((t) => {
        const posAttr = t.line.geometry.attributes.position;
        const segCount = posAttr.count;
        for (let s = 0; s < segCount; s++) {
          const ratio = s / (segCount - 1);
          const sway = Math.sin(time * 2.5 + t.phaseOffset + s * 0.4) * 0.04 * ratio;
          const tx = t.baseX + sway;
          const ty = -ratio * 0.45;
          const tz = t.baseZ + Math.cos(time * 2.0 + s * 0.3) * 0.03 * ratio;
          posAttr.setXYZ(s, tx, ty, tz);
        }
        posAttr.needsUpdate = true;
      });
    });
  }

  dispose() {
    if (this.group) {
      this.jellyfish.forEach((j) => {
        j.bell.geometry.dispose();
        j.bell.material.dispose();
        j.tentacles.forEach((t) => {
          t.line.geometry.dispose();
          t.line.material.dispose();
        });
      });
      this.jellyfish = [];
      this.group = null;
    }
  }
}
