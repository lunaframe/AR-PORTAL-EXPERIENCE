// scifi-rim.glsl — Holographic ring for Sci-Fi Stargate portal
// Effect: rotating mechanical segments with scanline digital noise and chevron locks
// TODO (Sci-Fi): replace with actual GLB ring geometry with vertex animation
#include "./common.glsl"

uniform float u_time;
uniform vec3  u_rimColor;      // teal/blue: vec3(0.0, 0.8, 1.0)
uniform float u_rimIntensity;
uniform float u_progress;
uniform vec3  u_lightTint;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec2  centered = vUv - 0.5;
  float dist     = length(centered) * 2.0;
  float angle    = atan(centered.y, centered.x);  // -π..π
  float normAngle = (angle / TAU) + 0.5;           // 0..1

  // ── Rotating ring segments (9 segments = Stargate lock count) ────────────
  float segCount = 9.0;
  float segAngle = fract(normAngle * segCount);    // position within segment
  float segEdge  = smoothstep(0.0, 0.04, segAngle) * smoothstep(1.0, 0.96, segAngle);

  // Inner (slower) and outer (faster) rings rotate in opposite directions
  float rot1 = fract(normAngle + u_time * 0.08);
  float rot2 = fract(normAngle - u_time * 0.05);
  float seg1  = smoothstep(0.0, 0.02, fract(rot1 * 9.0)) * smoothstep(1.0, 0.98, fract(rot1 * 9.0));
  float seg2  = smoothstep(0.0, 0.02, fract(rot2 * 7.0)) * smoothstep(1.0, 0.98, fract(rot2 * 7.0));

  // ── Scanlines (horizontal digital lines) ─────────────────────────────────
  float scanY   = fract(vUv.y * 60.0 + u_time * 0.5);
  float scanline = step(0.5, scanY) * 0.15;

  // ── Digital noise (random pixel flicker) ─────────────────────────────────
  float noiseT = floor(u_time * 12.0);   // step-quantize time for glitchy look
  float dig    = hash12(floor(vUv * 40.0) + noiseT) * 0.08;

  // ── Chevron lock flash ────────────────────────────────────────────────────
  // As portal opens, chevrons "lock" one by one (visible as angle-gated flash)
  float chevronProgress = u_progress * segCount;
  float lockedChevrons  = floor(chevronProgress);
  float currentLock     = fract(chevronProgress);
  float chevronAngle    = fract(normAngle * segCount + 0.5);
  float isLocked        = step(chevronAngle, lockedChevrons / segCount);
  float lockFlash       = isLocked * (0.3 + 0.2 * sin(u_time * 8.0));

  // ── Rim band ──────────────────────────────────────────────────────────────
  float rimBand = smoothstep(0.68, 0.72, dist) * smoothstep(1.0, 0.95, dist);

  // ── Color ─────────────────────────────────────────────────────────────────
  vec3 baseColor  = u_rimColor;
  vec3 lockColor  = vec3(1.0, 0.7, 0.0);   // amber chevron lock color
  vec3 color = mix(baseColor, lockColor, lockFlash);
  color += vec3(scanline + dig) * 0.5;
  color += (seg1 + seg2) * u_rimColor * 0.4;
  color  = mix(color, color * u_lightTint, 0.25);
  color *= u_rimIntensity;

  float fr = fresnelSchlick(vViewDir, vNormal, 4.0);
  color += fr * u_rimColor * 0.5;

  float irisAlpha = smoothstep(1.0 - u_progress, 1.0 - u_progress + 0.12, dist);
  float alpha = rimBand * (segEdge * 0.7 + lockFlash * 0.6 + 0.2 + dig) * irisAlpha;
  alpha = clamp(alpha, 0.0, 1.0);

  if (u_progress < 0.01 || alpha < 0.005) discard;

  gl_FragColor = vec4(color, alpha);
}
