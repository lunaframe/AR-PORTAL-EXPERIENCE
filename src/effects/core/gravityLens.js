/**
 * gravityLens.js — Effect 4: Gravity-Lens Ripple
 * Simulates gravitational spacetime warping and radial optical refraction around the portal rim.
 */

import * as THREE from 'three';

export const GravityLensShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uAudioBass;
    uniform float uIntensity;
    uniform vec3 uColorAccent1;
    uniform vec3 uColorAccent2;

    varying vec2 vUv;
    varying vec3 vViewPosition;

    void main() {
      // Map to centered circle
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);

      // Ring envelope [0.6 to 1.1]
      float ring = smoothstep(0.65, 0.88, r) * (1.0 - smoothstep(0.96, 1.08, r));
      if (ring <= 0.001) discard;

      // Radial gravity wave ripple
      float wave = sin(r * 28.0 - uTime * 5.0 + uAudioBass * 4.0);
      float ripple = pow(max(0.0, wave), 2.5);

      // Chromatic dispersion shimmer
      vec3 col = mix(uColorAccent1, uColorAccent2, sin(r * 15.0 - uTime * 2.0) * 0.5 + 0.5);
      col += ripple * 0.8;

      float alpha = ring * ripple * 0.65 * uIntensity;
      gl_FragColor = vec4(col, alpha);
    }
  `
};

export class GravityLensEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.mesh = null;
    this.geometry = null;
    this.material = null;
  }

  init(scene, camera, renderer) {
    this.geometry = new THREE.PlaneGeometry(2.3, 2.3, 32, 32);
    this.uniforms = {
      uTime: { value: 0 },
      uAudioBass: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorAccent2: { value: new THREE.Color(0xff3cac) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: GravityLensShader.vertexShader,
      fragmentShader: GravityLensShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(0, 1.2, 0.008);
    this.portalGroup.add(this.mesh);
  }

  setIntensity(val) {
    if (this.uniforms) this.uniforms.uIntensity.value = val;
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorAccent2.value.setRGB(theme.accent2.r, theme.accent2.g, theme.accent2.b);
  }

  setQuality(level) {
    if (this.mesh) {
      this.mesh.visible = (level !== 'low');
    }
  }

  update(dt, time, state) {
    if (!this.mesh) return;
    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;
  }

  dispose() {
    if (this.mesh) {
      this.portalGroup.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
      this.mesh = null;
    }
  }
}
