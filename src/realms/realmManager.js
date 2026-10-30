/**
 * realmManager.js — Master Coordinator for Dream Realms & Fragments
 * Manages active realm switching, stencil buffer gating, and fragment collection.
 */

import * as THREE from 'three';
import { SkyGardenRealm } from './skyGarden.js';
import { MidnightOceanRealm } from './midnightOcean.js';
import { StarLibraryRealm } from './starLibrary.js';
import { DreamFragmentsSystem } from './fragments.js';

export class RealmManager {
  constructor(scene, camera, renderer, effectsManager) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.effectsManager = effectsManager;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.activeRealmId = 'skyGarden';
    this.isInsideVirtual = false;

    // Fragment collection system
    this.fragments = new DreamFragmentsSystem(this.scene, this.camera);

    // Realm instances
    this.realms = {
      skyGarden: new SkyGardenRealm(this.scene, this.camera),
      midnightOcean: new MidnightOceanRealm(this.scene, this.camera),
      starLibrary: new StarLibraryRealm(this.scene, this.camera),
    };

    // Initialize all realms (hidden until gate is placed)
    this.realms.skyGarden.init();
    this.realms.midnightOcean.init();
    this.realms.starLibrary.init();

    this.isPlaced = false;
    this.realms.skyGarden.group.visible = false;
    this.realms.midnightOcean.group.visible = false;
    this.realms.starLibrary.group.visible = false;
    this.fragments.group.visible = false;

    // Apply stencil render orders
    this.applyRealmRenderOrders(false);

    // Init fragments for Sky Garden
    this.initRealmFragments('skyGarden');

    // Register with effects manager
    this.effectsManager.register('realm_sky_garden', 'realm', this.realms.skyGarden);
    this.effectsManager.register('realm_midnight_ocean', 'realm', this.realms.midnightOcean);
    this.effectsManager.register('realm_star_library', 'realm', this.realms.starLibrary);
  }

  initRealmFragments(realmId) {
    const coordsMap = {
      skyGarden: [
        [0.0, 1.2, -3.2],
        [-1.8, 1.4, -4.5],
        [1.8, 1.3, -4.8],
        [-2.5, 1.8, -6.0],
        [2.2, 1.6, -6.5],
        [0.0, 2.4, -7.5],
        [-1.0, 1.5, -8.2],
      ],
      midnightOcean: [
        [-1.2, 0.8, -3.0],
        [1.4, 0.9, -3.8],
        [0.0, 1.2, -4.5],
        [-2.2, 0.7, -5.5],
        [2.0, 1.1, -6.2],
        [-0.8, 1.4, -7.0],
        [1.2, 0.9, -8.0],
      ],
      starLibrary: [
        [-0.9, 1.6, -3.2],
        [1.1, 1.4, -3.6],
        [-1.6, 2.0, -4.8],
        [1.8, 1.8, -5.2],
        [0.0, 2.5, -6.0],
        [-1.2, 1.3, -6.8],
        [0.8, 2.1, -7.6],
      ],
    };

    this.fragments.init(coordsMap[realmId] || coordsMap.skyGarden);
  }

  setGatePlaced(isPlaced) {
    this.isPlaced = !!isPlaced;
    for (const [id, r] of Object.entries(this.realms)) {
      if (r) {
        r.group.visible = this.isPlaced && (id === this.activeRealmId);
      }
    }
    if (this.fragments) {
      this.fragments.group.visible = this.isPlaced;
    }
  }

  setRealm(realmId) {
    if (this.activeRealmId === realmId) return;
    this.activeRealmId = realmId;

    // Hide or show realms
    for (const [id, r] of Object.entries(this.realms)) {
      if (r) {
        r.group.visible = this.isPlaced && (id === realmId);
      }
    }

    // Reset fragment collection for new realm
    this.initRealmFragments(realmId);
    this.setInsideVirtual(this.isInsideVirtual);
  }

  applyRealmRenderOrders(isInside) {
    const order = isInside ? 0 : 2;
    for (const r of Object.values(this.realms)) {
      if (r && r.group) {
        r.group.traverse((obj) => {
          if (obj.material) obj.renderOrder = order;
        });
      }
    }
    if (this.fragments && this.fragments.group) {
      this.fragments.group.traverse((obj) => {
        if (obj.material) obj.renderOrder = order;
      });
    }
  }

  setInsideVirtual(isInside) {
    this.isInsideVirtual = isInside;
    const stencilFunc = isInside ? THREE.AlwaysStencilFunc : THREE.EqualStencilFunc;

    for (const r of Object.values(this.realms)) {
      if (r) r.setStencilFunc(stencilFunc);
    }
    if (this.fragments) {
      this.fragments.setStencilFunc(stencilFunc);
    }
    this.applyRealmRenderOrders(isInside);
  }

  update(dt, time, state) {
    const activeRealm = this.realms[this.activeRealmId];
    if (activeRealm) {
      activeRealm.update(dt, time, state);
    }
    this.fragments.update(dt, time, this.isInsideVirtual);
  }

  dispose() {
    this.fragments.dispose();
    for (const r of Object.values(this.realms)) {
      if (r) r.dispose();
    }
    this.scene.remove(this.group);
  }
}
