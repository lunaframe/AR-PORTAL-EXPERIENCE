// common.glsl — Shared utility functions for all portal rim shaders
// Include via: #include "./common.glsl"

precision mediump float;

#define PI   3.14159265358979323846
#define TAU  6.28318530717958647692

// ─── Hash / Pseudo-random ────────────────────────────────────────────────────

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

// ─── Value Noise (quintic-interpolated for C2 continuity) ───────────────────

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic
  return mix(
    mix(hash12(i + vec2(0,0)), hash12(i + vec2(1,0)), u.x),
    mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x),
    u.y
  );
}

// Fractional Brownian Motion — 5 octaves, balances quality vs. mobile perf
float fbm(vec2 p) {
  float val  = 0.0;
  float amp  = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    val  += amp * valueNoise(p * freq);
    amp  *= 0.5;
    freq *= 2.0;
    p    += vec2(0.37, 0.58); // offset per octave to avoid lattice patterns
  }
  return val;
}

// Domain-warped fbm — q = fbm(p+offset) used to warp p itself
// Creates self-similar, cloud/plasma-like distortion
float warpedFbm(vec2 p, float warpStrength) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
  return fbm(p + warpStrength * q);
}

// ─── Voronoi ─────────────────────────────────────────────────────────────────

// Returns vec2: x = nearest-cell dist, y = second-nearest (edge = y-x)
vec2 voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md = 8.0, md2 = 8.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2  g = vec2(float(i), float(j));
      vec2  r = g + hash22(n + g) * 0.7 + 0.15 - f;
      float d = dot(r, r);
      if      (d < md)  { md2 = md;  md  = d; }
      else if (d < md2) { md2 = d; }
    }
  }
  return vec2(sqrt(md), sqrt(md2));
}

// ─── Fresnel ─────────────────────────────────────────────────────────────────

// Schlick approximation — bright at grazing angles (edges of curved surfaces)
// power: 2.0 = wide glow, 5.0 = tight edge highlight
float fresnelSchlick(vec3 viewDir, vec3 normal, float power) {
  float cosTheta = clamp(dot(normalize(viewDir), normalize(normal)), 0.0, 1.0);
  return pow(1.0 - cosTheta, power);
}

// ─── Color Palettes ──────────────────────────────────────────────────────────

// Inigo Quilez cosine palette — maps t∈[0,1] to a smooth color cycle
// a,b,c,d control offset, amplitude, frequency, phase
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c * t + d));
}

// Cosmic preset: deep purple → electric blue → cyan → white
vec3 cosmicPalette(float t) {
  return palette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 0.7, 0.4),
    vec3(0.0, 0.15, 0.20)
  );
}

// Fire preset: black → red → orange → yellow → white
vec3 firePalette(float t) {
  return palette(t,
    vec3(0.5, 0.1, 0.0),
    vec3(0.5, 0.3, 0.0),
    vec3(0.8, 0.5, 0.3),
    vec3(0.0, 0.15, 0.0)
  );
}

// Ice preset: black → dark blue → cyan → white
vec3 icePalette(float t) {
  return palette(t,
    vec3(0.2, 0.4, 0.6),
    vec3(0.3, 0.3, 0.4),
    vec3(0.7, 0.8, 0.9),
    vec3(0.3, 0.4, 0.6)
  );
}
