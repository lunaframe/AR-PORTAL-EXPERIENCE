/**
 * cameraMode.js — Fallback Camera Mode (iOS Safari & Unsupported Browsers) & Desktop 3D Preview
 * 
 * Features:
 * - getUserMedia rear camera feed stream behind the 3D scene
 * - DeviceOrientationControls with iOS 13+ permission request
 * - Touch-drag & mouse-drag fallback for manual orientation
 * - Desktop 3D Preview mode with orbit-like controls
 * - Never shows a blank screen
 */

import * as THREE from 'three';

export class CameraModeFallback {
  constructor(scene, camera, renderer, videoElement) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.videoElement = videoElement;

    this.isActive = false;
    this.mode = 'none'; // 'camera' | 'preview'
    this.stream = null;

    // Gyro / Rotation tracking
    this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    this.hasGyro = false;
    this.gyroEnabled = false;

    // Touch / Drag controls
    this.isDragging = false;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.yaw = 0;
    this.pitch = 0;

    // Desktop preview target
    this.orbitRadius = 2.4;
    this.orbitAngleX = 0;
    this.orbitAngleY = 0.2;

    this.initInputListeners();
  }

  initInputListeners() {
    const onStart = (x, y) => {
      if (!this.isActive) return;
      this.isDragging = true;
      this.lastTouchX = x;
      this.lastTouchY = y;
    };

    const onMove = (x, y) => {
      if (!this.isActive || !this.isDragging) return;
      const dx = x - this.lastTouchX;
      const dy = y - this.lastTouchY;
      this.lastTouchX = x;
      this.lastTouchY = y;

      const sens = 0.004;
      this.yaw -= dx * sens;
      this.pitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this.pitch - dy * sens));

      if (this.mode === 'preview') {
        this.orbitAngleX -= dx * sens;
        this.orbitAngleY = Math.max(-0.2, Math.min(1.2, this.orbitAngleY + dy * sens));
      } else {
        this.applyManualRotation();
      }
    };

    const onEnd = () => {
      this.isDragging = false;
    };

    window.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onEnd);

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', onEnd);

    // Wheel zoom for preview mode
    window.addEventListener('wheel', (e) => {
      if (!this.isActive || this.mode !== 'preview') return;
      this.orbitRadius = Math.max(1.2, Math.min(6.0, this.orbitRadius + e.deltaY * 0.003));
    }, { passive: true });
  }

  applyManualRotation() {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  async requestGyroPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          this.bindGyro();
          return true;
        }
      } catch (err) {
        console.warn('Gyro permission rejected:', err);
      }
      return false;
    } else {
      this.bindGyro();
      return true;
    }
  }

  bindGyro() {
    if (this.gyroEnabled) return;
    this.gyroEnabled = true;

    window.addEventListener('deviceorientation', (e) => {
      if (!this.isActive || this.mode !== 'camera' || this.isDragging || e.alpha === null) return;
      this.hasGyro = true;

      const alpha = THREE.MathUtils.degToRad(e.alpha || 0);
      const beta = THREE.MathUtils.degToRad((e.beta || 90) - 90);
      const gamma = THREE.MathUtils.degToRad(e.gamma || 0);

      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = alpha + this.yaw;
      this.camera.rotation.x = beta * 0.6 + this.pitch;
    });
  }

  /**
   * Starts Camera Mode (iOS & non-WebXR mobile)
   */
  async startCameraMode() {
    this.mode = 'camera';
    this.isActive = true;

    // Reset camera position to typical eye level
    this.camera.position.set(0, 1.3, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.applyManualRotation();

    // Start video camera feed
    if (this.videoElement && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
        this.videoElement.style.display = 'block';
      } catch (err) {
        console.warn('Could not start rear camera stream:', err);
        // Fallback gracefully without video background
        this.videoElement.style.display = 'none';
      }
    }

    await this.requestGyroPermission();
  }

  /**
   * Starts 3D Desktop Preview Mode
   */
  startPreviewMode() {
    this.mode = 'preview';
    this.isActive = true;
    if (this.videoElement) {
      this.videoElement.style.display = 'none';
    }

    // Default orbit position
    this.orbitRadius = 2.8;
    this.orbitAngleX = 0;
    this.orbitAngleY = 0.25;
  }

  update(dt) {
    if (!this.isActive) return;

    if (this.mode === 'preview') {
      // Orbit around portal center (0, 1.2, -1.8)
      const target = new THREE.Vector3(0, 1.2, -1.8);
      const cx = target.x + Math.sin(this.orbitAngleX) * Math.cos(this.orbitAngleY) * this.orbitRadius;
      const cy = target.y + Math.sin(this.orbitAngleY) * this.orbitRadius;
      const cz = target.z + Math.cos(this.orbitAngleX) * Math.cos(this.orbitAngleY) * this.orbitRadius;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(target);
    }
  }

  stop() {
    this.isActive = false;
    this.mode = 'none';
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.style.display = 'none';
      this.videoElement.srcObject = null;
    }
  }
}
