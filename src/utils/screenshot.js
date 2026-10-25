/**
 * screenshot.js — High Resolution Screenshot Exporter with Watermark & Shutter Effect
 */

import { audioEngine } from '../audio/engine.js';

export async function captureScreenshot(renderer, videoElement = null, onFlash = null) {
  onFlash?.();
  audioEngine.playUiClick();

  // Create composite canvas
  const canvas = document.createElement('canvas');
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // If rear camera video is active in fallback mode, draw it first
  if (videoElement && videoElement.videoWidth && videoElement.style.display !== 'none') {
    ctx.drawImage(videoElement, 0, 0, w, h);
  } else {
    // Fill deep night background
    ctx.fillStyle = '#0B1026';
    ctx.fillRect(0, 0, w, h);
  }

  // Draw WebGL scene
  ctx.drawImage(renderer.domElement, 0, 0, w, h);

  // Draw sleek watermark banner
  const bannerHeight = Math.max(48, Math.round(h * 0.055));
  const grad = ctx.createLinearGradient(0, h - bannerHeight, 0, h);
  grad.addColorStop(0, 'rgba(11, 16, 38, 0)');
  grad.addColorStop(1, 'rgba(11, 16, 38, 0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - bannerHeight, w, bannerHeight);

  // Watermark text
  const fontSize = Math.max(16, Math.round(w * 0.022));
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#14f1d9';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦ TWILIGHT PORTAL', 24, h - bannerHeight / 2);

  ctx.font = `400 ${fontSize * 0.8}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = 'rgba(232, 247, 255, 0.7)';
  ctx.textAlign = 'right';
  ctx.fillText('WebXR Portal Experience', w - 24, h - bannerHeight / 2);

  // Export blob
  canvas.toBlob(async (blob) => {
    if (!blob) return;

    // Use Web Share API if available on mobile
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'twilight-portal.png', { type: 'image/png' })] })) {
      try {
        await navigator.share({
          title: 'Twilight Portal Capture',
          files: [new File([blob], 'twilight-portal.png', { type: 'image/png' })],
        });
        return;
      } catch (err) {
        console.debug('Share cancelled or not supported, falling back to download');
      }
    }

    // Direct download anchor
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twilight-portal-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}
