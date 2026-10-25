/**
 * textures.js — Procedural Canvas Texture Generator
 * Generates high quality soft sprites, glows, runes, flares, and smoke
 * completely on HTML5 Canvas without any external image files.
 */

import * as THREE from 'three';

const textureCache = new Map();

/**
 * Creates a soft radial glowing circular particle texture with cubic smoothstep falloff
 */
export function createSoftGlowTexture(size = 128) {
  const key = `glow_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.15, 'rgba(235, 245, 255, 0.85)');
  gradient.addColorStop(0.45, 'rgba(46, 242, 208, 0.35)');
  gradient.addColorStop(0.8, 'rgba(109, 40, 217, 0.1)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates a starburst spark texture with 4-point light diffraction spikes
 */
export function createSparkTexture(size = 128) {
  const key = `spark_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  // Center core
  const coreGrad = ctx.createRadialGradient(center, center, 0, center, center, center * 0.4);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.5, 'rgba(255, 215, 240, 0.6)');
  coreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, size, size);

  // Horizontal streak
  const hGrad = ctx.createLinearGradient(0, center, size, center);
  hGrad.addColorStop(0, 'rgba(255, 60, 172, 0)');
  hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  hGrad.addColorStop(1.0, 'rgba(20, 241, 217, 0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, center - 2, size, 4);

  // Vertical streak
  const vGrad = ctx.createLinearGradient(center, 0, center, size);
  vGrad.addColorStop(0, 'rgba(255, 60, 172, 0)');
  vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  vGrad.addColorStop(1.0, 'rgba(20, 241, 217, 0)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(center - 2, 0, 4, size);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates an ancient glowing rune symbol texture
 */
export function createRuneTexture(index = 0, size = 128) {
  const key = `rune_${index}_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Soft background glow
  const bgGrad = ctx.createRadialGradient(center, center, 0, center, center, center * 0.9);
  bgGrad.addColorStop(0, 'rgba(20, 241, 217, 0.25)');
  bgGrad.addColorStop(0.7, 'rgba(109, 40, 217, 0.08)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Draw intricate mystical glyph lines
  ctx.save();
  ctx.translate(center, center);
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#14f1d9';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const runeShapes = [
    // Rune 0: Algiz / Elk Horn
    () => {
      ctx.beginPath();
      ctx.moveTo(0, -32); ctx.lineTo(0, 32);
      ctx.moveTo(0, -10); ctx.lineTo(-24, -32);
      ctx.moveTo(0, -10); ctx.lineTo(24, -32);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
    },
    // Rune 1: Othala / Celestial Eye
    () => {
      ctx.beginPath();
      ctx.moveTo(-20, 28); ctx.lineTo(0, -20); ctx.lineTo(20, 28);
      ctx.moveTo(-24, 0); ctx.lineTo(24, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -2, 10, 0, Math.PI * 2);
      ctx.stroke();
    },
    // Rune 2: Sowilo / Sun Bolt
    () => {
      ctx.beginPath();
      ctx.moveTo(18, -30); ctx.lineTo(-12, -8); ctx.lineTo(12, 8); ctx.lineTo(-18, 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0.4, 2.7);
      ctx.stroke();
    },
    // Rune 3: Tiwaz / Cosmic Arrow
    () => {
      ctx.beginPath();
      ctx.moveTo(0, -32); ctx.lineTo(0, 32);
      ctx.moveTo(-22, -14); ctx.lineTo(0, -32); ctx.lineTo(22, -14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 16, 14, 0, Math.PI * 2);
      ctx.stroke();
    },
    // Rune 4: Dagaz / Infinite Dawn
    () => {
      ctx.beginPath();
      ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.lineTo(22, -22); ctx.lineTo(-22, 22);
      ctx.closePath();
      ctx.stroke();
    },
    // Rune 5: Kenaz / Torch
    () => {
      ctx.beginPath();
      ctx.moveTo(-16, -28); ctx.lineTo(-16, 28);
      ctx.moveTo(-16, 0); ctx.lineTo(22, -24);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4, 12, 12, 0, Math.PI * 2);
      ctx.stroke();
    },
    // Rune 6: Ingwaz / Gate Diamond
    () => {
      ctx.beginPath();
      ctx.moveTo(0, -28); ctx.lineTo(24, 0); ctx.lineTo(0, 28); ctx.lineTo(-24, 0);
      ctx.closePath();
      ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
      ctx.stroke();
    },
    // Rune 7: Mystic Spiral
    () => {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.2) {
        const r = 2 + a * 2.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  ];

  const drawFn = runeShapes[index % runeShapes.length];
  drawFn();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Creates a soft volumetric smoke cloud puff texture
 */
export function createSmokeTexture(size = 128) {
  const key = `smoke_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;

  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, 'rgba(232, 247, 255, 0.45)');
  grad.addColorStop(0.35, 'rgba(109, 40, 217, 0.2)');
  grad.addColorStop(0.7, 'rgba(27, 20, 100, 0.08)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Anamorphic horizontal lens flare streak texture
 */
export function createFlareStreakTexture(width = 512, height = 64) {
  const key = `flare_${width}x${height}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const cx = width / 2;
  const cy = height / 2;

  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, width / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.1, 'rgba(20, 241, 217, 0.8)');
  grad.addColorStop(0.4, 'rgba(255, 60, 172, 0.35)');
  grad.addColorStop(0.8, 'rgba(109, 40, 217, 0.1)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(key, texture);
  return texture;
}
