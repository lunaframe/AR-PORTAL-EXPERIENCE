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
      gate: new Set(),
      particles: new Set(),
      lighting: new Set(),
      realm: new Set(),
      reactive: new Set(),
      ui: new Set(),
    };

    this.groupEnabled = {
      gate: true,
      particles: true,
      lighting: true,
      realm: true,
      reactive: true,
      ui: true,
    };

    this.masterIntensity = 1.0;
    this.currentQuality = 'high';
    this.currentTheme = 'dream';
    this.disabledEffects = new Set();

    // Dream Gate Palette (RGB vectors)
    this.themes = {
      dream: {
        name: 'Dream Gate',
        midnight: { r: 11 / 255, g: 10 / 255, b: 42 / 255 },  // #0b0a2a
        violet: { r: 124 / 255, g: 77 / 255, b: 255 / 255 },  // #7c4dff
        silver: { r: 223 / 255, g: 233 / 255, b: 255 / 255 }, // #dfe9ff
        teal: { r: 61 / 255, g: 242 / 255, b: 208 / 255 },    // #3df2d0
        rose: { r: 255 / 255, g: 158 / 255, b: 203 / 255 },   // #ff9ecb
        lantern: { r: 255 / 255, g: 210 / 255, b: 122 / 255 },// #ffd27a

        // Standard VFX aliases
        primary: { r: 124 / 255, g: 77 / 255, b: 255 / 255 },
        secondary: { r: 11 / 255, g: 10 / 255, b: 42 / 255 },
        accent1: { r: 61 / 255, g: 242 / 255, b: 208 / 255 },
        accent2: { r: 255 / 255, g: 158 / 255, b: 203 / 255 },
        highlight: { r: 255 / 255, g: 210 / 255, b: 122 / 255 },
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

    // Initialize with current parameters safely
    if (typeof effect.init === 'function') {
      try {
        effect.init(this.scene, this.camera, this.renderer);
      } catch (err) {
        console.error(`[EffectsManager] Error initializing effect '${id}':`, err);
        this.disabledEffects.add(id);
      }
    }
    if (typeof effect.setQuality === 'function') {
      try {
        effect.setQuality(this.currentQuality);
      } catch (err) {
        console.error(`[EffectsManager] Error setQuality on effect '${id}':`, err);
      }
    }
    if (typeof effect.setTheme === 'function') {
      try {
        effect.setTheme(this.themes[this.currentTheme]);
      } catch (err) {
        console.error(`[EffectsManager] Error setTheme on effect '${id}':`, err);
      }
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
      if (this.disabledEffects.has(id)) continue;

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
          this.disabledEffects.add(id);
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
