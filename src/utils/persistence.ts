/**
 * persistence.ts
 * LocalStorage helpers for saving/restoring portal state across sessions.
 */

const KEYS = {
  THEME:    'ar-portal:last-theme',
  PORTALS:  'ar-portal:portals',
  SETTINGS: 'ar-portal:settings',
} as const;

export interface PersistedPortal {
  id: number;
  theme: string;
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
}

export interface AppSettings {
  audioEnabled: boolean;
  particlesEnabled: boolean;
  quality: 'low' | 'medium' | 'high';
}

const DEFAULT_SETTINGS: AppSettings = {
  audioEnabled: true,
  particlesEnabled: true,
  quality: 'medium',
};

// ─── Theme ────────────────────────────────────────────────────────────────────

export function saveTheme(id: string): void {
  try { localStorage.setItem(KEYS.THEME, id); } catch { /* private mode */ }
}

export function loadTheme(): string {
  try { return localStorage.getItem(KEYS.THEME) ?? 'wormhole'; } catch { return 'wormhole'; }
}

// ─── Portals ──────────────────────────────────────────────────────────────────

export function savePortals(list: PersistedPortal[]): void {
  try { localStorage.setItem(KEYS.PORTALS, JSON.stringify(list)); } catch { /* ignore */ }
}

export function loadPortals(): PersistedPortal[] {
  try {
    const raw = localStorage.getItem(KEYS.PORTALS);
    return raw ? (JSON.parse(raw) as PersistedPortal[]) : [];
  } catch { return []; }
}

export function clearPortals(): void {
  try { localStorage.removeItem(KEYS.PORTALS); } catch { /* ignore */ }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function saveSettings(patch: Partial<AppSettings>): void {
  try {
    const s = { ...loadSettings(), ...patch };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(s));
  } catch { /* ignore */ }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
