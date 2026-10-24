/**
 * themes/index.ts — Portal Theme Registry
 *
 * A theme is a self-contained config object that drives:
 *   • Which rim fragment shader to use
 *   • Rim color and intensity
 *   • Interior environment (type + source)
 *   • Activation animation style
 *   • Audio sources
 *   • Particle config
 *   • Thumbnail emoji / gradient for the UI
 *
 * Adding a new theme = adding one entry to THEMES and providing assets.
 * Zero changes to portal-core.ts or portal-rim-shader.ts required.
 */

export type InteriorType = 'skybox-gradient' | '360-photo' | '360-video' | 'equirect-url' | 'stub';
export type ActivationType = 'iris' | 'shatter' | 'iris-fast';

export interface PortalTheme {
  id:           string;
  name:         string;
  description:  string;
  emoji:        string;         // for HTML UI thumbnail
  gradientCss:  string;         // CSS gradient for UI card background

  /** Key of the imported GLSL fragment shader string (mapped in portal-rim-shader.ts) */
  rimShaderKey: 'wormhole' | 'glass-shatter' | 'glow' | 'nature' | 'scifi' | 'fire';

  /** Base rim color as [r,g,b] in 0–1 range */
  rimColor: [number, number, number];
  rimIntensity: number;

  interior: {
    type:     InteriorType;
    /** CSS color for gradient interiors */
    colorA?:  string;
    colorB?:  string;
    /** URL for 360 equirectangular photos/videos */
    src?:     string;
    /** true = user provides a custom src via drag-drop */
    userProvided?: boolean;
  };

  activation: {
    type:        ActivationType;
    durationMs:  number;  // total open animation duration
  };

  audio: {
    /** Path relative to /public/assets/audio/ */
    ambient?:  string;
    stinger?:  string;
  };

  particles?: {
    enabled:   boolean;
    color:     string;   // CSS color
    count:     number;
    speed:     number;
  };

  /** Whether this theme is fully implemented (false = stub/TODO) */
  implemented: boolean;
}

// ─── Theme Definitions ────────────────────────────────────────────────────────

import { WORMHOLE_THEME }      from './wormhole';
import { GLASS_SHATTER_THEME } from './glass-shatter';
import { CUSTOM_360_THEME }    from './custom-360';
import { NATURE_RIFT_THEME }   from './nature-rift';
import { ELEMENTAL_FIRE_THEME } from './elemental-fire';
import { SCIFI_STARGATE_THEME } from './scifi-stargate';

export const THEMES: PortalTheme[] = [
  WORMHOLE_THEME,
  GLASS_SHATTER_THEME,
  CUSTOM_360_THEME,
  NATURE_RIFT_THEME,
  ELEMENTAL_FIRE_THEME,
  SCIFI_STARGATE_THEME,
];

export const THEME_MAP: Map<string, PortalTheme> = new Map(
  THEMES.map(t => [t.id, t])
);

export function getTheme(id: string): PortalTheme {
  return THEME_MAP.get(id) ?? WORMHOLE_THEME;
}
