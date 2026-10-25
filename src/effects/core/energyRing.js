/**
 * energyRing.js — Effect 2: Energy Ring
 * Thick glowing torus frame around portal aperture with traveling light pulses,
 * electric arcs, and additive halo glow.
 */

import * as THREE from 'three';
import { createSoftGlowTexture } from '../../utils/textures.js';

export const EnergyRingShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

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
    uniform float uAudioTreble;
    uniform float uIntensity;
    uniform vec3 uColorAccent1; // Teal
    uniform vec3 uColorAccent2; // Magenta
    uniform vec3 uColorHighlight;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    // Fast 1D noise for electric arcs
    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    float noise1d(float x) {
      float i = floor(x);
      float f = fract(x);
      return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
    }

    void main() {
      // vUv.x runs around the circumference [0, 1]
      // vUv.y runs around the cross-section tube [0, 1]

      // Traveling light pulses around the ring
      float angle = vUv.x * 6.2831853;
      float pulse1 = sin(angle * 4.0 - uTime * 5.0);
      float pulse2 = cos(angle * 8.0 + uTime * 7.5);
      float pulses = pow(max(0.0, pulse1 * 0.5 + 0.5), 4.0) + pow(max(0.0, pulse2 * 0.5 + 0.5), 6.0);

      // High-frequency electric spark flickering
      float arcJitter = noise1d(angle * 30.0 + uTime * 35.0);
      float arc = step(0.82, arcJitter) * (1.0 + uAudioTreble * 2.5);

      // Base gradient blend
      vec3 ringColor = mix(uColorAccent1, uColorAccent2, sin(angle * 2.0 + uTime) * 0.5 + 0.5);
      ringColor += pulses * uColorAccent1 * 1.8;
      ringColor += arc * uColorHighlight * 2.2;

      // Fresnel edge rim for metallic/energy depth
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.5);
      ringColor += uColorAccent2 * fresnel * 1.5;

      // Tube edge smoothing
      float tubeEdge = sin(vUv.y * 3.14159);
      float alpha = smoothstep(0.05, 0.4, tubeEdge);

      // Bass punch
      float bassGlow = 1.0 + uAudioBass * 0.8;

      gl_FragColor = vec4(ringColor * uIntensity * bassGlow, alpha * 0.95);
    }
  `
};

export class EnergyRingEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.torusMesh = null;
    this.haloSprite = null;
    this.geometry = null;
    this.material = null;
    this.radius = 0.95;
    this.tubeRadius = 0.038;
  }

  init(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Torus mesh
    this.geometry = new THREE.TorusGeometry(this.radius, this.tubeRadius, 24, 96);
    this.uniforms = {
      uTime: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioTreble: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorAccent2: { value: new THREE.Color(0xff3cac) },
      uColorHighlight: { value: new THREE.Color(0xe8f7ff) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: EnergyRingShader.vertexShader,
      fragmentShader: EnergyRingShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    this.torusMesh = new THREE.Mesh(this.geometry, this.material);
    this.torusMesh.position.set(0, 1.2, 0.01);
    this.portalGroup.add(this.torusMesh);

    // Large additive halo sprite behind the ring (gives luscious bloom look without post-processing)
    const haloTex = createSoftGlowTexture(256);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: 0x14f1d9,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.haloSprite = new THREE.Sprite(haloMat);
    this.haloSprite.scale.set(this.radius * 2.8, this.radius * 2.8, 1);
    this.haloSprite.position.set(0, 1.2, -0.01);
    this.portalGroup.add(this.haloSprite);
  }

  setIntensity(val) {
    if (this.uniforms) this.uniforms.uIntensity.value = val;
    if (this.haloSprite) this.haloSprite.material.opacity = 0.55 * val;
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorAccent2.value.setRGB(theme.accent2.r, theme.accent2.g, theme.accent2.b);
    this.uniforms.uColorHighlight.value.setRGB(theme.highlight.r, theme.highlight.g, theme.highlight.b);
    if (this.haloSprite) {
      this.haloSprite.material.color.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    }
  }

  setQuality(level) {
    // Quality adjustment
    if (this.torusMesh) {
      if (level === 'low') {
        this.torusMesh.geometry.dispose();
        this.torusMesh.geometry = new THREE.TorusGeometry(this.radius, this.tubeRadius, 12, 48);
      } else {
        this.torusMesh.geometry.dispose();
        this.torusMesh.geometry = new THREE.TorusGeometry(this.radius, this.tubeRadius, 24, 96);
      }
    }
  }

  update(dt, time, state) {
    if (!this.torusMesh) return;
    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;
    this.uniforms.uAudioTreble.value = state.audio?.treble || 0;

    // Breath scale
    const breath = 1.0 + 0.02 * Math.sin(time * 2.2);
    this.torusMesh.scale.set(breath, breath, 1);

    // Halo pulse with bass
    if (this.haloSprite) {
      const haloScale = this.radius * (2.8 + 0.3 * Math.sin(time * 1.8) + (state.audio?.bass || 0) * 0.6);
      this.haloSprite.scale.set(haloScale, haloScale, 1);
    }
  }

  dispose() {
    if (this.torusMesh) {
      this.portalGroup.remove(this.torusMesh);
      this.torusMesh.geometry?.dispose();
      this.torusMesh.material?.dispose();
      this.torusMesh = null;
    }
    if (this.haloSprite) {
      this.portalGroup.remove(this.haloSprite);
      this.haloSprite.material?.dispose();
      this.haloSprite = null;
    }
  }
}
