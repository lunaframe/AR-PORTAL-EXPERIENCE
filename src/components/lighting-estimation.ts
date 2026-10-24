/**
 * lighting-estimation.ts — WebXR Lighting Estimation API integration
 *
 * Requests the `light-estimation` feature from the XR session and exposes
 * the real-world light probe color as a THREE.Color for use in rim shaders.
 *
 * When available, the light tint is computed from the XRLightProbe's
 * spherical harmonics (specifically the L0,0 coefficient = ambient color).
 * We blend this into the rim shader via u_lightTint uniform.
 *
 * Gracefully defaults to unit white when unsupported.
 */

import type * as THREETypes from 'three';
import { THREE } from '../utils/three';

AFRAME.registerComponent('lighting-estimation', {
  schema: {
    enabled: { type: 'boolean', default: true },
  },

  /** Exposed to other components — falls back to white (no tint) if unavailable */
  lightColor: null as any,
  _probe: null as any,

  init(this: any) {
    this.lightColor = new THREE.Color(1, 1, 1);
    this._probe = null;

    this.el.sceneEl.addEventListener('enter-vr', () => {
      this._requestLightEstimation();
    });

    this.el.sceneEl.addEventListener('exit-vr', () => {
      this._probe = null;
      this.lightColor.setRGB(1, 1, 1);
    });
  },

  async _requestLightEstimation(
    this: AFrameComponentInst & { lightColor: THREETypes.Color; _probe: any },
  ) {
    if (!this.data.enabled) return;
    const session = this.el.sceneEl?.xrSession as any;
    if (!session || typeof session.requestLightProbe !== 'function') {
      console.log('[lighting-estimation] Not supported on this device/session, using neutral white');
      return;
    }

    try {
      this._probe = await session.requestLightProbe().catch(() => null);
      if (this._probe) {
        console.log('[lighting-estimation] XRLightProbe acquired');
      }
    } catch {
      console.log('[lighting-estimation] Light probe acquisition failed, using neutral white');
      this._probe = null;
    }
  },

  tick(
    this: AFrameComponentInst & { lightColor: THREETypes.Color; _probe: any },
  ) {
    if (!this._probe) return;
    const frame = this.el.sceneEl?.frame as any;
    if (!frame || typeof frame.getLightEstimate !== 'function') return;

    try {
      const estimate = frame.getLightEstimate(this._probe);
      if (!estimate || !estimate.sphericalHarmonicsCoefficients) return;

      const sh = estimate.sphericalHarmonicsCoefficients as Float32Array;
      const r = Math.max(0, sh[0] / 0.886);
      const g = Math.max(0, sh[1] / 0.886);
      const b = Math.max(0, sh[2] / 0.886);

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance > 0.001) {
        this.lightColor.setRGB(r / luminance, g / luminance, b / luminance);
      }
    } catch {
      // Skip silently if frame doesn't have estimate ready
    }
  },

  remove(
    this: AFrameComponentInst & { lightColor: THREETypes.Color; _probe: any },
  ) {
    this._probe = null;
    this.lightColor?.setRGB(1, 1, 1);
  },
});
