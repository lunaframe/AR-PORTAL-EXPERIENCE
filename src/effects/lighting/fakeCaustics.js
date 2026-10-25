/**
 * fakeCaustics.js — Effect 22: Floor Caustics Projection
 * Procedural animated water-light caustics radiating on the floor surrounding the portal.
 */

import * as THREE from 'three';

const CausticsShader = {
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

    varying vec2 vUv;

    // Fast cellular/Voronoi caustic pattern
    vec2 hash2(vec2 p) {
      return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
    }

    float voronoi(vec2 x, float t) {
      vec2 n = floor(x);
      vec2 f = fract(x);
      float m = 8.0;
      for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          o = 0.5 + 0.5 * sin(t + 6.2831 * o);
          vec2 r = g - f + o;
          float d = dot(r, r);
          m = min(m, d);
        }
      }
      return sqrt(m);
    }

    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float dist = length(p);
      if (dist > 1.0) discard;

      // Two overlapping voronoi waves
      float c1 = voronoi(p * 5.0, uTime * 1.5);
      float c2 = voronoi(p * 7.0 + vec2(1.2), -uTime * 1.8);
      float caustic = pow(1.0 - (c1 * c2), 3.0);

      // Radial attenuation
      float fade = smoothstep(1.0, 0.2, dist);

      gl_FragColor = vec4(uColorAccent1 * caustic, caustic * fade * 0.45 * uIntensity);
    }
  `
};

export class FakeCausticsEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.mesh = null;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    const geom = new THREE.PlaneGeometry(3.2, 3.2);
    geom.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: CausticsShader.vertexShader,
      fragmentShader: CausticsShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.set(0, -1.185, 0); // Just above floor glow
    this.portalGroup.add(this.mesh);
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.uniforms) this.uniforms.uIntensity.value = val;
  }

  setQuality(level) {
    if (this.mesh) this.mesh.visible = level !== 'low';
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
  }

  update(dt, time, state) {
    if (!this.mesh) return;
    this.uniforms.uTime.value = time;
  }

  dispose() {
    if (this.mesh) {
      this.portalGroup.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
      this.mesh = null;
    }
  }
}
