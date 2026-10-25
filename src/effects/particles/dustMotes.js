/**
 * dustMotes.js — Effect 12: God-Ray Light Dust Motes
 * Floating atmospheric dust motes illuminated exclusively within the portal's light beam cone.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../../utils/textures.js';

export class DustMotesEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.count = 250;
    this.points = null;
    this.motes = [];
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    this.group.position.set(0, 1.2, 0.05);
    this.portalGroup.add(this.group);

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      // Scatter in conical light beam zone in front of portal (z from 0.1 to 3.2m)
      const z = 0.1 + Math.random() * 3.2;
      const coneRadius = 0.3 + z * 0.45;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.8) * coneRadius;

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 0.9;
      colors[i * 3 + 1] = 0.96;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = 0.05 + Math.random() * 0.06;

      this.motes.push({
        vx: (Math.random() - 0.5) * 0.03,
        vy: (Math.random() - 0.5) * 0.02,
        vz: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        baseSize: sizes[i],
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      map: createSoftGlowTexture(64),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.points = new THREE.Points(geom, mat);
    this.group.add(this.points);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.points) this.points.material.opacity = 0.75 * val;
  }

  setQuality(level) {
    if (this.points) {
      const active = level === 'low' ? 70 : (level === 'medium' ? 160 : 250);
      this.points.geometry.setDrawRange(0, active);
    }
  }

  setTheme(theme) {
    if (!this.points || !theme) return;
    const colors = this.points.geometry.attributes.color;
    for (let i = 0; i < this.count; i++) {
      colors.setXYZ(i, theme.highlight.r, theme.highlight.g, theme.highlight.b);
    }
    colors.needsUpdate = true;
  }

  update(dt, time, state) {
    if (!this.points) return;

    const pos = this.points.geometry.attributes.position;
    const sizeAttr = this.points.geometry.attributes.size;

    for (let i = 0; i < this.count; i++) {
      const m = this.motes[i];

      let px = pos.getX(i) + m.vx * dt + Math.sin(time + i) * 0.001;
      let py = pos.getY(i) + m.vy * dt + Math.cos(time * 0.8 + i) * 0.001;
      let pz = pos.getZ(i) + m.vz * dt;

      // Wrap if leaves cone range
      if (pz > 3.4 || Math.hypot(px, py) > (0.4 + pz * 0.5)) {
        pz = 0.1 + Math.random() * 0.3;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.35;
        px = Math.cos(angle) * r;
        py = Math.sin(angle) * r;
      }

      pos.setXYZ(i, px, py, pz);

      // Light beam intensity falloff based on distance from beam center
      const coneMaxR = 0.3 + pz * 0.45;
      const distFromAxis = Math.hypot(px, py);
      const beamFactor = Math.max(0, 1.0 - (distFromAxis / coneMaxR));

      // Twinkle
      const twinkle = 0.4 + 0.6 * Math.sin(time * 3.0 + m.twinklePhase);
      sizeAttr.setX(i, m.baseSize * beamFactor * twinkle * this.intensity);
    }

    pos.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      this.portalGroup.remove(this.group);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.motes = [];
      this.group = null;
    }
  }
}
