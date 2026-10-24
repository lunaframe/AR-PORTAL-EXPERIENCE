/**
 * portal-ui.ts
 *
 * Modern multi-tier UI system:
 *   1. Hero Theme Carousel — Quick preview dock on the launch screen
 *   2. Theme Drawer (Bottom Sheet) — Comprehensive glassmorphism theme browser
 *   3. In-scene 3D UI — Floating spatial panel in AR mode
 */

import { THEMES } from '../themes/index';
import { loadTheme, saveTheme, clearPortals } from '../utils/persistence';
import { THREE } from '../utils/three';

// ─── HTML Overlay UI ─────────────────────────────────────────────────────────

export function buildHtmlThemePicker(): void {
  const heroCarousel = document.getElementById('hero-theme-carousel');
  const drawerGrid   = document.getElementById('drawer-theme-grid');
  const activeLabel  = document.getElementById('active-theme-label');
  const savedThemeId = loadTheme();

  // 1. Build Hero Quick Carousel & Drawer Cards
  THEMES.forEach((theme) => {
    // A. Carousel Chip
    if (heroCarousel) {
      const chip = document.createElement('div');
      chip.className = `theme-card-chip ${theme.id === savedThemeId ? 'active' : ''}`;
      chip.id = `hero-chip-${theme.id}`;
      chip.title = theme.description;
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', String(theme.id === savedThemeId));
      chip.innerHTML = `
        <span class="chip-emoji">${theme.emoji}</span>
        <span class="chip-name">${theme.name.split(' ')[0]}</span>
      `;
      chip.addEventListener('click', () => selectTheme(theme.id));
      heroCarousel.appendChild(chip);
    }

    // B. Drawer Card
    if (drawerGrid) {
      const card = document.createElement('button');
      card.className = `theme-card-chip ${theme.id === savedThemeId ? 'active' : ''}`;
      card.id = `drawer-chip-${theme.id}`;
      card.style.height = '100px';
      card.style.width = '100%';
      card.title = theme.description;
      card.innerHTML = `
        <span class="chip-emoji" style="font-size: 2rem;">${theme.emoji}</span>
        <span class="chip-name" style="font-size: 0.72rem; color: #fff;">${theme.name}</span>
      `;
      card.addEventListener('click', () => {
        selectTheme(theme.id);
        closeDrawer();
      });
      drawerGrid.appendChild(card);
    }
  });

  // Set initial active label
  const initialTheme = THEMES.find(t => t.id === savedThemeId) || THEMES[0];
  if (activeLabel && initialTheme) {
    activeLabel.textContent = initialTheme.name;
  }

  // 2. Select Theme Handler
  function selectTheme(themeId: string) {
    saveTheme(themeId);
    const themeObj = THEMES.find(t => t.id === themeId);
    if (activeLabel && themeObj) {
      activeLabel.textContent = themeObj.name;
    }

    // Update active styles
    document.querySelectorAll('.theme-card-chip').forEach((el) => {
      const match = el.id.endsWith(themeId);
      el.classList.toggle('active', match);
      el.setAttribute('aria-checked', String(match));
    });

    const scene = document.getElementById('main-scene') as AFrameScene | null;
    scene?.emit('theme-selected', { themeId });

    if (themeId === 'custom-360') {
      triggerPhotoUpload();
    }
  }

  // 3. Wire Up Drawer and Modal Handlers
  const themeDrawer = document.getElementById('theme-drawer');
  const openDrawer = () => themeDrawer?.classList.remove('hidden');
  const closeDrawer = () => themeDrawer?.classList.add('hidden');

  document.getElementById('btn-hud-themes')?.addEventListener('click', openDrawer);
  document.getElementById('btn-close-drawer')?.addEventListener('click', closeDrawer);

  const helpModal = document.getElementById('help-modal');
  document.getElementById('btn-help-toggle')?.addEventListener('click', () => {
    helpModal?.classList.remove('hidden');
  });
  document.getElementById('btn-close-help')?.addEventListener('click', () => {
    helpModal?.classList.add('hidden');
  });
  helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });

  // Place Portal button (for magic-window or non-AR placement)
  document.getElementById('btn-hud-place')?.addEventListener('click', () => {
    const scene = document.getElementById('main-scene') as AFrameScene;
    scene?.emit('place-portal-at-center', {});
  });

  // Clear Portals
  document.getElementById('btn-hud-clear')?.addEventListener('click', () => {
    const scene = document.getElementById('main-scene') as AFrameScene;
    scene?.emit('clear-portals', {});
    clearPortals();
  });
}

// ─── 360 Photo Upload ─────────────────────────────────────────────────────────
function triggerPhotoUpload(): void {
  let input = document.getElementById('photo-upload-input') as HTMLInputElement | null;
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'photo-upload-input';
    input.accept = 'image/*,video/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      const file = input?.files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      const scene = document.getElementById('main-scene') as AFrameScene;
      scene?.emit('custom-360-src', { src: url, isVideo: file.type.startsWith('video') });

      const portals = document.querySelectorAll('[portal-core]');
      portals.forEach((el) => {
        const entity = el as AFrameEntity;
        const core   = entity.components?.['portal-core'] as any;
        if (core?._theme?.id === 'custom-360') {
          core._applyCustomSrc(url);
        }
      });
    });
  }

  input.click();
}

// ─── A-Frame In-Scene 3D UI Component ────────────────────────────────────────
AFRAME.registerComponent('portal-ui', {
  schema: {
    visible: { type: 'boolean', default: false },
  },

  init(this: AFrameComponentInst) {
    const self = this as any;
    self._isOpen     = false;
    self._selectedId = loadTheme();
    self._cards      = [] as AFrameEntity[];

    this.el.sceneEl?.addEventListener('show-portal-ui', () => self._showPanel());
    this.el.sceneEl?.addEventListener('hide-portal-ui', () => self._hidePanel());

    this.el.sceneEl?.addEventListener('theme-selected', (e: Event) => {
      self._selectedId = (e as CustomEvent).detail.themeId;
      self._updateCardHighlight();
    });

    self._positionInFrontOfCamera();
  },

  _buildPanel(this: any) {
    if (this._panelBuilt) return;
    this._panelBuilt = true;

    const CARD_W = 0.18, CARD_H = 0.20, GAP = 0.02;
    const cols = 3;
    const totalW = cols * CARD_W + (cols - 1) * GAP;

    // Background panel
    const bg = document.createElement('a-plane') as AFrameEntity;
    bg.setAttribute('width',    String(totalW + 0.06));
    bg.setAttribute('height',   '0.7');
    bg.setAttribute('color',    '#0a0010');
    bg.setAttribute('opacity',  '0.85');
    bg.setAttribute('material', 'shader: flat; transparent: true');
    bg.setAttribute('position', '0 0 0');
    this.el.appendChild(bg);

    // Title
    const title = document.createElement('a-text') as AFrameEntity;
    title.setAttribute('value',    'Select Portal Theme');
    title.setAttribute('color',    '#00f2fe');
    title.setAttribute('align',    'center');
    title.setAttribute('width',    '0.6');
    title.setAttribute('position', '0 0.28 0.01');
    this.el.appendChild(title);

    // Theme cards
    THEMES.forEach((theme, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = (col - (cols - 1) / 2) * (CARD_W + GAP);
      const y   = 0.10 - row * (CARD_H + GAP);

      const card = document.createElement('a-plane') as AFrameEntity;
      card.setAttribute('width',    String(CARD_W));
      card.setAttribute('height',   String(CARD_H));
      card.setAttribute('color',    '#1a0a2e');
      card.setAttribute('opacity',  '0.9');
      card.setAttribute('position', `${x} ${y} 0.005`);
      card.setAttribute('class',    'portal-ui-card clickable');
      card.dataset.themeId = theme.id;

      const emoji = document.createElement('a-text') as AFrameEntity;
      emoji.setAttribute('value',    theme.emoji);
      emoji.setAttribute('align',    'center');
      emoji.setAttribute('width',    '0.12');
      emoji.setAttribute('position', '0 0.035 0.005');
      card.appendChild(emoji);

      const label = document.createElement('a-text') as AFrameEntity;
      label.setAttribute('value',    theme.name.split(' ').slice(0, 2).join('\n'));
      label.setAttribute('align',    'center');
      label.setAttribute('color',    '#c4b5fd');
      label.setAttribute('width',    '0.14');
      label.setAttribute('position', '0 -0.04 0.005');
      card.appendChild(label);

      card.addEventListener('click', () => {
        this._selectedId = theme.id;
        this.el.sceneEl?.emit('theme-selected', { themeId: theme.id });
        this._updateCardHighlight();
        if (theme.id === 'custom-360') triggerPhotoUpload();
      });

      this.el.appendChild(card);
      this._cards.push(card);
    });

    // Close button
    const closeBtn = document.createElement('a-plane') as AFrameEntity;
    closeBtn.setAttribute('width',    '0.10');
    closeBtn.setAttribute('height',   '0.06');
    closeBtn.setAttribute('color',    '#7c3aed');
    closeBtn.setAttribute('position', `0 -0.29 0.005`);
    closeBtn.setAttribute('class',    'clickable');
    const closeTxt = document.createElement('a-text') as AFrameEntity;
    closeTxt.setAttribute('value',    'Close');
    closeTxt.setAttribute('align',    'center');
    closeTxt.setAttribute('color',    '#ffffff');
    closeTxt.setAttribute('width',    '0.08');
    closeTxt.setAttribute('position', '0 0 0.002');
    closeBtn.appendChild(closeTxt);
    closeBtn.addEventListener('click', () => this._hidePanel());
    this.el.appendChild(closeBtn);

    this._updateCardHighlight();
  },

  _updateCardHighlight(this: any) {
    this._cards.forEach((card: AFrameEntity) => {
      const isSelected = card.dataset.themeId === this._selectedId;
      card.setAttribute('color', isSelected ? '#3b0764' : '#1a0a2e');
    });
  },

  _showPanel(this: any) {
    this._buildPanel();
    this._positionInFrontOfCamera();
    this.el.setAttribute('visible', 'true');
    this._isOpen = true;
  },

  _hidePanel(this: any) {
    this.el.setAttribute('visible', 'false');
    this._isOpen = false;
  },

  _positionInFrontOfCamera(this: any) {
    const camera = this.el.sceneEl?.camera as any;
    if (!camera) return;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pos = new THREE.Vector3();
    camera.getWorldPosition(pos);
    pos.addScaledVector(dir, 1.2);
    pos.y = (camera.position.y || 1.6) - 0.1;

    this.el.object3D.position.copy(pos);
    this.el.object3D.lookAt(pos.clone().sub(dir));
  },
});
