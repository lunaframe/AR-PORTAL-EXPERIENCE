/**
 * portal-core.ts — The heart of the AR portal mechanic.
 *
 * This A-Frame component creates and manages a single portal:
 *   1. Occlusion mesh  (stencil write, no color)
 *   2. Interior sphere (stencil test = EQUAL — shows the virtual world)
 *   3. Rim mesh        (ShaderMaterial — the animated edge effect)
 *   4. Walk-through detection (camera crossing the portal plane)
 *   5. Theme switching and activation animations
 *   6. Comprehensive GPU resource disposal (zero memory leaks)
 */

import type * as THREETypes from 'three';
import { THREE } from '../utils/three';
import { RENDER_ORDER, allocatePortalId, freePortalId } from '../utils/render-order';
import { PortalTransition } from './portal-transition';
import { PortalAudioController } from './portal-audio';
import { createRimMaterial, updateRimUniforms, swapRimShader, setRimColor } from './portal-rim-shader';
import { getTheme, type PortalTheme } from '../themes/index';
import { saveTheme } from '../utils/persistence';

AFRAME.registerComponent('portal-core', {
  schema: {
    theme:        { type: 'string',  default: 'wormhole' },
    radius:       { type: 'number',  default: 0.9 },        // meters
    autoReparent: { type: 'boolean', default: false },       // Strategy A opt-in
    autoOpen:     { type: 'boolean', default: true },        // open on mount?
  },

  // ─── Internal state ─────────────────────────────────────────────────────────
  _portalId:      0 as number,
  _theme:         null as PortalTheme | null,
  _transition:    null as PortalTransition | null,
  _audio:         null as PortalAudioController | null,

  _occlusionMesh:  null as THREETypes.Mesh | null,
  _rimMesh:        null as THREETypes.Mesh | null,
  _interiorSphere: null as THREETypes.Mesh | null,
  _particleSystem: null as THREETypes.Points | null,

  _rimMaterial:   null as THREETypes.ShaderMaterial | null,
  _interiorMat:   null as THREETypes.MeshBasicMaterial | null,
  _interiorTex:   null as THREETypes.Texture | null,

  // Walk-through state
  _wasInFront:    null as boolean | null,
  _isInsidePortal: false as boolean,
  _lastCrossingTime: 0 as number,
  _worldPos:      null as any,
  _worldQuat:     null as any,
  _portalNormal:  null as any,
  _cameraPos:     null as any,
  _tempVec:       null as any,
  _startTime:     0 as number,

  // Autoparent strategy tracking
  _reparentedToScene: false as boolean,

  // ─── Init ──────────────────────────────────────────────────────────────────
  init(this: AFrameComponentInst) {
    const self = this as any;
    self._portalId = allocatePortalId();
    self._startTime = performance.now();
    self._worldPos = new THREE.Vector3();
    self._worldQuat = new THREE.Quaternion();
    self._portalNormal = new THREE.Vector3(0, 0, 1);
    self._cameraPos = new THREE.Vector3();
    self._tempVec = new THREE.Vector3();
    self._wasInFront = null;
    self._isInsidePortal = false;
    self._lastCrossingTime = 0;

    self._theme = getTheme(this.data.theme as string);
    self._buildPortal();

    if (this.data.autoOpen) {
      setTimeout(() => self._openPortal(), 100);
    }
  },

  // ─── Portal construction ───────────────────────────────────────────────────
  _buildPortal(this: any) {
    const theme      = this._theme as PortalTheme;
    const radius     = this.data.radius as number;
    const stencilRef = this._portalId as number;

    // ── 1. Occlusion mesh ──────────────────────────────────────────────────
    // colorWrite: false → invisible, but writes to stencil and depth buffers.
    // depthWrite: true → real-world depth is occluded behind portal hole.
    const occlusionGeom = new THREE.CircleGeometry(radius, 64);
    const occlusionMat  = new THREE.MeshBasicMaterial({
      colorWrite:   false,
      depthWrite:   true,
      stencilWrite: true,
      stencilRef:   stencilRef,
      stencilFunc:  THREE.AlwaysStencilFunc,
      stencilZPass: THREE.ReplaceStencilOp,
      side:         THREE.DoubleSide,
    });
    this._occlusionMesh = new THREE.Mesh(occlusionGeom, occlusionMat);
    this._occlusionMesh.renderOrder = RENDER_ORDER.OCCLUSION;

    // ── 2. Interior sphere ──────────────────────────────────────────────────
    // Large sphere (radius 100m) showing the virtual environment.
    // BackSide = viewed from inside.
    // stencilFunc = EQUAL → only draws where stencil = this portal's ID.
    this._interiorMat = new THREE.MeshBasicMaterial({
      side:         THREE.BackSide,
      stencilWrite: false,
      stencilFunc:  THREE.EqualStencilFunc,
      stencilRef:   stencilRef,
      stencilFail:  THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
      depthWrite:   false,
    });
    this._applyInteriorStyle(theme);

    const interiorGeom   = new THREE.SphereGeometry(100, 32, 16);
    this._interiorSphere = new THREE.Mesh(interiorGeom, this._interiorMat);
    this._interiorSphere.renderOrder = RENDER_ORDER.INTERIOR;
    this._interiorSphere.visible     = false;

    // ── 3. Rim mesh ────────────────────────────────────────────────────────
    const rimGeom     = new THREE.TorusGeometry(radius, 0.04, 20, 100);
    this._rimMaterial = createRimMaterial(
      theme.rimShaderKey,
      theme.rimColor,
      theme.rimIntensity,
    );
    this._rimMesh = new THREE.Mesh(rimGeom, this._rimMaterial);
    this._rimMesh.renderOrder = RENDER_ORDER.RIM;

    // ── 4. Particle system ─────────────────────────────────────────────────
    if (theme.particles?.enabled) {
      this._particleSystem = this._createParticles(theme, radius);
    }

    // ── Assemble into entity ───────────────────────────────────────────────
    const root = this.el.object3D;
    root.add(this._occlusionMesh);
    root.add(this._rimMesh);

    if (this.data.autoReparent) {
      this._reparentInteriorToScene();
    } else {
      root.add(this._interiorSphere);
    }

    if (this._particleSystem) {
      root.add(this._particleSystem);
      this._particleSystem.renderOrder = RENDER_ORDER.PARTICLES;
    }

    // ── Transition controller ──────────────────────────────────────────────
    this._transition = new PortalTransition({
      type:       theme.activation.type,
      durationMs: theme.activation.durationMs,
      onProgress: (p: number) => {
        if (p > 0.01 && this._interiorSphere) {
          this._interiorSphere.visible = true;
        }
        updateRimUniforms(
          this._rimMaterial!,
          (performance.now() - this._startTime) / 1000,
          p,
        );
      },
      onOpen:  () => { this._audio?.playAmbient(); },
      onClose: () => {
        this._audio?.stopAmbient();
        if (this._interiorSphere) {
          this._interiorSphere.visible = false;
        }
      },
    });

    // ── Audio controller ───────────────────────────────────────────────────
    this._audio = new PortalAudioController({
      ambient: theme.audio.ambient,
      stinger: theme.audio.stinger,
      enabled: true,
    });
    this._audio.preload();

    // ── AutoReparent strategy for occlusion mesh ───────────────────────────
    if (this.data.autoReparent) {
      this._reparentOcclusionToScene();
    }
  },

  _openPortal(this: any) {
    (this._transition as PortalTransition)?.open();
    this._audio?.playStinger();
    this.el.emit('portal-opened', { id: this._portalId });
  },

  closePortal(this: any) {
    (this._transition as PortalTransition)?.close();
    this.el.emit('portal-closed', { id: this._portalId });
  },

  // ─── Interior environment styling ──────────────────────────────────────────
  _applyInteriorStyle(this: any, theme: PortalTheme) {
    const mat = this._interiorMat as THREETypes.MeshBasicMaterial;
    if (!mat) return;
    const interior = theme.interior;

    if (interior.type === 'skybox-gradient' || interior.type === 'stub') {
      if (this._interiorTex) {
        this._interiorTex.dispose();
        this._interiorTex = null;
      }
      const texture = this._createThemedInterior(
        theme.id,
        interior.colorA ?? '#000010',
        interior.colorB ?? '#000030',
      );
      mat.map = texture;
      mat.needsUpdate = true;
      this._interiorTex = texture;

    } else if (interior.type === '360-photo') {
      if (this._interiorTex) {
        this._interiorTex.dispose();
        this._interiorTex = null;
      }
      if (interior.src) {
        const loader = new THREE.TextureLoader();
        loader.load(interior.src, (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          mat.map = tex;
          mat.needsUpdate = true;
          this._interiorTex = tex;
        });
      } else {
        const defaultTex = this._createDefault360Panorama();
        mat.map = defaultTex;
        mat.needsUpdate = true;
        this._interiorTex = defaultTex;
      }
    }
  },

  _applyCustomSrc(this: any, src: string) {
    const loader = new THREE.TextureLoader();
    loader.load(src, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (this._interiorTex) {
        this._interiorTex.dispose();
      }
      if (this._interiorMat) {
        this._interiorMat.map = tex;
        this._interiorMat.needsUpdate = true;
      }
      this._interiorTex = tex;
    });
  },

  /**
   * Dispatch to a theme-appropriate interior texture painter.
   * All 6 themes render distinct procedural 360 virtual worlds.
   */
  _createThemedInterior(this: any, themeId: string, colorA: string, colorB: string): THREETypes.Texture {
    switch (themeId) {
      case 'nature-rift':    return this._createForestInterior();
      case 'elemental-fire': return this._createLavaInterior();
      case 'scifi-stargate': return this._createHologramInterior();
      case 'glass-shatter':  return this._createPrismInterior();
      default:
        return this._createGradientTexture(colorA, colorB);
    }
  },

  // ─── Glass Shatter interior: prismatic crystal cavern ──────────────────────
  _createPrismInterior(this: any): THREETypes.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size * 2; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;

    // Background: deep crystalline cobalt to midnight indigo
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0,   '#020b18');
    bgGrad.addColorStop(0.5, '#001428');
    bgGrad.addColorStop(1,   '#020b18');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Prismatic geometric shard facets
    for (let i = 0; i < 35; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 40 + Math.random() * 120;
      const points = 3 + (Math.random() * 4 | 0);

      ctx.beginPath();
      for (let p = 0; p < points; p++) {
        const ang = (p / points) * Math.PI * 2 + (Math.random() * 0.4);
        const px = cx + Math.cos(ang) * (r * (0.6 + Math.random() * 0.4));
        const py = cy + Math.sin(ang) * (r * (0.6 + Math.random() * 0.4));
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const hue = 185 + Math.random() * 60; // cyan to ice blue
      ctx.fillStyle = `hsla(${hue}, 80%, 45%, ${0.08 + Math.random() * 0.12})`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${hue}, 90%, 75%, ${0.2 + Math.random() * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Refracting light shafts
    for (let s = 0; s < 10; s++) {
      const sx = (s / 10) * w + (Math.random() * 40 - 20);
      const lightGrad = ctx.createLinearGradient(sx, 0, sx + 50, h);
      lightGrad.addColorStop(0,   'rgba(200, 240, 255, 0.25)');
      lightGrad.addColorStop(0.5, 'rgba(100, 200, 255, 0.08)');
      lightGrad.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(sx - 15, 0);
      ctx.lineTo(sx + 15, 0);
      ctx.lineTo(sx + 60, h);
      ctx.lineTo(sx - 30, h);
      ctx.closePath();
      ctx.fill();
    }

    // Diamond glint stars
    for (let d = 0; d < 80; d++) {
      const dx = Math.random() * w, dy = Math.random() * h;
      const dr = 1 + Math.random() * 3;
      const glint = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr * 4);
      glint.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      glint.addColorStop(0.5, 'rgba(160, 230, 255, 0.4)');
      glint.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glint;
      ctx.beginPath(); ctx.arc(dx, dy, dr * 4, 0, Math.PI * 2); ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  },

  // ─── Nature Rift interior: lush forest canopy ──────────────────────────────
  _createForestInterior(this: any): THREETypes.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size * 2; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, '#1a4a1a');
    skyGrad.addColorStop(1, '#0d2e0d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.45);

    const groundGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
    groundGrad.addColorStop(0,   '#0a1a0a');
    groundGrad.addColorStop(0.5, '#061206');
    groundGrad.addColorStop(1,   '#040d04');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.4, w, h);

    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const lightGrad = ctx.createLinearGradient(x, 0, x, h * 0.6);
      lightGrad.addColorStop(0, 'rgba(120,200,80,0.15)');
      lightGrad.addColorStop(1, 'rgba(80,160,40,0.0)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(x - 8, 0, 16 + Math.random() * 30, h * 0.6);
    }

    for (let i = 0; i < 14; i++) {
      const tx = Math.random() * w;
      const tw = 12 + Math.random() * 30;
      const th = h * (0.45 + Math.random() * 0.5);
      const treeGrad = ctx.createLinearGradient(tx, h - th, tx, h);
      treeGrad.addColorStop(0, 'rgba(5,20,5,0.8)');
      treeGrad.addColorStop(1, 'rgba(2,10,2,1.0)');
      ctx.fillStyle = treeGrad;
      ctx.fillRect(tx - tw / 2, h - th, tw, th);

      const crownR = tw * (1.8 + Math.random());
      const crownGrad = ctx.createRadialGradient(tx, h - th, 0, tx, h - th, crownR);
      crownGrad.addColorStop(0, 'rgba(10,40,10,0.9)');
      crownGrad.addColorStop(1, 'rgba(5,20,5,0.0)');
      ctx.fillStyle = crownGrad;
      ctx.beginPath(); ctx.arc(tx, h - th, crownR, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = 0; i < 60; i++) {
      const px = Math.random() * w;
      const py = h * 0.3 + Math.random() * h * 0.65;
      const pr = 1 + Math.random() * 2.5;
      const glow = ctx.createRadialGradient(px, py, 0, px, py, pr * 4);
      glow.addColorStop(0, 'rgba(80,255,100,0.6)');
      glow.addColorStop(1, 'rgba(40,200,60,0.0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(px, py, pr * 4, 0, Math.PI * 2); ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  },

  // ─── Elemental Fire interior: molten lava hellscape ────────────────────────
  _createLavaInterior(this: any): THREETypes.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size * 2; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0,    '#0d0000');
    bgGrad.addColorStop(0.3,  '#1a0200');
    bgGrad.addColorStop(0.55, '#2a0500');
    bgGrad.addColorStop(0.75, '#3d0800');
    bgGrad.addColorStop(1,    '#1a0200');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 8; i++) {
      const y = h * (0.55 + Math.random() * 0.45);
      const lavaGrad = ctx.createLinearGradient(0, y - 10, 0, y + 10);
      lavaGrad.addColorStop(0,   'rgba(255,80,0,0.0)');
      lavaGrad.addColorStop(0.5, `rgba(255,${100 + (Math.random() * 80 | 0)},0,0.7)`);
      lavaGrad.addColorStop(1,   'rgba(200,40,0,0.0)');
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(0, y - 12, w, 24);
    }

    for (let i = 0; i < 10; i++) {
      const rx = Math.random() * w;
      const rw = 20 + Math.random() * 60;
      const rh = h * (0.2 + Math.random() * 0.35);
      ctx.fillStyle = `rgba(8,2,2,${0.7 + Math.random() * 0.3})`;
      ctx.fillRect(rx - rw / 2, h - rh, rw, rh);
    }

    for (let i = 0; i < 12; i++) {
      const ex = Math.random() * w;
      const ey = h * (0.6 + Math.random() * 0.4);
      const er = 20 + Math.random() * 60;
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, er);
      eg.addColorStop(0, `rgba(255,${60 + (Math.random() * 80 | 0)},0,0.4)`);
      eg.addColorStop(1, 'rgba(150,20,0,0.0)');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = 0; i < 120; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * h;
      const sr = 0.5 + Math.random() * 1.5;
      const bright = Math.random();
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = sy > h * 0.5
        ? `rgba(255,${100 + (bright * 100 | 0)},0,${bright * 0.8})`
        : `rgba(180,80,20,${bright * 0.25})`;
      ctx.fill();
    }

    const skyGlow = ctx.createRadialGradient(w / 2, h * 0.15, 0, w / 2, h * 0.15, w * 0.5);
    skyGlow.addColorStop(0, 'rgba(200,40,0,0.2)');
    skyGlow.addColorStop(1, 'rgba(100,10,0,0.0)');
    ctx.fillStyle = skyGlow;
    ctx.fillRect(0, 0, w, h * 0.4);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  },

  // ─── Sci-Fi Stargate interior: holographic corridor ────────────────────────
  _createHologramInterior(this: any): THREETypes.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size * 2; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0,   '#000814');
    bgGrad.addColorStop(0.5, '#00101e');
    bgGrad.addColorStop(1,   '#000814');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,200,255,0.22)';
    ctx.lineWidth = 1;
    const vx = w / 2, vy = h / 2;
    const cols = 12, rows = 10;
    for (let i = 0; i <= cols; i++) {
      const sx = (i / cols) * w;
      ctx.beginPath(); ctx.moveTo(sx, 0);  ctx.lineTo(vx, vy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, h);  ctx.lineTo(vx, vy); ctx.stroke();
    }
    for (let i = 1; i <= rows; i++) {
      const t = i / (rows + 1);
      const y1 = vy * t, y2 = h - vy * t;
      const xOff = vx * t;
      ctx.beginPath(); ctx.moveTo(vx - xOff, y1); ctx.lineTo(vx + xOff, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vx - xOff, y2); ctx.lineTo(vx + xOff, y2); ctx.stroke();
    }

    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = 'rgba(0,150,255,0.04)';
      ctx.fillRect(0, y, w, 2);
    }

    for (let i = 0; i < 25; i++) {
      const nx = Math.random() * w, ny = Math.random() * h;
      const nr = 2 + Math.random() * 5;
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr * 6);
      ng.addColorStop(0, 'rgba(0,220,255,0.8)');
      ng.addColorStop(1, 'rgba(0,100,200,0.0)');
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(nx, ny, nr * 6, 0, Math.PI * 2); ctx.fill();
    }

    const cg = ctx.createRadialGradient(vx, vy, 0, vx, vy, h * 0.35);
    cg.addColorStop(0,   'rgba(0,180,255,0.35)');
    cg.addColorStop(0.5, 'rgba(0,80,180,0.15)');
    cg.addColorStop(1,   'rgba(0,20,80,0.0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(vx, vy, h * 0.35, 0, Math.PI * 2); ctx.fill();

    for (let i = 0; i < 200; i++) {
      const sx = Math.random() * w, sy = Math.random() * h;
      ctx.fillStyle = `rgba(100,200,255,${Math.random() * 0.5})`;
      ctx.fillRect(sx, sy, 1, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  },

  // ─── Default 360 Panorama: Twilight Celestial Mountain Horizon ─────────────
  _createDefault360Panorama(this: any): THREETypes.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size * 2; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;

    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0,    '#05081c');
    sky.addColorStop(0.5,  '#1b1338');
    sky.addColorStop(0.85, '#4a1e3a');
    sky.addColorStop(1,    '#d97736');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.55);

    const ground = ctx.createLinearGradient(0, h * 0.5, 0, h);
    ground.addColorStop(0,   '#0d0812');
    ground.addColorStop(0.5, '#060408');
    ground.addColorStop(1,   '#020104');
    ctx.fillStyle = ground;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(0, h * (0.15 + j * 0.05));
      for (let x = 0; x <= w; x += 20) {
        const y = h * (0.15 + j * 0.05) + Math.sin(x * 0.015 + j) * 25 + Math.cos(x * 0.008) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h * 0.4);
      ctx.lineTo(0, h * 0.4);
      ctx.closePath();
      const aurora = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.4);
      aurora.addColorStop(0, 'rgba(0, 255, 170, 0.0)');
      aurora.addColorStop(0.5, `rgba(${j === 1 ? '160, 80, 255' : '40, 240, 180'}, 0.15)`);
      aurora.addColorStop(1, 'rgba(0, 255, 170, 0.0)');
      ctx.fillStyle = aurora;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    for (let x = 0; x <= w; x += 12) {
      const peak = Math.sin(x * 0.012) * 45 + Math.cos(x * 0.025) * 25 + Math.sin(x * 0.05) * 12;
      ctx.lineTo(x, h * 0.52 - Math.max(0, peak));
    }
    ctx.lineTo(w, h * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#080511';
    ctx.fill();

    for (let i = 0; i < 400; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * (h * 0.45);
      const r = Math.random() * 1.2 + 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  },

  _createGradientTexture(this: any, colorA: string, colorB: string): THREETypes.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0,   colorB);
    grad.addColorStop(0.5, colorA);
    grad.addColorStop(1,   colorB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 600; i++) {
      const x    = Math.random() * size;
      const y    = Math.random() * size;
      const r    = Math.random() * 1.5 + 0.3;
      const bright = Math.random();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${bright * 0.9})`;
      ctx.fill();
    }

    for (let i = 0; i < 5; i++) {
      const cx  = Math.random() * size;
      const cy  = Math.random() * size;
      const rx  = 30 + Math.random() * 80;
      const ry  = 20 + Math.random() * 50;
      const hue = Math.random() < 0.5 ? 270 : 210;
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      nebGrad.addColorStop(0, `hsla(${hue},80%,60%,0.15)`);
      nebGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebGrad;
      ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  },

  // ─── AutoReparent helpers (Strategy A) ────────────────────────────────────
  _reparentOcclusionToScene(this: any) {
    const scene = this.el.sceneEl?.object3D as THREETypes.Scene;
    if (!scene || !this._occlusionMesh) return;
    this.el.object3D.remove(this._occlusionMesh);
    scene.add(this._occlusionMesh);
    this._reparentedToScene = true;
  },

  _reparentInteriorToScene(this: any) {
    const scene = this.el.sceneEl?.object3D as THREETypes.Scene;
    if (!scene || !this._interiorSphere) return;
    this._interiorSphere.renderOrder = RENDER_ORDER.INTERIOR;
    scene.add(this._interiorSphere);
  },

  // ─── Particle system ───────────────────────────────────────────────────────
  _createParticles(this: any, theme: PortalTheme, radius: number): THREETypes.Points {
    const count  = theme.particles!.count;
    const geom   = new THREE.BufferGeometry();
    const pos    = new Float32Array(count * 3);
    const vel    = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      pos[i * 3]     = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = 0;
      vel[i * 3]     = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02 + 0.01;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.userData = { vel, radius };

    const mat = new THREE.PointsMaterial({
      color:        new THREE.Color(theme.particles!.color),
      size:         0.015,
      transparent:  true,
      opacity:      0.8,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      sizeAttenuation: true,
    });

    return new THREE.Points(geom, mat);
  },

  _updateParticles(this: any, delta: number) {
    if (!this._particleSystem) return;
    const geom   = this._particleSystem.geometry;
    const pos    = geom.attributes.position.array as Float32Array;
    const vel    = geom.userData.vel as Float32Array;
    const radius = geom.userData.radius as number;
    const count  = pos.length / 3;
    const speed  = (this._theme as PortalTheme)?.particles?.speed ?? 0.3;

    for (let i = 0; i < count; i++) {
      pos[i * 3]     += vel[i * 3]     * speed * delta / 16;
      pos[i * 3 + 1] += vel[i * 3 + 1] * speed * delta / 16;
      pos[i * 3 + 2] += vel[i * 3 + 2] * speed * delta / 16;

      const dx = pos[i * 3], dy = pos[i * 3 + 1];
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d > radius + 0.4 || Math.abs(pos[i * 3 + 2]) > 0.5) {
        const angle    = Math.random() * Math.PI * 2;
        pos[i * 3]     = Math.cos(angle) * radius;
        pos[i * 3 + 1] = Math.sin(angle) * radius;
        pos[i * 3 + 2] = 0;
      }
    }
    geom.attributes.position.needsUpdate = true;
  },

  // ─── Walk-through detection ────────────────────────────────────────────────
  _checkWalkThrough(this: any) {
    const camera = this.el.sceneEl?.camera as THREETypes.Camera;
    if (!camera) return;

    this.el.object3D.getWorldPosition(this._worldPos);
    this.el.object3D.getWorldQuaternion(this._worldQuat);

    // Local -Z direction after orientation = portal forward facing normal
    this._portalNormal.set(0, 0, -1).applyQuaternion(this._worldQuat).normalize();

    camera.getWorldPosition(this._cameraPos);

    this._tempVec.copy(this._cameraPos).sub(this._worldPos);
    const currentDot = this._tempVec.dot(this._portalNormal);

    const radialDist = this._tempVec.clone().sub(
      this._portalNormal.clone().multiplyScalar(currentDot)
    ).length();

    const radius = this.data.radius as number;
    const isInCylinder = radialDist < radius * 1.1; // 10% radial tolerance
    const isNowInFront = currentDot > 0;

    // Initialize baseline on first frame without firing
    if (this._wasInFront === null) {
      this._wasInFront = isNowInFront;
      return;
    }

    const now = performance.now();
    const canTransition = (now - this._lastCrossingTime) > 600; // debounce threshold

    // Detect sign flip crossing the portal plane inside the cylinder
    if (isInCylinder && Math.abs(currentDot) < 0.8 && isNowInFront !== this._wasInFront && canTransition) {
      const goingThrough = this._wasInFront && !isNowInFront;
      const comingBack   = !this._wasInFront && isNowInFront;

      if (goingThrough && !this._isInsidePortal) {
        this._isInsidePortal = true;
        this._lastCrossingTime = now;
        this.el.emit('portal-entered', { portalId: this._portalId });
        this._onEnterPortal();
      } else if (comingBack && this._isInsidePortal) {
        this._isInsidePortal = false;
        this._lastCrossingTime = now;
        this.el.emit('portal-exited', { portalId: this._portalId });
        this._onExitPortal();
      }
    }

    this._wasInFront = isNowInFront;
  },

  _onEnterPortal(this: any) {
    if (this._interiorMat) {
      this._interiorMat.stencilFunc = THREE.AlwaysStencilFunc;
      this._interiorMat.needsUpdate = true;
    }
    const overlay = document.getElementById('transition-overlay');
    if (overlay) {
      overlay.style.opacity = '1';
      setTimeout(() => { overlay.style.opacity = '0'; }, 300);
    }
    this.el.sceneEl?.emit('portal-world-enter', { themeId: (this._theme as PortalTheme).id });
  },

  _onExitPortal(this: any) {
    if (this._interiorMat) {
      this._interiorMat.stencilFunc = THREE.EqualStencilFunc;
      this._interiorMat.needsUpdate = true;
    }
    const overlay = document.getElementById('transition-overlay');
    if (overlay) {
      overlay.style.opacity = '1';
      setTimeout(() => { overlay.style.opacity = '0'; }, 300);
    }
    this.el.sceneEl?.emit('portal-world-exit', { themeId: (this._theme as PortalTheme).id });
  },

  // ─── Theme switching ───────────────────────────────────────────────────────
  switchTheme(this: any, themeId: string) {
    const newTheme = getTheme(themeId);
    this._theme = newTheme;

    if (this._rimMaterial) {
      swapRimShader(this._rimMaterial, newTheme.rimShaderKey);
      setRimColor(this._rimMaterial, newTheme.rimColor, newTheme.rimIntensity);
    }

    this._applyInteriorStyle(newTheme);

    this._audio?.destroy();
    this._audio = new PortalAudioController({
      ambient: newTheme.audio.ambient,
      stinger: newTheme.audio.stinger,
      enabled: true,
    });
    this._audio.preload();

    saveTheme(themeId);
    this.el.emit('theme-changed', { themeId });
  },

  // ─── Tick ─────────────────────────────────────────────────────────────────
  tick(this: AFrameComponentInst, _time: number, delta: number) {
    const self = this as any;
    const t = (performance.now() - self._startTime) / 1000;

    // Read real WebXR lighting estimation tint if available
    const lightEstComp = this.el.sceneEl?.components?.['lighting-estimation'] as any;
    const lightTint = lightEstComp?.lightColor as THREETypes.Color | undefined;

    // Advance transition animation
    if (self._transition) {
      const progress = (self._transition as PortalTransition).tick(delta);
      if (self._rimMaterial) {
        updateRimUniforms(self._rimMaterial, t, progress, lightTint);
      }
    } else if (self._rimMaterial) {
      updateRimUniforms(self._rimMaterial, t, 1.0, lightTint);
    }

    // Update particles
    self._updateParticles(delta);

    // Walk-through detection (once per frame)
    self._checkWalkThrough();

    // AutoReparent: sync occlusion mesh world transform
    if (self._reparentedToScene && self._occlusionMesh) {
      self.el.object3D.getWorldPosition(self._occlusionMesh.position);
      self.el.object3D.getWorldQuaternion(self._occlusionMesh.quaternion);
      self.el.object3D.getWorldScale(self._occlusionMesh.scale);
      self._occlusionMesh.updateMatrix();
    }

    // Update interior sphere position to follow camera
    if (self._interiorSphere && self._interiorSphere.visible) {
      const camera = this.el.sceneEl?.camera as THREETypes.Camera;
      if (camera) {
        camera.getWorldPosition(self._cameraPos);
        self._interiorSphere.position.copy(self._cameraPos);
      }
    }

    // Update spatial audio position
    const wp = self._worldPos;
    self.el.object3D.getWorldPosition(wp);
    self._audio?.updatePosition(wp.x, wp.y, wp.z);
  },

  // ─── Remove / cleanup ─────────────────────────────────────────────────────
  remove(this: AFrameComponentInst) {
    const self = this as any;

    // 1. Free the stencil ID back to the pool
    freePortalId(self._portalId);

    // 2. Clean up autoReparented meshes from scene root
    const scene = this.el.sceneEl?.object3D as THREETypes.Scene;
    if (self._reparentedToScene && scene) {
      if (self._occlusionMesh) scene.remove(self._occlusionMesh);
      if (self._interiorSphere) scene.remove(self._interiorSphere);
    }

    // 3. Remove meshes from root entity
    const root = this.el.object3D;
    if (self._occlusionMesh) root.remove(self._occlusionMesh);
    if (self._rimMesh) root.remove(self._rimMesh);
    if (self._interiorSphere) root.remove(self._interiorSphere);
    if (self._particleSystem) root.remove(self._particleSystem);

    // 4. Explicit disposal of all GPU geometries, materials, and textures
    self._occlusionMesh?.geometry?.dispose();
    self._occlusionMesh?.material?.dispose();

    self._rimMesh?.geometry?.dispose();
    self._rimMaterial?.dispose();

    self._interiorSphere?.geometry?.dispose();
    self._interiorMat?.dispose();
    self._interiorTex?.dispose();

    self._particleSystem?.geometry?.dispose();
    self._particleSystem?.material?.dispose();

    // 5. Stop and disconnect all audio nodes
    self._audio?.destroy();

    // 6. Clear references
    self._occlusionMesh = null;
    self._rimMesh = null;
    self._interiorSphere = null;
    self._particleSystem = null;
    self._rimMaterial = null;
    self._interiorMat = null;
    self._interiorTex = null;
    self._audio = null;
    self._transition = null;
  },

  open(this: any)  { this._openPortal(); },
  close(this: any) { this.closePortal(); },
});
