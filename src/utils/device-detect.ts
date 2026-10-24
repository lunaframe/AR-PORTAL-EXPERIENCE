/**
 * device-detect.ts
 * Detects WebXR AR capability safely and configures the scene for the right mode.
 */

export interface DeviceCapabilities {
  hasXR: boolean;
  hasImmersiveAR: boolean;
  isMobile: boolean;
  isARCapable: boolean;
}

let _cached: DeviceCapabilities | null = null;

export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  if (_cached) return _cached;

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  let hasXR = false;
  let hasImmersiveAR = false;

  try {
    hasXR = Boolean(typeof navigator !== 'undefined' && 'xr' in navigator && navigator.xr);
    if (hasXR && navigator.xr) {
      // Wrap in Promise.resolve and try/catch: macOS Safari defines navigator.xr but every call rejects
      hasImmersiveAR = await Promise.resolve(navigator.xr.isSessionSupported('immersive-ar')).catch(() => false);
    }
  } catch {
    hasXR = false;
    hasImmersiveAR = false;
  }

  _cached = {
    hasXR,
    hasImmersiveAR,
    isMobile,
    isARCapable: hasImmersiveAR,
  };

  return _cached;
}

export function applyFallbackMode(caps: DeviceCapabilities): void {
  const badge = document.getElementById('device-mode-badge');
  const btnStartText = document.getElementById('start-ar-text');
  const btnStartSub = document.getElementById('start-ar-subtext');
  const btnExplore3d = document.getElementById('btn-explore-3d');

  if (caps.isARCapable) {
    if (badge) {
      badge.textContent = '✦ WebXR AR Ready';
      badge.className = 'mode-badge ar-ready';
      badge.title = 'WebXR AR surface tracking supported on this device';
    }
    if (btnStartText) btnStartText.textContent = 'Start AR Experience';
    if (btnStartSub) btnStartSub.textContent = 'Tap to launch camera & hit-test';
    if (btnExplore3d) btnExplore3d.style.display = 'inline-flex';
  } else {
    // Magic Window fallback mode
    if (badge) {
      badge.textContent = '✦ 3D Magic Window';
      badge.className = 'mode-badge fallback-ready';
      badge.title = 'WebXR AR not detected — running in 3D Magic Window mode';
    }
    if (btnStartText) btnStartText.textContent = 'Explore 3D Portals';
    if (btnStartSub) btnStartSub.textContent = 'Click & drag to look around';
    if (btnExplore3d) btnExplore3d.style.display = 'none';

    const cam = document.getElementById('main-camera');
    if (cam) {
      cam.setAttribute('look-controls', 'enabled: true; touchEnabled: true; magicWindowTrackingEnabled: true');
    }
  }
}

let _instrTimer: ReturnType<typeof setTimeout> | null = null;

export function showInstruction(text: string, duration = 3500): void {
  let el = document.getElementById('instruction-bar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'instruction-bar';
    el.className = 'instructions';
    const uiOverlay = document.getElementById('ui-overlay') || document.body;
    uiOverlay.appendChild(el);
  }
  el.textContent = text;
  el.classList.remove('hidden');
  if (_instrTimer) clearTimeout(_instrTimer);
  if (duration > 0) {
    _instrTimer = setTimeout(() => el?.classList.add('hidden'), duration);
  }
}
