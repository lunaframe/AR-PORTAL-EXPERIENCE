/**
 * three.ts — Shared Three.js instance aliased to AFRAME.THREE
 *
 * CRITICAL ARCHITECTURE RULE:
 * Never import * as THREE from 'three' in runtime component logic.
 * A-Frame bundles its own Three.js instance and attaches it to window.AFRAME.THREE.
 * Importing 'three' as a separate ES module causes duplicate Three.js instances,
 * which breaks `instanceof` checks, stencil buffer application, and raycasting.
 *
 * All runtime modules must import THREE from this file.
 */

import type * as THREETypes from 'three';

export const THREE: typeof THREETypes = (
  typeof window !== 'undefined' &&
  ((window as any).AFRAME?.THREE || (window as any).THREE)
) as typeof THREETypes;
