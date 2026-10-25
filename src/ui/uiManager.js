/**
 * uiManager.js — Glassmorphism UI, Particle Splash, HUD & Slide-Up VFX Controls
 * Follows Twilight palette: #1b1464, #6d28d9, #14f1d9, #ff3cac, #e8f7ff.
 */

import { audioEngine } from '../audio/engine.js';

export class UIManager {
  constructor() {
    this.dom = {
      // Screens
      splashScreen: document.getElementById('splash-screen'),
      splashCanvas: document.getElementById('splash-canvas'),
      uiContainer: document.getElementById('ui-container'),

      // Buttons
      btnEnterAR: document.getElementById('btn-enter-ar'),
      btnCameraMode: document.getElementById('btn-camera-mode'),
      btnPreview: document.getElementById('btn-preview'),
      btnInstallApp: document.getElementById('btn-install-app'),

      // In-AR HUD
      coachPill: document.getElementById('coach-pill'),
      statusBadge: document.getElementById('status-badge'),
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      fpsCounter: document.getElementById('fps-counter'),

      // Top Actions
      btnSound: document.getElementById('btn-sound-toggle'),
      iconSoundOn: document.getElementById('icon-sound-on'),
      iconSoundOff: document.getElementById('icon-sound-off'),
      btnScreenshot: document.getElementById('btn-screenshot'),
      btnEffectsPanel: document.getElementById('btn-effects-panel'),
      btnExit: document.getElementById('btn-exit-ar'),

      // Bottom Bar
      btnPlaceFallback: document.getElementById('btn-place-fallback'),
      btnStepFallback: document.getElementById('btn-step-fallback'),
      btnResetPortal: document.getElementById('btn-reset-portal'),

      // Scale Slider
      scaleSliderContainer: document.getElementById('scale-slider-container'),
      portalScaleSlider: document.getElementById('portal-scale-slider'),

      // Effects Drawer / Modal
      effectsModal: document.getElementById('effects-modal'),
      btnCloseEffects: document.getElementById('btn-close-effects'),
      btnCinematic: document.getElementById('btn-cinematic-mode'),
      qualitySelect: document.getElementById('quality-select'),
      intensitySlider: document.getElementById('intensity-slider'),
      timeSlider: document.getElementById('time-slider'),
      themeButtons: document.querySelectorAll('.theme-btn'),
      groupToggles: {
        core: document.getElementById('toggle-core'),
        particles: document.getElementById('toggle-particles'),
        lighting: document.getElementById('toggle-lighting'),
        twilight: document.getElementById('toggle-twilight'),
        reactive: document.getElementById('toggle-reactive'),
      },

      // Overlays
      screenFlash: document.getElementById('screen-flash'),
      vignetteOverlay: document.getElementById('vignette-overlay'),
      letterboxTop: document.getElementById('letterbox-top'),
      letterboxBottom: document.getElementById('letterbox-bottom'),
      toast: document.getElementById('toast'),
    };

    this.onAction = null;
    this.splashAnimId = null;

    this.initSplashCanvas();
    this.bindEvents();
  }

  /**
   * Animated Particle-Text Title for Splash Screen ("TWILIGHT PORTAL")
   * Particles assemble dynamically from random positions into letterforms.
   */
  initSplashCanvas() {
    const canvas = this.dom.splashCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 380 * dpr;
    canvas.height = 110 * dpr;
    canvas.style.width = '380px';
    canvas.style.height = '110px';
    ctx.scale(dpr, dpr);

    // Render offscreen text to get pixel sample points
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 380;
    offCanvas.height = 110;
    const offCtx = offCanvas.getContext('2d');
    offCtx.fillStyle = '#ffffff';
    offCtx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText('TWILIGHT PORTAL', 190, 55);

    const imgData = offCtx.getImageData(0, 0, 380, 110).data;
    const particles = [];
    const step = 4; // Sample every 4th pixel

    for (let y = 0; y < 110; y += step) {
      for (let x = 0; x < 380; x += step) {
        const idx = (y * 380 + x) * 4;
        if (imgData[idx + 3] > 128) {
          particles.push({
            tx: x,
            ty: y,
            x: (Math.random() - 0.5) * 600 + 190,
            y: (Math.random() - 0.5) * 400 + 55,
            vx: 0,
            vy: 0,
            color: Math.random() < 0.5 ? '#14f1d9' : '#ff3cac',
            size: Math.random() * 1.8 + 1.2,
          });
        }
      }
    }

    let startTime = performance.now();
    const render = () => {
      ctx.clearRect(0, 0, 380, 110);
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      // Convergence factor
      const progress = Math.min(1.0, elapsed / 2.2);
      const ease = 1 - Math.pow(1 - progress, 3);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Swirl wobble
        const wobble = (1 - ease) * Math.sin(elapsed * 4 + i) * 12;
        p.x = p.x + (p.tx - p.x) * 0.08 + wobble * 0.02;
        p.y = p.y + (p.ty - p.y) * 0.08;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.dom.splashScreen && !this.dom.splashScreen.classList.contains('hidden')) {
        this.splashAnimId = requestAnimationFrame(render);
      }
    };

    this.splashAnimId = requestAnimationFrame(render);
  }

  bindEvents() {
    // Mode Buttons
    this.dom.btnEnterAR?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.init();
      audioEngine.playUiClick();
      this.onAction?.('start-ar');
    });

    this.dom.btnCameraMode?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.init();
      audioEngine.playUiClick();
      this.onAction?.('start-camera');
    });

    this.dom.btnPreview?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.init();
      audioEngine.playUiClick();
      this.onAction?.('start-preview');
    });

    // Sound toggle
    this.dom.btnSound?.addEventListener('click', () => {
      const active = audioEngine.toggleMute();
      this.dom.iconSoundOn?.classList.toggle('hidden', !active);
      this.dom.iconSoundOff?.classList.toggle('hidden', active);
      this.showToast(active ? '🔊 Spatial Audio active' : '🔇 Audio muted');
    });

    // Reset Portal
    this.dom.btnResetPortal?.addEventListener('click', () => {
      this.triggerHaptic(30);
      audioEngine.playUiClick();
      this.onAction?.('reset-portal');
    });

    // Fallback placement & step buttons
    this.dom.btnPlaceFallback?.addEventListener('click', () => {
      this.triggerHaptic(40);
      audioEngine.playUiClick();
      this.onAction?.('place-fallback');
    });

    this.dom.btnStepFallback?.addEventListener('click', () => {
      this.triggerHaptic(35);
      audioEngine.playUiClick();
      this.onAction?.('toggle-step');
    });

    // Exit
    this.dom.btnExit?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.onAction?.('exit-experience');
    });

    // Screenshot
    this.dom.btnScreenshot?.addEventListener('click', () => {
      this.triggerHaptic(35);
      this.onAction?.('screenshot');
    });

    // Scale Slider
    this.dom.portalScaleSlider?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.onAction?.('set-scale', val);
    });

    // Effects Drawer
    this.dom.btnEffectsPanel?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.dom.effectsModal?.classList.remove('hidden');
    });

    this.dom.btnCloseEffects?.addEventListener('click', () => {
      audioEngine.playUiClick();
      this.dom.effectsModal?.classList.add('hidden');
    });

    // Cinematic Mode Button
    this.dom.btnCinematic?.addEventListener('click', () => {
      this.triggerHaptic([30, 50, 100]);
      audioEngine.playUiClick();
      this.onAction?.('cinematic-mode');
      this.showToast('✨ Cinematic Mode Activated');
    });

    // Quality selector
    this.dom.qualitySelect?.addEventListener('change', (e) => {
      this.onAction?.('set-quality', e.target.value);
    });

    // Intensity slider
    this.dom.intensitySlider?.addEventListener('input', (e) => {
      this.onAction?.('set-intensity', parseFloat(e.target.value));
    });

    // Time of day slider
    this.dom.timeSlider?.addEventListener('input', (e) => {
      this.onAction?.('set-time-of-day', parseFloat(e.target.value));
    });

    // Theme buttons
    this.dom.themeButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dom.themeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        this.triggerHaptic(25);
        audioEngine.playUiClick();
        this.onAction?.('set-theme', theme);
        this.showToast(`Theme: ${theme.toUpperCase()}`);
      });
    });

    // Group Toggles
    for (const [grp, el] of Object.entries(this.dom.groupToggles)) {
      if (el) {
        el.addEventListener('change', (e) => {
          this.onAction?.('toggle-group', { group: grp, enabled: e.target.checked });
        });
      }
    }
  }

  triggerHaptic(pattern) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  showScreenFlash() {
    if (!this.dom.screenFlash) return;
    this.dom.screenFlash.classList.add('flash-active');
    setTimeout(() => {
      this.dom.screenFlash.classList.remove('flash-active');
    }, 450);
  }

  pulseVignette() {
    if (!this.dom.vignetteOverlay) return;
    this.dom.vignetteOverlay.classList.add('vignette-pulse');
    setTimeout(() => {
      this.dom.vignetteOverlay.classList.remove('vignette-pulse');
    }, 800);
  }

  setLetterbox(active) {
    this.dom.letterboxTop?.classList.toggle('active', active);
    this.dom.letterboxBottom?.classList.toggle('active', active);
  }

  setCoachText(text) {
    if (this.dom.coachPill) {
      this.dom.coachPill.textContent = text;
      this.dom.coachPill.classList.remove('hidden');
    }
  }

  setStatus(badgeText, isTracking = true) {
    if (this.dom.statusText) this.dom.statusText.textContent = badgeText;
    if (this.dom.statusDot) {
      this.dom.statusDot.style.background = isTracking ? 'var(--c-teal)' : '#f59e0b';
    }
  }

  updateFps(fps) {
    if (this.dom.fpsCounter) {
      this.dom.fpsCounter.textContent = `${fps} FPS`;
    }
  }

  showToast(msg, duration = 2500) {
    if (!this.dom.toast) return;
    this.dom.toast.textContent = msg;
    this.dom.toast.classList.remove('hidden');
    this.dom.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toast.classList.remove('show');
      setTimeout(() => this.dom.toast.classList.add('hidden'), 300);
    }, duration);
  }

  hideSplash() {
    if (this.splashAnimId) cancelAnimationFrame(this.splashAnimId);
    this.dom.splashScreen?.classList.add('fade-out');
    setTimeout(() => {
      this.dom.splashScreen?.classList.add('hidden');
      this.dom.uiContainer?.classList.remove('hidden');
    }, 500);
  }

  showSplash() {
    this.dom.uiContainer?.classList.add('hidden');
    this.dom.splashScreen?.classList.remove('hidden', 'fade-out');
    this.initSplashCanvas();
  }
}
