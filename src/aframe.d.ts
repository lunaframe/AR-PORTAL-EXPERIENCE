// aframe.d.ts — Type declarations for A-Frame (CDN-loaded global) and ambient globals
// A-Frame is NOT imported as an npm module — it attaches to window as AFRAME and window.THREE

import type * as THREETypes from 'three';

declare global {
  // ── A-Frame global ──────────────────────────────────────────────────────────
  const AFRAME: {
    registerComponent(name: string, def: AFrameComponentDef): void;
    registerSystem(name: string, def: Record<string, unknown>): void;
    registerShader(name: string, def: Record<string, unknown>): void;
    registerGeometry(name: string, def: Record<string, unknown>): void;
    THREE: typeof THREETypes;
    version: string;
    components: Record<string, unknown>;
    systems:    Record<string, unknown>;
    utils: {
      entity: { getComponentProperty(el: AFrameEntity, comp: string, prop?: string): unknown };
      coordinates: {
        parse(v: string): { x: number; y: number; z: number };
        stringify(v: { x: number; y: number; z: number }): string;
      };
    };
  };

  // ── Component definition shape ────────────────────────────────────────────
  interface AFrameComponentDef {
    schema?:    Record<string, AFrameSchemaItem>;
    multiple?:  boolean;
    data?:      Record<string, unknown>;
    el?:        AFrameEntity;
    system?:    unknown;
    init?(this: AFrameComponentInst):   void;
    update?(this: AFrameComponentInst, oldData: Record<string, unknown>): void;
    tick?(this: AFrameComponentInst,   time: number, delta: number): void;
    tock?(this: AFrameComponentInst,   time: number, delta: number): void;
    remove?(this: AFrameComponentInst): void;
    pause?(this:  AFrameComponentInst): void;
    play?(this:   AFrameComponentInst): void;
    [key: string]: unknown;
  }

  interface AFrameSchemaItem {
    type?:    'string'|'number'|'boolean'|'vec3'|'vec2'|'color'|'asset'|'selector'|'int'|'array';
    default?: unknown;
    oneOf?:   unknown[];
    min?:     number;
    max?:     number;
  }

  interface AFrameComponentInst {
    el:     AFrameEntity;
    data:   Record<string, unknown>;
    schema: Record<string, AFrameSchemaItem>;
    system: unknown;
    [key: string]: unknown;
  }

  // ── Entity / Scene ─────────────────────────────────────────────────────────
  interface AFrameEntity extends HTMLElement {
    object3D:   THREETypes.Object3D;
    object3DMap: Record<string, THREETypes.Object3D>;
    components: Record<string, AFrameComponentInst>;
    sceneEl:    AFrameScene;
    isPlaying:  boolean;
    hasLoaded:  boolean;
    getObject3D(type: string): THREETypes.Object3D | undefined;
    setObject3D(type: string, obj: THREETypes.Object3D): void;
    removeObject3D(type: string): void;
    setAttribute(name: string, val: unknown, prop?: string): void;
    getAttribute(name: string): unknown;
    addState(state: string): void;
    removeState(state: string): void;
    is(state: string): boolean;
    emit(event: string, detail?: unknown, bubbles?: boolean): void;
    addEventListener(type: string, cb: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions): void;
  }

  interface AFrameScene extends AFrameEntity {
    xrSession:  XRSession | null;
    frame:      XRFrame | null;
    renderer:   THREETypes.WebGLRenderer & { xr: THREETypes.WebXRManager };
    camera:     THREETypes.Camera;
    object3D:   THREETypes.Scene;
    systems:    Record<string, unknown>;
  }
}

// Ensure vite-plugin-glsl .glsl imports are typed as string
declare module '*.glsl' {
  const src: string;
  export default src;
}
