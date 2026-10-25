/**
 * auroraSky.js — Effect 24: Aurora Sky, Star Dome & Shooting Stars
 * Ethereal celestial dome with layered scrolling aurora ribbons and shooting stars.
 */

import * as THREE from 'three';

const AuroraSkyShader = {
  vertexShader: /* glsl */ `
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uTimeOfDay; // 0.0 dusk to 1.0 night
    uniform vec3 uColorPrimary;    // Indigo #1b1464
    uniform vec3 uColorSecondary;  // Violet #6d28d9
    uniform vec3 uColorAccent1;    // Teal #14f1d9
    uniform vec3 uColorAccent2;    // Magenta #ff3cac
    uniform vec3 uShootingStarPos; // xyz + life

    varying vec3 vWorldPosition;
    varying vec2 vUv;

    // Pseudo-random hash
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    void main() {
      vec3 dir = normalize(vWorldPosition);
      float elevation = max(0.0, dir.y);

      // Deep sky gradient
      vec3 duskZenith = vec3(0.08, 0.05, 0.22);
      vec3 nightZenith = vec3(0.02, 0.01, 0.06);
      vec3 skyColor = mix(duskZenith, nightZenith, uTimeOfDay);
      skyColor = mix(skyColor, uColorPrimary * 0.4, 1.0 - elevation);

      // Starfield (twinkling tiny points in upper sky)
      if (elevation > 0.08) {
        vec2 starUv = dir.xz / (elevation + 0.1) * 35.0;
        vec2 starCell = floor(starUv);
        float starRand = hash(starCell);
        if (starRand > 0.94) {
          float twinkle = sin(uTime * 3.0 + starRand * 100.0) * 0.5 + 0.5;
          float starBrightness = pow(starRand, 18.0) * twinkle * (0.4 + uTimeOfDay * 0.6);
          skyColor += vec3(0.9, 0.95, 1.0) * starBrightness;
        }
      }

      // Layered Aurora Curtains
      if (elevation > 0.02 && elevation < 0.75) {
        float h = elevation;
        // Ribbon waves
        float wave1 = sin(dir.x * 4.0 + uTime * 0.35 + dir.z * 2.0);
        float wave2 = cos(dir.x * 7.0 - uTime * 0.25);
        float wave = wave1 * 0.6 + wave2 * 0.4;

        // Ribbon vertical span
        float ribbon1 = smoothstep(0.1, 0.28, h + wave * 0.08) * (1.0 - smoothstep(0.35, 0.55, h + wave * 0.08));
        float ribbon2 = smoothstep(0.2, 0.42, h - wave * 0.06) * (1.0 - smoothstep(0.48, 0.72, h - wave * 0.06));

        vec3 auroraCol1 = mix(uColorAccent1, uColorSecondary, sin(dir.x * 3.0 + uTime * 0.2) * 0.5 + 0.5);
        vec3 auroraCol2 = mix(uColorAccent2, uColorAccent1, cos(dir.z * 2.0 + uTime * 0.3) * 0.5 + 0.5);

        skyColor += auroraCol1 * ribbon1 * 0.75;
        skyColor += auroraCol2 * ribbon2 * 0.6;
      }

      // Shooting Star Streak
      if (uShootingStarPos.z > 0.0) {
        vec2 starDir = normalize(vec2(1.0, -0.4));
        vec2 p = dir.xy - uShootingStarPos.xy;
        float proj = dot(p, starDir);
        vec2 perp = p - starDir * proj;
        if (proj > 0.0 && proj < 0.25 && length(perp) < 0.004) {
          float tailFade = 1.0 - (proj / 0.25);
          skyColor += vec3(1.0, 1.0, 1.0) * tailFade * uShootingStarPos.z * 2.5;
        }
      }

      gl_FragColor = vec4(skyColor, 1.0);
    }
  `
};

export class AuroraSkyEffect {
  constructor() {
    this.mesh = null;
    this.shootingStar = { x: 0, y: 0, life: 0, timer: 3.0 };
  }

  init(scene, camera, renderer) {
    const geom = new THREE.SphereGeometry(60, 48, 32);
    // Invert geometry so it is viewed from inside
    geom.scale(-1, 1, 1);

    this.uniforms = {
      uTime: { value: 0 },
      uTimeOfDay: { value: 0.5 },
      uColorPrimary: { value: new THREE.Color(0x1b1464) },
      uColorSecondary: { value: new THREE.Color(0x6d28d9) },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorAccent2: { value: new THREE.Color(0xff3cac) },
      uShootingStarPos: { value: new THREE.Vector3(0, 0, 0) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: AuroraSkyShader.vertexShader,
      fragmentShader: AuroraSkyShader.fragmentShader,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc, // Only visible through portal when outside
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.set(0, 0, 0);
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorPrimary.value.setRGB(theme.primary.r, theme.primary.g, theme.primary.b);
    this.uniforms.uColorSecondary.value.setRGB(theme.secondary.r, theme.secondary.g, theme.secondary.b);
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorAccent2.value.setRGB(theme.accent2.r, theme.accent2.g, theme.accent2.b);
  }

  setTimeOfDay(val) {
    if (this.uniforms) this.uniforms.uTimeOfDay.value = val;
  }

  setStencilFunc(func) {
    if (this.material) this.material.stencilFunc = func;
  }

  update(dt, time, state) {
    if (!this.mesh) return;
    this.uniforms.uTime.value = time;

    // Shooting star cycle
    this.shootingStar.timer -= dt;
    if (this.shootingStar.timer <= 0) {
      if (this.shootingStar.life <= 0) {
        // Spawn shooting star
        this.shootingStar.x = (Math.random() - 0.5) * 0.8;
        this.shootingStar.y = 0.3 + Math.random() * 0.4;
        this.shootingStar.life = 0.8;
      }
    }

    if (this.shootingStar.life > 0) {
      this.shootingStar.life -= dt;
      this.shootingStar.x += 0.25 * dt;
      this.shootingStar.y -= 0.1 * dt;
      this.uniforms.uShootingStarPos.value.set(
        this.shootingStar.x,
        this.shootingStar.y,
        Math.max(0, this.shootingStar.life / 0.8)
      );

      if (this.shootingStar.life <= 0) {
        this.shootingStar.timer = 5.0 + Math.random() * 8.0;
        this.uniforms.uShootingStarPos.value.set(0, 0, 0);
      }
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.material.dispose();
      this.mesh = null;
    }
  }
}
