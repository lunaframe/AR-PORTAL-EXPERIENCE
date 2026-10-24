/**
 * utils/pwa.ts — Progressive Web App lifecycle, service worker registration,
 * and custom install prompt management.
 */

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  deferredPrompt: any | null;
}

const state: PWAState = {
  isInstallable: false,
  isInstalled: false,
  deferredPrompt: null,
};

/**
 * Register Service Worker and initialize PWA install event listeners.
 */
export function initPWA(): void {
  // Check if app is running in standalone mode (already installed)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  state.isInstalled = isStandalone;

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default browser mini-infobar on mobile
    e.preventDefault();
    state.deferredPrompt = e;
    state.isInstallable = true;

    // Notify UI components
    window.dispatchEvent(new CustomEvent('pwa-installable', { detail: { installable: true } }));
    console.log('[PWA] App is installable. Custom install prompt ready.');
  });

  // Track app installation
  window.addEventListener('appinstalled', () => {
    state.isInstalled = true;
    state.isInstallable = false;
    state.deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
    console.log('[PWA] AR Portal Effect installed successfully!');
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);

          // Check for service worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available.');
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}

/**
 * Trigger the browser install prompt if available.
 */
export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!state.deferredPrompt) {
    console.log('[PWA] Install prompt not available.');
    return 'unavailable';
  }

  try {
    const promptEvent = state.deferredPrompt;
    state.deferredPrompt = null;
    state.isInstallable = false;

    // Show native prompt
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);

    window.dispatchEvent(new CustomEvent('pwa-installable', { detail: { installable: false } }));
    return outcome;
  } catch (err) {
    console.error('[PWA] Error triggering install prompt:', err);
    return 'unavailable';
  }
}

export function getPWAState(): Readonly<PWAState> {
  return state;
}
