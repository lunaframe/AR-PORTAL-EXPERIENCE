/**
 * starLibrary.js — Realm 3: Star Library
 * Floating fluttering books, gaze-connecting glowing constellations,
 * orbiting ringed planets, and warm ascending lanterns.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../utils/textures.js';

export class StarLibraryRealm {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.visible = false;

    this.books = [];
    this.lanterns = [];
    this.planets = [];
    this.constellationLines = [];

    this.stencilFunc = THREE.EqualStencilFunc;
  }

  init() {
    this.initCosmicSky();
    this.initFloatingBooks();
    this.initOrbitingPlanets();
    this.initAscendingLanterns();
    this.initConstellations();
  }

  initCosmicSky() {
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

          // Deep cosmic midnight indigo into violet starfield
          vec3 zenith = vec3(0.03, 0.02, 0.12);
          vec3 horizon = vec3(0.12, 0.08, 0.35);
          vec3 col = mix(horizon, zenith, elevation);

          // Dense star dust
          vec2 starUv = dir.xz / (elevation + 0.1) * 45.0;
          float r = hash(floor(starUv));
          if (r > 0.93) {
            float tw = sin(uTime * 4.0 + r * 60.0) * 0.5 + 0.5;
            col += vec3(1.0, 0.95, 0.8) * pow(r, 12.0) * tw;
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    this.skyMesh = new THREE.Mesh(skyGeom, skyMat);
    this.group.add(this.skyMesh);
  }

  initFloatingBooks() {
    // 8 floating tomes fluttering in 3D space
    const bookConfigs = [
      { x: -1.2, y: 1.5, z: -3.2, rotY: 0.4, scale: 0.9 },
      { x: 1.4, y: 1.8, z: -3.8, rotY: -0.6, scale: 1.1 },
      { x: -2.2, y: 2.2, z: -4.5, rotY: 0.8, scale: 0.85 },
      { x: 2.0, y: 1.2, z: -5.0, rotY: -0.3, scale: 1.0 },
      { x: 0.2, y: 2.6, z: -5.5, rotY: 0.1, scale: 1.2 },
      { x: -1.8, y: 0.9, z: -6.0, rotY: -0.7, scale: 0.95 },
      { x: 1.6, y: 2.4, z: -6.8, rotY: 0.5, scale: 1.05 },
      { x: -0.5, y: 1.6, z: -7.5, rotY: -0.2, scale: 1.15 },
    ];

    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x7c4dff, // Dream violet
      emissive: 0x241858,
      roughness: 0.4,
      metalness: 0.6,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const pageMat = new THREE.MeshBasicMaterial({
      color: 0xfff6dc, // Warm parchment
      side: THREE.DoubleSide,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    bookConfigs.forEach((cfg, idx) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(cfg.x, cfg.y, cfg.z);
      bGroup.rotation.y = cfg.rotY;

      // Book cover (hardcover binder)
      const coverGeom = new THREE.BoxGeometry(0.32, 0.04, 0.42);
      const cover = new THREE.Mesh(coverGeom, coverMat);
      bGroup.add(cover);

      // Open fluttering pages
      const pageGeom = new THREE.PlaneGeometry(0.28, 0.38, 4, 1);
      pageGeom.translate(0.14, 0.02, 0);
      const rightPage = new THREE.Mesh(pageGeom, pageMat);
      bGroup.add(rightPage);

      const leftPage = new THREE.Mesh(pageGeom, pageMat);
      leftPage.rotation.y = Math.PI;
      bGroup.add(leftPage);

      bGroup.scale.set(cfg.scale, cfg.scale, cfg.scale);
      this.group.add(bGroup);

      this.books.push({
        group: bGroup,
        rightPage,
        leftPage,
        baseY: cfg.y,
        phase: idx * 1.2,
      });
    });
  }

  initOrbitingPlanets() {
    // 2 ringed celestial planets in the backdrop
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x3df2d0,
      emissive: 0x145a50,
      roughness: 0.6,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff9ecb,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const pGroup = new THREE.Group();
    pGroup.position.set(6.0, 8.5, -20.0);

    const sphereGeom = new THREE.SphereGeometry(1.4, 24, 24);
    const sphere = new THREE.Mesh(sphereGeom, planetMat);
    pGroup.add(sphere);

    const ringGeom = new THREE.RingGeometry(1.8, 2.6, 32);
    ringGeom.rotateX(Math.PI * 0.4);
    const ring = new THREE.Mesh(ringGeom, ringMat);
    pGroup.add(ring);

    this.group.add(pGroup);
    this.planets.push(pGroup);
  }

  initAscendingLanterns() {
    // Warm floating paper lanterns slowly drifting upward
    const lanternCount = 12;
    const glowTex = createSoftGlowTexture(128);

    const bodyGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.32, 8);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0xffd27a, // Warm lantern #ffd27a
      transparent: true,
      opacity: 0.85,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const haloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffd27a,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    for (let i = 0; i < lanternCount; i++) {
      const lGroup = new THREE.Group();
      const x = (Math.random() - 0.5) * 8.0;
      const y = 0.5 + Math.random() * 4.0;
      const z = -2.5 - Math.random() * 8.0;
      lGroup.position.set(x, y, z);

      const body = new THREE.Mesh(bodyGeom, bodyMat);
      lGroup.add(body);

      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(0.65, 0.65, 1);
      lGroup.add(halo);

      this.group.add(lGroup);
      this.lanterns.push({
        group: lGroup,
        speed: 0.2 + Math.random() * 0.3,
        x, z,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  initConstellations() {
    // Constellation lines connecting glowing star vertices
    const starCoords = [
      new THREE.Vector3(-3.0, 4.5, -12.0),
      new THREE.Vector3(-1.8, 5.8, -12.0),
      new THREE.Vector3(0.0, 5.2, -12.0),
      new THREE.Vector3(1.5, 6.4, -12.0),
      new THREE.Vector3(3.2, 5.0, -12.0),
    ];

    const lineGeom = new THREE.BufferGeometry().setFromPoints(starCoords);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3df2d0,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      stencilWrite: false,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const line = new THREE.Line(lineGeom, lineMat);
    this.group.add(line);
    this.constellationLines.push(line);
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

    // 1. Sky shader update
    if (this.skyMesh) {
      this.skyMesh.material.uniforms.uTime.value = time;
    }

    // 2. Fluttering books pages
    this.books.forEach((b) => {
      b.group.position.y = b.baseY + Math.sin(time * 1.5 + b.phase) * 0.12;
      b.group.rotation.x = Math.sin(time * 1.2 + b.phase) * 0.08;

      const flutter = Math.sin(time * 6.0 + b.phase) * 0.25;
      b.rightPage.rotation.y = flutter;
      b.leftPage.rotation.y = Math.PI - flutter;
    });

    // 3. Ascending warm lanterns
    this.lanterns.forEach((l) => {
      l.group.position.y += l.speed * dt;
      if (l.group.position.y > 6.5) l.group.position.y = 0.4;
      l.group.position.x = l.x + Math.sin(time * 1.5 + l.phase) * 0.1;
    });

    // 4. Orbiting planet rotation
    this.planets.forEach((p) => {
      p.rotation.y += dt * 0.08;
    });
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
    this.books = [];
    this.lanterns = [];
    this.planets = [];
    this.constellationLines = [];
  }
}
