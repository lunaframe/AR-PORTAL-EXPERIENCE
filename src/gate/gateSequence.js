/**
 * gateSequence.js — Effects 3 & 6: Summon Sequence & Particle Crumble Dissolve
 * Floor light crack, rising fog, spark bursts, and firefly dissolution.
 */

import * as THREE from 'three';
import { createSparkTexture } from '../utils/textures.js';
import { audioEngine } from '../audio/engine.js';

export class GateSequenceController {
  constructor(gateGroup, surfaceEffect) {
    this.gateGroup = gateGroup;
    this.surfaceEffect = surfaceEffect;

    this.state = 'closed'; // 'closed' | 'opening' | 'open' | 'dissolving'
    this.animTime = 0;
    this.openProgress = 0;

    // Shockwave & Cracks
    this.shockwaveMesh = null;
    this.floorCrackMesh = null;

    // Sparks Burst System
    this.sparksCount = 300;
    this.sparksPoints = null;
    this.sparksData = [];

    // Dissolve Particles (firefly particles on gate removal)
    this.dissolveCount = 200;
    this.dissolvePoints = null;
    this.dissolveData = [];

    // Callbacks
    this.onSequenceComplete = null;
    this.onFlashTrigger = null;
    this.onLetterboxToggle = null;
  }

  init(scene, camera, renderer) {
    this.sequenceGroup = new THREE.Group();
    this.sequenceGroup.position.set(0, 0, 0.02);
    this.gateGroup.add(this.sequenceGroup);

    // 1. Floor Crack Geometry
    const crackGeom = new THREE.PlaneGeometry(1.6, 0.25);
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0x3df2d0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.floorCrackMesh = new THREE.Mesh(crackGeom, crackMat);
    this.floorCrackMesh.rotation.x = -Math.PI / 2;
    this.floorCrackMesh.position.y = 0.005;
    this.sequenceGroup.add(this.floorCrackMesh);

    // 2. Shockwave Ring
    const ringGeom = new THREE.RingGeometry(0.1, 0.25, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff9ecb,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.shockwaveMesh = new THREE.Mesh(ringGeom, ringMat);
    this.shockwaveMesh.position.set(0, 1.2, 0.01);
    this.sequenceGroup.add(this.shockwaveMesh);

    // 3. Summon Sparks
    const sparkTex = createSparkTexture(128);
    const sparkGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.sparksCount * 3);
    const colors = new Float32Array(this.sparksCount * 3);
    const teal = new THREE.Color(0x3df2d0);
    const rose = new THREE.Color(0xff9ecb);
    const lantern = new THREE.Color(0xffd27a);

    for (let i = 0; i < this.sparksCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0.1;
      positions[i * 3 + 2] = 0;

      const c = i % 3 === 0 ? teal : (i % 3 === 1 ? rose : lantern);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this.sparksData.push({
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0,
      });
    }

    sparkGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const sparkMat = new THREE.PointsMaterial({
      size: 0.12,
      map: sparkTex,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.sparksPoints = new THREE.Points(sparkGeom, sparkMat);
    this.sequenceGroup.add(this.sparksPoints);
  }

  summon() {
    this.state = 'opening';
    this.animTime = 0;
    this.openProgress = 0;
    this.surfaceEffect.setOpenProgress(0);

    audioEngine.playGateSummon(this.gateGroup.position);

    if (navigator.vibrate) {
      try { navigator.vibrate([40, 80, 160]); } catch (e) {}
    }

    this.onLetterboxToggle?.(true);
  }

  dissolve() {
    this.state = 'dissolving';
    this.animTime = 0;
    this.triggerDissolveParticles();

    if (navigator.vibrate) {
      try { navigator.vibrate([40, 40, 40]); } catch (e) {}
    }

    this.onLetterboxToggle?.(false);
  }

  triggerSparks() {
    const posAttr = this.sparksPoints.geometry.attributes.position;
    for (let i = 0; i < this.sparksCount; i++) {
      posAttr.setXYZ(i, (Math.random() - 0.5) * 0.8, 0.1, 0);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.5;
      const vx = Math.cos(angle) * speed * 0.7;
      const vy = (0.8 + Math.random() * 1.5) * speed;
      const vz = (Math.random() - 0.5) * speed * 0.6;

      this.sparksData[i].velocity.set(vx, vy, vz);
      this.sparksData[i].life = 1.0;
      this.sparksData[i].maxLife = 0.7 + Math.random() * 0.8;
    }
    posAttr.needsUpdate = true;
    this.sparksPoints.material.opacity = 1.0;
  }

  triggerDissolveParticles() {
    // Spawns firefly sparks rising from the gate structure
    this.triggerSparks();
  }

  update(dt, time, state) {
    if (this.state === 'opening') {
      this.animTime += dt;

      // Phase 1: Floor crack glows (0.0 to 0.4s)
      if (this.animTime < 0.4) {
        const t = this.animTime / 0.4;
        this.floorCrackMesh.material.opacity = t;
        this.floorCrackMesh.scale.set(t, 1, 1);
      }
      // Phase 2: Shockwave expands, sparks fire (0.4 to 1.2s)
      else if (this.animTime < 1.2) {
        if (this.animTime - dt < 0.4) {
          this.triggerSparks();
          this.onFlashTrigger?.();
        }

        const t = (this.animTime - 0.4) / 0.8;
        const eased = 1 - Math.pow(1 - t, 3);
        this.openProgress = eased;
        this.surfaceEffect.setOpenProgress(this.openProgress);

        const swRadius = eased * 2.6;
        this.shockwaveMesh.scale.set(swRadius, swRadius, 1);
        this.shockwaveMesh.material.opacity = (1.0 - t) * 0.9;
      }
      // Phase 3: Settle
      else if (this.animTime < 1.8) {
        this.openProgress = 1.0;
        this.surfaceEffect.setOpenProgress(1.0);
        this.shockwaveMesh.material.opacity = 0;
        this.floorCrackMesh.material.opacity = Math.max(0, 1.0 - (this.animTime - 1.2));
      } else {
        this.state = 'open';
        this.openProgress = 1.0;
        this.surfaceEffect.setOpenProgress(1.0);
        this.onSequenceComplete?.('open');
      }
    } else if (this.state === 'dissolving') {
      this.animTime += dt;
      const t = Math.min(1.0, this.animTime / 1.0);
      const collapse = Math.pow(1.0 - t, 2.0);
      this.openProgress = collapse;
      this.surfaceEffect.setOpenProgress(this.openProgress);

      if (t >= 1.0) {
        this.state = 'closed';
        this.openProgress = 0;
        this.surfaceEffect.setOpenProgress(0);
        this.onSequenceComplete?.('closed');
      }
    }

    // Update sparks physics
    if (this.sparksPoints && this.sparksPoints.material.opacity > 0.01) {
      const posAttr = this.sparksPoints.geometry.attributes.position;
      let alive = 0;

      for (let i = 0; i < this.sparksCount; i++) {
        const s = this.sparksData[i];
        if (s.life > 0) {
          s.life -= dt / s.maxLife;
          s.velocity.y -= 1.8 * dt; // gravity
          s.velocity.x *= 0.98;
          s.velocity.z *= 0.98;

          const px = posAttr.getX(i) + s.velocity.x * dt;
          const py = posAttr.getY(i) + s.velocity.y * dt;
          const pz = posAttr.getZ(i) + s.velocity.z * dt;

          posAttr.setXYZ(i, px, py, pz);
          alive++;
        }
      }
      posAttr.needsUpdate = true;
      if (alive === 0) this.sparksPoints.material.opacity = 0;
    }
  }

  dispose() {
    if (this.sequenceGroup) {
      this.gateGroup.remove(this.sequenceGroup);
      this.sequenceGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.sequenceGroup = null;
    }
  }
}
