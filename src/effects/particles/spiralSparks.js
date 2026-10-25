/**
 * spiralSparks.js — Effect 8: Spiral Spark Stream & Edge Streaks
 * Curved logarithmic spiral stream flowing from the rim into the portal center,
 * plus edge ring particle streaks.
 */

import * as THREE from 'three';
import { createSparkTexture } from '../../utils/textures.js';

export class SpiralSparksEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.points = null;
    this.count = 320;
    this.particles = [];
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    this.group.position.set(0, 1.2, 0.012);
    this.portalGroup.add(this.group);

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    const cTeal = new THREE.Color(0x14f1d9);
    const cMagenta = new THREE.Color(0xff3cac);
    const cWhite = new THREE.Color(0xe8f7ff);

    for (let i = 0; i < this.count; i++) {
      const col = (i % 3 === 0) ? cWhite : ((i % 3 === 1) ? cTeal : cMagenta);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = 0.08 + Math.random() * 0.1;

      // Initialize spiral particle state
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.1 + Math.random() * 0.85;
      this.particles.push({
        radius,
        theta,
        speed: 1.5 + Math.random() * 2.0,
        inwardSpeed: 0.25 + Math.random() * 0.45,
        z: (Math.random() - 0.5) * 0.03,
      });

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(theta) * radius;
      positions[i * 3 + 2] = this.particles[i].z;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      map: createSparkTexture(128),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.points = new THREE.Points(geom, mat);
    this.group.add(this.points);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.points) this.points.material.opacity = 0.85 * val;
  }

  setQuality(level) {
    if (this.points) {
      const mult = level === 'low' ? 0.35 : (level === 'medium' ? 0.7 : 1.0);
      const activeCount = Math.floor(this.count * mult);
      this.points.geometry.setDrawRange(0, activeCount);
    }
  }

  setTheme(theme) {
    if (!this.points || !theme) return;
    const colors = this.points.geometry.attributes.color;
    for (let i = 0; i < this.count; i++) {
      const c = (i % 3 === 0) ? theme.highlight : ((i % 3 === 1) ? theme.accent1 : theme.accent2);
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  }

  update(dt, time, state) {
    if (!this.points) return;

    const pos = this.points.geometry.attributes.position;
    const treble = state.audio?.treble || 0;
    const bass = state.audio?.bass || 0;
    const speedBoost = 1.0 + treble * 1.5 + bass * 0.8;

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];

      // Spiral inwards
      p.radius -= p.inwardSpeed * dt * speedBoost;
      // Faster angular speed as it approaches center (conservation of angular momentum)
      p.theta += (p.speed / Math.max(0.08, p.radius)) * dt * speedBoost;

      // Reset when sucked into event horizon center
      if (p.radius <= 0.04) {
        p.radius = 0.92 + Math.random() * 0.06; // Spawn at rim
        p.theta = Math.random() * Math.PI * 2;
      }

      const x = Math.cos(p.theta) * p.radius;
      const y = Math.sin(p.theta) * p.radius;
      const z = p.z + Math.sin(time * 3.0 + i) * 0.01;

      pos.setXYZ(i, x, y, z);
    }

    pos.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      this.portalGroup.remove(this.group);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.particles = [];
      this.group = null;
    }
  }
}
