/**
 * fireflies.js — Effect 10: Wandering Fireflies
 * 60 wandering organic bioluminescent lights with pulsing glow and camera avoidance.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../../utils/textures.js';

export class FirefliesEffect {
  constructor(scene) {
    this.scene = scene;
    this.count = 60;
    this.fireflies = [];
    this.group = null;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const texture = createSoftGlowTexture(128);

    for (let i = 0; i < this.count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        color: 0x14f1d9,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(mat);
      const scale = 0.14 + Math.random() * 0.16;
      sprite.scale.set(scale, scale, 1);

      // Random position in room
      const x = (Math.random() - 0.5) * 5.0;
      const y = 0.4 + Math.random() * 2.2;
      const z = -1.5 + (Math.random() - 0.5) * 4.0;
      sprite.position.set(x, y, z);

      this.group.add(sprite);

      this.fireflies.push({
        sprite,
        baseScale: scale,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.15
        ),
        targetPos: new THREE.Vector3(x, y, z),
        pulseSpeed: 1.0 + Math.random() * 2.0,
        pulseOffset: Math.random() * Math.PI * 2,
        wanderPhase: Math.random() * 100,
      });
    }
  }

  setIntensity(val) {
    this.intensity = val;
  }

  setQuality(level) {
    const limit = level === 'low' ? 20 : (level === 'medium' ? 40 : 60);
    this.fireflies.forEach((f, idx) => {
      f.sprite.visible = idx < limit;
    });
  }

  setTheme(theme) {
    if (!theme) return;
    this.fireflies.forEach((f, idx) => {
      const col = idx % 2 === 0 ? theme.accent1 : theme.accent2;
      f.sprite.material.color.setRGB(col.r, col.g, col.b);
    });
  }

  update(dt, time, state) {
    if (!this.group) return;

    const camPos = this.camera.position;
    const treble = state.audio?.treble || 0;

    this.fireflies.forEach((f, idx) => {
      // Wandering target with smooth harmonic noise
      f.wanderPhase += dt * 0.5;
      const wx = Math.sin(f.wanderPhase + idx) * 2.2;
      const wy = 1.2 + Math.sin(f.wanderPhase * 0.7 + idx * 2) * 0.8;
      const wz = -1.5 + Math.cos(f.wanderPhase * 0.8 + idx) * 2.0;

      f.targetPos.set(wx, wy, wz);

      // Force toward wander target
      const steer = new THREE.Vector3().subVectors(f.targetPos, f.sprite.position).multiplyScalar(0.08 * dt);
      f.velocity.add(steer);

      // Camera avoidance: if camera approaches < 0.9m, push firefly away
      const toCam = new THREE.Vector3().subVectors(f.sprite.position, camPos);
      const camDist = toCam.length();
      if (camDist < 0.9) {
        const repulsion = toCam.normalize().multiplyScalar((0.9 - camDist) * 1.5 * dt);
        f.velocity.add(repulsion);
      }

      // Damping
      f.velocity.multiplyScalar(0.96);
      f.sprite.position.add(f.velocity);

      // Bioluminescent pulsing glow
      const pulse = 0.4 + 0.6 * Math.pow(Math.sin(time * f.pulseSpeed + f.pulseOffset) * 0.5 + 0.5, 2.0);
      f.sprite.material.opacity = Math.min(1.0, (pulse + treble * 0.5) * this.intensity);
      const s = f.baseScale * (0.8 + 0.4 * pulse);
      f.sprite.scale.set(s, s, 1);
    });
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.fireflies.forEach((f) => {
        f.sprite.material.dispose();
      });
      this.fireflies = [];
      this.group = null;
    }
  }
}
