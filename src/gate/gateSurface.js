/**
 * gateSurface.js — Effect 2: Dream-Mist Swirl Surface & Stencil Aperture
 * Custom domain-warped FBM noise shader acting as the cosmic aperture into dream realms.
 */

import * as THREE from 'three';

const GateSurfaceShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uOpenProgress;
    uniform float uAudioBass;
    uniform float uAudioTreble;
    uniform float uIntensity;
    uniform float uProximity;
    uniform vec3 uColorMidnight; // #0b0a2a
    uniform vec3 uColorViolet;   // #7c4dff
    uniform vec3 uColorTeal;     // #3df2d0
    uniform vec3 uColorRose;     // #ff9ecb
    uniform vec3 uColorLantern;  // #ffd27a

    varying vec2 vUv;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // Centered coordinate system within door arch
      vec2 p = (vUv - 0.5) * 2.0;

      // Aperture mask based on open progress
      float radius = length(vec2(p.x * 1.0, p.y * 0.7));
      if (radius > uOpenProgress) {
        discard;
      }

      // Swirling dream-mist domain warp
      float t = uTime * (0.35 + uProximity * 0.5 + uAudioBass * 0.3);
      vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + vec2(0.1 * t, 0.05 * t)),
                    fbm(p + vec2(5.2, 1.3) + vec2(-0.08 * t, 0.12 * t)));

      vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + vec2(0.12 * t, -0.07 * t)),
                    fbm(p + 3.0 * q + vec2(8.3, 2.8) + vec2(-0.1 * t, 0.14 * t)));

      float f = fbm(p + 3.5 * r);

      // Color gradation
      vec3 col = mix(uColorMidnight, uColorViolet, clamp(f * f * 3.5, 0.0, 1.0));
      col = mix(col, uColorTeal, clamp(length(q), 0.0, 1.0) * 0.65);
      col = mix(col, uColorRose, clamp(length(r.x), 0.0, 1.0) * 0.45);

      // Edge fresnel and dream shimmer
      float edgeDist = smoothstep(uOpenProgress, uOpenProgress - 0.15, radius);
      col += uColorLantern * (1.0 - edgeDist) * 1.4;

      // Treble glitter twinkle
      float twinkle = pow(noise(p * 25.0 + uTime * 4.0), 4.0) * uAudioTreble * 2.0;
      col += vec3(twinkle);

      float alpha = edgeDist * (0.8 + 0.2 * f) * uIntensity;
      gl_FragColor = vec4(col, alpha);
    }
  `
};

export class GateSurfaceEffect {
  constructor(gateGroup) {
    this.gateGroup = gateGroup;
    this.mesh = null;
    this.stencilMaskMesh = null;
    this.openProgress = 0.0;
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    // Doorway opening plane geometry (~1.1m wide, 2.0m tall, curved arch top)
    const shape = new THREE.Shape();
    const w = 0.55;
    const h = 1.45;
    shape.moveTo(-w, 0);
    shape.lineTo(-w, h);
    shape.absarc(0, h, w, Math.PI, 0, true);
    shape.lineTo(w, 0);
    shape.closePath();

    this.geometry = new THREE.ShapeGeometry(shape, 32);

    this.uniforms = {
      uTime: { value: 0 },
      uOpenProgress: { value: 0.0 },
      uAudioBass: { value: 0.0 },
      uAudioTreble: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uProximity: { value: 0.0 },
      uColorMidnight: { value: new THREE.Color(0x0b0a2a) },
      uColorViolet: { value: new THREE.Color(0x7c4dff) },
      uColorTeal: { value: new THREE.Color(0x3df2d0) },
      uColorRose: { value: new THREE.Color(0xff9ecb) },
      uColorLantern: { value: new THREE.Color(0xffd27a) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: GateSurfaceShader.vertexShader,
      fragmentShader: GateSurfaceShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(0, 0, 0.005);
    this.gateGroup.add(this.mesh);

    // Stencil Mask Plane (Writes 1 to stencil buffer inside aperture)
    const maskMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilZPass: THREE.ReplaceStencilOp,
    });
    this.stencilMaskMesh = new THREE.Mesh(this.geometry, maskMat);
    this.stencilMaskMesh.position.set(0, 0, 0.0);
    this.stencilMaskMesh.renderOrder = 0;
    this.gateGroup.add(this.stencilMaskMesh);
  }

  setOpenProgress(progress) {
    this.openProgress = Math.max(0, Math.min(1.0, progress));
    if (this.uniforms) {
      this.uniforms.uOpenProgress.value = this.openProgress;
    }
    if (this.stencilMaskMesh) {
      const s = Math.max(0.001, this.openProgress);
      this.stencilMaskMesh.scale.set(s, s, 1);
    }
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.uniforms) this.uniforms.uIntensity.value = val;
  }

  setQuality(level) {}

  update(dt, time, state) {
    if (!this.uniforms) return;
    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;
    this.uniforms.uAudioTreble.value = state.audio?.treble || 0;
    this.uniforms.uProximity.value = state.proximity || 0;
  }

  dispose() {
    if (this.mesh) {
      this.gateGroup.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    if (this.stencilMaskMesh) {
      this.gateGroup.remove(this.stencilMaskMesh);
      this.stencilMaskMesh.geometry.dispose();
      this.stencilMaskMesh.material.dispose();
      this.stencilMaskMesh = null;
    }
  }
}
