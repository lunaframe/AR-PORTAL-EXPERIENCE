/**
 * vortexSurface.js — Effect 1: Vortex Surface & Event Horizon
 * Implements domain-warped FBM swirl surface with audio reactivity and stencil masking.
 */

import * as THREE from 'three';
import { VortexVertexShader, VortexFragmentShader } from '../../portal/shaders/vortexShader.js';

export class VortexSurfaceEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.stencilMaskMesh = null;
    this.openProgress = 0.0;
    this.intensity = 1.0;
    this.radius = 0.95;
  }

  init(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Geometry: High-density circle plane
    this.geometry = new THREE.CircleGeometry(this.radius, 64);

    // Uniforms
    this.uniforms = {
      uTime: { value: 0 },
      uOpenProgress: { value: 0.0 },
      uAudioBass: { value: 0.0 },
      uAudioTreble: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uProximity: { value: 0.0 },
      uColorPrimary: { value: new THREE.Color(0x1b1464) },
      uColorSecondary: { value: new THREE.Color(0x6d28d9) },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorAccent2: { value: new THREE.Color(0xff3cac) },
      uColorHighlight: { value: new THREE.Color(0xe8f7ff) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: VortexVertexShader,
      fragmentShader: VortexFragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(0, 1.2, 0.005); // Centered on portal doorway
    this.portalGroup.add(this.mesh);

    // Stencil Mask Plane (Aperture into Twilight World)
    // Writes ref: 1 to stencil buffer without drawing color or depth
    const maskGeom = new THREE.CircleGeometry(this.radius - 0.02, 64);
    const maskMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilZPass: THREE.ReplaceStencilOp,
    });
    this.stencilMaskMesh = new THREE.Mesh(maskGeom, maskMat);
    this.stencilMaskMesh.position.set(0, 1.2, 0.0);
    this.stencilMaskMesh.renderOrder = 0; // Drawn before twilight world
    this.portalGroup.add(this.stencilMaskMesh);
  }

  setOpenProgress(progress) {
    this.openProgress = Math.max(0, Math.min(1.0, progress));
    if (this.uniforms) {
      this.uniforms.uOpenProgress.value = this.openProgress;
    }
    if (this.stencilMaskMesh) {
      const s = Math.max(0.001, this.openProgress);
      this.stencilMaskMesh.scale.set(s, s, 1);
    }
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.uniforms) {
      this.uniforms.uIntensity.value = val;
    }
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorPrimary.value.setRGB(theme.primary.r, theme.primary.g, theme.primary.b);
    this.uniforms.uColorSecondary.value.setRGB(theme.secondary.r, theme.secondary.g, theme.secondary.b);
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorAccent2.value.setRGB(theme.accent2.r, theme.accent2.g, theme.accent2.b);
    this.uniforms.uColorHighlight.value.setRGB(theme.highlight.r, theme.highlight.g, theme.highlight.b);
  }

  setQuality(level) {
    // Quality scaling on geometry density if needed
  }

  update(dt, time, state) {
    if (!this.mesh) return;

    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;
    this.uniforms.uAudioTreble.value = state.audio?.treble || 0;
    this.uniforms.uProximity.value = state.proximity || 0;

    // Subtle breathing pulse
    const breath = 1.0 + 0.025 * Math.sin(time * 2.2) + (state.audio?.bass || 0) * 0.05;
    this.mesh.scale.set(breath, breath, 1);
  }

  dispose() {
    if (this.mesh) {
      this.portalGroup.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
      this.mesh = null;
    }
    if (this.stencilMaskMesh) {
      this.portalGroup.remove(this.stencilMaskMesh);
      this.stencilMaskMesh.geometry?.dispose();
      this.stencilMaskMesh.material?.dispose();
      this.stencilMaskMesh = null;
    }
  }
}
