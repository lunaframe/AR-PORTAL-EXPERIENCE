// elemental-fire.glsl — Molten energy rim for the Elemental Fire portal
// Effect: turbulent fire tongue with ember sparks, heat shimmer and lava glow
#include "./common.glsl"

uniform float u_time;
uniform vec3  u_rimColor;      // orange-red: vec3(1.0, 0.35, 0.0)
uniform float u_rimIntensity;
uniform float u_progress;
uniform vec3  u_lightTint;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

// ── Rising flame noise ──────────────────────────────────────────────────────
// Elongated upward noise to simulate fire tongues climbing the rim.
float flameFbm(vec2 p) {
  float val  = 0.0;
  float amp  = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    // Stretch vertically (y*0.5) for tall flame shapes
    val  += amp * valueNoise(p * vec2(freq * 1.5, freq * 0.7));
    amp  *= 0.5;
    freq *= 2.1;
    p    += vec2(0.13, 0.79);
  }
  return val;
}

void main() {
  vec2  centered = vUv - 0.5;
  float dist     = length(centered) * 2.0;
  float angle    = atan(centered.y, centered.x);
  float normAngle = (angle / TAU) + 0.5;   // 0..1

  // ── Turbulent fire boundary ───────────────────────────────────────────────
  // Fire rises from the rim — shift noise upward over time for upward flow.
  vec2 flameUV = vec2(normAngle * 3.0, dist * 2.0 - u_time * 0.9);
  float flameNoise = flameFbm(flameUV);

  // Secondary slower layer for depth
  vec2 flameUV2 = vec2(normAngle * 2.0 + 0.3, dist * 1.5 - u_time * 0.55);
  float flameNoise2 = flameFbm(flameUV2);

  float flame = mix(flameNoise, flameNoise2, 0.4);

  // ── Rim mask with jagged fire edge ────────────────────────────────────────
  float fierceJitter = flame * 0.18;
  float outerEdge    = 0.88 + fierceJitter;
  float outerMask    = smoothstep(outerEdge + 0.08, outerEdge, dist);
  float innerEdge    = outerEdge - 0.22;
  float innerMask    = smoothstep(innerEdge - 0.04, innerEdge, dist);
  float rimBand      = outerMask * innerMask;

  // ── Color: lava palette from black → red → orange → yellow ───────────────
  float colorT = clamp(flame * 1.3 + (1.0 - dist) * 0.3, 0.0, 1.0);
  vec3 lavaColor = firePalette(colorT);

  // Bright white-hot core at peaks of flame
  float hotSpot = pow(clamp(flame - 0.55, 0.0, 1.0) * 2.2, 2.5);
  lavaColor = mix(lavaColor, vec3(1.0, 0.95, 0.7), hotSpot * 0.6);

  // ── Ember sparks (random bright dots near the outer edge) ─────────────────
  vec2 emberCell = floor(vec2(normAngle * 40.0, u_time * 3.0 + dist * 5.0));
  float emberRand = hash12(emberCell);
  float emberBright = step(0.92, emberRand);                     // ~8% of cells
  float emberFade   = fract(u_time * 2.0 + emberRand);          // flicker
  float ember = emberBright * smoothstep(0.4, 0.8, emberFade) * smoothstep(1.0, 0.7, emberFade);
  ember *= smoothstep(0.7, 0.95, dist);  // only near rim outer edge
  lavaColor = mix(lavaColor, vec3(1.0, 0.7, 0.1), ember * 0.9);

  // ── Heat shimmer glow (radial bloom inside the disk) ─────────────────────
  float innerGlow = (1.0 - dist) * 0.35 * flame;
  lavaColor += u_rimColor * innerGlow;

  // ── Fresnel edge highlight ─────────────────────────────────────────────────
  float fr = fresnelSchlick(vViewDir, vNormal, 2.5);
  lavaColor += fr * vec3(1.0, 0.4, 0.0) * 0.5;

  // Apply lighting tint
  lavaColor = mix(lavaColor, lavaColor * u_lightTint, 0.2);
  lavaColor *= u_rimIntensity;

  // ── Iris open/close ────────────────────────────────────────────────────────
  float irisAlpha = smoothstep(1.0 - u_progress, 1.0 - u_progress + 0.12, dist);
  float alpha = rimBand * irisAlpha * (0.75 + flame * 0.25) + ember * irisAlpha * 0.5;
  alpha = clamp(alpha, 0.0, 1.0);

  if (u_progress < 0.01 || alpha < 0.005) discard;

  gl_FragColor = vec4(lavaColor, alpha);
}
