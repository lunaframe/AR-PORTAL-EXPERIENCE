import type { PortalTheme } from './index';

/**
 * Classic Wormhole — the signature portal theme.
 * Swirling plasma energy rim with a starfield/nebula interior.
 * Fully implemented.
 */
export const WORMHOLE_THEME: PortalTheme = {
  id:          'wormhole',
  name:        'Classic Wormhole',
  description: 'Step through a swirling cosmic rift into a starfield nebula',
  emoji:       '🌀',
  gradientCss: 'linear-gradient(135deg, #1a003d 0%, #0a0060 40%, #001a4d 100%)',

  rimShaderKey: 'wormhole',
  rimColor:     [0.45, 0.10, 1.0],  // electric violet
  rimIntensity: 2.8,

  interior: {
    type:   'skybox-gradient',
    colorA: '#000010',
    colorB: '#200040',
  },

  activation: {
    type:       'iris',
    durationMs: 1800,
  },

  audio: {
    ambient: 'wormhole-ambient.mp3',
    stinger: 'wormhole-open.mp3',
  },

  particles: {
    enabled: true,
    color:   '#a855f7',
    count:   40,
    speed:   0.4,
  },

  implemented: true,
};
