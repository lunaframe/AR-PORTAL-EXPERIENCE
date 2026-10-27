/**
 * src/config.ts — Master Tunable Configuration for Shadow Slave Dream Gates
 * (Waking World -> Dream Realm)
 * All visual, geometric, lighting, audio, and performance parameters in one place.
 */

export interface PortalConfig {
  // Gate Identity & Variant
  gateName: string;
  gateVariant: 'radiant' | 'shadow'; // 'radiant' (Changing Star) | 'shadow' (Dark type)

  // Razor Slash Geometry (1:4 ratio, pointed ends, 15cm hover)
  slashHalfWidth: number;          // Half-width at center (0.35m = 0.70m total)
  slashHalfHeight: number;         // Half-height (1.40m = 2.80m total, 1:4 ratio)
  gateTilt: number;                // Slant angle in degrees (2.0 to 4.0 deg)
  hoverElevation: number;          // Elevation of bottom point above floor (0.15m)
  edgeSharpnessNoise: number;      // Subtle seeded outline noise (very low amplitude, 0.015)
  edgeTravelingSpeed: number;      // Speed of traveling highlight along the hairline cut

  // Recessed Thickness & Depth Parallax
  recedingLayers: number;          // 3-4 recessed depth layers behind the cut
  recedingDepthSpacing: number;    // Distance in meters between depth layers (0.04m)
  shadowParallaxFactor: number;    // Counter-shift factor for shadow variant interior

  // Lens Warp & Refraction (10% of width screen-space warp)
  lensWarpStrength: number;        // Amplitude of screen-space room bend toward the cut
  lensWarpWidth: number;           // Width of lens warp band (approx 10% of gate width)

  // Light Spill & Floor Decal
  lightPoolIntensity: number;      // Opacity of floor light pool
  lightPoolRadius: number;         // Radius of floor illumination in meters
  lightStreakIntensity: number;     // Intensity of bright light streak emerging under hovered base
  verticalStreakIntensity: number; // Subtle anamorphic vertical highlight streak
  cameraExposureShift: number;     // Exposure dimming of camera feed on proximity (0.0 to 0.5)

  // Particles & Motes (Clamped & Soft-Falloff)
  interiorParticleCount: number;   // Clamped max 300 on high tier
  crossingParticleCount: number;   // Streaming light motes (radiant) or drawn dust (shadow)
  particleMinSize: number;         // Minimum gl_PointSize in pixels
  particleMaxSize: number;         // Clamped maximum gl_PointSize in pixels
  particleFadeDist: number;        // Alpha fades to 0 below 0.8m from camera

  // Palette & Accents (Shadow Slave Theme)
  radiantCoreColor: string;        // Warm white to pale gold (#f5ebd0)
  shadowCoreColor: string;         // Impenetrable deep void (#020203)
  nearBlack: string;               // #08080a
  ashGrey: string;                 // #6a6b70
  boneWhite: string;               // #dcd8cf
  accentColor: string;             // Dull brass (#967d4e)
  bloodRedAccent: string;          // Dried-blood red (Forgotten Shore only)

  // Opening & Traversal Timings (Phase 3 & Phase 5)
  openingPointDuration: number;    // Step 1: pinprick appearance (200ms)
  drawingLineDuration: number;     // Step 2: vertical hairline draw (600ms)
  partingSlitDuration: number;     // Step 3: blade cut parting sideways (1200ms)
  transitionDuration: number;      // Crossing duration (1800ms)
  fovPunchAmount: number;          // Brief FOV push during threshold crossing

  // Atmosphere & Audio
  fogDensity: number;
  fogColor: string;
  fogLayers: number;
  fogScrollSpeed: number;
  portalHumVolume: number;
  pannerRefDistance: number;
  pannerMaxDistance: number;

  // Performance Tiers
  qualityTier: 'high' | 'medium' | 'low' | 'auto';
  autoDowngradeThreshold: number;
}

export const CONFIG: PortalConfig = {
  // Gate Identity & Variant
  gateName: 'FORGOTTEN SHORE',
  gateVariant: 'radiant',          // 'radiant' | 'shadow'

  // Razor Slash Geometry (1:4 ratio, 0.70m x 2.80m, pointed at both ends)
  slashHalfWidth: 0.35,            // 0.70m total width at center
  slashHalfHeight: 1.40,           // 2.80m total height (1:4 ratio)
  gateTilt: 2.8,                   // 2.8 degrees slant tilt
  hoverElevation: 0.15,            // Hovers 15cm above floor level
  edgeSharpnessNoise: 0.012,       // Very low amplitude seeded noise (stays razor sharp)
  edgeTravelingSpeed: 1.6,         // Slow traveling highlight rate along cut

  // Recessed Thickness & Depth Parallax
  recedingLayers: 3,               // 3 recessed depth layers inside the cut
  recedingDepthSpacing: 0.042,     // 4.2cm spacing between depth layers
  shadowParallaxFactor: 0.18,      // Counter-shift factor in shadow variant

  // Screen-space Lens Warp (Bends room slightly toward cut within ~10% width)
  lensWarpStrength: 0.014,         // Subtle bend of real room toward the cut
  lensWarpWidth: 0.08,             // 8-10% of width

  // Light Interaction with the Real Room
  lightPoolIntensity: 0.45,        // Soft warm floor light pool
  lightPoolRadius: 2.4,            // Floor projection reach in meters
  lightStreakIntensity: 0.65,      // Thin bright light streak pouring under base
  verticalStreakIntensity: 0.35,   // Subtle vertical anamorphic highlight streak
  cameraExposureShift: 0.38,       // Camera feed exposure darkening on proximity

  // Particles & Motes (Clamped & Soft-Falloff)
  interiorParticleCount: 240,      // Under 300 on high tier
  crossingParticleCount: 32,       // Slow light motes streaming upward or dust pulled in
  particleMinSize: 2.0,            // Min gl_PointSize in pixels
  particleMaxSize: 18.0,           // Clamped max gl_PointSize in pixels
  particleFadeDist: 0.8,           // Alpha fades to 0 below 0.8m from camera

  // Palette: Shadow Slave Theme
  radiantCoreColor: '#f5ebd0',     // Luminous warm white / pale gold
  shadowCoreColor: '#020203',      // Impenetrable void black
  nearBlack: '#08080a',
  ashGrey: '#6a6b70',
  boneWhite: '#dcd8cf',
  accentColor: '#967d4e',          // Dull brass
  bloodRedAccent: '#6b1c1c',       // Dried-blood red (Forgotten Shore only)

  // Opening & Traversal Timings
  openingPointDuration: 200,       // Pinprick point
  drawingLineDuration: 600,        // Hairline vertical line draw (0.6s)
  partingSlitDuration: 1200,       // Slit parts sideways like a blade cut (1.2s)
  transitionDuration: 1800,        // 1.8 seconds with easing
  fovPunchAmount: 8.0,             // Brief FOV push

  // Atmosphere & Audio
  fogDensity: 0.075,
  fogColor: '#08080a',
  fogLayers: 3,
  fogScrollSpeed: 0.014,
  portalHumVolume: 0.22,
  pannerRefDistance: 1.2,
  pannerMaxDistance: 9.0,

  // Performance Tiers
  qualityTier: 'high',
  autoDowngradeThreshold: 28
};

// Expose to global window for runtime debugging and hot tuning
if (typeof window !== 'undefined') {
  (window as any).PORTAL_CONFIG = CONFIG;
}
