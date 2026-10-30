/**
 * main.js — "Dream Gate" Master Orchestrator
 * WebXR ARCore, iOS Camera Fallback, Desktop 3D Preview,
 * Spatial Audio Engine, Dream Realms, Fragment Collection, and Journal.
 */

import * as THREE from 'three';
import { QualityManager } from './utils/quality.js';
import { EffectsManager } from './effects/effectsManager.js';
import { audioEngine } from './audio/engine.js';
import { DreamGate } from './gate/gate.js';
import { MoonReticle } from './gate/reticle.js';
import { RealmManager } from './realms/realmManager.js';
import { XRSessionManager } from './xr/session.js';
import { CameraModeFallback } from './fallback/cameraMode.js';
import { UIManager } from './ui/uiManager.js';
import { captureScreenshot } from './utils/screenshot.js';
import { PostProcessingManager } from './effects/postprocessing/postManager.js';
import { dreamJournal } from './journal/dreamJournal.js';

class DreamGateApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.videoElement = document.getElementById('camera-video');
    this.uiContainer = document.getElementById('ui-container');

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Subsystems
    this.quality = null;
    this.effects = null;
    this.gate = null;
    this.reticle = null;
    this.realms = null;
    this.xrSession = null;
    this.fallback = null;
    this.ui = null;
    this.post = null;

    // State
    this.activeMode = 'none'; // 'ar' | 'camera' | 'preview'
    this.isPlaced = false;
    this.clock = new THREE.Clock();
    this.cameraWorldPos = new THREE.Vector3();
    this.dreamStartTime = 0;

    // Crossing FOV punch
    this.baseFov = 70;
    this.fovPunch = 0;

    // Multi-touch gestures
    this.touchStartDist = 0;
    this.touchStartAngle = 0;
    this.initialScale = 1.0;
    this.initialRotation = 0;
    this.isPinching = false;
  }

  async init() {
    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.05, 120);
    this.camera.position.set(0, 1.4, 1.8);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: true, // Crucial for portal doorway aperture mask
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 2. Quality & Effects Managers
    this.quality = new QualityManager(this.renderer);
    this.effects = new EffectsManager(this.scene, this.camera, this.renderer);

    this.quality.onQualityChange((level) => {
      this.effects.setQuality(level);
      if (this.ui?.dom.qualitySelect) {
        this.ui.dom.qualitySelect.value = level;
      }
    });

    // 3. Gate, Reticle & Realm Systems
    this.gate = new DreamGate(this.scene, this.camera, this.renderer, this.effects);
    this.reticle = new MoonReticle(this.scene);
    this.realms = new RealmManager(this.scene, this.camera, this.renderer, this.effects);

    // Sequence visual callbacks
    this.gate.sequence.onFlashTrigger = () => this.ui.showScreenFlash();
    this.gate.sequence.onLetterboxToggle = (active) => this.ui.setLetterbox(active);

    // Traversal crossing callback
    this.gate.onRealmTransition = (entering) => {
      this.handleRealmCrossing(entering);
    };

    // Fragment collection callbacks
    this.realms.fragments.onFragmentCollected = (collected, total) => {
      this.ui.updateFragmentProgress(collected, total);
      this.ui.showToast(`✦ Fragment ${collected}/${total} collected`);
    };

    this.realms.fragments.onAllCollected = () => {
      this.ui.showToast('✨ All 7 Dream Fragments collected! Tap "Wake Up" when ready');
      this.ui.dom.btnWakeUp?.classList.remove('hidden');
    };

    // 4. Desktop/Camera Post-Processing (Bloom + Grain)
    this.post = new PostProcessingManager(this.renderer, this.scene, this.camera);

    // 5. XR & Fallback Managers
    this.xrSession = new XRSessionManager(this.renderer, this.uiContainer);
    this.fallback = new CameraModeFallback(this.scene, this.camera, this.renderer, this.videoElement);

    // 6. UI Manager
    this.ui = new UIManager();

    // 7. Bind Interactions & Gestures
    this.bindEvents();
    this.initGestures();

    // 8. Detect platform and configure entry button
    await this.detectPlatform();

    // 9. Resize Handling
    window.addEventListener('resize', () => this.onResize());
  }

  handleRealmCrossing(entering) {
    this.ui.showScreenFlash();
    this.ui.pulseVignette();
    this.ui.triggerHaptic([40, 70, 150]);

    // FOV punch (widens briefly by 12 degrees then springs back)
    this.fovPunch = entering ? 12 : -8;
    this.realms.setInsideVirtual(entering);

    if (entering) {
      this.dreamStartTime = performance.now();
      this.ui.showToast(`✦ Entered ${this.getRealmDisplayName(this.gate.activeRealm)}`, 3000);
      this.ui.setCoachText('Explore the realm • Find 7 hidden dream fragments');
      this.ui.dom.btnWakeUp?.classList.remove('hidden');
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = '⚡ Step Outside';
    } else {
      this.ui.showToast('✦ Returned to Real Room', 2500);
      this.ui.setCoachText('Outside gate • Walk back in anytime');
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = '⚡ Step Through';
    }
  }

  getRealmDisplayName(id) {
    const map = {
      skyGarden: 'Sky Garden',
      midnightOcean: 'Midnight Ocean',
      starLibrary: 'Star Library',
    };
    return map[id] || 'Dream Realm';
  }

  triggerWakeUp() {
    this.ui.showWakeUpOverlay(1600, () => {
      const timeSpent = (performance.now() - (this.dreamStartTime || performance.now())) / 1000;
      const fragments = this.realms.fragments.collectedCount;
      const realmName = this.getRealmDisplayName(this.gate.activeRealm);
      const title = dreamJournal.generatePoeticTitle(this.gate.activeRealm, fragments);

      // Save into Dream Journal
      dreamJournal.saveDream({
        title,
        realm: realmName,
        fragments,
        timeSpentSeconds: timeSpent,
      });

      // Show Wake-Up Summary Card
      this.ui.showWakeSummary({
        title,
        realm: realmName,
        fragments,
        timeSpentSeconds: timeSpent,
      });

      // Reset camera to outside
      this.realms.setInsideVirtual(false);
      this.gate.isInsideVirtual = false;
      this.fallback.setInsideVirtual(false);
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = '⚡ Step Through';
    });
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
          this.placeFallbackGate();
          break;
        case 'toggle-step':
          this.toggleStepFallback();
          break;
        case 'wake-up':
          this.triggerWakeUp();
          break;
        case 'set-realm':
          this.gate.setRealm(data);
          this.realms.setRealm(data);
          break;
        case 'reset-gate':
          this.resetGate();
          break;
        case 'exit-experience':
          this.exitExperience();
          break;
        case 'screenshot':
          captureScreenshot(this.renderer, this.videoElement, () => this.ui.showScreenFlash());
          break;
        case 'set-scale':
          this.gate.setScale(data);
          break;
        case 'set-intensity':
          this.effects.setMasterIntensity(data);
          break;
        case 'set-quality':
          this.quality.setQuality(data);
          break;
        case 'toggle-group':
          this.effects.setGroupEnabled(data.group, data.enabled);
          break;
        case 'cinematic-mode':
          this.quality.setQuality('high');
          this.effects.setMasterIntensity(1.35);
          for (const grp of ['gate', 'particles', 'lighting', 'realm', 'reactive']) {
            this.effects.setGroupEnabled(grp, true);
          }
          break;
      }
    };

    // XR Hit test
    this.xrSession.onHitResult = (hitResult) => {
      if (!this.isPlaced) {
        this.reticle.setHitResult(hitResult);
        if (hitResult) {
          this.ui.setCoachText('Tap anywhere to summon Dream Gate');
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
        this.gate.place(this.reticle.group.position, this.camera.position);
        this.isPlaced = true;
        this.reticle.group.visible = false;
        this.ui.setCoachText('Step through gate into dreamscape');
        this.ui.setStatus('Gate Summoned');
        this.ui.dom.btnResetGate?.classList.remove('hidden');
        this.ui.dom.scaleSliderContainer?.classList.remove('hidden');
        this.ui.dom.sigilButtons?.forEach((b) => b.parentElement?.classList.remove('hidden'));
      } else if (this.isPlaced) {
        audioEngine.playTapEffect(this.camera.position);
      }
    };

    this.xrSession.onSessionEnded = () => {
      this.resetGate();
      this.ui.showSplash();
      this.activeMode = 'none';
      this.post.setEnabled(false);
    };
  }

  async startAR() {
    try {
      this.activeMode = 'ar';
      this.post.setEnabled(false); // Direct WebGL for WebXR ARCore
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
    this.post.setEnabled(true);
    this.ui.hideSplash();
    this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
    this.ui.dom.btnStepFallback?.classList.remove('hidden');

    await this.fallback.startCameraMode();
    this.placeFallbackGate();

    this.renderer.setAnimationLoop((time) => {
      this.renderFallback(time);
    });
  }

  startPreviewMode() {
    this.activeMode = 'preview';
    this.post.setEnabled(true);
    this.ui.hideSplash();
    this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
    this.ui.dom.btnStepFallback?.classList.remove('hidden');

    this.fallback.startPreviewMode();
    this.placeFallbackGate();

    this.renderer.setAnimationLoop((time) => {
      this.renderFallback(time);
    });
  }

  placeFallbackGate() {
    let placePos;
    if (this.activeMode === 'preview') {
      placePos = new THREE.Vector3(0, 0, -1.8);
    } else {
      const forward = new THREE.Vector3(0, 0, -1.8).applyQuaternion(this.camera.quaternion);
      placePos = new THREE.Vector3().copy(this.camera.position).add(forward);
      placePos.y = 0;
    }

    this.gate.place(placePos, this.camera.position);
    this.isPlaced = true;
    this.ui.setCoachText('Drag to look around • Click Step button to walk through');
    this.ui.setStatus('Gate Active');
    this.ui.dom.btnPlaceFallback?.classList.add('hidden');
    this.ui.dom.btnResetGate?.classList.remove('hidden');
    this.ui.dom.scaleSliderContainer?.classList.remove('hidden');
    this.ui.dom.sigilButtons?.forEach((b) => b.parentElement?.classList.remove('hidden'));
  }

  toggleStepFallback() {
    if (!this.isPlaced) return;
    const entering = !this.gate.isInsideVirtual;
    this.fallback.setInsideVirtual(entering);

    if (entering) {
      const forward = new THREE.Vector3(0, 0, -0.6).applyQuaternion(this.gate.group.quaternion);
      const insidePos = new THREE.Vector3(0, 1.2, 0).applyMatrix4(this.gate.group.matrixWorld).add(forward);
      this.camera.position.copy(insidePos);
      this.gate.checkCrossing(this.camera.position);
    } else {
      const backward = new THREE.Vector3(0, 0, 1.8).applyQuaternion(this.gate.group.quaternion);
      const outsidePos = new THREE.Vector3(0, 1.2, 0).applyMatrix4(this.gate.group.matrixWorld).add(backward);
      this.camera.position.copy(outsidePos);
      this.gate.checkCrossing(this.camera.position);
    }
  }

  resetGate() {
    if (this.isPlaced) {
      this.gate.remove(() => {
        this.isPlaced = false;
        if (this.activeMode === 'ar') {
          this.reticle.group.visible = false;
          this.ui.setCoachText('Scan floor to summon gate again');
        } else {
          this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
        }
        this.ui.dom.btnResetGate?.classList.add('hidden');
        this.ui.dom.scaleSliderContainer?.classList.add('hidden');
      });
    }
  }

  exitExperience() {
    if (this.activeMode === 'ar') {
      this.xrSession.stop();
    } else {
      this.fallback.stop();
      this.resetGate();
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
        this.initialScale = this.gate.scale;
        this.initialRotation = this.gate.group.rotation.y;
      } else if (e.touches.length === 1 && this.isPlaced) {
        pressTimer = setTimeout(() => {
          this.ui.triggerHaptic([40, 60, 120]);
          this.gate.sequence.triggerSparks();
          this.ui.showToast('💥 Lucid Shockwave');
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
        this.gate.setScale(newScale);
        if (this.ui.dom.gateScaleSlider) this.ui.dom.gateScaleSlider.value = newScale;

        const deltaAngle = currentAngle - this.touchStartAngle;
        this.gate.setRotation(this.initialRotation + deltaAngle);
      } else {
        clearTimeout(pressTimer);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isPinching = false;
      clearTimeout(pressTimer);
    });
  }

  updateCommon(dt, time) {
    this.quality.update(dt);
    this.ui.updateFps(this.quality.currentFps);

    // Spring FOV punch back
    if (Math.abs(this.fovPunch) > 0.1) {
      this.fovPunch *= Math.pow(0.05, dt);
      this.camera.fov = this.baseFov + this.fovPunch;
      this.camera.updateProjectionMatrix();
    }

    // Camera crossing & proximity
    this.camera.getWorldPosition(this.cameraWorldPos);
    const distToGate = this.gate.checkCrossing(this.cameraWorldPos) || 2.0;

    // Spatial Audio Listener & Proximity
    audioEngine.updateListener(this.camera);
    audioEngine.updateProximity(distToGate);
    const audioData = audioEngine.updateAnalysis();

    // Update VFX & Realms
    const state = {
      audio: audioData,
      proximity: Math.max(0, 1.0 - distToGate / 3.5),
      isInside: this.gate.isInsideVirtual,
      estimatedLightColor: this.xrSession.estimatedLightColor,
    };

    this.effects.update(dt, time, state);
    this.realms.update(dt, time, state);
  }

  renderAR(timeMs, frame) {
    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.xrSession.update(frame);
    this.reticle.update(dt, time);
    this.updateCommon(dt, time);

    this.renderer.render(this.scene, this.camera);
  }

  renderFallback(timeMs) {
    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.fallback.update(dt);
    this.updateCommon(dt, time);

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
  const app = new DreamGateApp();
  app.init().catch((err) => {
    console.error('Fatal initialization error:', err);
  });
});
