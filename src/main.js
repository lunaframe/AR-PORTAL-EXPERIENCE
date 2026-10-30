/**
 * main.js — "Dream Gate" Master Orchestrator
 * WebXR ARCore, iOS Camera Fallback, Desktop 3D Preview,
 * Spatial Audio Engine, Dream Realms, Fragment Collection, and Journal.
 */

import * as THREE from 'three';
import '@fontsource/instrument-serif';
import '@fontsource/dm-sans';

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

class DebugOverlay {
  constructor(app) {
    this.app = app;
    this.enabled = new URLSearchParams(window.location.search).get('debug') === '1';
    this.dom = null;
    this.lastError = 'none';
    this.lastRejection = 'none';

    window.addEventListener('error', (e) => {
      this.lastError = `${e.message} (${e.filename ? e.filename.split('/').pop() : ''}:${e.lineno})`;
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.lastRejection = String(e.reason?.message || e.reason || 'rejection');
    });

    if (this.enabled) {
      this.initDom();
      setInterval(() => this.update(), 200);
    }
  }

  initDom() {
    this.dom = document.createElement('div');
    this.dom.id = 'debug-overlay';
    this.dom.style.cssText = `
      position: fixed;
      top: env(safe-area-inset-top, 8px);
      left: env(safe-area-inset-left, 8px);
      z-index: 999999;
      background: rgba(11, 10, 42, 0.92);
      border: 1px solid rgba(255, 210, 122, 0.5);
      border-radius: 8px;
      padding: 8px 10px;
      font-family: monospace;
      font-size: 10px;
      line-height: 1.4;
      color: #dfe9ff;
      pointer-events: none;
      max-width: 270px;
      word-break: break-all;
    `;
    document.body.appendChild(this.dom);
  }

  update() {
    if (!this.dom) return;
    const renderer = this.app.renderer;
    const gl = renderer ? renderer.getContext() : null;
    const glAlpha = gl ? gl.getContextAttributes()?.alpha : false;
    const xr = this.app.xrSession;
    const audio = audioEngine.ctx;
    const scrollW = document.documentElement.scrollWidth;
    const innerW = window.innerWidth;
    const isOverflow = scrollW > innerW;

    console.assert(
      !isOverflow,
      `Horizontal overflow detected: scrollWidth (${scrollW}px) > innerWidth (${innerW}px)`
    );

    this.dom.innerHTML = `
      <div style="font-weight:bold;color:#ffd27a;margin-bottom:2px;">Dream Gate Debug (?debug=1)</div>
      <div>Session: <b>${this.app.activeMode}</b> (${xr?.xrSession ? 'XR Active' : 'No XR'})</div>
      <div>Ref Space: <b>${xr?.refSpaceType || 'none'}</b></div>
      <div>Renderer Alpha: <b>${glAlpha}</b></div>
      <div>scene.bg: <b>${this.app.scene?.background === null ? 'null' : 'active'}</b></div>
      <div>Loop Running: <b>${this.app.loopRunning}</b></div>
      <div>Frame Count: <b>${this.app.frameCount}</b></div>
      <div>Live FPS: <b style="color:${this.app.currentFps < 30 ? '#ff6b6b' : '#ffd27a'}">${this.app.currentFps}</b></div>
      <div>Hit Test: <b>${xr?.hasHit ? 'LOCKED' : (this.app.activeMode === 'ar' ? 'Searching' : 'Idle')}</b> (${xr?.hitCount || 0})</div>
      <div>AudioContext: <b>${audio?.state || 'uninitialized'}</b></div>
      <div>Overflow: <b style="color:${isOverflow ? '#ff6b6b' : '#3df2d0'}">${isOverflow ? `YES (${scrollW} > ${innerW})` : 'NO'}</b></div>
      ${this.lastError !== 'none' ? `<div style="color:#ff6b6b">Err: ${this.lastError}</div>` : ''}
      ${this.lastRejection !== 'none' ? `<div style="color:#ffb347">Rej: ${this.lastRejection}</div>` : ''}
    `;
  }
}

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
    this.debugOverlay = null;

    // State
    this.activeMode = 'none'; // 'ar' | 'camera' | 'preview'
    this.isPlaced = false;
    this.clock = new THREE.Clock();
    this.cameraWorldPos = new THREE.Vector3();
    this.dreamStartTime = 0;

    // Loop & FPS computation
    this.frameCount = 0;
    this.fpsFrames = 0;
    this.lastFpsTime = performance.now();
    this.currentFps = 60;
    this.loopRunning = false;

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
    // 1. Scene & Renderer (transparent canvas for WebXR camera passthrough)
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.01, 200);
    this.camera.position.set(0, 1.4, 1.8);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: true, // Aperture mask
    });
    this.renderer.debug.checkShaderErrors = true;
    this.renderer.setClearColor(0x000000, 0);
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

    // Lighting for scene and gate structures
    this.ambientLight = new THREE.AmbientLight(0x403670, 1.2);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xe8f7ff, 0.9);
    this.dirLight.position.set(2, 4, 3);
    this.scene.add(this.dirLight);

    // Visual sequence callbacks
    this.gate.sequence.onFlashTrigger = () => this.ui.showScreenFlash();

    // Traversal crossing callback
    this.gate.onRealmTransition = (entering) => {
      this.handleRealmCrossing(entering);
    };

    // Fragment collection callbacks
    this.realms.fragments.onFragmentCollected = (collected, total) => {
      this.ui.updateFragmentProgress(collected, total);
      this.ui.showToast(`Fragment ${collected} of ${total} found`);
    };

    this.realms.fragments.onAllCollected = () => {
      this.ui.showToast('All 7 fragments found. Tap Wake up when ready.');
      this.ui.dom.btnWakeUp?.classList.remove('hidden');
    };

    // 4. Desktop/Camera Post-Processing (Bloom + Grain) — Bypassed in AR
    this.post = new PostProcessingManager(this.renderer, this.scene, this.camera);
    this.post.setEnabled(false);

    // 5. XR & Fallback Managers
    this.xrSession = new XRSessionManager(this.renderer, this.uiContainer);
    this.fallback = new CameraModeFallback(this.scene, this.camera, this.renderer, this.videoElement);

    // 6. UI Manager
    this.ui = new UIManager();

    // 7. Bind Interactions & Gestures
    this.bindEvents();
    this.initGestures();

    // 8. User tap AudioContext resume
    this.initAudioGestureUnlock();

    // 9. Detect platform and configure entry buttons
    await this.detectPlatform();

    // 10. Single Master Animation Loop: handles AR, Camera, and Preview
    this.renderer.setAnimationLoop((time, frame) => {
      this.onAnimationFrame(time, frame);
    });

    // 11. Debug overlay if ?debug=1
    this.debugOverlay = new DebugOverlay(this);

    // 12. Resize Handling (guarded so it does not resize XR session)
    window.addEventListener('resize', () => this.onResize());

    // 13. URL parameters for debugging & bisecting: ?effects=none, ?realm=skyGarden
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('effects') === 'none') {
      for (const grp of ['gate', 'particles', 'lighting', 'realm', 'reactive']) {
        this.effects.setGroupEnabled(grp, false);
      }
    }
    const targetRealm = urlParams.get('realm');
    if (targetRealm && this.realms.realms[targetRealm]) {
      this.gate.setRealm(targetRealm);
      this.realms.setRealm(targetRealm);
    }
  }

  initAudioGestureUnlock() {
    const unlock = () => {
      audioEngine.resume();
    };
    ['click', 'touchstart', 'pointerdown'].forEach((ev) => {
      window.addEventListener(ev, unlock, { once: true, passive: true });
    });
  }

  handleRealmCrossing(entering) {
    this.ui.showScreenFlash();
    this.ui.pulseVignette();
    this.ui.triggerHaptic([30, 60, 120]);

    this.fovPunch = entering ? 10 : -6;
    this.realms.setInsideVirtual(entering);

    if (entering) {
      this.dreamStartTime = performance.now();
      this.ui.showToast(`Entered ${this.getRealmDisplayName(this.gate.activeRealm)}`, 2500);
      this.ui.setCoachText('Explore the realm to find all 7 fragments.');
      this.ui.dom.btnWakeUp?.classList.remove('hidden');
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = 'Step outside';
    } else {
      this.ui.showToast('Returned to room', 2000);
      this.ui.setCoachText('Outside gate. Step through to enter.');
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = 'Step through';
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
      if (this.ui.dom.btnStepFallback) this.ui.dom.btnStepFallback.textContent = 'Step through';
    });
  }

  async detectPlatform() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const xrCheck = await XRSessionManager.checkSupport();

    if (xrCheck.supported) {
      this.ui.dom.btnEnterAR?.classList.remove('hidden');
      this.ui.dom.btnCameraMode?.classList.add('hidden');
      this.ui.dom.btnPreview?.classList.remove('hidden');
      this.ui.setStatus('AR ready');
    } else if (isMobile) {
      this.ui.dom.btnEnterAR?.classList.add('hidden');
      this.ui.dom.btnCameraMode?.classList.remove('hidden');
      this.ui.dom.btnPreview?.classList.remove('hidden');
      if (this.ui.dom.splashSupportHint) {
        this.ui.dom.splashSupportHint.classList.remove('hidden');
      }
      this.ui.setStatus('Camera mode');
    } else {
      this.ui.dom.btnEnterAR?.classList.add('hidden');
      this.ui.dom.btnCameraMode?.classList.add('hidden');
      this.ui.dom.btnPreview?.classList.remove('hidden');
      this.ui.setStatus('3D preview');
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
          this.effects.setMasterIntensity(1.3);
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
          this.ui.setCoachText('Tap to open the gate.');
          this.ui.setStatus('Floor found');
        } else {
          this.ui.setCoachText('Move your phone slowly to find the floor.');
          this.ui.setStatus('Scanning');
        }
      }
    };

    // 10-second surface timeout message
    this.xrSession.onSurfaceTimeout = () => {
      if (!this.isPlaced) {
        this.ui.setCoachText('Move your phone slowly across the floor to find a surface.');
        this.ui.showToast('Still scanning for a surface. Try aiming at a well-lit floor.');
      }
    };

    // XR Select (Tap in AR to place gate)
    this.xrSession.onSelect = () => {
      if (!this.isPlaced && this.reticle.isLocked) {
        this.gate.place(this.reticle.group.position, this.camera.position);
        this.realms.setGatePlaced(true);
        this.isPlaced = true;
        this.reticle.group.visible = false;
        this.ui.setCoachText('Step through to enter.');
        this.ui.setStatus('Gate open');
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
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
      this.post.setEnabled(false); // Strictly no EffectComposer in XR
      this.realms.setGatePlaced(false); // Render ONLY reticle before gate is placed

      this.ui.hideSplash();
      this.ui.dom.btnPlaceFallback?.classList.add('hidden');
      this.ui.dom.btnStepFallback?.classList.add('hidden');

      await this.xrSession.start();
      audioEngine.resume();
    } catch (err) {
      console.error('Failed to start WebXR session:', err);
      this.ui.showToast(`AR error: ${err.message}. Starting camera mode.`);
      await this.startCameraMode();
    }
  }

  async startCameraMode() {
    this.activeMode = 'camera';
    this.post.setEnabled(true);
    this.ui.hideSplash();
    this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
    this.ui.dom.btnStepFallback?.classList.remove('hidden');

    try {
      await this.fallback.startCameraMode();
    } catch (e) {
      this.ui.showToast('Camera access was blocked. Allow it in site settings and reload.');
    }
    this.placeFallbackGate();
    audioEngine.resume();
  }

  startPreviewMode() {
    this.activeMode = 'preview';
    this.post.setEnabled(true);
    this.ui.hideSplash();
    this.ui.dom.btnPlaceFallback?.classList.remove('hidden');
    this.ui.dom.btnStepFallback?.classList.remove('hidden');

    this.fallback.startPreviewMode();
    this.placeFallbackGate();
    audioEngine.resume();
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
    this.realms.setGatePlaced(true);
    this.isPlaced = true;
    this.ui.setCoachText('Drag to look around. Click Step through to walk in.');
    this.ui.setStatus('Gate open');
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
        this.realms.setGatePlaced(false);
        if (this.activeMode === 'ar') {
          this.reticle.group.visible = false;
          this.ui.setCoachText('Move your phone slowly to find the floor.');
          this.ui.setStatus('Scanning');
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
      this.ui.showSplash();
      this.activeMode = 'none';
      this.post.setEnabled(false);
    }
  }

  initGestures() {
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2 && this.isPlaced) {
        this.isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDist = Math.hypot(dx, dy);
        this.touchStartAngle = Math.atan2(dy, dx);
        this.initialScale = this.gate.scale;
        this.initialRotation = this.gate.group.rotation.y;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && this.isPinching && this.isPlaced) {
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
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isPinching = false;
    });
  }

  updateCommon(dt, time) {
    this.quality.update(dt);

    // Spring FOV punch back
    if (Math.abs(this.fovPunch) > 0.1) {
      this.fovPunch *= Math.pow(0.05, dt);
      this.camera.fov = this.baseFov + this.fovPunch;
      this.camera.updateProjectionMatrix();
    }

    // Camera crossing & proximity
    this.camera.getWorldPosition(this.cameraWorldPos);
    const distToGate = this.gate.checkCrossing(this.cameraWorldPos) || 2.0;

    // Spatial Audio Listener & Proximity (throttled inside engine)
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

  /**
   * Master Animation Loop — Drives WebXR sessions & desktop/fallback
   */
  onAnimationFrame(timeMs, frame) {
    this.frameCount++;
    this.loopRunning = true;

    // FPS calculation inside render loop
    const now = performance.now();
    const elapsed = (now - this.lastFpsTime) / 1000;
    if (elapsed >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / elapsed);
      this.fpsFrames = 0;
      this.lastFpsTime = now;
      this.ui.updateFps(this.currentFps);
    }
    this.fpsFrames++;

    if (this.activeMode === 'ar') {
      this.renderAR(timeMs, frame);
    } else if (this.activeMode === 'camera' || this.activeMode === 'preview') {
      this.renderFallback(timeMs);
    }
  }

  renderAR(timeMs, frame) {
    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.xrSession.update(frame);
    this.reticle.update(dt, time);
    this.updateCommon(dt, time);

    // Direct WebGL render with alpha=true and clearColor=0
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

    // Do NOT call renderer.setSize during active WebXR session
    if (!this.renderer.xr.isPresenting) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.post?.setSize(window.innerWidth, window.innerHeight);
    }
  }
}

// Start application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new DreamGateApp();
  window.app = app;
  app.init().catch((err) => {
    console.error('Fatal initialization error:', err);
  });
});
