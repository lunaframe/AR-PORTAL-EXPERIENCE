/**
 * skyGarden.js — Realm 1: Sky Garden
 * Floating celestial islands with proximity-blooming glowing flowers,
 * harmonic sky-whales gliding overhead, parallax cloud layers, and a gigantic moon.
 */

import * as THREE from 'three';
import { createSoftGlowTexture, createSmokeTexture } from '../utils/textures.js';
import { audioEngine } from '../audio/engine.js';

export class SkyGardenRealm {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Entities
    this.islands = [];
    this.flowers = [];
    this.clouds = [];
    this.whales = [];
    this.moonMesh = null;
    this.moonHalo = null;
    this.shootingStars = [];

    this.stencilFunc = THREE.EqualStencilFunc;
  }

  init() {
    this.initSkyAndMoon();
    this.initFloatingIslands();
    this.initSkyWhales();
    this.initParallaxClouds();
  }

  initSkyAndMoon() {
    // 1. Sky Dome with Aurora Violet & Midnight
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
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float elevation = max(0.0, dir.y);

          // Deep Midnight into Dream Violet and Aurora Teal
          vec3 zenith = vec3(0.04, 0.03, 0.16); // #0b0a2a
          vec3 horizon = vec3(0.48, 0.30, 1.0); // #7c4dff
          vec3 sky = mix(horizon, zenith, elevation);

          // Aurora Ribbon wave in upper sky
          if (elevation > 0.15 && elevation < 0.8) {
            float wave = sin(dir.x * 5.0 + uTime * 0.4 + dir.z * 3.0);
            float ribbon = smoothstep(0.2, 0.45, elevation + wave * 0.1) * (1.0 - smoothstep(0.45, 0.75, elevation + wave * 0.1));
            sky += vec3(0.24, 0.95, 0.82) * ribbon * 0.6; // Aurora teal #3df2d0
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });
    this.skyMesh = new THREE.Mesh(skyGeom, skyMat);
    this.group.add(this.skyMesh);

    // 2. Huge Luminous Moon
    const moonGeom = new THREE.CircleGeometry(2.4, 48);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xdfe9ff, // Moon silver
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.moonMesh.position.set(-6.0, 16.0, -28.0);
    this.moonMesh.lookAt(0, 1.2, 0);
    this.group.add(this.moonMesh);

    // Soft Moon Halo
    const haloTex = createSoftGlowTexture(256);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: 0x3df2d0,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.55,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
      depthWrite: false,
    });
    this.moonHalo = new THREE.Sprite(haloMat);
    this.moonHalo.position.copy(this.moonMesh.position);
    this.moonHalo.scale.set(10.0, 10.0, 1);
    this.group.add(this.moonHalo);
  }

  initFloatingIslands() {
    // Island shapes with mossy rock bodies and grassy surfaces
    const islandConfigs = [
      { x: 0.0, y: -0.4, z: -3.8, radius: 2.2, height: 1.4 },
      { x: -3.2, y: 0.6, z: -5.5, radius: 1.6, height: 1.2 },
      { x: 3.5, y: 0.8, z: -6.0, radius: 1.8, height: 1.3 },
      { x: -1.8, y: 2.4, z: -8.0, radius: 2.0, height: 1.5 },
      { x: 2.6, y: 2.8, z: -9.5, radius: 1.5, height: 1.1 },
    ];

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x141038,
      roughness: 0.85,
      metalness: 0.1,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1d1454,
      emissive: 0x3df2d0,
      emissiveIntensity: 0.15,
      roughness: 0.7,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    islandConfigs.forEach((cfg) => {
      const isGroup = new THREE.Group();
      isGroup.position.set(cfg.x, cfg.y, cfg.z);

      // Underside tapered cone rock
      const coneGeom = new THREE.ConeGeometry(cfg.radius, cfg.height, 12);
      coneGeom.rotateX(Math.PI);
      const cone = new THREE.Mesh(coneGeom, rockMat);
      cone.position.y = -cfg.height * 0.5;
      isGroup.add(cone);

      // Top grassy plateau cylinder
      const topGeom = new THREE.CylinderGeometry(cfg.radius, cfg.radius * 0.95, 0.2, 16);
      const top = new THREE.Mesh(topGeom, grassMat);
      top.position.y = 0.1;
      isGroup.add(top);

      this.group.add(isGroup);
      this.islands.push({ group: isGroup, baseY: cfg.y, seed: Math.random() * 10 });

      // Add blooming flowers on this island surface
      const numFlowers = 6;
      for (let f = 0; f < numFlowers; f++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (cfg.radius * 0.8);
        const fx = Math.cos(angle) * dist;
        const fz = Math.sin(angle) * dist;

        const flGroup = new THREE.Group();
        flGroup.position.set(fx, 0.2, fz);

        // Flower stem
        const stemGeom = new THREE.CylinderGeometry(0.012, 0.016, 0.25, 6);
        stemGeom.translate(0, 0.125, 0);
        const stemMat = new THREE.MeshBasicMaterial({
          color: 0x3df2d0,
          stencilWrite: true,
          stencilRef: 1,
          stencilFunc: this.stencilFunc,
        });
        flGroup.add(new THREE.Mesh(stemGeom, stemMat));

        // Blooming flower petals (5-petal ring)
        const petals = [];
        const petalGeom = new THREE.SphereGeometry(0.045, 8, 8);
        petalGeom.scale(0.5, 1.2, 0.4);

        const petalMat = new THREE.MeshStandardMaterial({
          color: 0xff9ecb, // Rose gold
          emissive: 0xff9ecb,
          emissiveIntensity: 0.6,
          stencilWrite: true,
          stencilRef: 1,
          stencilFunc: this.stencilFunc,
        });

        for (let p = 0; p < 5; p++) {
          const petal = new THREE.Mesh(petalGeom, petalMat);
          const pAngle = (p / 5) * Math.PI * 2;
          petal.position.set(0, 0.25, 0);
          petal.rotation.y = pAngle;
          flGroup.add(petal);
          petals.push(petal);
        }

        isGroup.add(flGroup);
        this.flowers.push({
          group: flGroup,
          worldPos: new THREE.Vector3(),
          petals,
          openAmount: 0,
        });
      }
    });
  }

  initSkyWhales() {
    // 2 majestic sky-whales gliding high overhead
    const whaleConfigs = [
      { startX: -8, y: 6.5, startZ: -12, speed: 0.6, scale: 2.2, phase: 0 },
      { startX: 10, y: 8.5, startZ: -18, speed: -0.45, scale: 2.8, phase: 2.5 },
    ];

    const whaleMat = new THREE.MeshStandardMaterial({
      color: 0x221a60,
      emissive: 0x3df2d0,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.2,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    whaleConfigs.forEach((cfg) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(cfg.startX, cfg.y, cfg.startZ);

      // Torpedo-like smooth body
      const bodyGeom = new THREE.ConeGeometry(0.5, 3.2, 16);
      bodyGeom.rotateZ(-Math.PI / 2);
      const body = new THREE.Mesh(bodyGeom, whaleMat);
      wGroup.add(body);

      // Broad flukes / tail
      const tailGeom = new THREE.BoxGeometry(0.1, 0.05, 1.2);
      const tail = new THREE.Mesh(tailGeom, whaleMat);
      tail.position.set(-1.6, 0, 0);
      wGroup.add(tail);

      // Flippers
      const flipperGeom = new THREE.BoxGeometry(0.6, 0.04, 0.3);
      const leftFlipper = new THREE.Mesh(flipperGeom, whaleMat);
      leftFlipper.position.set(0.4, -0.2, 0.6);
      leftFlipper.rotation.y = 0.4;
      wGroup.add(leftFlipper);

      const rightFlipper = new THREE.Mesh(flipperGeom, whaleMat);
      rightFlipper.position.set(0.4, -0.2, -0.6);
      rightFlipper.rotation.y = -0.4;
      wGroup.add(rightFlipper);

      wGroup.scale.set(cfg.scale, cfg.scale, cfg.scale);
      this.group.add(wGroup);

      this.whales.push({
        group: wGroup,
        tail,
        cfg,
        pos: new THREE.Vector3(cfg.startX, cfg.y, cfg.startZ),
      });
    });
  }

  initParallaxClouds() {
    const smokeTex = createSmokeTexture(128);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: smokeTex,
      color: 0x7c4dff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: this.stencilFunc,
    });

    const cloudLayers = [
      { w: 10, h: 2.8, x: 0, y: 1.2, z: -4.5, speed: 0.08 },
      { w: 14, h: 3.5, x: -4, y: 3.2, z: -7.5, speed: -0.05 },
      { w: 18, h: 4.5, x: 3, y: 5.0, z: -11.0, speed: 0.04 },
    ];

    cloudLayers.forEach((c) => {
      const geom = new THREE.PlaneGeometry(c.w, c.h);
      const mesh = new THREE.Mesh(geom, cloudMat.clone());
      mesh.position.set(c.x, c.y, c.z);
      this.group.add(mesh);
      this.clouds.push({ mesh, baseX: c.x, speed: c.speed });
    });
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
    // 1. Update Sky Dome Shader
    if (this.skyMesh) {
      this.skyMesh.material.uniforms.uTime.value = time;
    }

    // 2. Gentle Dream Drift of Floating Islands
    this.islands.forEach((isl) => {
      isl.group.position.y = isl.baseY + Math.sin(time * 1.2 + isl.seed) * 0.08;
    });

    // 3. Proximity Flower Bloom (open petals when camera gets near)
    const camPos = this.camera.position;
    this.flowers.forEach((fl) => {
      fl.group.getWorldPosition(fl.worldPos);
      const dist = camPos.distanceTo(fl.worldPos);
      const targetOpen = dist < 2.0 ? 1.0 : 0.15;
      fl.openAmount += (targetOpen - fl.openAmount) * (dt * 3.5);

      fl.petals.forEach((p, idx) => {
        const tilt = 0.2 + fl.openAmount * 0.9;
        p.rotation.z = tilt;
      });
    });

    // 4. Gliding Sky-Whales with Harmonic Tail Sway
    this.whales.forEach((w) => {
      w.pos.x += w.cfg.speed * dt;
      if (w.pos.x > 18) w.pos.x = -18;
      if (w.pos.x < -18) w.pos.x = 18;

      w.group.position.x = w.pos.x;
      w.group.position.y = w.cfg.y + Math.sin(time * 0.8 + w.cfg.phase) * 0.35;

      // Tail fluke sway
      w.tail.rotation.y = Math.sin(time * 1.8 + w.cfg.phase) * 0.25;
      w.group.rotation.z = Math.sin(time * 0.9 + w.cfg.phase) * 0.06;
    });

    // 5. Parallax Clouds Drifting
    this.clouds.forEach((c) => {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 16) c.mesh.position.x = -16;
      if (c.mesh.position.x < -16) c.mesh.position.x = 16;
    });

    // 6. Moon breathing pulse
    if (this.moonHalo) {
      const breath = 0.5 + 0.15 * Math.sin(time * 2.0) + (state.audio?.bass || 0) * 0.3;
      this.moonHalo.material.opacity = breath;
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
    this.islands = [];
    this.flowers = [];
    this.whales = [];
    this.clouds = [];
  }
}
