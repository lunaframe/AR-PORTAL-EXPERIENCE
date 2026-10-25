/**
 * twilightMist.js — Effect 29: Multi-Depth Parallax Mist & Drifting Clouds
 * Layered horizontal mist planes creating deep parallax depth in the twilight world.
 */

import * as THREE from 'three';
import { createSmokeTexture } from '../utils/textures.js';

export class TwilightMistEffect {
  constructor() {
    this.group = null;
    this.clouds = [];
    this.count = 6;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    const smokeTex = createSmokeTexture(128);

    const configs = [
      { width: 8.0, height: 2.2, x: 0, y: 0.6, z: -3.0, speed: 0.08, opacity: 0.35 },
      { width: 12.0, height: 3.0, x: -3.0, y: 1.0, z: -5.5, speed: -0.05, opacity: 0.4 },
      { width: 14.0, height: 3.5, x: 2.5, y: 1.4, z: -8.0, speed: 0.03, opacity: 0.45 },
      { width: 16.0, height: 4.0, x: -1.0, y: 2.0, z: -11.0, speed: -0.02, opacity: 0.5 },
      { width: 10.0, height: 2.5, x: 3.0, y: 0.8, z: -4.5, speed: 0.06, opacity: 0.35 },
      { width: 18.0, height: 4.5, x: 0, y: 2.5, z: -14.0, speed: 0.015, opacity: 0.55 },
    ];

    configs.forEach((cfg) => {
      const geom = new THREE.PlaneGeometry(cfg.width, cfg.height);
      const mat = new THREE.MeshBasicMaterial({
        map: smokeTex,
        color: 0x6d28d9,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      this.group.add(mesh);

      this.clouds.push({
        mesh,
        baseX: cfg.x,
        speed: cfg.speed,
        width: cfg.width,
      });
    });
  }

  setStencilFunc(func) {
    this.clouds.forEach((c) => (c.mesh.material.stencilFunc = func));
  }

  setQuality(level) {
    const limit = level === 'low' ? 2 : (level === 'medium' ? 4 : 6);
    this.clouds.forEach((c, idx) => (c.mesh.visible = idx < limit));
  }

  setTheme(theme) {
    if (!theme) return;
    this.clouds.forEach((c, idx) => {
      const col = idx % 2 === 0 ? theme.secondary : theme.accent1;
      c.mesh.material.color.setRGB(col.r, col.g, col.b);
    });
  }

  update(dt, time, state) {
    if (!this.group) return;

    this.clouds.forEach((c) => {
      c.mesh.position.x += c.speed * dt;
      // Wrap around bounds
      if (c.mesh.position.x > 12) c.mesh.position.x = -12;
      if (c.mesh.position.x < -12) c.mesh.position.x = 12;

      // Gentle vertical wave drift
      c.mesh.position.y += Math.sin(time * 0.8 + c.baseX) * 0.001;
    });
  }

  dispose() {
    if (this.group) {
      this.clouds.forEach((c) => {
        c.mesh.geometry.dispose();
        c.mesh.material.dispose();
      });
      this.clouds = [];
      this.group = null;
    }
  }
}
