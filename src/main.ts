/**
 * main.ts — Application entry point & PWA Orchestrator
 *
 * Coordinates:
 *   1. A-Frame component registrations (side-effect imports)
 *   2. PWA installation lifecycle and Service Worker registration
 *   3. Modern UI interaction (Hero Launch Console, HUD, Modals)
 *   4. Seamless WebXR AR session entry & Magic Window fallback
 */

// ── Register all A-Frame components (side-effect imports) ────────────────────
import './components/portal-core';
import './components/hit-test-placement';
import './components/portal-theme-manager';
import './components/portal-audio';
import './components/portal-ui';
import './components/lighting-estimation';

// ── UI & System helpers ───────────────────────────────────────────────────────
import { buildHtmlThemePicker } from './components/portal-ui';
import { getDeviceCapabilities, applyFallbackMode, showInstruction } from './utils/device-detect';
import { loadTheme, loadPortals, clearPortals } from './utils/persistence';
import { validateRimShaders } from './components/portal-rim-shader';
import { getAudioContext } from './components/portal-audio';
import { initPWA, promptPWAInstall } from './utils/pwa';
import { THREE } from './utils/three';

// ─── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize PWA Service Worker and install handlers
  initPWA();

  // 2. Build the HTML overlay theme picker & hero carousel
  buildHtmlThemePicker();

  // 3. Detect AR capabilities and apply UI mode
  const caps = await getDeviceCapabilities();
  applyFallbackMode(caps);

  // Audio Context gesture trigger
  const onGesture = () => {
    getAudioContext();
  };
  ['click', 'touchstart', 'pointerdown'].forEach((ev) => {
    window.addEventListener(ev, onGesture, { once: true, passive: true });
  });

  const sceneEl = document.getElementById('main-scene') as AFrameScene | null;
  const launchHero = document.getElementById('launch-hero');
  const hudOverlay = document.getElementById('hud-overlay');
  const btnStartAR = document.getElementById('btn-start-ar');
  const btnExplore3D = document.getElementById('btn-explore-3d');
  const btnExitAR = document.getElementById('btn-hud-exit');
  const btnInstallPWA = document.getElementById('btn-install-pwa');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const reticleStatusText = document.getElementById('reticle-status-text');

  // 4. Setup PWA Install Button
  window.addEventListener('pwa-installable', (e: any) => {
    if (btnInstallPWA) {
      if (e.detail?.installable) {
        btnInstallPWA.classList.remove('hidden');
      } else {
        btnInstallPWA.classList.add('hidden');
      }
    }
  });

  window.addEventListener('pwa-installed', () => {
    btnInstallPWA?.classList.add('hidden');
    showInstruction('✦ AR Portals added to Home Screen!', 4000);
  });

  btnInstallPWA?.addEventListener('click', async () => {
    await promptPWAInstall();
  });

  // 5. Sound Mute / Unmute Toggle
  let isMuted = false;
  btnSoundToggle?.addEventListener('click', () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (isMuted) {
      ctx.resume().catch(() => {});
      isMuted = false;
      btnSoundToggle.textContent = '🔊';
      btnSoundToggle.title = 'Mute spatial audio';
      showInstruction('🔊 Spatial Audio Unmuted', 2000);
    } else {
      ctx.suspend().catch(() => {});
      isMuted = true;
      btnSoundToggle.textContent = '🔇';
      btnSoundToggle.title = 'Unmute spatial audio';
      showInstruction('🔇 Spatial Audio Muted', 2000);
    }
  });

  // 6. Enter Active Experience (AR or Magic Window)
  const startExperience = async (force3D = false) => {
    // Resume audio
    getAudioContext();

    if (caps.isARCapable && !force3D) {
      // Launch WebXR AR Mode
      try {
        if ((sceneEl as any)?.enterAR) {
          await (sceneEl as any).enterAR();
        } else if ((sceneEl as any)?.enterVR) {
          await (sceneEl as any).enterVR();
        }
      } catch (err) {
        console.warn('[WebXR] enterAR failed, falling back to 3D mode:', err);
        switchToActiveHUD('3d');
      }
    } else {
      // 3D Magic Window Mode
      switchToActiveHUD('3d');
      if (sceneEl) {
        placeDemoPortal(sceneEl);
      }
    }
  };

  const switchToActiveHUD = (mode: 'ar' | '3d') => {
    launchHero?.classList.add('hidden');
    hudOverlay?.classList.remove('hidden');

    if (mode === 'ar') {
      if (reticleStatusText) {
        reticleStatusText.textContent = '✦ Point camera at a floor or surface';
      }
      showInstruction('✦ Scan floor with camera and tap to open portal', 5000);
    } else {
      if (reticleStatusText) {
        reticleStatusText.textContent = '✦ 3D Magic Window Active — Drag to look around';
      }
      showInstruction('✦ Magic Window Mode: Drag to look around portal', 4000);
    }
  };

  const exitExperience = () => {
    if (sceneEl?.is('ar-mode') || sceneEl?.is('vr-mode')) {
      (sceneEl as any)?.exitVR?.();
    }
    hudOverlay?.classList.add('hidden');
    launchHero?.classList.remove('hidden');
  };

  // Wire buttons
  btnStartAR?.addEventListener('click', () => startExperience(false));
  btnExplore3D?.addEventListener('click', () => startExperience(true));
  btnExitAR?.addEventListener('click', exitExperience);

  // Check URL shortcut (?action=launch-ar)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'launch-ar') {
    setTimeout(() => startExperience(false), 500);
  }

  // 7. A-Frame Scene Lifecycle Listeners
  if (sceneEl) {
    const hideLoader = () => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
      }
    };

    const onSceneReady = () => {
      hideLoader();

      // Dev-mode startup self-test for rim shaders
      if (import.meta.env.DEV && sceneEl.renderer) {
        try {
          validateRimShaders(sceneEl.renderer);
        } catch (e) {
          console.error('[shader-validation] Self-test failed:', e);
        }
      }

      // Restore persisted portals
      restorePersistedPortals();
    };

    if (sceneEl.hasLoaded) {
      onSceneReady();
    } else {
      sceneEl.addEventListener('loaded', onSceneReady);
    }

    // AR Mode entered
    sceneEl.addEventListener('enter-vr', () => {
      if (sceneEl.is('ar-mode')) {
        switchToActiveHUD('ar');
        setTimeout(() => {
          sceneEl.emit('show-portal-ui', {});
        }, 3000);
      }
    });

    // AR Mode exited
    sceneEl.addEventListener('exit-vr', () => {
      exitExperience();
    });

    // Manual placement from HUD
    sceneEl.addEventListener('place-portal-at-center', () => {
      placeDemoPortal(sceneEl);
    });

    // Custom 360 photo update
    sceneEl.addEventListener('custom-360-src', (e: Event) => {
      const { src } = (e as CustomEvent).detail;
      const portals = document.querySelectorAll('[portal-core]');
      portals.forEach((el) => {
        const core = (el as AFrameEntity).components?.['portal-core'] as any;
        if (core?._theme?.id === 'custom-360') {
          const loader = new THREE.TextureLoader();
          loader.load(src, (tex) => {
            tex.mapping = THREE.EquirectangularReflectionMapping;
            if (core._interiorMat) {
              core._interiorMat.map = tex;
              core._interiorMat.needsUpdate = true;
            }
          });
        }
      });
    });
  }
});

// ─── Restore Portals from LocalStorage ───────────────────────────────────────
function restorePersistedPortals(): boolean {
  const container = document.getElementById('portals-container') as AFrameEntity;
  if (!container) return false;

  const saved = loadPortals();
  if (!saved || saved.length === 0) return false;

  console.log(`[persistence] Restoring ${saved.length} portal(s) from storage`);
  saved.forEach((p, idx) => {
    const portal = document.createElement('a-entity') as AFrameEntity;
    portal.setAttribute('portal-core', `theme: ${p.theme}; autoOpen: true; radius: 0.9`);
    portal.setAttribute('position', `${p.position.x} ${p.position.y} ${p.position.z}`);
    portal.dataset.portalId = String(idx + 1);

    if (p.quaternion) {
      portal.object3D.quaternion.set(p.quaternion.x, p.quaternion.y, p.quaternion.z, p.quaternion.w);
    }
    container.appendChild(portal);
  });
  return true;
}

// ─── Demo Portal (non-AR / magic window mode) ────────────────────────────────
function placeDemoPortal(sceneEl: AFrameScene): void {
  const container = document.getElementById('portals-container') as AFrameEntity;
  if (!container) return;

  const existing = container.querySelector('[data-demo="true"]') as AFrameEntity | null;
  if (existing) container.removeChild(existing);

  const theme = loadTheme();
  const portal = document.createElement('a-entity') as AFrameEntity;
  portal.setAttribute('portal-core', `theme: ${theme}; autoOpen: true; radius: 0.9`);
  portal.setAttribute('position', '0 0 -2.5');
  portal.setAttribute('data-demo', 'true');
  container.appendChild(portal);
}

// ─── 20-Cycle Memory Leak QA Test Runner ──────────────────────────────────────
declare global {
  interface Window {
    runPortalMemoryTest: (cycles?: number) => Promise<{
      initialGeometries: number;
      initialTextures: number;
      finalGeometries: number;
      finalTextures: number;
      diffGeometries: number;
      diffTextures: number;
      passed: boolean;
    }>;
  }
}

if (typeof window !== 'undefined') {
  window.runPortalMemoryTest = async (cycles = 20) => {
    const sceneEl = document.getElementById('main-scene') as AFrameScene;
    const container = document.getElementById('portals-container') as AFrameEntity;
    const renderer = sceneEl?.renderer;

    if (!sceneEl || !container || !renderer) {
      throw new Error('Scene or renderer not ready for memory test');
    }

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    clearPortals();

    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 100));

    const initialGeometries = renderer.info.memory.geometries;
    const initialTextures = renderer.info.memory.textures;

    console.log(`[memory-qa] Starting ${cycles}-cycle create/destroy loop...`);

    for (let i = 0; i < cycles; i++) {
      const portal = document.createElement('a-entity') as AFrameEntity;
      portal.setAttribute('portal-core', 'theme: wormhole; autoOpen: false; radius: 0.8');
      portal.setAttribute('position', `0 0 -${2 + (i % 3) * 0.2}`);
      container.appendChild(portal);

      await new Promise((r) => setTimeout(r, 40));
      container.removeChild(portal);
      await new Promise((r) => setTimeout(r, 30));
    }

    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 150));

    const finalGeometries = renderer.info.memory.geometries;
    const finalTextures = renderer.info.memory.textures;
    const diffGeometries = finalGeometries - initialGeometries;
    const diffTextures = finalTextures - initialTextures;
    const passed = diffGeometries === 0 && diffTextures === 0;

    console.log(`[memory-qa] Completed ${cycles} cycles. Passed: ${passed}`);

    return {
      initialGeometries,
      initialTextures,
      finalGeometries,
      finalTextures,
      diffGeometries,
      diffTextures,
      passed,
    };
  };
}
