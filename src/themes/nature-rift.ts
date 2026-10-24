import type { PortalTheme } from './index';

/**
 * Nature Rift — an organic tear in reality leading to a forest/fantasy world.
 * Rim: fbm-distorted boundary with moss/bioluminescent glow.
 * Interior: procedural multi-layer forest gradient (deep canopy sky + ground fog).
 */
export const NATURE_RIFT_THEME: PortalTheme = {
  id:          'nature-rift',
  name:        'Nature Rift',
  description: 'A tear in reality — vines creep along the edges of this forest portal',
  emoji:       '🌿',
  gradientCss: 'linear-gradient(135deg, #001a00 0%, #003300 50%, #001400 100%)',

  rimShaderKey: 'nature',
  rimColor:     [0.08, 0.55, 0.12],  // forest green
  rimIntensity: 1.6,

  interior: {
    type:   'skybox-gradient',
    colorA: '#001a00',    // deep forest floor dark green
    colorB: '#0a3a0a',    // sunlit canopy mid-green
  },

  activation: {
    type:       'iris',
    durationMs: 2200,
  },

  audio: {
    ambient: 'nature-ambient.mp3',
    stinger: 'nature-open.mp3',
  },

  particles: {
    enabled: true,
    color:   '#4ade80',
    count:   30,
    speed:   0.2,
  },

  implemented: true,
};
