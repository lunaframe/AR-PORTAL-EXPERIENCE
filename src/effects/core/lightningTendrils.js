/**
 * lightningTendrils.js — Effect 5: Lightning Tendrils
 * Procedural branching electric arcs crawling from the portal rim toward the ground.
 */

import * as THREE from 'three';

export class LightningTendrilsEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.linesGroup = null;
    this.boltCount = 5;
    this.bolts = [];
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.linesGroup = new THREE.Group();
    this.linesGroup.position.set(0, 1.2, 0.01);
    this.portalGroup.add(this.linesGroup);

    this.material = new THREE.LineBasicMaterial({
      color: 0x14f1d9,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < this.boltCount; i++) {
      const geom = new THREE.BufferGeometry();
      const maxPoints = 24;
      const positions = new Float32Array(maxPoints * 3);
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setDrawRange(0, 0);

      const line = new THREE.Line(geom, this.material.clone());
      this.linesGroup.add(line);

      this.bolts.push({
        line,
        geom,
        timer: Math.random() * 0.4,
        duration: 0.15 + Math.random() * 0.25,
        active: false,
        sourceAngle: -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6, // Lower half of rim
      });
    }
  }

  setIntensity(val) {
    this.intensity = val;
  }

  setTheme(theme) {
    if (!theme) return;
    this.bolts.forEach((b, idx) => {
      const c = idx % 2 === 0 ? theme.accent1 : theme.accent2;
      b.line.material.color.setRGB(c.r, c.g, c.b);
    });
  }

  setQuality(level) {
    if (level === 'low') {
      this.bolts.forEach((b, idx) => {
        b.line.visible = idx < 2;
      });
    } else if (level === 'medium') {
      this.bolts.forEach((b, idx) => {
        b.line.visible = idx < 4;
      });
    } else {
      this.bolts.forEach((b) => {
        b.line.visible = true;
      });
    }
  }

  generateBoltPath(start, end, segments, jitter) {
    const points = [start];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const mid = new THREE.Vector3().lerpVectors(start, end, t);
      // Lateral jitter perpendicular to travel
      mid.x += (Math.random() - 0.5) * jitter;
      mid.y += (Math.random() - 0.5) * jitter * 0.5;
      mid.z += (Math.random() - 0.5) * jitter;
      points.push(mid);
    }
    points.push(end);
    return points;
  }

  update(dt, time, state) {
    if (!this.linesGroup) return;

    const treble = state.audio?.treble || 0;
    const bass = state.audio?.bass || 0;

    this.bolts.forEach((bolt) => {
      bolt.timer -= dt;

      if (bolt.timer <= 0) {
        // Trigger bolt with chance boosted by audio energy
        if (Math.random() < (0.35 + treble * 0.5 + bass * 0.4)) {
          bolt.active = true;
          bolt.duration = 0.1 + Math.random() * 0.2;
          bolt.timer = bolt.duration + 0.15 + Math.random() * 0.4;

          // Start on rim (radius 0.95m)
          const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.5;
          const start = new THREE.Vector3(
            Math.cos(angle) * 0.95,
            Math.sin(angle) * 0.95,
            (Math.random() - 0.5) * 0.05
          );

          // Ground target (portal center is at y=1.2, so floor is at y=-1.2 in local space)
          const end = new THREE.Vector3(
            start.x + (Math.random() - 0.5) * 0.4,
            -1.2,
            start.z + (Math.random() - 0.5) * 0.3
          );

          const segments = 12 + Math.floor(Math.random() * 6);
          const path = this.generateBoltPath(start, end, segments, 0.12);

          const posAttr = bolt.geom.attributes.position;
          for (let p = 0; p < path.length; p++) {
            posAttr.setXYZ(p, path[p].x, path[p].y, path[p].z);
          }
          posAttr.needsUpdate = true;
          bolt.geom.setDrawRange(0, path.length);
          bolt.line.material.opacity = (0.7 + Math.random() * 0.3) * this.intensity;
        } else {
          bolt.active = false;
          bolt.timer = 0.1 + Math.random() * 0.2;
          bolt.geom.setDrawRange(0, 0);
        }
      } else if (bolt.active) {
        // Fast flicker and fade
        const remaining = bolt.timer / bolt.duration;
        bolt.line.material.opacity = Math.max(0, remaining * (Math.random() > 0.3 ? 0.9 : 0.2) * this.intensity);
      } else {
        bolt.geom.setDrawRange(0, 0);
      }
    });
  }

  dispose() {
    if (this.linesGroup) {
      this.portalGroup.remove(this.linesGroup);
      this.bolts.forEach((b) => {
        b.geom.dispose();
        b.line.material.dispose();
      });
      this.bolts = [];
      this.linesGroup = null;
    }
  }
}
