/**
 * session.js — WebXR Immersive-AR Session Manager
 * Handles:
 * - Session request with 'hit-test', 'dom-overlay', 'local-floor', and 'light-estimation'
 * - AR Hit-Testing against real-world floor/wall surfaces
 * - WebXR Light Estimation (ambient intensity & spherical harmonics tint)
 * - Clean session lifecycle & exit handling
 */

import * as THREE from 'three';

export class XRSessionManager {
  constructor(renderer, domOverlayRoot) {
    this.renderer = renderer;
    this.domOverlayRoot = domOverlayRoot;

    this.xrSession = null;
    this.xrRefSpace = null;
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;

    // Hit test reticle transform
    this.hitPose = null;
    this.hasHit = false;

    // Light estimation
    this.lightProbe = null;
    this.lightEstimator = null;
    this.estimatedLightIntensity = 1.0;
    this.estimatedLightColor = new THREE.Color(0xffffff);

    // Callbacks
    this.onSessionStarted = null;
    this.onSessionEnded = null;
    this.onHitResult = null;
    this.onSelect = null;
  }

  static async checkSupport() {
    if (!navigator.xr) {
      return { supported: false, reason: 'navigator.xr not available' };
    }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      return { supported, reason: supported ? null : 'immersive-ar not supported' };
    } catch (err) {
      return { supported: false, reason: err.message };
    }
  }

  async start() {
    if (!navigator.xr) throw new Error('WebXR is not supported on this browser.');

    const sessionInit = {
      requiredFeatures: ['hit-test', 'local-floor'],
      optionalFeatures: ['dom-overlay', 'light-estimation'],
    };

    if (this.domOverlayRoot) {
      sessionInit.domOverlay = { root: this.domOverlayRoot };
    }

    const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
    this.xrSession = session;

    // Connect to Three.js WebGLRenderer
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(session);

    this.xrRefSpace = await session.requestReferenceSpace('local-floor');

    // Input controller select event (screen tap in AR)
    session.addEventListener('select', (e) => {
      this.onSelect?.(e);
    });

    session.addEventListener('end', () => {
      this.handleSessionEnd();
    });

    // Request light probe if supported
    try {
      if ('requestLightProbe' in session) {
        this.lightProbe = await session.requestLightProbe();
      }
    } catch (e) {
      console.debug('Light estimation not available on this device');
    }

    this.hitTestSourceRequested = false;
    this.onSessionStarted?.();

    return session;
  }

  update(frame) {
    if (!frame || !this.xrSession) return;

    const referenceSpace = this.renderer.xr.getReferenceSpace() || this.xrRefSpace;

    // Request hit-test source once session reference space is established
    if (!this.hitTestSourceRequested) {
      this.xrSession.requestReferenceSpace('viewer').then((viewerSpace) => {
        this.xrSession.requestHitTestSource({ space: viewerSpace }).then((source) => {
          this.hitTestSource = source;
        }).catch((err) => {
          console.warn('Hit test source request failed:', err);
        });
      });
      this.hitTestSourceRequested = true;
    }

    // Process hit test results
    if (this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        if (pose) {
          this.hasHit = true;
          this.hitPose = pose;
          this.onHitResult?.({
            matrix: new THREE.Matrix4().fromArray(pose.transform.matrix),
            position: new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z),
            orientation: new THREE.Quaternion(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w),
          });
        }
      } else {
        this.hasHit = false;
        this.onHitResult?.(null);
      }
    }

    // Process light estimation
    if (this.lightProbe && frame.getLightEstimate) {
      const estimate = frame.getLightEstimate(this.lightProbe);
      if (estimate) {
        // Pixel intensity & color temperature
        const primaryLight = estimate.primaryLightIntensity;
        if (primaryLight) {
          this.estimatedLightColor.setRGB(primaryLight.x, primaryLight.y, primaryLight.z);
        }
      }
    }
  }

  stop() {
    if (this.xrSession) {
      this.xrSession.end().catch(() => {});
    }
  }

  handleSessionEnd() {
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    this.hasHit = false;
    this.xrSession = null;
    this.renderer.xr.enabled = false;
    this.onSessionEnded?.();
  }
}
