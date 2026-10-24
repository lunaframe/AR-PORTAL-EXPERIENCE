// wormhole-rim.glsl — Fragment shader for the Classic Wormhole portal rim
// Effect: swirling plasma energy ring with fresnel glow and iris open/close animation
#include "./common.glsl"

uniform float u_time;          // elapsed seconds
uniform vec3  u_rimColor;      // base tint (e.g. vec3(0.4, 0.1, 1.0) for purple)
uniform float u_rimIntensity;  // overall brightness multiplier (1.0–4.0)
uniform float u_progress;      // 0 = fully closed, 1 = fully open (iris animation)
uniform vec3  u_lightTint;     // from WebXR lighting estimation (tints output color)

varying vec2 vUv;       // 0..1 UV on the ring geometry
varying vec3 vNormal;   // world-space normal
varying vec3 vViewDir;  // direction from fragment to camera

void main() {
  // ── Polar coordinates ─────────────────────────────────────────────────────
  // Convert UV to polar: angle around ring (φ) and radial position (r)
  vec2 centered = vUv - 0.5;
  float phi = atan(centered.y, centered.x);          // -π .. π
  float r   = length(centered) * 2.0;                // 0 at center, 1 at outer edge

  // ── Swirling plasma ───────────────────────────────────────────────────────
  // Use domain-warped fbm to generate the swirling energy texture.
  // We sample it in a UV space that spirals around the ring over time.
  vec2 noiseUV = vec2(
    phi / TAU + u_time * 0.08,     // angle mapped to 0..1, slowly rotating
    r   * 1.5  + u_time * 0.25     // radial coord, scrolling inward
  );
  float plasma = warpedFbm(noiseUV * 3.5, 0.8);

  // Secondary noise layer at higher frequency for fine detail
  float detail = fbm(noiseUV * 7.0 + vec2(u_time * 0.15));
  plasma = plasma * 0.7 + detail * 0.3;

  // ── Radial edge mask ──────────────────────────────────────────────────────
  // Create a band mask: opaque between innerFade and outerFade.
  // This shapes the ring: only the rim band glows, center and outer are hidden.
  float innerFade = smoothstep(0.0,  0.25, r);   // fade in from center
  float outerFade = smoothstep(1.05, 0.75, r);   // fade out at outer edge
  float bandMask  = innerFade * outerFade;

  // ── Iris opening animation ────────────────────────────────────────────────
  // u_progress sweeps from 0→1 as the portal opens.
  // A threshold that advances outward over the ring creates an iris/aperture effect.
  // The seam is a soft 0.08-wide gradient to avoid hard popping.
  float irisThreshold = 1.0 - u_progress;
  float irisAlpha = smoothstep(irisThreshold, irisThreshold + 0.08, r);

  // ── Fresnel edge highlight ────────────────────────────────────────────────
  // Brightens the very edge of the rim for a 3D rounded-glow feel.
  float fr = fresnelSchlick(vViewDir, vNormal, 3.5);

  // ── Color ─────────────────────────────────────────────────────────────────
  // Map plasma value + angle + time through the cosmic palette for color variety.
  float colorT = fract(plasma * 1.5 + phi / TAU * 0.3 + u_time * 0.05);
  vec3 swirl   = cosmicPalette(colorT);

  // Blend the base rim color with the palette swirl
  vec3 color = mix(u_rimColor, swirl, 0.65);

  // Boost intensity based on plasma hotspots (bright spots in the swirl)
  float hotspot = smoothstep(0.4, 0.9, plasma);
  color += swirl * hotspot * 1.5;

  // Fresnel adds a white-hot rim at glancing angles
  color += vec3(fr * 0.6);

  // Apply lighting estimation tint (real-world light color from WebXR API)
  // Blended at 30% so the portal effect is still vivid but feels grounded
  color = mix(color, color * u_lightTint, 0.3);

  // Apply overall intensity multiplier
  color *= u_rimIntensity;

  // ── Alpha ─────────────────────────────────────────────────────────────────
  float alpha = bandMask * irisAlpha * (0.55 + plasma * 0.45 + fr * 0.3);
  alpha = clamp(alpha, 0.0, 1.0);

  // Guard: portal not yet open → invisible
  if (u_progress < 0.01) discard;

  gl_FragColor = vec4(color, alpha);
}
