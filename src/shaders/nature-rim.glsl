// nature-rim.glsl — Organic edge for the Nature Rift portal
// Effect: torn, overgrown edge using fbm-displaced boundary + green color palette
// TODO (Nature Rift): add vine-growth geometry shader for actual 3D tendrils
#include "./common.glsl"

uniform float u_time;
uniform vec3  u_rimColor;      // forest green: vec3(0.1, 0.6, 0.15)
uniform float u_rimIntensity;
uniform float u_progress;
uniform vec3  u_lightTint;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec2  centered = vUv - 0.5;
  float dist     = length(centered) * 2.0;
  float angle    = atan(centered.y, centered.x);

  // ── Organic jagged boundary ───────────────────────────────────────────────
  // Distort the portal edge using fbm so it looks like a torn rift in reality.
  // The noise is slow (0.12 speed) and large-scale for a natural growth feel.
  float noiseSample = fbm(vec2(angle / TAU + 0.5, u_time * 0.12) * 4.0);
  float jitter = noiseSample * 0.12;                 // ±12% radius variation

  // Boundary mask: the "wall" of the nature rift
  float boundary  = 0.85 + jitter;
  float outerMask = smoothstep(boundary + 0.06, boundary, dist);
  float innerMask = smoothstep(boundary - 0.12, boundary, dist);
  float rimBand   = outerMask * innerMask;

  // ── Moss/lichen color variation ───────────────────────────────────────────
  float mossDensity = fbm(centered * 6.0 + vec2(u_time * 0.05, 0.0));
  vec3 greenA = vec3(0.05, 0.45, 0.08);   // deep forest green
  vec3 greenB = vec3(0.15, 0.65, 0.10);   // bright spring green
  vec3 brown  = vec3(0.25, 0.15, 0.05);   // earth / bark
  vec3 mossColor = mix(mix(greenA, greenB, mossDensity), brown, mossDensity * 0.3);

  // ── Bioluminescent glow spots ─────────────────────────────────────────────
  float glow = fbm(centered * 9.0 - vec2(u_time * 0.08)) * smoothstep(0.6, 0.9, dist);
  mossColor += vec3(0.0, 0.8, 0.3) * pow(glow, 2.5) * 1.5;

  // ── Fresnel ───────────────────────────────────────────────────────────────
  float fr = fresnelSchlick(vViewDir, vNormal, 3.0);

  vec3 color = mix(u_rimColor, mossColor, 0.7);
  color += fr * vec3(0.0, 1.0, 0.3) * 0.3;
  color  = mix(color, color * u_lightTint, 0.3);
  color *= u_rimIntensity;

  float irisAlpha = smoothstep(1.0 - u_progress, 1.0 - u_progress + 0.1, dist);
  float alpha = rimBand * irisAlpha * (0.7 + glow * 0.3);
  alpha = clamp(alpha, 0.0, 1.0);

  if (u_progress < 0.01 || alpha < 0.005) discard;

  gl_FragColor = vec4(color, alpha);
}
