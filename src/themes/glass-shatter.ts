import type { PortalTheme } from './index';

/**
 * Glass Shatter — portal tears open like breaking safety glass.
 * Voronoi cracks dissolve from center outward, prismatic interior.
 * Fully implemented.
 */
export const GLASS_SHATTER_THEME: PortalTheme = {
  id:          'glass-shatter',
  name:        'Glass Shatter',
  description: 'Reality shatters open — prismatic fragments fade to reveal another dimension',
  emoji:       '💎',
  gradientCss: 'linear-gradient(135deg, #001a2e 0%, #003355 50%, #00243d 100%)',

  rimShaderKey: 'glass-shatter',
  rimColor:     [0.5, 0.85, 1.0],  // ice blue
  rimIntensity: 2.2,

  interior: {
    type:   'skybox-gradient',
    colorA: '#000d1a',
    colorB: '#001433',
  },

  activation: {
    type:       'shatter',
    durationMs: 2400,   // longer — the shatter cascade takes time
  },

  audio: {
    ambient: 'glass-ambient.mp3',
    stinger: 'glass-shatter.mp3',
  },

  particles: {
    enabled: true,
    color:   '#7dd3fc',
    count:   25,
    speed:   0.6,
  },

  implemented: true,
};
