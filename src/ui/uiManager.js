/**
 * uiManager.js — Quiet, Human UI System for "Dream Gate"
 * 
 * Part 3 & 4 Redesign:
 * - Uses self-hosted Instrument Serif for headings and DM Sans for UI
 * - Midnight #0b0a2a base with single warm lantern #ffd27a accent
 * - 12px radius, 1px hairline borders (12% white), solid dark surfaces
 * - Clean Lucide-style single-weight line icons, zero emoji
 * - Particle assembly resolves into crisp real text within 1.4s
 * - Responsive top bar with fragments counter ("0 of 7" + 7 ticks)
 * - Safe-area dock for primary actions, short human copy
 */

import { audioEngine } from '../audio/engine.js';
import { dreamJournal } from '../journal/dreamJournal.js';

export class UIManager {
  constructor() {
    this.dom = {
      // Screens
      splashScreen: document.getElementById('splash-screen'),
      splashTitle: document.getElementById('splash-title'),
      splashCanvas: document.getElementById('splash-canvas'),
      splashSupportHint: document.getElementById('splash-support-hint'),
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

      // Fragment Progress
      fragmentPill: document.getElementById('fragment-pill'),
      fragmentCountText: document.getElementById('fragment-count-text'),
      fragmentTicks: document.getElementById('fragment-ticks'),

      // Realm Sigil Bar on HUD
      sigilButtons: document.querySelectorAll('.sigil-btn'),

      // Top Actions
      btnSound: document.getElementById('btn-sound-toggle'),
      iconSoundOn: document.getElementById('icon-sound-on'),
      iconSoundOff: document.getElementById('icon-sound-off'),
      btnJournal: document.getElementById('btn-journal'),
      btnEffectsPanel: document.getElementById('btn-effects-panel'),
      btnExit: document.getElementById('btn-exit-ar'),

      // Bottom Dock
      btnScreenshot: document.getElementById('btn-screenshot'),
      btnResetGate: document.getElementById('btn-reset-gate'),
      btnWakeUp: document.getElementById('btn-wake-up'),
      btnPlaceFallback: document.getElementById('btn-place-fallback'),
      btnStepFallback: document.getElementById('btn-step-fallback'),

      // Scale Slider
      scaleSliderContainer: document.getElementById('scale-slider-container'),
      gateScaleSlider: document.getElementById('gate-scale-slider'),

      // Settings Drawer
      effectsModal: document.getElementById('effects-modal'),
      btnCloseEffects: document.getElementById('btn-close-effects'),
      btnCinematic: document.getElementById('btn-cinematic-mode'),
      qualitySelect: document.getElementById('quality-select'),
      intensitySlider: document.getElementById('intensity-slider'),
      nightSlider: document.getElementById('night-slider'),
      groupToggles: {
        gate: document.getElementById('toggle-gate'),
        particles: document.getElementById('toggle-particles'),
        lighting: document.getElementById('toggle-lighting'),
        realm: document.getElementById('toggle-realm'),
        reactive: document.getElementById('toggle-reactive'),
      },

      // Wake-up Summary Card
      wakeModal: document.getElementById('wake-modal'),
      wakeTitle: document.getElementById('wake-title'),
      wakePoeticTitle: document.getElementById('wake-poetic-title'),
      wakeFragments: document.getElementById('wake-fragments'),
      wakeTime: document.getElementById('wake-time'),
      btnCloseWakeSummary: document.getElementById('btn-close-wake-summary'),

      // Dream Journal Modal
      journalModal: document.getElementById('journal-modal'),
      journalList: document.getElementById('journal-list'),
      btnCloseJournal: document.getElementById('btn-close-journal'),

      // Overlays
      wakeUpOverlay: document.getElementById('wake-up-overlay'),
      screenFlash: document.getElementById('screen-flash'),
      vignetteOverlay: document.getElementById('vignette-overlay'),
      toast: document.getElementById('toast'),
    };

    this.onAction = null;
    this.splashAnimId = null;
    this.toastTimer = null;

    // Check debug mode for FPS counter
    const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
    if (this.dom.fpsCounter && isDebug) {
      this.dom.fpsCounter.classList.remove('hidden');
    }

    this.initSplashCanvas();
    this.bindEvents();
  }

  /**
   * Title particle convergence effect that resolves to crisp real text within 1.4s
   */
  initSplashCanvas() {
    const canvas = this.dom.splashCanvas;
    const titleEl = this.dom.splashTitle;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.min(320, Math.max(240, (window.innerWidth || 360) - 48));
    const height = 70;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Render offscreen text target positions
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const offCtx = off.getContext('2d');
    offCtx.fillStyle = '#ffffff';
    offCtx.font = '400 48px "Instrument Serif", Georgia, serif';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText('Dream Gate', width / 2, height / 2);

    const imgData = offCtx.getImageData(0, 0, width, height).data;
    const particles = [];
    const step = 3;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        if (imgData[idx + 3] > 120) {
          particles.push({
            tx: x,
            ty: y,
            x: (Math.random() - 0.5) * 360 + width / 2,
            y: (Math.random() - 0.5) * 160 + height / 2,
            color: Math.random() < 0.6 ? '#ffd27a' : '#dfe9ff',
            size: Math.random() * 1.4 + 0.8,
            alpha: Math.random() * 0.4 + 0.6,
          });
        }
      }
    }

    const startTime = performance.now();
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / 1.3);
      const ease = 1 - Math.pow(1 - progress, 3);

      // Once resolved (at ~1.3s), make the real HTML heading fully crisp
      if (progress >= 0.95 && titleEl) {
        titleEl.classList.add('resolved');
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += (p.tx - p.x) * 0.12;
        p.y += (p.ty - p.y) * 0.12;

        // Fade canvas particles out as real text fades in
        const fadeOut = progress > 0.8 ? 1.0 - (progress - 0.8) / 0.2 : 1.0;
        ctx.globalAlpha = p.alpha * fadeOut;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Stop loop after 1.5s once resolved
      if (elapsed < 1.5 && this.dom.splashScreen && !this.dom.splashScreen.classList.contains('hidden')) {
        this.splashAnimId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
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
      this.showToast(active ? 'Sound unmuted' : 'Sound muted');
    });

    // Reset Gate
    this.dom.btnResetGate?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.onAction?.('reset-gate');
    });

    // Screenshot
    this.dom.btnScreenshot?.addEventListener('click', () => {
      this.triggerHaptic([30, 40]);
      audioEngine.playUiClick();
      this.onAction?.('screenshot');
    });

    // Fallback placement & step
    this.dom.btnPlaceFallback?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.onAction?.('place-fallback');
    });

    this.dom.btnStepFallback?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.onAction?.('toggle-step');
    });

    // Wake Up
    this.dom.btnWakeUp?.addEventListener('click', () => {
      this.triggerHaptic([30, 60, 100]);
      audioEngine.playWakeUpSound();
      this.onAction?.('wake-up');
    });

    // Exit AR / Preview
    this.dom.btnExit?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.onAction?.('exit-experience');
    });

    // Realm Sigils Switcher
    this.dom.sigilButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.triggerHaptic(20);
        audioEngine.playUiClick();
        const realmId = btn.getAttribute('data-realm');
        this.dom.sigilButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.onAction?.('set-realm', realmId);
      });
    });

    // Scale Slider
    this.dom.gateScaleSlider?.addEventListener('input', (e) => {
      this.onAction?.('set-scale', parseFloat(e.target.value));
    });

    // Effects & Settings Drawer
    this.dom.btnEffectsPanel?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.dom.effectsModal?.classList.remove('hidden');
    });

    this.dom.btnCloseEffects?.addEventListener('click', () => {
      audioEngine.playUiClick();
      this.dom.effectsModal?.classList.add('hidden');
    });

    this.dom.btnCinematic?.addEventListener('click', () => {
      this.triggerHaptic([20, 50]);
      audioEngine.playUiClick();
      this.onAction?.('cinematic-mode');
      this.showToast('Cinematic profile active');
      this.dom.effectsModal?.classList.add('hidden');
    });

    this.dom.qualitySelect?.addEventListener('change', (e) => {
      this.onAction?.('set-quality', e.target.value);
    });

    this.dom.intensitySlider?.addEventListener('input', (e) => {
      this.onAction?.('set-intensity', parseFloat(e.target.value));
    });

    for (const [grp, el] of Object.entries(this.dom.groupToggles)) {
      if (el) {
        el.addEventListener('change', (e) => {
          this.onAction?.('toggle-group', { group: grp, enabled: e.target.checked });
        });
      }
    }

    // Dream Journal
    this.dom.btnJournal?.addEventListener('click', () => {
      this.triggerHaptic(20);
      audioEngine.playUiClick();
      this.renderJournal();
      this.dom.journalModal?.classList.remove('hidden');
    });

    this.dom.btnCloseJournal?.addEventListener('click', () => {
      audioEngine.playUiClick();
      this.dom.journalModal?.classList.add('hidden');
    });

    this.dom.btnCloseWakeSummary?.addEventListener('click', () => {
      audioEngine.playUiClick();
      this.dom.wakeModal?.classList.add('hidden');
    });
  }

  updateFragmentProgress(collected, total = 7) {
    if (this.dom.fragmentCountText) {
      this.dom.fragmentCountText.textContent = `${collected} of ${total}`;
    }
    const ticks = this.dom.fragmentTicks?.querySelectorAll('.tick');
    if (ticks) {
      ticks.forEach((tick, i) => {
        tick.classList.toggle('active', i < collected);
      });
    }
  }

  showWakeSummary(data) {
    if (this.dom.wakeTitle) this.dom.wakeTitle.textContent = `Awakened from ${data.realm || 'dream'}`;
    if (this.dom.wakePoeticTitle) this.dom.wakePoeticTitle.textContent = `"${data.title || 'Whispers of the Threshold'}"`;
    if (this.dom.wakeFragments) this.dom.wakeFragments.textContent = `${data.fragments || 0} of 7`;
    if (this.dom.wakeTime) this.dom.wakeTime.textContent = `${Math.round(data.timeSpentSeconds || 0)}s`;

    this.dom.wakeModal?.classList.remove('hidden');
  }

  renderJournal() {
    if (!this.dom.journalList) return;
    const dreams = dreamJournal.getDreams();
    if (dreams.length === 0) {
      this.dom.journalList.innerHTML = '<p class="journal-empty">No recorded journeys yet. Step through a gate and wake up to record your journey.</p>';
      return;
    }

    this.dom.journalList.innerHTML = dreams.map((d) => `
      <div class="journal-entry">
        <div class="journal-entry-title">${d.title}</div>
        <div class="journal-entry-meta">
          <span>Realm: ${d.realm} • ${d.fragments} of 7 fragments</span>
          <span>${d.date}</span>
        </div>
      </div>
    `).join('');
  }

  triggerHaptic(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  showScreenFlash() {
    if (!this.dom.screenFlash) return;
    this.dom.screenFlash.classList.add('flash-active');
    setTimeout(() => this.dom.screenFlash.classList.remove('flash-active'), 300);
  }

  showWakeUpOverlay(duration = 1600, onDone = null) {
    if (!this.dom.wakeUpOverlay) return;
    this.dom.wakeUpOverlay.classList.add('active');
    setTimeout(() => {
      this.dom.wakeUpOverlay.classList.remove('active');
      onDone?.();
    }, duration);
  }

  pulseVignette() {
    if (!this.dom.vignetteOverlay) return;
    this.dom.vignetteOverlay.classList.add('pulse');
    setTimeout(() => this.dom.vignetteOverlay.classList.remove('pulse'), 600);
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
      this.dom.statusDot.style.background = isTracking ? 'var(--c-accent)' : 'rgba(255, 255, 255, 0.4)';
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
      setTimeout(() => this.dom.toast.classList.add('hidden'), 250);
    }, duration);
  }

  hideSplash() {
    if (this.splashAnimId) cancelAnimationFrame(this.splashAnimId);
    this.dom.splashScreen?.classList.add('fade-out');
    setTimeout(() => {
      this.dom.splashScreen?.classList.add('hidden');
      this.dom.uiContainer?.classList.remove('hidden');
    }, 300);
  }

  showSplash() {
    this.dom.uiContainer?.classList.add('hidden');
    this.dom.splashScreen?.classList.remove('hidden', 'fade-out');
    if (this.dom.splashTitle) {
      this.dom.splashTitle.classList.remove('resolved');
    }
    this.initSplashCanvas();
  }
}
