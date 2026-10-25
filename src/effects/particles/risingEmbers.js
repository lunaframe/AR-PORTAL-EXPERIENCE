/**
 * risingEmbers.js — Effect 11: Rising Embers & Ash
 * Glowing thermal embers and ash specks rising from the portal base with turbulence noise.
 */

import * as THREE from 'three';
import { createSparkTexture } from '../../utils/textures.js';

export class RisingEmbersEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.count = 220;
    this.points = null;
    this.embers = [];
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    this.portalGroup.add(this.group);

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    const cMagenta = new THREE.Color(0xff3cac);
    const cGold = new THREE.Color(0xffaa40);
    const cAsh = new THREE.Color(0x8899aa);

    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 1.8;
      const y = Math.random() * 2.8;
      const z = (Math.random() - 0.5) * 0.8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const isAsh = Math.random() < 0.25;
      const col = isAsh ? cAsh : (Math.random() < 0.5 ? cMagenta : cGold);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = isAsh ? 0.05 : (0.07 + Math.random() * 0.08);

      this.embers.push({
        vy: 0.35 + Math.random() * 0.65,
        turbFreq: 2.0 + Math.random() * 3.0,
        turbOffset: Math.random() * 10,
        baseSize: sizes[i],
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.1,
      map: createSparkTexture(64),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this.points = new THREE.Points(geom, mat);
    this.group.add(this.points);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.points) this.points.material.opacity = 0.8 * val;
  }

  setQuality(level) {
    if (this.points) {
      const active = level === 'low' ? 60 : (level === 'medium' ? 140 : 220);
      this.points.geometry.setDrawRange(0, active);
    }
  }

  setTheme(theme) {
    if (!this.points || !theme) return;
    const colors = this.points.geometry.attributes.color;
    for (let i = 0; i < this.count; i++) {
      const col = i % 2 === 0 ? theme.accent2 : theme.highlight;
      colors.setXYZ(i, col.r, col.g, col.b);
    }
    colors.needsUpdate = true;
  }

  update(dt, time, state) {
    if (!this.points) return;

    const pos = this.points.geometry.attributes.position;
    const sizeAttr = this.points.geometry.attributes.size;
    const bass = state.audio?.bass || 0;

    for (let i = 0; i < this.count; i++) {
      const em = this.embers[i];

      let px = pos.getX(i);
      let py = pos.getY(i);
      let pz = pos.getZ(i);

      // Rise with thermal lift + bass boost
      py += (em.vy + bass * 0.4) * dt;

      // 3D turbulence drift
      px += Math.sin(time * em.turbFreq + em.turbOffset) * 0.012;
      pz += Math.cos(time * em.turbFreq * 0.8 + em.turbOffset) * 0.012;

      // Reset when reaching top
      if (py > 2.8) {
        py = 0.02 + Math.random() * 0.2;
        px = (Math.random() - 0.5) * 1.6;
        pz = (Math.random() - 0.5) * 0.6;
      }

      pos.setXYZ(i, px, py, pz);

      // Fade size with height
      const heightRatio = Math.max(0, 1.0 - py / 2.8);
      sizeAttr.setX(i, em.baseSize * heightRatio * (0.8 + 0.4 * Math.sin(time * 8.0 + i)));
    }

    pos.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      this.portalGroup.remove(this.group);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.embers = [];
      this.group = null;
    }
  }
}
