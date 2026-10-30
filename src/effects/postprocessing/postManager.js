/**
 * postManager.js — Effect 42: Desktop & Camera Mode Post-Processing
 * Real bloom, chromatic aberration, and subtle film grain for Desktop Preview and Camera modes.
 * Intentionally bypassed in WebXR immersive-ar mode to ensure zero-glitch ARCore rendering.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const AberrationGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0025 },
    uGrain: { value: 0.045 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uGrain;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // Chromatic Aberration radial distortion
      vec2 center = vec2(0.5);
      vec2 dir = vUv - center;
      float dist = length(dir);

      float r = texture2D(tDiffuse, vUv - dir * uAberration * dist).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir * uAberration * dist).b;

      // Subtle dynamic film grain
      float grain = (hash(vUv * 500.0 + fract(uTime)) - 0.5) * uGrain;

      gl_FragColor = vec4(vec3(r, g, b) + grain, 1.0);
    }
  `
};

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.composer = null;
    this.bloomPass = null;
    this.aberrationPass = null;
    this.isEnabled = false;

    this.init();
  }

  init() {
    const size = this.renderer.getSize(new THREE.Vector2());
    const width = size.x || window.innerWidth || 1280;
    const height = size.y || window.innerHeight || 720;

    // Initialize composer with stencil buffer enabled on render targets
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      stencilBuffer: true,
      depthBuffer: true,
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Unreal Bloom
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    // Chromatic Aberration & Film Grain Pass
    this.aberrationPass = new ShaderPass(AberrationGrainShader);
    this.composer.addPass(this.aberrationPass);
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  setSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  render(dt, time) {
    if (this.isEnabled && this.composer) {
      if (this.aberrationPass) {
        this.aberrationPass.uniforms.uTime.value = time;
      }
      this.composer.render(dt);
      return true;
    }
    return false;
  }

  dispose() {
    this.composer = null;
  }
}
