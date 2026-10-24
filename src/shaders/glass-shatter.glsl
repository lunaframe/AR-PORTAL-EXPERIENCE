// glass-shatter.glsl — Fragment shader for Glass Shatter portal rim
// Effect: portal "cracks open" like breaking glass, shards dissolving away as it opens
#include "./common.glsl"

uniform float u_time;
uniform vec3  u_rimColor;      // usually white/blue (vec3(0.6, 0.85, 1.0))
uniform float u_rimIntensity;
uniform float u_progress;      // 0 = fully shattered/closed, 1 = fully open/clear
uniform vec3  u_lightTint;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec2  uv   = vUv - 0.5;
  float dist = length(uv);         // 0 at center, 0.5 at outer edge

  // ── Voronoi crack pattern ─────────────────────────────────────────────────
  // Scale UV to get finer cracks at the edge, coarser near center
  // The crack pattern is baked in (not animated) for a convincing glass look
  float scale   = 6.0 + dist * 4.0;                  // more shards at edge
  vec2  vor     = voronoi(uv * scale);
  float cellDist = vor.x;
  float edgeDist = vor.y - vor.x;                     // distance to inter-cell edge
  float crackLine = 1.0 - smoothstep(0.0, 0.04, edgeDist); // thin bright crack lines

  // ── Per-shard dissolve ────────────────────────────────────────────────────
  // Each Voronoi cell (glass shard) gets a unique seed from its nearest-point distance.
  // As u_progress increases, shards with lower seeds dissolve first (cascade effect).
  // This gives an organic, non-uniform cracking-open feel.
  float shardSeed = hash12(floor(uv * scale + vor.x * 100.0));
  float dissolveOrder = shardSeed;                    // each shard has a unique order
  float shardAlpha = smoothstep(dissolveOrder - 0.05, dissolveOrder + 0.05, u_progress);
  // shardAlpha = 0 when shard is still present, 1 when dissolved
  float shardPresent = 1.0 - shardAlpha;             // 1=present, 0=dissolved

  // ── Edge glow at crack lines ──────────────────────────────────────────────
  // Cracks glow blue-white, especially on intact shards adjacent to dissolved ones
  vec3 crackGlow   = u_rimColor * 3.0 + vec3(0.0, 0.2, 0.5);
  vec3 shardColor  = vec3(0.55, 0.75, 0.95) * 0.25; // translucent blue-grey glass
  float iridescence = fbm(uv * 8.0 + u_time * 0.05) * 0.15; // subtle shimmer
  shardColor += vec3(iridescence * 0.5, iridescence * 0.3, iridescence);

  // ── Rim boundary (outer glow ring) ───────────────────────────────────────
  // A subtle glow ring at the portal's outer edge marks where the glass was
  float rimDist  = abs(dist - 0.47);                 // distance from 0.47-radius boundary
  float rimGlow  = smoothstep(0.03, 0.0, rimDist) * 2.0;
  vec3  rimColor = u_rimColor * rimGlow * u_rimIntensity;

  // ── Fresnel ───────────────────────────────────────────────────────────────
  float fr = fresnelSchlick(vViewDir, vNormal, 4.0);

  // ── Iris progress clamp ──────────────────────────────────────────────────
  // The whole portal is bounded by the circle; nothing outside 0.5 UV dist renders
  float circleMask = smoothstep(0.5, 0.47, dist);

  // ── Compose final color ──────────────────────────────────────────────────
  vec3 color = mix(shardColor + rimColor, crackGlow, crackLine * shardPresent);
  color += fr * u_rimColor * 0.4;
  color  = mix(color, color * u_lightTint, 0.25);
  color *= u_rimIntensity;

  // Alpha: shards that are still present + crack lines + rim glow
  float shardVis = shardPresent * 0.5;               // translucent glass
  float alpha    = circleMask * (crackLine * shardPresent * 0.9 + shardVis + rimGlow * 0.3);
  alpha  = clamp(alpha, 0.0, 1.0);

  // During opening pulse: brief bright flash as each shard dissolves
  float dissolveFlash = smoothstep(dissolveOrder - 0.02, dissolveOrder, u_progress)
                      * smoothstep(dissolveOrder + 0.02, dissolveOrder, u_progress);
  color += u_rimColor * dissolveFlash * 4.0;

  if (u_progress < 0.01 || alpha < 0.005) discard;

  gl_FragColor = vec4(color, alpha);
}
