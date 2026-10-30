/**
 * midnightOcean.js — Realm 2: Midnight Ocean
 * Endless calm night sea, bioluminescent wave crests, rising glowing jellyfish orbs,
 * underwater light beams, and buoyant rising air bubbles.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../utils/textures.js';

export class MidnightOceanRealm {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.visible = false;

    this.waterMesh = null;
    this.jellyfish = [];
    this.bubbles = [];
    this.lightBeams = [];
    this.ripples = [
      new THREE.Vector4(0, 0, 0, 0),
      new THREE.Vector4(0, 0, 0, 0),
      new THREE.Vector4(0, 0, 0, 0),
      new THREE.Vector4(0, 0, 0, 0),
    ];
    this.rippleIndex = 0;

    this.stencilFunc = THREE.EqualStencilFunc;
  }

  init() {
    this.initSky();
    this.initBioluminescentOcean();
    this.initRisingJellyfish();
    this.initUnderwaterLightBeams();
    this.initRisingBubbles();
  }

  initSky() {
    // Starry night dome for the ocean
    const skyGeom = new THREE.SphereGeometry(50, 32, 24);
    skyGeom.scale(-1, 1, 1);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vWorldPosition;
        uniform float uTime;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float elevation = max(0.0, dir.y);

          // Deep abyssal navy into midnight violet
          vec3 zenith = vec3(0.02, 0.02, 0.10); // #0b0a2a
          vec3 horizon = vec3(0.08, 0.05, 0.28);
          vec3 col = mix(horizon, zenith, elevation);

          // Ocean stars reflection
          if (elevation > 0.05) {
            vec2 starUv = dir.xz / (elevation + 0.1) * 35.0;
            float r = hash(floor(starUv));
            if (r > 0.95) {
              float tw = sin(uTime * 3.0 + r * 50.0) * 0.5 + 0.5;
              col += vec3(0.85, 0.92, 1.0) * pow(r, 15.0) * tw;
            }
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });
    this.skyMesh = new THREE.Mesh(skyGeom, skyMat);
    this.group.add(this.skyMesh);
  }

  initBioluminescentOcean() {
    // Ocean plane at y = -0.1 extending from doorway
    const waterGeom = new THREE.PlaneGeometry(60, 60, 64, 64);
    waterGeom.rotateX(-Math.PI / 2);

    const waterMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uAudioBass;
        uniform vec4 uRipples[4];
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
          vec2 p = vWorldPosition.xz;

          // Rolling ocean swells
          float wave1 = sin(p.x * 0.6 + uTime * 1.2 + p.y * 0.4);
          float wave2 = cos(p.y * 0.8 - uTime * 0.9 + p.x * 0.5);
          float swells = wave1 * 0.5 + wave2 * 0.5;

          // Crest foam illumination (bioluminescent crest glow)
          float crest = pow(max(0.0, swells + 0.35), 4.5);

          // Interactive ripples
          float rippleSum = 0.0;
          for (int i = 0; i < 4; i++) {
            if (uRipples[i].w > 0.001) {
              float d = length(p - uRipples[i].xy);
              float t = uRipples[i].z;
              float wf = d - t * 2.0;
              if (wf < 0.25 && d < t * 2.5) {
                rippleSum += sin(wf * 16.0) * exp(-d * 0.7) * exp(-t * 1.5) * uRipples[i].w;
              }
            }
          }

          vec3 oceanDeep = vec3(0.04, 0.03, 0.16); // Midnight
          vec3 oceanGlow = vec3(0.24, 0.95, 0.82); // Aurora teal #3df2d0
          vec3 crestRose = vec3(1.0, 0.62, 0.8);  // Rose gold #ff9ecb

          vec3 water = mix(oceanDeep, oceanGlow * 0.5, swells * 0.4 + 0.5);
          water += crestRose * crest * 1.2;
          water += vec3(0.9, 0.96, 1.0) * pow(max(0.0, rippleSum), 3.0) * 1.5;
          water += oceanGlow * (uAudioBass * 0.4);

          gl_FragColor = vec4(water, 0.92);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uAudioBass: { value: 0 },
        uRipples: { value: this.ripples },
      },
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.position.set(0, -0.1, -15);
    this.group.add(this.waterMesh);
  }

  initRisingJellyfish() {
    // 6 floating jellyfish orbs slowly bobbing and rising from below
    const jellyfishConfigs = [
      { x: -1.8, y: 0.6, z: -3.5, size: 0.25, phase: 0.5 },
      { x: 1.5, y: 1.2, z: -4.8, size: 0.32, phase: 1.8 },
      { x: 0.0, y: 0.8, z: -6.2, size: 0.28, phase: 3.2 },
      { x: -2.8, y: 1.6, z: -7.5, size: 0.38, phase: 4.5 },
      { x: 2.2, y: 1.0, z: -8.8, size: 0.3, phase: 2.1 },
      { x: -0.5, y: 1.9, z: -10.5, size: 0.42, phase: 5.6 },
    ];

    const bellGeom = new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    bellGeom.scale(1.0, 0.7, 1.0);

    const bellMat = new THREE.MeshBasicMaterial({
      color: 0x3df2d0,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
      depthWrite: false,
    });

    const tentacleMat = new THREE.LineBasicMaterial({
      color: 0xff9ecb,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    jellyfishConfigs.forEach((cfg) => {
      const jGroup = new THREE.Group();
      jGroup.position.set(cfg.x, cfg.y, cfg.z);

      const bell = new THREE.Mesh(bellGeom, bellMat.clone());
      jGroup.add(bell);

      // 4 tentacles
      const tentacles = [];
      for (let t = 0; t < 4; t++) {
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(8 * 3);
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const line = new THREE.Line(geom, tentacleMat.clone());
        jGroup.add(line);
        tentacles.push({ line, pos, angle: (t / 4) * Math.PI * 2 });
      }

      jGroup.scale.set(cfg.size * 3.5, cfg.size * 3.5, cfg.size * 3.5);
      this.group.add(jGroup);

      this.jellyfish.push({
        group: jGroup,
        bell,
        tentacles,
        baseY: cfg.y,
        phase: cfg.phase,
      });
    });
  }

  initUnderwaterLightBeams() {
    // Translucent light cones shining upward from beneath the ocean surface
    const coneGeom = new THREE.ConeGeometry(0.8, 4.0, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x3df2d0,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const beamPositions = [
      [-2.5, 0.8, -5.0],
      [2.0, 0.6, -6.5],
      [-0.5, 1.0, -8.0],
    ];

    beamPositions.forEach((pos) => {
      const cone = new THREE.Mesh(coneGeom, beamMat.clone());
      cone.position.set(...pos);
      this.group.add(cone);
      this.lightBeams.push(cone);
    });
  }

  initRisingBubbles() {
    const bubbleCount = 45;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(bubbleCount * 3);
    const glowTex = createSoftGlowTexture(64);

    for (let i = 0; i < bubbleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.0;
      positions[i * 3 + 1] = Math.random() * 3.0;
      positions[i * 3 + 2] = -2.0 - Math.random() * 8.0;

      this.bubbles.push({
        x: positions[i * 3],
        y: positions[i * 3 + 1],
        z: positions[i * 3 + 2],
        speed: 0.35 + Math.random() * 0.45,
        wobble: Math.random() * 5.0,
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.1,
      map: glowTex,
      color: 0x3df2d0,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    this.bubblePoints = new THREE.Points(geom, mat);
    this.group.add(this.bubblePoints);
  }

  spawnRipple(x, z) {
    this.ripples[this.rippleIndex].set(x, z, 0.0, 1.0);
    this.rippleIndex = (this.rippleIndex + 1) % 4;
  }

  setStencilFunc(func) {
    this.stencilFunc = func;
    this.group.traverse((obj) => {
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => (m.stencilFunc = func));
        else obj.material.stencilFunc = func;
      }
    });
  }

  update(dt, time, state) {
    if (!this.group.visible) return;

    // 1. Water shader & ripple progress
    if (this.waterMesh) {
      this.waterMesh.material.uniforms.uTime.value = time;
      this.waterMesh.material.uniforms.uAudioBass.value = state.audio?.bass || 0;

      for (let i = 0; i < 4; i++) {
        if (this.ripples[i].w > 0.001) {
          this.ripples[i].z += dt;
          this.ripples[i].w *= Math.pow(0.5, dt);
        }
      }
    }

    // 2. Jellyfish swimming pulsations
    const bass = state.audio?.bass || 0;
    this.jellyfish.forEach((jf) => {
      const pulse = Math.sin(time * 2.2 + jf.phase);
      const isPushing = pulse > 0;
      const bellScaleY = 1.0 + (isPushing ? 0.35 : -0.15) * pulse + bass * 0.25;

      jf.bell.scale.set(1.0 / Math.sqrt(bellScaleY), bellScaleY, 1.0 / Math.sqrt(bellScaleY));
      jf.group.position.y = jf.baseY + Math.sin(time * 0.8 + jf.phase) * 0.25;

      // Update tentacle lines
      jf.tentacles.forEach((tent) => {
        const pos = tent.pos;
        for (let i = 0; i < 8; i++) {
          const y = -i * 0.18;
          const sway = Math.sin(time * 3.0 + i * 0.6 + tent.angle) * (i * 0.025);
          pos[i * 3] = Math.cos(tent.angle) * 0.12 + sway;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = Math.sin(tent.angle) * 0.12 + sway;
        }
        tent.line.geometry.attributes.position.needsUpdate = true;
      });
    });

    // 3. Light beams rotation & breathing
    this.lightBeams.forEach((b, idx) => {
      b.rotation.y = time * 0.2 + idx;
      b.material.opacity = 0.18 + 0.12 * Math.sin(time * 1.5 + idx);
    });

    // 4. Rising bubbles physics
    if (this.bubblePoints) {
      const posAttr = this.bubblePoints.geometry.attributes.position;
      for (let i = 0; i < this.bubbles.length; i++) {
        const b = this.bubbles[i];
        b.y += b.speed * dt;
        if (b.y > 3.2) b.y = 0.0;

        const x = b.x + Math.sin(time * 2.0 + b.wobble) * 0.04;
        posAttr.setXYZ(i, x, b.y, b.z);
      }
      posAttr.needsUpdate = true;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    this.jellyfish = [];
    this.bubbles = [];
    this.lightBeams = [];
  }
}
