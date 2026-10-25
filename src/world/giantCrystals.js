/**
 * giantCrystals.js — Effect 28: Giant Faceted Spire Crystals
 * Tall faceted crystals with strong edge fresnel, internal luminescence, and audio pulse.
 */

import * as THREE from 'three';

const CrystalShader = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uAudioBass;
    uniform float uAudioMid;
    uniform float uIntensity;
    uniform vec3 uColorAccent1;
    uniform vec3 uColorAccent2;
    uniform vec3 uColorHighlight;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Glassy fresnel edge glow
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.6);

      // Internal resonance driven by bass and mid frequencies
      float internalGlow = 0.4 + (uAudioBass * 1.5 + uAudioMid * 0.8) + 0.15 * sin(uTime * 2.5 + vUv.y * 6.0);

      // Gradient color blend from bottom to tip
      vec3 col = mix(uColorAccent2 * 0.6, uColorAccent1, vUv.y);
      col += uColorHighlight * fresnel * 1.6;
      col += uColorAccent1 * internalGlow * 0.8;

      gl_FragColor = vec4(col * uIntensity, 0.88);
    }
  `
};

export class GiantCrystalsEffect {
  constructor() {
    this.group = null;
    this.crystals = [];
    this.count = 8;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();

    // 6-sided faceted spire crystal geometry
    const geom = new THREE.CylinderGeometry(0.0, 0.42, 2.8, 6);
    geom.translate(0, 1.4, 0);

    this.uniforms = {
      uTime: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorAccent2: { value: new THREE.Color(0xff3cac) },
      uColorHighlight: { value: new THREE.Color(0xe8f7ff) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: CrystalShader.vertexShader,
      fragmentShader: CrystalShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.EqualStencilFunc,
    });

    const positions = [
      { x: -2.8, z: -3.5, scale: 1.4, tiltX: 0.15, tiltZ: 0.2 },
      { x: 2.6, z: -4.2, scale: 1.6, tiltX: -0.1, tiltZ: -0.25 },
      { x: -3.5, z: -6.0, scale: 2.1, tiltX: 0.2, tiltZ: 0.1 },
      { x: 3.2, z: -5.8, scale: 1.8, tiltX: -0.15, tiltZ: -0.18 },
      { x: -1.2, z: -7.2, scale: 2.4, tiltX: 0.05, tiltZ: -0.1 },
      { x: 1.5, z: -7.0, scale: 2.2, tiltX: -0.1, tiltZ: 0.15 },
      { x: -4.5, z: -4.0, scale: 1.3, tiltX: 0.25, tiltZ: 0.2 },
      { x: 4.4, z: -3.8, scale: 1.2, tiltX: -0.2, tiltZ: -0.2 },
    ];

    positions.forEach((p) => {
      const mesh = new THREE.Mesh(geom, this.material);
      mesh.position.set(p.x, -0.05, p.z);
      mesh.rotation.set(p.tiltX, Math.random() * Math.PI, p.tiltZ);
      mesh.scale.set(p.scale, p.scale, p.scale);
      this.group.add(mesh);
      this.crystals.push(mesh);
    });
  }

  setStencilFunc(func) {
    if (this.material) this.material.stencilFunc = func;
  }

  setQuality(level) {
    const lim = level === 'low' ? 4 : (level === 'medium' ? 6 : 8);
    this.crystals.forEach((c, idx) => (c.visible = idx < lim));
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorAccent2.value.setRGB(theme.accent2.r, theme.accent2.g, theme.accent2.b);
    this.uniforms.uColorHighlight.value.setRGB(theme.highlight.r, theme.highlight.g, theme.highlight.b);
  }

  update(dt, time, state) {
    if (!this.group) return;
    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;
    this.uniforms.uAudioMid.value = state.audio?.mid || 0;
  }

  dispose() {
    if (this.group) {
      this.crystals.forEach((c) => c.geometry.dispose());
      this.material?.dispose();
      this.crystals = [];
      this.group = null;
    }
  }
}
