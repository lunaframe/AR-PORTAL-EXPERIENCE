import type { PortalTheme } from './index';

/**
 * Sci-Fi Stargate — rotating mechanical ring with chevron lock-in animation.
 * Rim: hologram scanlines + rotating 9-segment ring + chevron flash (scifi-rim.glsl).
 * Interior: procedural holographic grid corridor (deep-blue + teal tones).
 */
export const SCIFI_STARGATE_THEME: PortalTheme = {
  id:          'scifi-stargate',
  name:        'Sci-Fi Stargate',
  description: 'Chevrons lock. The gate opens. A digital dimension awaits.',
  emoji:       '⚙️',
  gradientCss: 'linear-gradient(135deg, #000d1a 0%, #001a2e 50%, #000a14 100%)',

  rimShaderKey: 'scifi',
  rimColor:     [0.0, 0.80, 1.0],  // teal/cyan
  rimIntensity: 2.0,

  interior: {
    type:   'skybox-gradient',
    colorA: '#000a14',    // near-black deep space blue
    colorB: '#001433',    // holographic dark blue glow
  },

  activation: {
    type:       'iris',
    durationMs: 3000, // long: 9 chevrons lock sequentially
  },

  audio: {
    ambient: 'scifi-ambient.mp3',
    stinger: 'chevron-lock.mp3',
  },

  particles: {
    enabled: true,
    color:   '#22d3ee',
    count:   20,
    speed:   0.5,
  },

  implemented: true,
};
