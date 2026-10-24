/**
 * render-order.ts
 *
 * Centralized render-order constants and stencil ID allocation for the portal system.
 *
 * ─── Why render order matters for portals ────────────────────────────────────
 *
 * Three.js sorts objects within the same renderOrder by depth (front-to-back
 * for opaques, back-to-front for transparents). The portal trick relies on a
 * precise sequence:
 *
 *   1. OCCLUSION (renderOrder=0)
 *      A circle mesh that writes to the stencil buffer (stencilRef = portalId)
 *      but produces NO color output (colorWrite: false). Also writes to the
 *      depth buffer, so the real-world AR passthrough behind the portal is
 *      occluded. This "stamps" the portal shape into the stencil.
 *
 *   2. INTERIOR (renderOrder=1)
 *      The sky sphere / virtual environment. Uses stencilFunc=EQUAL so it only
 *      renders where the stencil contains the correct portalId. Result: you
 *      see the virtual world through the portal hole.
 *
 *   3. RIM (renderOrder=2)
 *      The animated edge shader (wormhole swirl, glass cracks, etc.). Additive
 *      blending over the stencil boundary — visible both on the edge of the
 *      portal and in the real world (additive blend goes over everything).
 *
 *   4. PARTICLES (renderOrder=3)
 *      Emitters just outside the rim. Additive so they glow beautifully.
 *
 *   5. UI (renderOrder=10)
 *      In-scene 3D menu panels, always on top.
 */

export const RENDER_ORDER = {
  /** Stencil write mesh — must render before any interior or rim content. */
  OCCLUSION: 0,
  /** Interior sky sphere / environment (stencil test = EQUAL). */
  INTERIOR: 1,
  /** Rim / edge shader (additive blending over boundary). */
  RIM: 2,
  /** Particle systems emitting from rim. */
  PARTICLES: 3,
  /** In-scene 3D UI panels. */
  UI: 10,
} as const;

/**
 * Maximum simultaneous portals. WebGL stencil buffer is 8-bit (0–255).
 * We reserve 0 for "no portal", and slots 1–8 for active portals.
 * In practice 8 is a safe upper bound for mobile GPU fill-rate.
 */
export const MAX_PORTALS = 8;

/** Active allocated stencil slots. */
const _activeSlots = new Set<number>();

/**
 * Check if a new portal ID can be allocated without hitting the MAX_PORTALS limit.
 */
export function canAllocatePortalId(): boolean {
  return _activeSlots.size < MAX_PORTALS;
}

/**
 * Return current count of active allocated portals.
 */
export function getActivePortalCount(): number {
  return _activeSlots.size;
}

/**
 * Return array of active portal IDs.
 */
export function getActivePortalIds(): number[] {
  return Array.from(_activeSlots).sort((a, b) => a - b);
}

/**
 * Allocate a unique stencil reference for a new portal (1–8).
 * Never silently reuses an active ID. Throws if pool is full.
 */
export function allocatePortalId(): number {
  if (_activeSlots.size >= MAX_PORTALS) {
    throw new Error(`[portal] Maximum simultaneous portals (${MAX_PORTALS}) reached.`);
  }

  // Find lowest available slot in 1..MAX_PORTALS
  for (let slot = 1; slot <= MAX_PORTALS; slot++) {
    if (!_activeSlots.has(slot)) {
      _activeSlots.add(slot);
      return slot;
    }
  }

  throw new Error(`[portal] Stencil pool exhausted.`);
}

/**
 * Release a portal ID back into the pool.
 */
export function freePortalId(id: number): void {
  if (id >= 1 && id <= MAX_PORTALS) {
    _activeSlots.delete(id);
  }
}

/**
 * Reset all portal IDs (used during scene reset or memory testing).
 */
export function resetPortalIds(): void {
  _activeSlots.clear();
}
