/**
 * hit-test-placement.ts — WebXR Hit-Test API integration for surface placement
 *
 * Registered as A-Frame scene-level component: <a-scene hit-test-placement>
 *
 * Flow:
 *   1. On AR session start, request an XRHitTestSource from the viewer space.
 *   2. Each frame, getHitTestResults() returns surface poses for the reticle.
 *   3. User taps the screen → spawn a portal at the hit pose.
 *   4. Multi-portal support: up to 8 simultaneous portals.
 *   5. 9th portal attempt is cleanly blocked without crash.
 *   6. Reticle aligns to the detected surface normal.
 */

import type * as THREETypes from 'three';
import { THREE } from '../utils/three';
import { loadTheme, savePortals, clearPortals, type PersistedPortal } from '../utils/persistence';
import { showInstruction } from '../utils/device-detect';
import { canAllocatePortalId, MAX_PORTALS } from '../utils/render-order';

AFRAME.registerComponent('hit-test-placement', {
  schema: {
    enabled:     { type: 'boolean', default: true },
    maxPortals:  { type: 'int',     default: MAX_PORTALS },
    reticleId:   { type: 'string',  default: '#reticle' },
    containerId: { type: 'string',  default: '#portals-container' },
  },

  _hitTestSource: null as any,
  _reticleEl:     null as AFrameEntity | null,
  _container:     null as AFrameEntity | null,
  _currentPose:   null as any,
  _currentTheme:  'wormhole' as string,
  _hasHitResult:  false as boolean,
  _tempMatrix:    null as any,

  init(this: AFrameComponentInst) {
    const self = this as any;
    self._currentTheme = loadTheme();
    self._tempMatrix   = new THREE.Matrix4();

    this.el.sceneEl.addEventListener('loaded', () => {
      self._reticleEl = document.querySelector(this.data.reticleId as string) as AFrameEntity;
      self._container = document.querySelector(this.data.containerId as string) as AFrameEntity;
    });

    this.el.sceneEl.addEventListener('enter-vr', () => {
      self._startHitTest();
    });

    this.el.sceneEl.addEventListener('exit-vr', () => {
      self._hitTestSource?.cancel?.();
      self._hitTestSource = null;
      self._reticleEl?.setAttribute('visible', 'false');
    });

    this.el.sceneEl.addEventListener('click', () => {
      if (!this.data.enabled || !self._hasHitResult) return;
      self._placePortal();
    });

    this.el.sceneEl.addEventListener('select', () => {
      if (!this.data.enabled || !self._hasHitResult) return;
      self._placePortal();
    });

    this.el.sceneEl.addEventListener('theme-selected', (e: Event) => {
      self._currentTheme = (e as CustomEvent).detail.themeId;
    });

    this.el.sceneEl.addEventListener('clear-portals', () => {
      self._clearPortals();
    });
  },

  async _startHitTest(this: any) {
    const session = this.el.sceneEl?.xrSession as any;
    if (!session) return;

    try {
      const viewerSpace = await session.requestReferenceSpace('viewer');
      if (session.requestHitTestSource) {
        this._hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        console.log('[hit-test] Hit-test source acquired');
      }
    } catch (e) {
      console.warn('[hit-test] Hit-test not available on this device/session:', e);
    }
  },

  _placePortal(this: any) {
    if (!this._currentPose) return;

    const container = this._container || document.getElementById('portals-container');
    if (!container) return;

    const currentCount = container.querySelectorAll('[portal-core]').length;
    if (currentCount >= this.data.maxPortals || !canAllocatePortalId()) {
      showInstruction(`Maximum ${this.data.maxPortals} portals reached — remove one to place another`, 3500);
      return;
    }

    const matrix = new THREE.Matrix4();
    matrix.fromArray((this._currentPose as any).transform.matrix);

    const position = new THREE.Vector3();
    const quat     = new THREE.Quaternion();
    const scale    = new THREE.Vector3();
    matrix.decompose(position, quat, scale);

    const portal = document.createElement('a-entity') as AFrameEntity;
    portal.setAttribute('position', `${position.x.toFixed(4)} ${position.y.toFixed(4)} ${position.z.toFixed(4)}`);

    const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
    portal.setAttribute(
      'rotation',
      `${THREE.MathUtils.radToDeg(euler.x).toFixed(2)} ${THREE.MathUtils.radToDeg(euler.y).toFixed(2)} ${THREE.MathUtils.radToDeg(euler.z).toFixed(2)}`
    );

    portal.setAttribute('portal-core', `theme: ${this._currentTheme}; autoOpen: true`);
    portal.dataset.portalId = String(currentCount + 1);

    container.appendChild(portal);

    // Save to persistence
    setTimeout(() => {
      this._persistAllPortals();
    }, 150);

    this._reticleEl?.setAttribute('visible', 'false');
    this._hasHitResult = false;

    showInstruction('✦ Portal placed! Walk through to enter', 3000);
    this.el.sceneEl.emit('portal-placed', { position, themeId: this._currentTheme });
  },

  _persistAllPortals(this: any) {
    const container = this._container || document.getElementById('portals-container');
    if (!container) return;

    const portals = container.querySelectorAll('[portal-core]');
    const list: PersistedPortal[] = [];

    portals.forEach((el: Element, index: number) => {
      const entity = el as AFrameEntity;
      const core = entity.components?.['portal-core'] as any;
      const pos = entity.object3D.position;
      const quat = entity.object3D.quaternion;
      const themeId = core?._theme?.id || this._currentTheme;

      list.push({
        id: index + 1,
        theme: themeId,
        position: { x: pos.x, y: pos.y, z: pos.z },
        quaternion: { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
      });
    });

    savePortals(list);
  },

  _clearPortals(this: any) {
    const container = this._container || document.getElementById('portals-container');
    if (!container) return;

    const children = Array.from(container.children) as AFrameEntity[];
    children.forEach(child => {
      if (child.hasAttribute('portal-core') || child.dataset.portalId || child.hasAttribute('data-demo')) {
        container.removeChild(child);
      }
    });

    clearPortals();
    showInstruction('All portals cleared', 2000);
  },

  tick(this: AFrameComponentInst) {
    const self = this as any;
    if (!self._hitTestSource) return;

    const frame = this.el.sceneEl?.frame as any;
    if (!frame) return;

    const referenceSpace = (this.el.sceneEl?.renderer as any)?.xr?.getReferenceSpace?.();
    if (!referenceSpace) return;

    const results = frame.getHitTestResults(self._hitTestSource);

    if (results && results.length > 0) {
      const hit  = results[0];
      const pose = hit.getPose(referenceSpace);

      if (pose) {
        self._currentPose  = pose;
        self._hasHitResult = true;

        if (self._reticleEl) {
          self._reticleEl.setAttribute('visible', 'true');
          self._tempMatrix.fromArray(pose.transform.matrix);

          const pos  = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          const sc   = new THREE.Vector3();
          self._tempMatrix.decompose(pos, quat, sc);

          self._reticleEl.object3D.position.copy(pos);
          self._reticleEl.object3D.quaternion.copy(quat);
        }
      }
    } else {
      self._hasHitResult = false;
      self._reticleEl?.setAttribute('visible', 'false');
    }
  },

  remove(this: AFrameComponentInst) {
    (this as any)._hitTestSource?.cancel?.();
  },
});
