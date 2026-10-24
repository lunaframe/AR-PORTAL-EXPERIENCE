/**
 * portal-rim-shader.ts
 *
 * Manages creation and updating of THREE.ShaderMaterials for portal rim effects.
 * Each theme maps to a GLSL fragment shader; all share the same vertex shader.
 *
 * Usage:
 *   const mat = createRimMaterial('wormhole', [0.4, 0.1, 1.0], 2.5);
 *   updateRimUniforms(mat, time, progress, lightTint);
 */

import type * as THREETypes from 'three';
import { THREE } from '../utils/three';
import { RIM_VERTEX_SHADER } from '../shaders/rim-vertex';

// Import fragment shaders as strings via vite-plugin-glsl
import wormholeGlsl      from '../shaders/wormhole-rim.glsl';
import glassShatterGlsl  from '../shaders/glass-shatter.glsl';
import glowGlsl          from '../shaders/glow-rim.glsl';
import natureGlsl        from '../shaders/nature-rim.glsl';
import scifiGlsl         from '../shaders/scifi-rim.glsl';
import fireGlsl          from '../shaders/elemental-fire.glsl';

export type RimShaderKey = 'wormhole' | 'glass-shatter' | 'glow' | 'nature' | 'scifi' | 'fire';

export const FRAG_SHADERS: Record<RimShaderKey, string> = {
  'wormhole':      wormholeGlsl,
  'glass-shatter': glassShatterGlsl,
  'glow':          glowGlsl,
  'nature':        natureGlsl,
  'scifi':         scifiGlsl,
  'fire':          fireGlsl,
};

/**
 * Rim material uniforms — updated every frame via updateRimUniforms().
 */
export interface RimUniforms {
  u_time:         { value: number };
  u_rimColor:     { value: THREETypes.Color };
  u_rimIntensity: { value: number };
  u_progress:     { value: number };    // 0=closed, 1=open
  u_lightTint:    { value: THREETypes.Color }; // from WebXR lighting estimation
  [uniform: string]: { value: any };
}

/**
 * Create a THREE.ShaderMaterial for the given rim shader key.
 */
export function createRimMaterial(
  shaderKey: RimShaderKey,
  rimColor: [number, number, number],
  intensity: number,
): THREETypes.ShaderMaterial {
  const uniforms: RimUniforms = {
    u_time:         { value: 0 },
    u_rimColor:     { value: new THREE.Color(rimColor[0], rimColor[1], rimColor[2]) },
    u_rimIntensity: { value: intensity },
    u_progress:     { value: 0 },
    u_lightTint:    { value: new THREE.Color(1, 1, 1) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader:   RIM_VERTEX_SHADER,
    fragmentShader: FRAG_SHADERS[shaderKey],
    transparent:    true,
    depthWrite:     false,
    side:           THREE.DoubleSide,
    blending:       THREE.AdditiveBlending,
  });

  return mat;
}

/**
 * Update time-varying uniforms each tick.
 * Call from portal-core's tick() with the current elapsed time.
 */
export function updateRimUniforms(
  mat: THREETypes.ShaderMaterial,
  timeSeconds: number,
  progress: number,
  lightTint?: THREETypes.Color,
): void {
  const u = mat.uniforms as RimUniforms;
  if (!u) return;
  if (u.u_time) u.u_time.value = timeSeconds;
  if (u.u_progress) u.u_progress.value = progress;
  if (lightTint && u.u_lightTint) {
    u.u_lightTint.value.copy(lightTint);
  }
}

/**
 * Swap the rim shader on an existing material (for live theme switching).
 */
export function swapRimShader(mat: THREETypes.ShaderMaterial, shaderKey: RimShaderKey): void {
  mat.fragmentShader = FRAG_SHADERS[shaderKey];
  mat.needsUpdate    = true;
}

/**
 * Update rim color and intensity (e.g. on theme switch).
 */
export function setRimColor(
  mat: THREETypes.ShaderMaterial,
  rimColor: [number, number, number],
  intensity: number,
): void {
  const u = mat.uniforms as RimUniforms;
  if (!u) return;
  if (u.u_rimColor) u.u_rimColor.value.setRGB(rimColor[0], rimColor[1], rimColor[2]);
  if (u.u_rimIntensity) u.u_rimIntensity.value = intensity;
}

/**
 * Startup self-test (dev mode):
 * Pre-compiles all registered rim shaders against the renderer to ensure zero shader
 * compilation or linking errors occur at runtime.
 */
export function validateRimShaders(renderer: THREETypes.WebGLRenderer): void {
  console.log('[shader-validation] Starting dev startup self-test for all rim shaders...');
  const testScene = new THREE.Scene();
  const testCamera = new THREE.PerspectiveCamera();
  const geom = new THREE.BufferGeometry();
  const keys = Object.keys(FRAG_SHADERS) as RimShaderKey[];

  for (const key of keys) {
    const mat = createRimMaterial(key, [1, 1, 1], 1);
    const mesh = new THREE.Mesh(geom, mat);
    testScene.add(mesh);

    try {
      renderer.compile(testScene, testCamera);
      console.log(`[shader-validation] ✓ ${key} shader compiled successfully`);
    } catch (err) {
      console.error(`[shader-validation] ✗ ${key} failed compilation:`, err);
      throw err;
    } finally {
      testScene.remove(mesh);
      mat.dispose();
    }
  }

  geom.dispose();
  console.log('[shader-validation] All 6 rim shaders passed compilation self-test.');
}
