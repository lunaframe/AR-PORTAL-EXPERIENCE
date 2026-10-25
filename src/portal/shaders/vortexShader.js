/**
 * vortexShader.js — Domain-Warped FBM Swirl Shader with Chromatic Aberration & Fresnel
 * Creates the mesmerizing cosmic event-horizon surface of the Twilight Portal.
 */

import * as THREE from 'three';

export const VortexVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const VortexFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpenProgress;
  uniform float uAudioBass;
  uniform float uAudioTreble;
  uniform float uIntensity;
  uniform float uProximity;
  uniform vec3 uColorPrimary;    // Indigo #1b1464
  uniform vec3 uColorSecondary;  // Violet #6d28d9
  uniform vec3 uColorAccent1;    // Teal #14f1d9
  uniform vec3 uColorAccent2;    // Magenta #ff3cac
  uniform vec3 uColorHighlight;  // Soft white #e8f7ff

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  // 2D Simplex-like hash & noise
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

  // Fractal Brownian Motion
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.05 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  // Domain-warped FBM swirl
  float domainWarp(vec2 p, float t, out vec2 q, out vec2 r) {
    q = vec2(
      fbm(p + vec2(0.0, 0.0) + vec2(0.12 * t, 0.08 * t)),
      fbm(p + vec2(5.2, 1.3) + vec2(-0.09 * t, 0.14 * t))
    );

    r = vec2(
      fbm(p + 4.0 * q + vec2(1.7, 9.2) + vec2(0.15 * t, -0.1 * t)),
      fbm(p + 4.0 * q + vec2(8.3, 2.8) + vec2(-0.12 * t, 0.17 * t))
    );

    return fbm(p + 4.0 * r);
  }

  void main() {
    // Map UVs to centered coordinates [-1, 1]
    vec2 pos = (vUv - 0.5) * 2.0;
    float dist = length(pos);

    // Hard/soft aperture cutout based on opening animation
    float maxRadius = uOpenProgress;
    if (dist > maxRadius) {
      discard;
    }

    // Swirl angle distortion (faster near center, boosted by proximity & bass)
    float swirlSpeed = (1.2 + uProximity * 1.5 + uAudioBass * 0.8) * uTime;
    float angle = atan(pos.y, pos.x);
    float spiral = angle + (1.8 / (dist + 0.15)) * (0.8 + 0.2 * sin(uTime * 2.0));

    vec2 polarUv = vec2(
      cos(spiral) * dist,
      sin(spiral) * dist
    );

    // Multi-octave domain warped noise
    vec2 q, r;
    float warp = domainWarp(polarUv * 2.5, uTime * 0.45, q, r);

    // Chromatic aberration split
    float offset = 0.04 * (1.0 + uAudioTreble * 1.5) * (1.0 - dist * 0.5);
    float warpR = fbm(polarUv * 2.5 + vec2(offset, 0.0) + 4.0 * r);
    float warpG = warp;
    float warpB = fbm(polarUv * 2.5 - vec2(offset, 0.0) + 4.0 * r);

    // Layered Twilight Palette Color Grading
    vec3 col = mix(uColorPrimary, uColorSecondary, clamp(warpG * 1.2 + 0.3, 0.0, 1.0));
    col = mix(col, uColorAccent1, clamp(length(q) * 1.4 - 0.2, 0.0, 1.0));
    col = mix(col, uColorAccent2, clamp(r.x * 1.6, 0.0, 1.0));

    // High energy filaments and white core highlights
    float filament = smoothstep(0.42, 0.58, warpR * warpB);
    col += uColorHighlight * filament * (1.2 + uAudioTreble * 2.0);

    // Fresnel rim glow
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.8);

    // Pulsing energy edge ring
    float edgeWidth = 0.08 * (1.0 + uAudioBass * 0.4);
    float edgeDist = abs(dist - (maxRadius - edgeWidth * 0.5));
    float edgeGlow = smoothstep(edgeWidth, 0.0, edgeDist);

    col += uColorAccent1 * edgeGlow * (2.5 + uAudioBass * 2.0);
    col += uColorAccent2 * fresnel * 1.8;

    // Center cosmic singularity darkness or gateway depth
    float centerDepth = smoothstep(0.0, 0.35, dist);
    col = mix(col * 0.2, col, centerDepth);

    // Alpha blending with soft edge falloff
    float alpha = smoothstep(maxRadius, maxRadius - 0.03, dist);
    alpha *= clamp(uOpenProgress * 2.0, 0.0, 1.0);

    gl_FragColor = vec4(col * uIntensity, alpha);
  }
`;
