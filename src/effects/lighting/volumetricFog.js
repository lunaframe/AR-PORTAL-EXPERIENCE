/**
 * volumetricFog.js — Effect 19: Volumetric-Looking Base Fog
 * Low billboard planes with scrolling multi-octave noise hugging the portal base.
 */

import * as THREE from 'three';

const VolumetricFogShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColorAccent1;
    uniform vec3 uColorSecondary;

    varying vec2 vUv;

    // Fast 2D noise
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y
      );
    }

    void main() {
      // Scrolling fog coordinates
      vec2 uv1 = vUv * vec2(3.0, 1.5) + vec2(uTime * 0.08, uTime * 0.03);
      vec2 uv2 = vUv * vec2(4.5, 2.0) - vec2(uTime * 0.05, -uTime * 0.02);

      float n1 = noise(uv1);
      float n2 = noise(uv2);
      float fog = pow(n1 * 0.6 + n2 * 0.4, 1.5);

      // Edge fading: fade out at top, left, right, and bottom borders
      float borderFade = sin(vUv.x * 3.14159) * sin(vUv.y * 3.14159);
      fog *= borderFade;

      vec3 col = mix(uColorSecondary, uColorAccent1, fog);
      gl_FragColor = vec4(col, fog * 0.35 * uIntensity);
    }
  `
};

export class VolumetricFogEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.group = null;
    this.planes = [];
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    this.portalGroup.add(this.group);

    this.uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorSecondary: { value: new THREE.Color(0x6d28d9) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: VolumetricFogShader.vertexShader,
      fragmentShader: VolumetricFogShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // 4 layered mist planes around portal base (y around -1.0 to -0.6 relative to portal)
    const configs = [
      { width: 3.2, height: 0.8, x: 0, y: -0.9, z: 0.1, rotY: 0 },
      { width: 2.8, height: 0.7, x: -0.4, y: -1.0, z: -0.2, rotY: 0.4 },
      { width: 3.0, height: 0.75, x: 0.3, y: -0.95, z: 0.3, rotY: -0.3 },
      { width: 3.4, height: 0.9, x: 0, y: -0.85, z: -0.1, rotY: 0.15 },
    ];

    configs.forEach((cfg) => {
      const geom = new THREE.PlaneGeometry(cfg.width, cfg.height);
      const mesh = new THREE.Mesh(geom, this.material);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.rotation.y = cfg.rotY;
      this.group.add(mesh);
      this.planes.push(mesh);
    });
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.uniforms) this.uniforms.uIntensity.value = val;
  }

  setQuality(level) {
    this.planes.forEach((p, idx) => {
      p.visible = level === 'low' ? idx < 2 : true;
    });
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorSecondary.value.setRGB(theme.secondary.r, theme.secondary.g, theme.secondary.b);
  }

  update(dt, time, state) {
    if (!this.group) return;
    this.uniforms.uTime.value = time;
  }

  dispose() {
    if (this.group) {
      this.portalGroup.remove(this.group);
      this.planes.forEach((p) => p.geometry.dispose());
      this.material?.dispose();
      this.planes = [];
      this.group = null;
    }
  }
}
