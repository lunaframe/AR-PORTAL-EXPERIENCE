/**
 * reflectiveWater.js — Effect 27: Reflective Bioluminescent Water Plane
 * Shimmering ground mirror with interactive ripples spawning where the user taps.
 */

import * as THREE from 'three';

const WaterShader = {
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
    uniform float uIntensity;
    uniform vec3 uColorPrimary;   // Indigo
    uniform vec3 uColorSecondary; // Violet
    uniform vec3 uColorAccent1;   // Teal
    uniform vec4 uRipples[4];     // xy: center, z: time, w: amplitude

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vec2 p = vWorldPosition.xz;

      // Base undulating waves
      float wave1 = sin(p.x * 2.5 + uTime * 1.5 + p.y * 1.2);
      float wave2 = cos(p.y * 3.2 - uTime * 1.2 + p.x * 1.8);
      float waves = wave1 * 0.5 + wave2 * 0.5;

      // Interactive tap ripples
      float rippleTotal = 0.0;
      for (int i = 0; i < 4; i++) {
        if (uRipples[i].w > 0.001) {
          float d = length(p - uRipples[i].xy);
          float t = uRipples[i].z;
          float waveFront = d - t * 2.2;
          float ring = sin(waveFront * 14.0) * exp(-d * 0.8) * exp(-t * 1.2) * uRipples[i].w;
          if (waveFront < 0.2 && d < t * 2.5) {
            rippleTotal += ring;
          }
        }
      }

      // Fresnel reflection sheen
      vec3 waterColor = mix(uColorPrimary * 0.6, uColorSecondary * 0.8, waves * 0.3 + 0.5);
      waterColor += uColorAccent1 * pow(max(0.0, waves + rippleTotal), 3.0) * 0.8;
      waterColor += vec3(0.9, 0.98, 1.0) * pow(max(0.0, rippleTotal), 4.0) * 1.5;

      // Bass wave swell
      waterColor += uColorAccent1 * (uAudioBass * 0.35);

      gl_FragColor = vec4(waterColor * uIntensity, 0.92);
    }
  `
};

export class ReflectiveWaterEffect {
  constructor() {
    this.mesh = null;
    this.ripples = [
      { x: 0, z: -2.5, time: 99, amp: 0 },
      { x: 0, z: -2.5, time: 99, amp: 0 },
      { x: 0, z: -2.5, time: 99, amp: 0 },
      { x: 0, z: -2.5, time: 99, amp: 0 },
    ];
    this.rippleIdx = 0;
  }

  init(scene, camera, renderer) {
    const geom = new THREE.PlaneGeometry(35, 35, 64, 64);
    geom.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uAudioBass: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorPrimary: { value: new THREE.Color(0x1b1464) },
      uColorSecondary: { value: new THREE.Color(0x6d28d9) },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uRipples: {
        value: [
          new THREE.Vector4(0, 0, 99, 0),
          new THREE.Vector4(0, 0, 99, 0),
          new THREE.Vector4(0, 0, 99, 0),
          new THREE.Vector4(0, 0, 99, 0),
        ],
      },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: WaterShader.vertexShader,
      fragmentShader: WaterShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.set(0, -0.05, 0); // Flat on ground level
  }

  spawnRipple(x, z) {
    const r = this.ripples[this.rippleIdx];
    r.x = x;
    r.z = z;
    r.time = 0;
    r.amp = 1.0;
    this.rippleIdx = (this.rippleIdx + 1) % this.ripples.length;
  }

  setStencilFunc(func) {
    if (this.material) this.material.stencilFunc = func;
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorPrimary.value.setRGB(theme.primary.r, theme.primary.g, theme.primary.b);
    this.uniforms.uColorSecondary.value.setRGB(theme.secondary.r, theme.secondary.g, theme.secondary.b);
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
  }

  update(dt, time, state) {
    if (!this.mesh) return;

    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;

    // Update ripples
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      if (r.amp > 0.001) {
        r.time += dt;
        r.amp = Math.max(0, 1.0 - r.time / 2.2);
        this.uniforms.uRipples.value[i].set(r.x, r.z, r.time, r.amp);
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
