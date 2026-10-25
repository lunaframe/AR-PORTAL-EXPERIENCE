/**
 * effectsManager.js — Central Coordinator for Modular VFX Subsystems
 * 
 * Manages life-cycle, rendering loop, UI toggles, quality scaling,
 * theme uniforms, and resource cleanup across all visual effects.
 */

export class EffectsManager {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.effects = new Map(); // id -> effectInstance
    this.groups = {
      core: new Set(),
      particles: new Set(),
      lighting: new Set(),
      twilight: new Set(),
      reactive: new Set(),
      ui: new Set(),
    };

    this.groupEnabled = {
      core: true,
      particles: true,
      lighting: true,
      twilight: true,
      reactive: true,
      ui: true,
    };

    this.masterIntensity = 1.0;
    this.currentQuality = 'high';
    this.currentTheme = 'twilight';

    // Shared theme palettes (RGB vectors)
    this.themes = {
      twilight: {
        name: 'Twilight',
        primary: { r: 27 / 255, g: 20 / 255, b: 100 / 255 }, // Indigo #1b1464
        secondary: { r: 109 / 255, g: 40 / 255, b: 217 / 255 }, // Violet #6d28d9
        accent1: { r: 20 / 255, g: 241 / 255, b: 217 / 255 }, // Teal #14f1d9
        accent2: { r: 255 / 255, g: 60 / 255, b: 172 / 255 }, // Magenta #ff3cac
        highlight: { r: 232 / 255, g: 247 / 255, b: 255 / 255 }, // Soft White #e8f7ff
      },
      ember: {
        name: 'Ember',
        primary: { r: 75 / 255, g: 15 / 255, b: 10 / 255 }, // Deep Crimson
        secondary: { r: 195 / 255, g: 45 / 255, b: 20 / 255 }, // Burning Orange
        accent1: { r: 255 / 255, g: 185 / 255, b: 40 / 255 }, // Gold Flame
        accent2: { r: 255 / 255, g: 70 / 255, b: 40 / 255 }, // Hot Ember
        highlight: { r: 255 / 255, g: 245 / 255, b: 220 / 255 }, // Warm White
      },
      frost: {
        name: 'Frost',
        primary: { r: 10 / 255, g: 35 / 255, b: 70 / 255 }, // Deep Arctic Blue
        secondary: { r: 35 / 255, g: 110 / 255, b: 190 / 255 }, // Glacial Cyan
        accent1: { r: 120 / 255, g: 230 / 255, b: 255 / 255 }, // Ice Shimmer
        accent2: { r: 190 / 255, g: 140 / 255, b: 255 / 255 }, // Aurora Lilac
        highlight: { r: 240 / 255, g: 252 / 255, b: 255 / 255 }, // Pure Frost
      },
    };
  }

  /**
   * Registers a new effect instance
   * @param {string} id - Unique identifier
   * @param {string} group - Group name ('core', 'particles', 'lighting', 'twilight', 'reactive')
   * @param {Object} effect - Object with init, update, setQuality, dispose
   */
  register(id, group, effect) {
    if (this.effects.has(id)) {
      this.effects.get(id).dispose?.();
    }

    this.effects.set(id, effect);
    if (!this.groups[group]) {
      this.groups[group] = new Set();
    }
    this.groups[group].add(id);

    // Initialize with current parameters
    if (typeof effect.init === 'function') {
      effect.init(this.scene, this.camera, this.renderer);
    }
    if (typeof effect.setQuality === 'function') {
      effect.setQuality(this.currentQuality);
    }
    if (typeof effect.setTheme === 'function') {
      effect.setTheme(this.themes[this.currentTheme]);
    }
  }

  setGroupEnabled(group, enabled) {
    if (this.groupEnabled[group] === undefined) return;
    this.groupEnabled[group] = enabled;
    const effectIds = this.groups[group];
    if (effectIds) {
      for (const id of effectIds) {
        const eff = this.effects.get(id);
        if (eff) {
          if (typeof eff.setEnabled === 'function') {
            eff.setEnabled(enabled);
          } else if (eff.mesh) {
            eff.mesh.visible = enabled;
          }
        }
      }
    }
  }

  setMasterIntensity(val) {
    this.masterIntensity = Math.max(0, Math.min(2.0, val));
    for (const eff of this.effects.values()) {
      if (typeof eff.setIntensity === 'function') {
        eff.setIntensity(this.masterIntensity);
      }
    }
  }

  setQuality(level) {
    this.currentQuality = level;
    for (const eff of this.effects.values()) {
      if (typeof eff.setQuality === 'function') {
        eff.setQuality(level);
      }
    }
  }

  setTheme(themeName) {
    if (!this.themes[themeName]) return;
    this.currentTheme = themeName;
    const themeData = this.themes[themeName];
    for (const eff of this.effects.values()) {
      if (typeof eff.setTheme === 'function') {
        eff.setTheme(themeData);
      }
    }
  }

  getTheme() {
    return this.themes[this.currentTheme];
  }

  /**
   * Main per-frame update loop
   */
  update(dt, time, state) {
    const fullState = {
      ...state,
      masterIntensity: this.masterIntensity,
      quality: this.currentQuality,
      theme: this.themes[this.currentTheme],
    };

    for (const [id, eff] of this.effects.entries()) {
      // Find group
      let groupName = 'core';
      for (const [grp, ids] of Object.entries(this.groups)) {
        if (ids.has(id)) {
          groupName = grp;
          break;
        }
      }

      if (this.groupEnabled[groupName] && typeof eff.update === 'function') {
        try {
          eff.update(dt, time, fullState);
        } catch (e) {
          console.error(`[EffectsManager] Error updating effect '${id}':`, e);
        }
      }
    }
  }

  dispose() {
    for (const eff of this.effects.values()) {
      try {
        eff.dispose?.();
      } catch (err) {
        console.error('Error disposing effect:', err);
      }
    }
    this.effects.clear();
    for (const s of Object.values(this.groups)) {
      s.clear();
    }
  }
}
