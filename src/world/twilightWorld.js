/**
 * twilightWorld.js — Master Coordinator for Group D: The Twilight World
 * Coordinates all virtual world entities, stencil clipping, and full-immersion realm transitions.
 */

import * as THREE from 'three';
import { AuroraSkyEffect } from './auroraSky.js';
import { GlowingMushroomsEffect } from './glowingMushrooms.js';
import { FloatingJellyfishEffect } from './floatingJellyfish.js';
import { ReflectiveWaterEffect } from './reflectiveWater.js';
import { GiantCrystalsEffect } from './giantCrystals.js';
import { TwilightMistEffect } from './twilightMist.js';
import { BioluminescentGrassEffect } from './bioluminescentGrass.js';
import { TwilightMoonEffect } from './twilightMoon.js';

export class TwilightWorld {
  constructor(scene, camera, renderer, effectsManager) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.effectsManager = effectsManager;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.isInside = false;

    // Instantiate Group D effects
    this.sky = new AuroraSkyEffect();
    this.mushrooms = new GlowingMushroomsEffect();
    this.jellyfish = new FloatingJellyfishEffect();
    this.water = new ReflectiveWaterEffect();
    this.crystals = new GiantCrystalsEffect();
    this.mist = new TwilightMistEffect();
    this.grass = new BioluminescentGrassEffect();
    this.moon = new TwilightMoonEffect();

    // Initialize all world systems
    this.sky.init(scene, camera, renderer);
    this.group.add(this.sky.mesh);

    this.mushrooms.init(scene, camera, renderer);
    this.group.add(this.mushrooms.group);

    this.jellyfish.init(scene, camera, renderer);
    this.group.add(this.jellyfish.group);

    this.water.init(scene, camera, renderer);
    this.group.add(this.water.mesh);

    this.crystals.init(scene, camera, renderer);
    this.group.add(this.crystals.group);

    this.mist.init(scene, camera, renderer);
    this.group.add(this.mist.group);

    this.grass.init(scene, camera, renderer);
    this.group.add(this.grass.group);

    this.moon.init(scene, camera, renderer);
    this.group.add(this.moon.group);

    // Register with central EffectsManager under group 'twilight'
    this.effectsManager.register('twilight_sky', 'twilight', this.sky);
    this.effectsManager.register('twilight_mushrooms', 'twilight', this.mushrooms);
    this.effectsManager.register('twilight_jellyfish', 'twilight', this.jellyfish);
    this.effectsManager.register('twilight_water', 'twilight', this.water);
    this.effectsManager.register('twilight_crystals', 'twilight', this.crystals);
    this.effectsManager.register('twilight_mist', 'twilight', this.mist);
    this.effectsManager.register('twilight_grass', 'twilight', this.grass);
    this.effectsManager.register('twilight_moon', 'twilight', this.moon);
  }

  /**
   * Updates stencil function when crossing into or out of the portal
   * When outside: EqualStencilFunc (only seen through portal doorway)
   * When inside: AlwaysStencilFunc (full 360 degree immersion)
   */
  setInsideVirtual(isInside) {
    this.isInside = isInside;
    const stencilFunc = isInside ? THREE.AlwaysStencilFunc : THREE.EqualStencilFunc;

    this.sky.setStencilFunc(stencilFunc);
    this.mushrooms.setStencilFunc(stencilFunc);
    this.jellyfish.setStencilFunc(stencilFunc);
    this.water.setStencilFunc(stencilFunc);
    this.crystals.setStencilFunc(stencilFunc);
    this.mist.setStencilFunc(stencilFunc);
    this.grass.setStencilFunc(stencilFunc);
    this.moon.setStencilFunc(stencilFunc);
  }

  setTimeOfDay(val) {
    this.sky.setTimeOfDay(val);
  }

  spawnWaterRipple(x, z) {
    this.water.spawnRipple(x, z);
  }

  dispose() {
    this.sky.dispose();
    this.mushrooms.dispose();
    this.jellyfish.dispose();
    this.water.dispose();
    this.crystals.dispose();
    this.mist.dispose();
    this.grass.dispose();
    this.moon.dispose();

    if (this.group) {
      this.scene.remove(this.group);
      this.group = null;
    }
  }
}
