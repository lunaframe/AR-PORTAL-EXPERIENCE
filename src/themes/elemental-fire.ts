import type { PortalTheme } from './index';

/**
 * Elemental Fire — molten rim with ember particles and an infernal interior.
 * Uses the dedicated elemental-fire.glsl shader for authentic turbulent flame.
 * Interior: procedural lava gradient with ember glow layers.
 */
export const ELEMENTAL_FIRE_THEME: PortalTheme = {
  id:          'elemental-fire',
  name:        'Elemental Fire',
  description: 'Molten energy crackles at the rim of a gateway to an infernal world',
  emoji:       '🔥',
  gradientCss: 'linear-gradient(135deg, #1a0000 0%, #3d0a00 50%, #1a0500 100%)',

  rimShaderKey: 'fire',
  rimColor:     [1.0, 0.35, 0.0],  // orange-red
  rimIntensity: 3.0,

  interior: {
    type:   'skybox-gradient',
    colorA: '#0d0000',    // deep infernal black
    colorB: '#2a0800',    // dark lava red
  },

  activation: {
    type:       'iris',
    durationMs: 1600,
  },

  audio: {
    ambient: 'fire-ambient.mp3',
    stinger: 'fire-whoosh.mp3',
  },

  particles: {
    enabled: true,
    color:   '#f97316',
    count:   60,
    speed:   0.8,
  },

  implemented: true,
};
