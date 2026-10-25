/**
 * main.js — Application Master Orchestrator (Complete Production Edition)
 * Full WebXR ARCore, iOS Camera Fallback, Desktop 3D Preview,
 * Spatial Audio Engine, 43 Visual Effects, Gestures and Crossing Transitions.
 */

import * as THREE from 'three';
import { QualityManager } from './utils/quality.js';
import { EffectsManager } from './effects/effectsManager.js';
import { audioEngine } from './audio/engine.js';
import { Portal } from './portal/portal.js';
import { ScanningReticle } from './portal/reticle.js';
import { XRSessionManager } from './xr/session.js';
import { CameraModeFallback } from './fallback/cameraMode.js';
import { UIManager } from './ui/uiManager.js';
import { captureScreenshot } from './utils/screenshot.js';
import { PostProcessingManager } from './effects/postprocessing/postManager.js';

class TwilightPortalApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.videoElement = document.getElementById('camera-video');
    this.uiContainer = document.getElementById('ui-container');

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Subsystem Managers
    this.quality = null;
    this.effects = null;
    this.portal = null;
    this.reticle = null;
    this.xrSession = null;
    this.fallback = null;
    this.ui = null;
    this.post = null;

    // Application State
    this.activeMode = 'none'; // 'ar' | 'camera' | 'preview'
    this.isPlaced = false;
    this.clock = new THREE.Clock();
    this.cameraWorldPos = new THREE.Vector3();

    // Crossing FOV punch animation
    this.baseFov = 70;
    this.fovPunch = 0;

    // Multi-touch Gesture tracking
    this.touchStartDist = 0;
    this.touchStartAngle = 0;
    this.initialScale = 1.0;
    this.initialRotation = 0;
    this.isPinching = false;
  }

  async init() {
    // 1. Initialize Three.js Renderer & Scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.05, 100);
    this.camera.position.set(0, 1.4, 1.8);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: true, // Crucial for portal aperture stencil buffer
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 2. Initialize Quality & Effects Managers
    this.quality = new QualityManager(this.renderer);
    this.effects = new EffectsManager(this.scene, this.camera, this.renderer);

    this.quality.onQualityChange((level) => {
      this.effects.setQuality(level);
      if (this.ui?.dom.qualitySelect) {
        this.ui.dom.qualitySelect.value = level;
      }
    });

    // 3. Initialize Portal & Scanning Reticle
    this.portal = new Portal(this.scene, this.camera, this.renderer, this.effects);
    this.reticle = new ScanningReticle(this.scene);

    // Sequence flash / letterbox hooks
    this.portal.sequence.onFlashTrigger = () => this.ui.showScreenFlash();
    this.portal.sequence.onVignettePulse = () => this.ui.pulseVignette();
    this.portal.sequence.onLetterboxToggle = (active) => this.ui.setLetterbox(active);

    // Effect 32: Crossing-through reaction hook
    this.portal.onRealmTransition = (entering) => {
      this.handleRealmCrossing(entering);
    };

    // 4. Initialize Desktop/Camera Post-Processing (UnrealBloom + Chromatic Aberration + Grain)
    this.post = new PostProcessingManager(this.renderer, this.scene, this.camera);

    // 5. Initialize XR & Fallback Managers
    this.xrSession = new XRSessionManager(this.renderer, this.uiContainer);
    this.fallback = new CameraModeFallback(this.scene, this.camera, this.renderer, this.videoElement);

    // 6. Initialize UI Manager
    this.ui = new UIManager();

    // 7. Bind Interactions & Event Listeners
    this.bindEvents();
    this.initGestures();

    // 8. Detect platform support and configure buttons
    await this.detectPlatform();

    // 9. Handle Window Resizing
    window.addEventListener('resize', () => this.onResize());
  }

  handleRealmCrossing(entering) {
    // Screen flash
    this.ui.showScreenFlash();
    this.ui.pulseVignette();

    // Haptic vibration buzz
    this.ui.triggerHaptic([40, 70, 150]);

    // FOV punch (widens briefly by 12 degrees then springs back)
    this.fovPunch = entering ? 12 : -8;

    // Sparks burst from doorway
    this.portal.sequence.triggerSparksBurst();

    if (entering) {
      this.ui.showToast('✦ Entered Bioluminescent Twilight Realm', 3000);
      this.ui.setCoachText('You are inside the realm • Explore the flora & crystals');
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = '⚡ Step Back Outside';
    } else {
      this.ui.showToast('✦ Returned to Real World', 2500);
      this.ui.setCoachText('Outside portal • Walk back in anytime');
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = '⚡ Step Through';
    }
  }

  async detectPlatform() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const xrCheck = await XRSessionManager.checkSupport();

    if (xrCheck.supported) {
      this.ui.dom.btnEnterAR?.classList.remove('hidden');
      this.ui.dom.btnCameraMode?.classList.add('hidden');
      this.ui.dom.btnPreview?.classList.remove('hidden');
      this.ui.setStatus('ARCore Ready');
    } else if (isMobile) {
      this.ui.dom.btnEnterAR?.classList.add('hidden');
      this.ui.dom.btnCameraMode?.classList.remove('hidden');
      this.ui.dom.btnPreview?.classList.remove('hidden');
      this.ui.setStatus('Camera Mode');
    } else {
      this.ui.dom.btnEnterAR?.classList.add('hidden');
      this.ui.dom.btnCameraMode?.classList.add('hidden');
      this.ui.dom.btnPreview?.classList.remove('hidden');
      this.ui.setStatus('3D Preview');
    }
  }

  bindEvents() {
    this.ui.onAction = async (action, data) => {
      switch (action) {
        case 'start-ar':
          await this.startAR();
          break;
        case 'start-camera':
          await this.startCameraMode();
          break;
        case 'start-preview':
          this.startPreviewMode();
          break;
        case 'place-fallback':
          this.placeFallbackPortal();
          break;
        case 'toggle-step':
          this.toggleStepFallback();
          break;
        case 'reset-portal':
          this.resetPortal();
          break;
        case 'exit-experience':
          this.exitExperience();
          break;
        case 'screenshot':
          captureScreenshot(this.renderer, this.videoElement, () => this.ui.showScreenFlash());
          break;
        case 'set-scale':
          this.portal.setScale(data);
          break;
        case 'set-intensity':
          this.effects.setMasterIntensity(data);
          break;
        case 'set-quality':
          this.quality.setQuality(data);
          break;
        case 'set-theme':
          this.effects.setTheme(data);
          break;
        case 'set-time-of-day':
          this.portal.setTimeOfDay(data);
          break;
        case 'toggle-group':
          this.effects.setGroupEnabled(data.group, data.enabled);
          break;
        case 'cinematic-mode':
          this.quality.setQuality('high');
          this.effects.setMasterIntensity(1.35);
          for (const grp of ['core', 'particles', 'lighting', 'twilight', 'reactive']) {
            this.effects.setGroupEnabled(grp, true);
            if (this.ui.dom.groupToggles[grp]) this.ui.dom.groupToggles[grp].checked = true;
          }
          break;
      }
    };

    // XR Hit test
    this.xrSession.onHitResult = (hitResult) => {
      if (!this.isPlaced) {
        this.reticle.setHitResult(hitResult);
        if (hitResult) {
          this.ui.setCoachText('Tap anywhere to place portal on floor');
          this.ui.setStatus('Surface Locked');
        } else {
          this.ui.setCoachText('Move phone slowly across floor to scan');
          this.ui.setStatus('Scanning...');
        }
      }
    };

    // XR Select (Tap in AR)
    this.xrSession.onSelect = () => {
      if (!this.isPlaced && this.reticle.isLocked) {
        this.portal.place(this.reticle.group.position, this.camera.position);
        this.isPlaced = true;
        this.reticle.group.visible = false;
        this.ui.setCoachText('Walk closer to step through into twilight world');
        this.ui.setStatus('Portal Active');
        this.ui.dom.btnResetPortal?.classList.remove('hidden');
        this.ui.dom.scaleSliderContainer?.classList.remove('hidden');
      } else if (this.isPlaced) {
        audioEngine.playTapEffect(this.camera.position);
      }
    };

    this.xrSession.onSessionEnded = () => {
      this.resetPortal();
      this.ui.showSplash();
      this.activeMode = 'none';
      this.post.setEnabled(false);
    };
  }

  async startAR() {
    try {
      this.activeMode = 'ar';
      this.post.setEnabled(false); // Disable post-processing in immersive-ar
      this.ui.hideSplash();
      this.ui.dom.btnPlaceFallback?.classList.add('hidden');
      this.ui.dom.btnStepFallback?.classList.add('hidden');

      await this.xrSession.start();

      this.renderer.setAnimationLoop((time, frame) => {
        this.renderAR(time, frame);
      });
    } catch (err) {
      console.error('Failed to start WebXR session:', err);
      this.ui.showToast(`AR error: ${err.message}. Starting Camera Mode...`);
      await this.startCameraMode();
    }
  }

  async startCameraMode() {
    this.activeMode = 'camera';
    this.post.setEnabled(true); // Enable real bloom and film grain in camera mode
    this.ui.hideSplash();
    this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
    this.ui.dom.btnStepFallback?.classList.remove('hidden');

    await this.fallback.startCameraMode();
    this.placeFallbackPortal();

    this.renderer.setAnimationLoop((time) => {
      this.renderFallback(time);
    });
  }

  startPreviewMode() {
    this.activeMode = 'preview';
    this.post.setEnabled(true); // Enable real bloom and film grain in preview mode
    this.ui.hideSplash();
    this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
    this.ui.dom.btnStepFallback?.classList.remove('hidden');

    this.fallback.startPreviewMode();
    this.placeFallbackPortal();

    this.renderer.setAnimationLoop((time) => {
      this.renderFallback(time);
    });
  }

  placeFallbackPortal() {
    const forward = new THREE.Vector3(0, 0, -1.8).applyQuaternion(this.camera.quaternion);
    const placePos = new THREE.Vector3().copy(this.camera.position).add(forward);
    placePos.y = 0;

    this.portal.place(placePos, this.camera.position);
    this.isPlaced = true;
    this.ui.setCoachText('Drag to rotate view • Click Step button to walk through');
    this.ui.setStatus('Portal Active');
    this.ui.dom.btnPlaceFallback?.classList.add('hidden');
    this.ui.dom.btnResetPortal?.classList.remove('hidden');
    this.ui.dom.scaleSliderContainer?.classList.remove('hidden');
  }

  toggleStepFallback() {
    if (!this.isPlaced) return;
    if (!this.portal.isInsideVirtual) {
      // Step through into twilight world
      const forward = new THREE.Vector3(0, 0, -0.6).applyQuaternion(this.portal.group.quaternion);
      const insidePos = new THREE.Vector3(0, 1.2, 0).applyMatrix4(this.portal.group.matrixWorld).add(forward);
      this.camera.position.copy(insidePos);
      this.portal.checkCrossing(this.camera.position);
    } else {
      // Step back outside into real world
      const backward = new THREE.Vector3(0, 0, 1.8).applyQuaternion(this.portal.group.quaternion);
      const outsidePos = new THREE.Vector3(0, 1.2, 0).applyMatrix4(this.portal.group.matrixWorld).add(backward);
      this.camera.position.copy(outsidePos);
      this.portal.checkCrossing(this.camera.position);
    }
  }

  resetPortal() {
    if (this.isPlaced) {
      this.portal.remove(() => {
        this.isPlaced = false;
        if (this.activeMode === 'ar') {
          this.reticle.group.visible = false;
          this.ui.setCoachText('Move phone across floor to place again');
        } else {
          this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
        }
        this.ui.dom.btnResetPortal?.classList.add('hidden');
        this.ui.dom.scaleSliderContainer?.classList.add('hidden');
      });
    }
  }

  exitExperience() {
    if (this.activeMode === 'ar') {
      this.xrSession.stop();
    } else {
      this.fallback.stop();
      this.resetPortal();
      this.renderer.setAnimationLoop(null);
      this.ui.showSplash();
      this.activeMode = 'none';
      this.post.setEnabled(false);
    }
  }

  initGestures() {
    let pressTimer = null;

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2 && this.isPlaced) {
        this.isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDist = Math.hypot(dx, dy);
        this.touchStartAngle = Math.atan2(dy, dx);
        this.initialScale = this.portal.scale;
        this.initialRotation = this.portal.group.rotation.y;
      } else if (e.touches.length === 1 && this.isPlaced) {
        pressTimer = setTimeout(() => {
          this.triggerShockwaveBurst();
        }, 650);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && this.isPinching && this.isPlaced) {
        clearTimeout(pressTimer);
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const currentAngle = Math.atan2(dy, dx);

        const scaleFactor = currentDist / this.touchStartDist;
        const newScale = Math.max(0.4, Math.min(2.5, this.initialScale * scaleFactor));
        this.portal.setScale(newScale);
        if (this.ui.dom.portalScaleSlider) this.ui.dom.portalScaleSlider.value = newScale;

        const deltaAngle = currentAngle - this.touchStartAngle;
        this.portal.setRotation(this.initialRotation + deltaAngle);
      } else {
        clearTimeout(pressTimer);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isPinching = false;
      clearTimeout(pressTimer);
    });
  }

  triggerShockwaveBurst() {
    this.ui.triggerHaptic([40, 60, 120]);
    audioEngine.playShockwaveBoom();
    this.portal.sequence.triggerSparksBurst();
    this.ui.pulseVignette();
    this.ui.showToast('💥 Gravitational Shockwave');
  }

  updateCommon(dt, time) {
    this.quality.update(dt);
    this.ui.updateFps(this.quality.currentFps);

    // Spring FOV punch back to normal
    if (Math.abs(this.fovPunch) > 0.1) {
      this.fovPunch *= Math.pow(0.05, dt);
      this.camera.fov = this.baseFov + this.fovPunch;
      this.camera.updateProjectionMatrix();
    }

    // Camera crossing & proximity
    this.camera.getWorldPosition(this.cameraWorldPos);
    const distToPortal = this.portal.checkCrossing(this.cameraWorldPos) || 2.0;

    // Spatial Audio Listener & Proximity
    audioEngine.updateListener(this.camera);
    audioEngine.updateProximity(distToPortal);
    const audioData = audioEngine.updateAnalysis();

    // Update VFX
    this.effects.update(dt, time, {
      audio: audioData,
      proximity: Math.max(0, 1.0 - distToPortal / 3.0),
      isInside: this.portal.isInsideVirtual,
      estimatedLightColor: this.xrSession.estimatedLightColor,
    });
  }

  renderAR(timeMs, frame) {
    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.xrSession.update(frame);
    this.reticle.update(dt, time);
    this.updateCommon(dt, time);

    // Direct WebGL render for WebXR (bypass EffectComposer in AR)
    this.renderer.render(this.scene, this.camera);
  }

  renderFallback(timeMs) {
    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.fallback.update(dt);
    this.updateCommon(dt, time);

    // In Preview & Camera mode: use post-processing with bloom and film grain
    const rendered = this.post.render(dt, time);
    if (!rendered) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.post?.setSize(window.innerWidth, window.innerHeight);
  }
}

// Start application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new TwilightPortalApp();
  app.init().catch((err) => {
    console.error('Fatal initialization error:', err);
  });
});
