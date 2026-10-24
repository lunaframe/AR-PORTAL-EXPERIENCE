import type { PortalTheme } from './index';

/**
 * Custom 360 Photo / Video — user drops in their own equirectangular image or video.
 * Soft golden glow rim that doesn't compete with the photo content.
 * Fully implemented.
 */
export const CUSTOM_360_THEME: PortalTheme = {
  id:          'custom-360',
  name:        '360° Photo',
  description: 'Drop in any equirectangular photo or video as the portal interior',
  emoji:       '📸',
  gradientCss: 'linear-gradient(135deg, #1a1000 0%, #2a1800 50%, #1a0f00 100%)',

  rimShaderKey: 'glow',
  rimColor:     [1.0, 0.88, 0.55],  // warm gold
  rimIntensity: 1.8,

  interior: {
    type:          '360-photo',
    src:           '',          // user-provided via drag-drop
    userProvided:  true,
  },

  activation: {
    type:       'iris-fast',
    durationMs: 900,
  },

  audio: {
    ambient: undefined,         // no ambient — respects the photo's silence
    stinger: 'whoosh.mp3',
  },

  particles: {
    enabled: false,             // clean look to let the photo breathe
    color:   '#fde68a',
    count:   0,
    speed:   0,
  },

  implemented: true,
};
