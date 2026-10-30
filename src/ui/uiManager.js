/**
 * uiManager.js — Glassmorphism UI, Particle Splash, HUD, Dream Fragments & Journal
 * Palette: Midnight #0b0a2a, Violet #7c4dff, Silver #dfe9ff, Teal #3df2d0, Rose #ff9ecb, Lantern #ffd27a
 */

import { audioEngine } from '../audio/engine.js';
import { dreamJournal } from '../journal/dreamJournal.js';

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

      // Fragment Progress
      fragmentPill: document.getElementById('fragment-pill'),
      fragmentCountText: document.getElementById('fragment-count-text'),
      fragmentRingFill: document.getElementById('fragment-ring-fill'),

      // Realm Sigil Bar on HUD
      sigilButtons: document.querySelectorAll('.sigil-btn'),

      // Top Actions
      btnSound: document.getElementById('btn-sound-toggle'),
      iconSoundOn: document.getElementById('icon-sound-on'),
      iconSoundOff: document.getElementById('icon-sound-off'),
      btnScreenshot: document.getElementById('btn-screenshot'),
      btnEffectsPanel: document.getElementById('btn-effects-panel'),
      btnJournal: document.getElementById('btn-journal'),
      btnExit: document.getElementById('btn-exit-ar'),

      // Bottom Bar
      btnPlaceFallback: document.getElementById('btn-place-fallback'),
      btnStepFallback: document.getElementById('btn-step-fallback'),
      btnWakeUp: document.getElementById('btn-wake-up'),
      btnResetGate: document.getElementById('btn-reset-gate'),

      // Scale Slider
      scaleSliderContainer: document.getElementById('scale-slider-container'),
      gateScaleSlider: document.getElementById('gate-scale-slider'),

      // Effects Drawer / Modal
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

      // Wake-up Summary Card Modal
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
   * Animated Particle-Text Title for Splash Screen ("DREAM GATE")
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

    // Render offscreen text
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 380;
    offCanvas.height = 110;
    const offCtx = offCanvas.getContext('2d');
    offCtx.fillStyle = '#ffffff';
    offCtx.font = 'bold 36px "Cinzel", Georgia, serif';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText('DREAM GATE', 190, 55);

    const imgData = offCtx.getImageData(0, 0, 380, 110).data;
    const particles = [];
    const step = 4;

    for (let y = 0; y < 110; y += step) {
      for (let x = 0; x < 380; x += step) {
        const idx = (y * 380 + x) * 4;
        if (imgData[idx + 3] > 128) {
          particles.push({
            tx: x,
            ty: y,
            x: (Math.random() - 0.5) * 600 + 190,
            y: (Math.random() - 0.5) * 400 + 55,
            color: Math.random() < 0.5 ? '#3df2d0' : '#ff9ecb',
            size: Math.random() * 1.8 + 1.2,
          });
        }
      }
    }

    let startTime = performance.now();
    const render = () => {
      ctx.clearRect(0, 0, 380, 110);
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / 2.2);
      const ease = 1 - Math.pow(1 - progress, 3);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
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
      this.triggerHaptic(25);
      audioEngine.init();
      audioEngine.playUiClick();
      this.onAction?.('start-ar');
    });

    this.dom.btnCameraMode?.addEventListener('click', () => {
      this.triggerHaptic(25);
      audioEngine.init();
      audioEngine.playUiClick();
      this.onAction?.('start-camera');
    });

    this.dom.btnPreview?.addEventListener('click', () => {
      this.triggerHaptic(25);
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

    // Reset Gate
    this.dom.btnResetGate?.addEventListener('click', () => {
      this.triggerHaptic(30);
      audioEngine.playUiClick();
      this.onAction?.('reset-gate');
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

    // Wake Up Button
    this.dom.btnWakeUp?.addEventListener('click', () => {
      this.triggerHaptic([50, 70, 120]);
      audioEngine.playWakeUpSound();
      this.onAction?.('wake-up');
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
    this.dom.gateScaleSlider?.addEventListener('input', (e) => {
      this.onAction?.('set-scale', parseFloat(e.target.value));
    });

    // Realm Sigil Buttons
    this.dom.sigilButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dom.sigilButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const realm = btn.dataset.realm;
        this.triggerHaptic(30);
        audioEngine.playUiClick();
        this.onAction?.('set-realm', realm);
        this.showToast(`Entering Realm: ${btn.textContent.trim()}`);
      });
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

    // Cinematic Mode
    this.dom.btnCinematic?.addEventListener('click', () => {
      this.triggerHaptic([30, 50, 100]);
      audioEngine.playUiClick();
      this.onAction?.('cinematic-mode');
      this.showToast('✨ Cinematic Lucid Mode Active');
    });

    // Quality selector
    this.dom.qualitySelect?.addEventListener('change', (e) => {
      this.onAction?.('set-quality', e.target.value);
    });

    // Intensity & Night Sliders
    this.dom.intensitySlider?.addEventListener('input', (e) => {
      this.onAction?.('set-intensity', parseFloat(e.target.value));
    });

    this.dom.nightSlider?.addEventListener('input', (e) => {
      this.onAction?.('set-time-of-night', parseFloat(e.target.value));
    });

    // Group Toggles
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
      this.dom.fragmentCountText.textContent = `${collected}/${total}`;
    }
    if (this.dom.fragmentRingFill) {
      const maxOffset = 44;
      const progress = Math.min(1.0, collected / total);
      this.dom.fragmentRingFill.style.strokeDashoffset = maxOffset * (1 - progress);
    }
  }

  showWakeSummary(data) {
    if (this.dom.wakeTitle) this.dom.wakeTitle.textContent = `Awakened from ${data.realm || 'Dream'}`;
    if (this.dom.wakePoeticTitle) this.dom.wakePoeticTitle.textContent = `"${data.title || 'Whispers of the Threshold'}"`;
    if (this.dom.wakeFragments) this.dom.wakeFragments.textContent = `${data.fragments || 0} / 7`;
    if (this.dom.wakeTime) this.dom.wakeTime.textContent = `${Math.round(data.timeSpentSeconds || 0)}s`;

    this.dom.wakeModal?.classList.remove('hidden');
  }

  renderJournal() {
    if (!this.dom.journalList) return;
    const dreams = dreamJournal.getDreams();
    if (dreams.length === 0) {
      this.dom.journalList.innerHTML = '<p style="color:rgba(223,233,255,0.5);text-align:center;font-size:13px;padding:24px 0;">No recorded dreams yet. Step through a gate and wake up to record your journey.</p>';
      return;
    }

    this.dom.journalList.innerHTML = dreams.map((d) => `
      <div class="journal-entry">
        <div class="journal-entry-title">${d.title}</div>
        <div class="journal-entry-meta">
          <span>Realm: ${d.realm} • ${d.fragments}/7 Shards</span>
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
    setTimeout(() => this.dom.screenFlash.classList.remove('flash-active'), 450);
  }

  showWakeUpOverlay(duration = 1800, onDone = null) {
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
    setTimeout(() => this.dom.vignetteOverlay.classList.remove('pulse'), 1200);
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
      this.dom.statusDot.style.background = isTracking ? 'var(--c-teal)' : 'var(--c-rose)';
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
    }, 600);
  }

  showSplash() {
    this.dom.uiContainer?.classList.add('hidden');
    this.dom.splashScreen?.classList.remove('hidden', 'fade-out');
    this.initSplashCanvas();
  }
}
