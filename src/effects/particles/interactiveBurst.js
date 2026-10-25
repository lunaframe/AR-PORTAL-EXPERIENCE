/**
 * interactiveBurst.js — Effect 14: Interactive Tap Particle Burst
 * Tapping anywhere in the AR space fires expanding glowing spark clusters with soft chime.
 */

import * as THREE from 'three';
import { createSparkTexture } from '../../utils/textures.js';
import { audioEngine } from '../../audio/engine.js';

export class InteractiveBurstEffect {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
    this.maxBursts = 4;
    this.particlesPerBurst = 60;
    this.group = null;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const sparkTex = createSparkTexture(128);

    for (let b = 0; b < this.maxBursts; b++) {
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(this.particlesPerBurst * 3);
      const colors = new Float32Array(this.particlesPerBurst * 3);
      const sizes = new Float32Array(this.particlesPerBurst);

      for (let i = 0; i < this.particlesPerBurst; i++) {
        sizes[i] = 0.08 + Math.random() * 0.1;
      }

      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.PointsMaterial({
        size: 0.1,
        map: sparkTex,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });

      const points = new THREE.Points(geom, mat);
      this.group.add(points);

      const particlesData = [];
      for (let i = 0; i < this.particlesPerBurst; i++) {
        particlesData.push({
          velocity: new THREE.Vector3(),
          life: 0,
        });
      }

      this.bursts.push({
        points,
        particlesData,
        active: false,
        age: 0,
      });
    }

    // Bind tap / click listener to spawn burst at world point
    window.addEventListener('pointerdown', (e) => {
      // Don't trigger if tapping on UI buttons
      if (e.target.closest('#hud-top, #hud-bottom, #effects-modal, #scale-slider-container, #splash-screen')) return;

      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);

      // Distance in front of camera
      const spawnPos = new THREE.Vector3();
      raycaster.ray.at(1.6, spawnPos);

      this.trigger(spawnPos);
    });
  }

  setIntensity(val) {
    this.intensity = val;
  }

  setQuality(level) {
    // Quality scaling
  }

  setTheme(theme) {
    this.theme = theme;
  }

  trigger(position) {
    // Find inactive burst pool item
    const burst = this.bursts.find((b) => !b.active) || this.bursts[0];
    burst.active = true;
    burst.age = 0;
    burst.points.position.copy(position);
    burst.points.material.opacity = 1.0 * this.intensity;

    const pos = burst.points.geometry.attributes.position;
    const col = burst.points.geometry.attributes.color;

    const cTeal = new THREE.Color(0x14f1d9);
    const cMagenta = new THREE.Color(0xff3cac);
    const cWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < this.particlesPerBurst; i++) {
      pos.setXYZ(i, 0, 0, 0);

      // Spherical explosion
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 0.8 + Math.random() * 2.2;

      burst.particlesData[i].velocity.set(
        Math.cos(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * speed,
        Math.cos(phi) * Math.sin(theta) * speed
      );
      burst.particlesData[i].life = 1.0;

      const c = Math.random() < 0.4 ? cWhite : (Math.random() < 0.5 ? cTeal : cMagenta);
      col.setXYZ(i, c.r, c.g, c.b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;

    audioEngine.playTapEffect(position);
  }

  update(dt, time, state) {
    if (!this.group) return;

    this.bursts.forEach((burst) => {
      if (!burst.active) return;

      burst.age += dt;
      const pos = burst.points.geometry.attributes.position;

      for (let i = 0; i < this.particlesPerBurst; i++) {
        const p = burst.particlesData[i];
        p.velocity.multiplyScalar(0.95); // Drag

        const px = pos.getX(i) + p.velocity.x * dt;
        const py = pos.getY(i) + p.velocity.y * dt;
        const pz = pos.getZ(i) + p.velocity.z * dt;

        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;

      // Fade out
      const alpha = Math.max(0, 1.0 - burst.age / 0.85);
      burst.points.material.opacity = alpha * this.intensity;

      if (burst.age >= 0.85) {
        burst.active = false;
        burst.points.material.opacity = 0;
      }
    });
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.bursts.forEach((b) => {
        b.points.geometry.dispose();
        b.points.material.dispose();
      });
      this.bursts = [];
      this.group = null;
    }
  }
}
