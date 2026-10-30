/**
 * session.js — WebXR Immersive-AR Session Manager
 * Handles:
 * - Session request with required 'hit-test', optional 'dom-overlay', 'local-floor', 'light-estimation'
 * - Reference space fallback: tries 'local-floor', falls back to 'local'
 * - AR Hit-Testing against real-world floor/wall surfaces from viewer space
 * - Reticle visibility and 10s surface search timeout notice
 * - DOM Overlay transparency class ('xr-active') toggle
 * - Clean session lifecycle & exit handling
 */

import * as THREE from 'three';

export class XRSessionManager {
  constructor(renderer, domOverlayRoot) {
    this.renderer = renderer;
    this.domOverlayRoot = domOverlayRoot;

    this.xrSession = null;
    this.xrRefSpace = null;
    this.refSpaceType = 'none';
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;

    // Hit test state
    this.hitPose = null;
    this.hasHit = false;
    this.hitCount = 0;
    this.sessionStartTime = 0;
    this.lastHitTime = 0;
    this.surfaceTimeoutReported = false;

    // Light estimation
    this.lightProbe = null;
    this.estimatedLightIntensity = 1.0;
    this.estimatedLightColor = new THREE.Color(0xffffff);

    // Callbacks
    this.onSessionStarted = null;
    this.onSessionEnded = null;
    this.onHitResult = null;
    this.onSelect = null;
    this.onSurfaceTimeout = null;
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
    if (!navigator.xr) {
      throw new Error('WebXR is not supported on this browser.');
    }

    const sessionInit = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor', 'light-estimation'],
    };

    if (this.domOverlayRoot) {
      sessionInit.domOverlay = { root: this.domOverlayRoot };
    }

    const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
    this.xrSession = session;
    this.sessionStartTime = performance.now();
    this.lastHitTime = 0;
    this.surfaceTimeoutReported = false;

    // Add xr-active class to DOM overlay root and body/html for transparent camera view
    document.documentElement.classList.add('xr-active');
    document.body.classList.add('xr-active');
    if (this.domOverlayRoot) {
      this.domOverlayRoot.classList.add('xr-active');
    }

    // Connect to Three.js WebGLRenderer
    this.renderer.xr.enabled = true;
    try {
      this.renderer.xr.setFramebufferScaleFactor(1.0);
    } catch (e) {
      console.debug('setFramebufferScaleFactor not available:', e);
    }

    // Reference space setup with fallback from local-floor to local
    let refSpace = null;
    let chosenType = 'local-floor';
    try {
      refSpace = await session.requestReferenceSpace('local-floor');
      this.renderer.xr.setReferenceSpaceType('local-floor');
      chosenType = 'local-floor';
    } catch (err) {
      console.warn('local-floor reference space unavailable, falling back to local:', err);
      try {
        refSpace = await session.requestReferenceSpace('local');
        this.renderer.xr.setReferenceSpaceType('local');
        chosenType = 'local';
      } catch (errLocal) {
        console.error('Failed to acquire local reference space:', errLocal);
        throw errLocal;
      }
    }
    this.xrRefSpace = refSpace;
    this.refSpaceType = chosenType;

    await this.renderer.xr.setSession(session);

    // Screen tap / primary input
    session.addEventListener('select', (e) => {
      this.onSelect?.(e);
    });

    session.addEventListener('end', () => {
      this.handleSessionEnd();
    });

    // Optional Light estimation
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
    if (!referenceSpace) return;

    // Request viewer-space hit-test source once
    if (!this.hitTestSourceRequested) {
      this.hitTestSourceRequested = true;
      this.xrSession.requestReferenceSpace('viewer').then((viewerSpace) => {
        return this.xrSession.requestHitTestSource({ space: viewerSpace });
      }).then((source) => {
        this.hitTestSource = source;
      }).catch((err) => {
        console.warn('Viewer hit-test source request failed:', err);
      });
    }

    // Process hit-test
    if (this.hitTestSource) {
      try {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        if (hitTestResults && hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          if (pose) {
            this.hasHit = true;
            this.hitPose = pose;
            this.hitCount++;
            this.lastHitTime = performance.now();
            this.onHitResult?.({
              matrix: new THREE.Matrix4().fromArray(pose.transform.matrix),
              position: new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z),
              orientation: new THREE.Quaternion(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w),
            });
          } else {
            this.hasHit = false;
            this.onHitResult?.(null);
          }
        } else {
          this.hasHit = false;
          this.onHitResult?.(null);
        }
      } catch (err) {
        this.hasHit = false;
        this.onHitResult?.(null);
      }
    }

    // 10-second timeout check for surface scanning
    const now = performance.now();
    if (!this.surfaceTimeoutReported && (now - this.sessionStartTime > 10000) && (!this.lastHitTime || (now - this.lastHitTime > 8000))) {
      this.surfaceTimeoutReported = true;
      this.onSurfaceTimeout?.();
    }

    // Process optional light estimation
    if (this.lightProbe && frame.getLightEstimate) {
      try {
        const estimate = frame.getLightEstimate(this.lightProbe);
        if (estimate && estimate.primaryLightIntensity) {
          const pli = estimate.primaryLightIntensity;
          this.estimatedLightColor.setRGB(pli.x, pli.y, pli.z);
        }
      } catch (e) {
        // Safe swallow
      }
    }
  }

  stop() {
    if (this.xrSession) {
      this.xrSession.end().catch(() => {});
    }
  }

  handleSessionEnd() {
    document.documentElement.classList.remove('xr-active');
    document.body.classList.remove('xr-active');
    if (this.domOverlayRoot) {
      this.domOverlayRoot.classList.remove('xr-active');
    }

    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    this.hasHit = false;
    this.hitPose = null;
    this.xrSession = null;
    this.renderer.xr.enabled = false;
    this.refSpaceType = 'none';
    this.onSessionEnded?.();
  }
}
