/**
 * floorGlow.js — Effect 17: Floor Glow Decal & Contact Shadow
 * Soft radial ground plane decal with color-shifting glow and central contact grounding shadow.
 */

import * as THREE from 'three';

const FloorGlowShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uAudioBass;
    uniform float uIntensity;
    uniform vec3 uColorAccent1;
    uniform vec3 uColorAccent2;
    uniform vec3 uColorPrimary;

    varying vec2 vUv;

    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      // Elliptical deformation matching portal depth
      p.y *= 1.35;
      float dist = length(p);

      if (dist > 1.0) discard;

      // Outer glow envelope
      float glow = smoothstep(1.0, 0.15, dist);

      // Contact shadow core right beneath the doorway
      float shadow = smoothstep(0.0, 0.45, dist);

      // Color shift
      vec3 col = mix(uColorAccent1, uColorAccent2, sin(uTime * 1.5) * 0.5 + 0.5);
      col = mix(uColorPrimary, col, shadow);

      // Pulse with bass
      float pulse = 0.8 + 0.2 * sin(uTime * 2.2) + uAudioBass * 0.5;

      float alpha = glow * 0.7 * pulse * uIntensity;
      gl_FragColor = vec4(col, alpha);
    }
  `
};

export class FloorGlowEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.geometry = new THREE.PlaneGeometry(2.6, 2.6);
    this.geometry.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uAudioBass: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorAccent2: { value: new THREE.Color(0xff3cac) },
      uColorPrimary: { value: new THREE.Color(0x1b1464) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: FloorGlowShader.vertexShader,
      fragmentShader: FloorGlowShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    // Portal center is y=1.2, so floor is at local y=-1.19
    this.mesh.position.set(0, -1.19, 0);
    this.portalGroup.add(this.mesh);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.uniforms) this.uniforms.uIntensity.value = val;
  }

  setQuality(level) {
    // Floor glow is lightweight
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorAccent2.value.setRGB(theme.accent2.r, theme.accent2.g, theme.accent2.b);
    this.uniforms.uColorPrimary.value.setRGB(theme.primary.r, theme.primary.g, theme.primary.b);
  }

  update(dt, time, state) {
    if (!this.mesh) return;
    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;

    // Scale breathing
    const scale = 1.0 + 0.05 * Math.sin(time * 2.0);
    this.mesh.scale.set(scale, 1, scale);
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
