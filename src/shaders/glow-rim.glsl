// glow-rim.glsl — Soft glow rim for the Custom 360 Photo/Video portal
// Effect: clean gaussian falloff at the portal edge, gentle pulse, no noise
#include "./common.glsl"

uniform float u_time;
uniform vec3  u_rimColor;      // usually warm white or golden
uniform float u_rimIntensity;
uniform float u_progress;
uniform vec3  u_lightTint;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec2  centered = vUv - 0.5;
  float dist     = length(centered) * 2.0;   // 0 at center, 1 at outer edge

  // ── Iris opening (same across all themes for consistency) ─────────────────
  float irisThreshold = 1.0 - u_progress;
  float irisAlpha = smoothstep(irisThreshold, irisThreshold + 0.1, dist);

  // ── Gaussian rim band ─────────────────────────────────────────────────────
  // Two layers: a tight bright inner ring and a wide soft outer halo
  float innerRing = exp(-pow((dist - 0.88) / 0.04, 2.0)) * 1.5;  // bright ring
  float outerHalo = exp(-pow((dist - 0.82) / 0.12, 2.0)) * 0.5;  // wide halo
  float glow = innerRing + outerHalo;

  // ── Subtle pulsing ────────────────────────────────────────────────────────
  float pulse = 0.85 + 0.15 * sin(u_time * 1.8 + dist * PI);

  // ── Angle-based shimmer (rotates around ring) ────────────────────────────
  float angle   = atan(centered.y, centered.x);  // -π..π
  float shimmer = 0.5 + 0.5 * sin(angle * 3.0 + u_time * 0.7);
  shimmer = mix(1.0, shimmer, 0.25);             // subtle — 25% effect

  // ── Fresnel boost ─────────────────────────────────────────────────────────
  float fr = fresnelSchlick(vViewDir, vNormal, 2.5);

  // ── Color ─────────────────────────────────────────────────────────────────
  // Base rim color blended with a warm white for a "magic window" feel
  vec3 color = mix(u_rimColor, vec3(1.0, 0.97, 0.92), 0.3);
  color += fr * vec3(0.6, 0.7, 1.0) * 0.4;       // slight blue fresnel flash
  color  = mix(color, color * u_lightTint, 0.35);
  color *= u_rimIntensity * pulse * shimmer;

  // ── Alpha ─────────────────────────────────────────────────────────────────
  float alpha = glow * irisAlpha;
  alpha = clamp(alpha, 0.0, 1.0);

  if (u_progress < 0.01 || alpha < 0.005) discard;

  gl_FragColor = vec4(color, alpha);
}
