/**
 * reticle.js — AR Surface Scanning Moon Reticle
 * Crescent moon-shaped reticle following the hit-test plane with lock pulse.
 */

import * as THREE from 'three';

export class MoonReticle {
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
    // 1. Crescent Ring Geometry (Custom shader for glowing crescent and stars)
    const ringGeom = new THREE.RingGeometry(0.2, 0.28, 48);
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

          // Crescent cut: moon crescent shape
          float crescent = smoothstep(-0.2, 0.6, sin(angle + uTime * 0.8));

          // 12 star ticks around rim
          float ticks = step(0.85, sin(angle * 12.0));

          vec3 moonColor = vec3(0.87, 0.91, 1.0); // Moon silver #dfe9ff
          vec3 tealColor = vec3(0.24, 0.95, 0.82); // Aurora teal #3df2d0
          vec3 lockedColor = vec3(1.0, 0.62, 0.8); // Rose gold #ff9ecb

          vec3 col = mix(mix(moonColor, tealColor, crescent), lockedColor, uLocked);
          float pulse = 0.75 + 0.25 * sin(uTime * 3.5);

          float alpha = (crescent * 0.7 + ticks * 0.4) * pulse;
          gl_FragColor = vec4(col, alpha);
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

    this.ringMesh = new THREE.Mesh(ringGeom, this.ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.group.add(this.ringMesh);

    // 2. Central star dot
    const dotGeom = new THREE.CircleGeometry(0.035, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x3df2d0,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.dotMesh = new THREE.Mesh(dotGeom, dotMat);
    this.dotMesh.rotation.x = -Math.PI / 2;
    this.dotMesh.position.y = 0.002;
    this.group.add(this.dotMesh);
  }

  setHitResult(hitResult) {
    if (hitResult) {
      this.group.visible = true;
      this.isLocked = true;
      this.targetPosition.copy(hitResult.position);
      this.targetQuaternion.copy(hitResult.orientation);
      this.ringMat.uniforms.uLocked.value = 1.0;
    } else {
      this.group.visible = false;
      this.isLocked = false;
      this.ringMat.uniforms.uLocked.value = 0.0;
    }
  }

  update(dt, time) {
    if (!this.group.visible) return;

    this.ringMat.uniforms.uTime.value = time;

    // Smooth position and rotation lerping
    this.group.position.lerp(this.targetPosition, 0.2);
    this.group.quaternion.slerp(this.targetQuaternion, 0.2);
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.ringMesh.geometry.dispose();
      this.ringMat.dispose();
      this.dotMesh.geometry.dispose();
      this.dotMesh.material.dispose();
      this.group = null;
    }
  }
}
