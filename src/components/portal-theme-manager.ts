/**
 * portal-theme-manager.ts — Theme switcher and scene-level audio listener bridge
 *
 * Registered as scene-level component: <a-scene portal-scene-manager>
 *
 * Responsibilities:
 *   - Continuously update Web Audio API listener position and orientation each frame
 *   - Broadcast theme-switch events to all portals
 *   - Handle portal lifecycle events
 */

import { saveTheme, loadTheme } from '../utils/persistence';
import { PortalAudioController } from './portal-audio';
import { THREE } from '../utils/three';

AFRAME.registerComponent('portal-scene-manager', {
  _camPos: null as any,
  _camDir: null as any,

  init(this: AFrameComponentInst) {
    const self = this as any;
    self._activeTheme = loadTheme();
    self._camPos = new THREE.Vector3();
    self._camDir = new THREE.Vector3();

    this.el.addEventListener('portal-placed', (e: Event) => {
      const { position, themeId } = (e as CustomEvent).detail;
      console.log(`[scene-manager] Portal placed at`, position, 'theme:', themeId);
    });

    this.el.addEventListener('portal-world-enter', (e: Event) => {
      const { themeId } = (e as CustomEvent).detail;
      console.log(`[scene-manager] Entered portal world: ${themeId}`);
    });

    this.el.addEventListener('portal-world-exit', (e: Event) => {
      const { themeId } = (e as CustomEvent).detail;
      console.log(`[scene-manager] Exited portal world: ${themeId}`);
    });

    this.el.addEventListener('theme-selected', (e: Event) => {
      const { themeId } = (e as CustomEvent).detail;
      self._activeTheme = themeId;
      saveTheme(themeId);
      self._broadcastThemeChange(themeId);
    });
  },

  setThemeForAll(this: any, themeId: string) {
    this._broadcastThemeChange(themeId);
  },

  _broadcastThemeChange(this: any, themeId: string) {
    const container = document.getElementById('portals-container');
    if (!container) return;
    Array.from(container.children).forEach((child) => {
      const entity = child as AFrameEntity;
      const core = entity.components?.['portal-core'] as any;
      if (core?.switchTheme) {
        core.switchTheme(themeId);
      }
    });
  },

  tick(this: AFrameComponentInst) {
    const self = this as any;
    const camera = this.el.sceneEl?.camera as any;
    if (!camera) return;

    // Dynamically update spatial audio listener transform each frame
    camera.getWorldPosition(self._camPos);
    camera.getWorldDirection(self._camDir);

    PortalAudioController.updateListenerPosition(
      self._camPos.x, self._camPos.y, self._camPos.z,
      self._camDir.x, self._camDir.y, self._camDir.z
    );
  },
});
