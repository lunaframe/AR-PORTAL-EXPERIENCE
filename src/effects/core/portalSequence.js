/**
 * portalSequence.js — Effects 6 & 7: Cinematic Portal Opening & Closing Sequences
 * 
 * Opening:
 * 1. Pinpoint singularity of intense light appears
 * 2. Expanding energetic ring + expanding shockwave plane
 * 3. Screen flash + vignette pulse + cinematic letterbox
 * 4. Burst of 350+ velocity-driven sparks exploding outward
 * 5. Haptic vibration pulses (navigator.vibrate)
 * 
 * Closing:
 * 1. Accelerated inward gravitational collapse
 * 2. Particles dragged into center
 * 3. Implosion into final glowing dot and silent dissipation
 */

import * as THREE from 'three';
import { createSparkTexture } from '../../utils/textures.js';
import { audioEngine } from '../../audio/engine.js';

export class PortalSequenceController {
  constructor(portalGroup, vortexEffect) {
    this.portalGroup = portalGroup;
    this.vortexEffect = vortexEffect;

    this.state = 'closed'; // 'closed' | 'opening' | 'open' | 'closing'
    this.animTime = 0;
    this.openProgress = 0; // 0 to 1

    // Shockwave Mesh
    this.shockwaveMesh = null;
    this.shockwaveProgress = 0;

    // Sparks Burst System
    this.sparksCount = 350;
    this.sparksPoints = null;
    this.sparksData = [];

    // Pinpoint singularity core sprite
    this.pinpointSprite = null;

    // Event callbacks
    this.onSequenceComplete = null;
    this.onFlashTrigger = null;
    this.onVignettePulse = null;
    this.onLetterboxToggle = null;
  }

  init(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.sequenceGroup = new THREE.Group();
    this.sequenceGroup.position.set(0, 1.2, 0.015);
    this.portalGroup.add(this.sequenceGroup);

    // 1. Expanding Shockwave Ring Mesh
    const ringGeom = new THREE.RingGeometry(0.1, 0.22, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x14f1d9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shockwaveMesh = new THREE.Mesh(ringGeom, ringMat);
    this.sequenceGroup.add(this.shockwaveMesh);

    // 2. Pinpoint core sprite
    const sparkTex = createSparkTexture(128);
    const pinMat = new THREE.SpriteMaterial({
      map: sparkTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pinpointSprite = new THREE.Sprite(pinMat);
    this.pinpointSprite.scale.set(0.1, 0.1, 1);
    this.sequenceGroup.add(this.pinpointSprite);

    // 3. Sparks Burst Particles
    const sparkGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.sparksCount * 3);
    const colors = new Float32Array(this.sparksCount * 3);
    const sizes = new Float32Array(this.sparksCount);

    const teal = new THREE.Color(0x14f1d9);
    const magenta = new THREE.Color(0xff3cac);
    const white = new THREE.Color(0xffffff);

    for (let i = 0; i < this.sparksCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const col = Math.random() < 0.4 ? white : (Math.random() < 0.5 ? teal : magenta);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = 0.08 + Math.random() * 0.12;

      this.sparksData.push({
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0,
      });
    }

    sparkGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    sparkGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const sparkMat = new THREE.PointsMaterial({
      size: 0.14,
      map: sparkTex,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.sparksPoints = new THREE.Points(sparkGeom, sparkMat);
    this.sequenceGroup.add(this.sparksPoints);
  }

  /**
   * Triggers cinematic opening animation
   */
  open() {
    this.state = 'opening';
    this.animTime = 0;
    this.openProgress = 0;
    this.vortexEffect.setOpenProgress(0);

    // Play procedural opening audio swell
    audioEngine.playOpeningSwell(this.portalGroup.position);

    // Haptic feedback sequence: tap then heavy thud
    if (navigator.vibrate) {
      try {
        navigator.vibrate([30, 80, 140]);
      } catch (e) {}
    }

    // Trigger letterbox cinema bars sliding in
    this.onLetterboxToggle?.(true);
  }

  /**
   * Triggers implosion closing animation
   */
  close() {
    this.state = 'closing';
    this.animTime = 0;

    // Haptic buzz
    if (navigator.vibrate) {
      try {
        navigator.vibrate([50, 40, 20]);
      } catch (e) {}
    }

    this.onLetterboxToggle?.(false);
  }

  triggerSparksBurst() {
    const posAttr = this.sparksPoints.geometry.attributes.position;
    for (let i = 0; i < this.sparksCount; i++) {
      posAttr.setXYZ(i, 0, 0, 0);

      // Spherical direction with forward bias
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 2.0 + Math.random() * 4.5;

      const vx = Math.cos(phi) * Math.cos(theta) * speed;
      const vy = Math.cos(phi) * Math.sin(theta) * speed;
      const vz = (Math.sin(phi) * 0.4 + (Math.random() - 0.2)) * speed;

      this.sparksData[i].velocity.set(vx, vy, vz);
      this.sparksData[i].life = 1.0;
      this.sparksData[i].maxLife = 0.8 + Math.random() * 1.2;
    }
    posAttr.needsUpdate = true;
    this.sparksPoints.material.opacity = 1.0;
  }

  update(dt, time, state) {
    if (!this.sequenceGroup) return;

    if (this.state === 'opening') {
      this.animTime += dt;

      // Phase 1 (0.0 - 0.4s): Pinpoint of light grows
      if (this.animTime < 0.4) {
        const t = this.animTime / 0.4;
        this.pinpointSprite.material.opacity = t;
        const s = 0.05 + t * 0.45;
        this.pinpointSprite.scale.set(s, s, 1);
        this.vortexEffect.setOpenProgress(0.01);
      }
      // Phase 2 (0.4 - 1.2s): Shockwave expands, screen flash, sparks ignite
      else if (this.animTime < 1.2) {
        if (this.animTime - dt < 0.4) {
          // Flash point detonation!
          this.triggerSparksBurst();
          this.onFlashTrigger?.();
          this.onVignettePulse?.();
        }

        const t = (this.animTime - 0.4) / 0.8;
        // Cubic easing out for aperture expansion
        const eased = 1 - Math.pow(1 - t, 3);
        this.openProgress = eased;
        this.vortexEffect.setOpenProgress(this.openProgress);

        // Pinpoint shrinks and dissolves
        this.pinpointSprite.material.opacity = Math.max(0, 1.0 - t * 2.0);

        // Shockwave expansion
        const swRadius = eased * 2.8;
        this.shockwaveMesh.scale.set(swRadius, swRadius, 1);
        this.shockwaveMesh.material.opacity = (1.0 - t) * 0.9;
      }
      // Phase 3 (1.2 - 1.8s): Settling into idle open
      else if (this.animTime < 1.8) {
        this.openProgress = 1.0;
        this.vortexEffect.setOpenProgress(1.0);
        this.shockwaveMesh.material.opacity = 0;
        this.pinpointSprite.material.opacity = 0;
      } else {
        this.state = 'open';
        this.openProgress = 1.0;
        this.vortexEffect.setOpenProgress(1.0);
        this.onSequenceComplete?.('open');
      }
    } else if (this.state === 'closing') {
      this.animTime += dt;
      const duration = 0.9;
      const t = Math.min(1.0, this.animTime / duration);

      // Accelerating collapse into center
      const collapse = Math.pow(1.0 - t, 2.5);
      this.openProgress = collapse;
      this.vortexEffect.setOpenProgress(this.openProgress);

      // Singularity dot appears near end
      if (t > 0.6) {
        const dotAlpha = (1.0 - (t - 0.6) / 0.4);
        this.pinpointSprite.material.opacity = dotAlpha;
        this.pinpointSprite.scale.set(0.15 * dotAlpha, 0.15 * dotAlpha, 1);
      }

      if (t >= 1.0) {
        this.state = 'closed';
        this.openProgress = 0;
        this.vortexEffect.setOpenProgress(0);
        this.pinpointSprite.material.opacity = 0;
        this.onSequenceComplete?.('closed');
      }
    }

    // Update sparks burst physics
    if (this.sparksPoints && this.sparksPoints.material.opacity > 0.01) {
      const posAttr = this.sparksPoints.geometry.attributes.position;
      let activeSparks = 0;

      for (let i = 0; i < this.sparksCount; i++) {
        const spark = this.sparksData[i];
        if (spark.life > 0) {
          spark.life -= dt / spark.maxLife;

          // Drag and gravity
          spark.velocity.x *= 0.97;
          spark.velocity.y = (spark.velocity.y - 1.8 * dt) * 0.97;
          spark.velocity.z *= 0.97;

          const px = posAttr.getX(i) + spark.velocity.x * dt;
          const py = posAttr.getY(i) + spark.velocity.y * dt;
          const pz = posAttr.getZ(i) + spark.velocity.z * dt;

          posAttr.setXYZ(i, px, py, pz);
          activeSparks++;
        }
      }

      posAttr.needsUpdate = true;
      if (activeSparks === 0) {
        this.sparksPoints.material.opacity = 0;
      }
    }
  }

  dispose() {
    if (this.sequenceGroup) {
      this.portalGroup.remove(this.sequenceGroup);
      this.shockwaveMesh.geometry.dispose();
      this.shockwaveMesh.material.dispose();
      this.pinpointSprite.material.dispose();
      this.sparksPoints.geometry.dispose();
      this.sparksPoints.material.dispose();
      this.sparksData = [];
      this.sequenceGroup = null;
    }
  }
}
