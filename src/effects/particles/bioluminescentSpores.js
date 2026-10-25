/**
 * bioluminescentSpores.js — Effect 9: Bioluminescent Spores
 * Thousands of drifting glowing dots with individual sine-wave twinkle,
 * slight gravitational drift toward the portal, and audio-reactive sparkle.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../../utils/textures.js';

export class BioluminescentSporesEffect {
  constructor(scene) {
    this.scene = scene;
    this.maxCount = 2800;
    this.activeCount = 2800;
    this.points = null;
    this.spores = [];
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxCount * 3);
    const colors = new Float32Array(this.maxCount * 3);
    const sizes = new Float32Array(this.maxCount);

    const cTeal = new THREE.Color(0x14f1d9);
    const cViolet = new THREE.Color(0x6d28d9);
    const cMagenta = new THREE.Color(0xff3cac);
    const cWhite = new THREE.Color(0xe8f7ff);

    for (let i = 0; i < this.maxCount; i++) {
      // Scatter in volume around portal (radius 0.4m to 4.5m)
      const r = 0.4 + Math.pow(Math.random(), 1.5) * 4.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      const x = r * Math.cos(phi) * Math.cos(theta);
      const y = Math.max(0.05, 1.2 + r * Math.sin(phi));
      const z = -1.5 + r * Math.cos(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const colChoice = Math.random();
      const col = colChoice < 0.45 ? cTeal : (colChoice < 0.75 ? cMagenta : (colChoice < 0.9 ? cViolet : cWhite));
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = 0.04 + Math.random() * 0.08;

      this.spores.push({
        origPos: new THREE.Vector3(x, y, z),
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.03,
        vz: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.5 + Math.random() * 3.5,
        baseSize: sizes[i],
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      map: createSoftGlowTexture(64),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geom, mat);
    this.group.add(this.points);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.points) this.points.material.opacity = 0.8 * val;
  }

  setQuality(level) {
    if (level === 'low') this.activeCount = 700;
    else if (level === 'medium') this.activeCount = 1600;
    else this.activeCount = this.maxCount;

    if (this.points) {
      this.points.geometry.setDrawRange(0, this.activeCount);
    }
  }

  setTheme(theme) {
    if (!this.points || !theme) return;
    const colors = this.points.geometry.attributes.color;
    for (let i = 0; i < this.maxCount; i++) {
      const colChoice = Math.random();
      const col = colChoice < 0.5 ? theme.accent1 : (colChoice < 0.8 ? theme.accent2 : theme.highlight);
      colors.setXYZ(i, col.r, col.g, col.b);
    }
    colors.needsUpdate = true;
  }

  update(dt, time, state) {
    if (!this.points) return;

    const pos = this.points.geometry.attributes.position;
    const sizeAttr = this.points.geometry.attributes.size;
    const treble = state.audio?.treble || 0;

    // Portal center position target for gentle gravity pull
    const targetX = 0;
    const targetY = 1.2;
    const targetZ = -1.5;

    for (let i = 0; i < this.activeCount; i++) {
      const sp = this.spores[i];

      let px = pos.getX(i);
      let py = pos.getY(i);
      let pz = pos.getZ(i);

      // Mild attraction toward portal
      const dx = targetX - px;
      const dy = targetY - py;
      const dz = targetZ - pz;
      const dist = Math.hypot(dx, dy, dz);

      if (dist > 0.4) {
        const pull = (0.015 / Math.max(1.0, dist)) * dt;
        px += dx * pull;
        py += dy * pull;
        pz += dz * pull;
      }

      // Drift velocity with gentle wandering
      px += sp.vx * dt + Math.sin(time + sp.phase) * 0.002;
      py += sp.vy * dt + Math.cos(time * 0.8 + sp.phase) * 0.002;
      pz += sp.vz * dt;

      // Wrap around bounds so spores constantly repopulate volume
      if (dist > 5.0 || py < 0.02) {
        px = sp.origPos.x;
        py = Math.max(0.1, sp.origPos.y);
        pz = sp.origPos.z;
      }

      pos.setXYZ(i, px, py, pz);

      // Sine-wave twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(time * sp.twinkleSpeed + sp.phase);
      const audioSparkle = 1.0 + treble * 2.2;
      sizeAttr.setX(i, sp.baseSize * twinkle * audioSparkle);
    }

    pos.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.spores = [];
      this.group = null;
    }
  }
}
