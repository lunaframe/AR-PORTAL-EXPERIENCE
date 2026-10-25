/**
 * reticle.js — AR Surface Scanning & Placement Reticle
 * Rotating ring with ticks, inner pulsing beacon, and smooth surface snapping.
 */

import * as THREE from 'three';

export class ScanningReticle {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.isLocked = false;
    this.targetPosition = new THREE.Vector3();
    this.targetQuaternion = new THREE.Quaternion();

    this.initMeshes();
  }

  initMeshes() {
    // 1. Outer Ring with Ticks (ShaderMaterial)
    const ringGeom = new THREE.RingGeometry(0.24, 0.28, 64);
    this.ringMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uLocked;
        varying vec2 vUv;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float angle = atan(p.y, p.x);
          float dist = length(p);

          // 24 rotating ticks around ring
          float ticks = sin((angle + uTime * 1.5) * 24.0);
          float tickMask = step(0.1, ticks);

          vec3 baseColor = mix(vec3(0.08, 0.94, 0.85), vec3(1.0, 0.24, 0.67), uLocked);
          float pulse = 0.7 + 0.3 * sin(uTime * 4.0);

          gl_FragColor = vec4(baseColor * pulse, tickMask * 0.9);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uLocked: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.outerRing = new THREE.Mesh(ringGeom, this.ringMat);
    this.outerRing.rotation.x = -Math.PI / 2;
    this.group.add(this.outerRing);

    // 2. Center beacon dot
    const dotGeom = new THREE.CircleGeometry(0.04, 32);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x14f1d9,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.centerDot = new THREE.Mesh(dotGeom, dotMat);
    this.centerDot.rotation.x = -Math.PI / 2;
    this.centerDot.position.y = 0.002;
    this.group.add(this.centerDot);
  }

  setHitResult(hitResult) {
    if (hitResult) {
      this.group.visible = true;
      this.isLocked = true;
      this.targetPosition.copy(hitResult.position);
      this.targetQuaternion.copy(hitResult.orientation);
      this.ringMat.uniforms.uLocked.value = 1.0;
    } else {
      this.isLocked = false;
      this.ringMat.uniforms.uLocked.value = 0.0;
    }
  }

  update(dt, time) {
    if (!this.group.visible) return;

    this.ringMat.uniforms.uTime.value = time;

    // Smooth lerp to surface position
    this.group.position.lerp(this.targetPosition, 0.25);
    this.group.quaternion.slerp(this.targetQuaternion, 0.25);

    // Subtle scale breathing
    const scale = 1.0 + 0.06 * Math.sin(time * 5.0);
    this.group.scale.set(scale, scale, scale);
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.outerRing.geometry.dispose();
      this.outerRing.material.dispose();
      this.centerDot.geometry.dispose();
      this.centerDot.material.dispose();
      this.group = null;
    }
  }
}
