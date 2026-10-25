/**
 * portal.js — Master Portal Assembly & Complete Effects Coordinator
 * Integrates Groups A, B, C, D, E into one unified, production-grade WebXR experience.
 */

import * as THREE from 'three';

// Group A: Portal Core
import { VortexSurfaceEffect } from '../effects/core/vortexSurface.js';
import { EnergyRingEffect } from '../effects/core/energyRing.js';
import { OrbitingRunesEffect } from '../effects/core/orbitingRunes.js';
import { GravityLensEffect } from '../effects/core/gravityLens.js';
import { LightningTendrilsEffect } from '../effects/core/lightningTendrils.js';
import { PortalSequenceController } from '../effects/core/portalSequence.js';

// Group B: Particles
import { SpiralSparksEffect } from '../effects/particles/spiralSparks.js';
import { BioluminescentSporesEffect } from '../effects/particles/bioluminescentSpores.js';
import { FirefliesEffect } from '../effects/particles/fireflies.js';
import { RisingEmbersEffect } from '../effects/particles/risingEmbers.js';
import { DustMotesEffect } from '../effects/particles/dustMotes.js';
import { PetalSwirlEffect } from '../effects/particles/petalSwirl.js';
import { InteractiveBurstEffect } from '../effects/particles/interactiveBurst.js';
import { RibbonTrailEffect } from '../effects/particles/ribbonTrail.js';

// Group C: Light and Atmosphere
import { GodRaysEffect } from '../effects/lighting/godRays.js';
import { FloorGlowEffect } from '../effects/lighting/floorGlow.js';
import { PortalPointLightEffect } from '../effects/lighting/portalPointLight.js';
import { VolumetricFogEffect } from '../effects/lighting/volumetricFog.js';
import { ProximityGradingEffect } from '../effects/lighting/proximityGrading.js';
import { LensFlareEffect } from '../effects/lighting/lensFlare.js';
import { FakeCausticsEffect } from '../effects/lighting/fakeCaustics.js';
import { LightEstimationEffect } from '../effects/lighting/lightEstimation.js';

// Group D: The Twilight World (Virtual Realm)
import { TwilightWorld } from '../world/twilightWorld.js';

import { audioEngine } from '../audio/engine.js';

export class Portal {
  constructor(scene, camera, renderer, effectsManager) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.effectsManager = effectsManager;

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.visible = false;

    this.isPlaced = false;
    this.isOpen = false;
    this.scale = 1.0;
    this.radius = 0.95;

    // Crossing state tracking
    this.isInsideVirtual = false;
    this.lastSide = 1; // +1 outside in front, -1 inside behind

    // Callbacks
    this.onRealmTransition = null;

    // ─── Group A: Portal Core ──────────────────────────────────────────
    this.vortex = new VortexSurfaceEffect(this.group);
    this.energyRing = new EnergyRingEffect(this.group);
    this.orbitingRunes = new OrbitingRunesEffect(this.group);
    this.gravityLens = new GravityLensEffect(this.group);
    this.lightningTendrils = new LightningTendrilsEffect(this.group);
    this.sequence = new PortalSequenceController(this.group, this.vortex);

    this.effectsManager.register('core_vortex', 'core', this.vortex);
    this.effectsManager.register('core_ring', 'core', this.energyRing);
    this.effectsManager.register('core_runes', 'core', this.orbitingRunes);
    this.effectsManager.register('core_lens', 'core', this.gravityLens);
    this.effectsManager.register('core_lightning', 'core', this.lightningTendrils);
    this.effectsManager.register('core_sequence', 'core', this.sequence);

    // ─── Group B: Particles ─────────────────────────────────────────────
    this.spiralSparks = new SpiralSparksEffect(this.group);
    this.spores = new BioluminescentSporesEffect(this.scene);
    this.fireflies = new FirefliesEffect(this.scene);
    this.risingEmbers = new RisingEmbersEffect(this.group);
    this.dustMotes = new DustMotesEffect(this.group);
    this.petalSwirl = new PetalSwirlEffect(this.group);
    this.interactiveBurst = new InteractiveBurstEffect(this.scene);
    this.ribbonTrail = new RibbonTrailEffect(this.scene);

    this.effectsManager.register('part_spiral', 'particles', this.spiralSparks);
    this.effectsManager.register('part_spores', 'particles', this.spores);
    this.effectsManager.register('part_fireflies', 'particles', this.fireflies);
    this.effectsManager.register('part_embers', 'particles', this.risingEmbers);
    this.effectsManager.register('part_dust', 'particles', this.dustMotes);
    this.effectsManager.register('part_petals', 'particles', this.petalSwirl);
    this.effectsManager.register('part_burst', 'particles', this.interactiveBurst);
    this.effectsManager.register('part_ribbon', 'particles', this.ribbonTrail);

    // ─── Group C: Light and Atmosphere ──────────────────────────────────
    this.godRays = new GodRaysEffect(this.group);
    this.floorGlow = new FloorGlowEffect(this.group);
    this.portalLight = new PortalPointLightEffect(this.group);
    this.volumetricFog = new VolumetricFogEffect(this.group);
    this.proximityGrading = new ProximityGradingEffect();
    this.lensFlare = new LensFlareEffect(this.group);
    this.caustics = new FakeCausticsEffect(this.group);
    this.lightEstimation = new LightEstimationEffect(this.scene);

    this.effectsManager.register('light_godrays', 'lighting', this.godRays);
    this.effectsManager.register('light_floorglow', 'lighting', this.floorGlow);
    this.effectsManager.register('light_pointlight', 'lighting', this.portalLight);
    this.effectsManager.register('light_fog', 'lighting', this.volumetricFog);
    this.effectsManager.register('light_grading', 'lighting', this.proximityGrading);
    this.effectsManager.register('light_lensflare', 'lighting', this.lensFlare);
    this.effectsManager.register('light_caustics', 'lighting', this.caustics);
    this.effectsManager.register('light_estimation', 'lighting', this.lightEstimation);

    // ─── Group D: The Twilight World (Virtual Realm) ────────────────────
    this.twilightWorld = new TwilightWorld(this.scene, this.camera, this.renderer, this.effectsManager);
  }

  place(position, lookAtTarget = null) {
    this.group.position.copy(position);

    if (lookAtTarget) {
      const targetFlat = new THREE.Vector3(lookAtTarget.x, position.y, lookAtTarget.z);
      this.group.lookAt(targetFlat);
    }

    this.group.visible = true;
    this.isPlaced = true;
    this.isInsideVirtual = false;
    this.lastSide = 1;
    this.twilightWorld.setInsideVirtual(false);

    // Spatial sound & swell
    audioEngine.setupPortalHum(this.group.position);
    audioEngine.playPlaceWhoosh(this.group.position);

    // Cinematic opening sequence
    this.sequence.open();
  }

  setScale(scale) {
    this.scale = Math.max(0.3, Math.min(3.0, scale));
    this.group.scale.set(this.scale, this.scale, this.scale);
  }

  setRotation(angle) {
    this.group.rotation.y = angle;
  }

  setTimeOfDay(val) {
    this.twilightWorld.setTimeOfDay(val);
  }

  remove(onDone) {
    if (!this.isPlaced) return;
    this.sequence.close();
    this.sequence.onSequenceComplete = (st) => {
      if (st === 'closed') {
        this.group.visible = false;
        this.isPlaced = false;
        this.isOpen = false;
        this.twilightWorld.setInsideVirtual(false);
        onDone?.();
      }
    };
  }

  /**
   * Effect 32: Crossing-through math and detection
   */
  checkCrossing(cameraPos) {
    if (!this.isPlaced || this.sequence.state !== 'open') return 2.0;

    const portalCenter = new THREE.Vector3(0, 1.2, 0).applyMatrix4(this.group.matrixWorld);
    const portalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();
    const toCam = new THREE.Vector3().subVectors(cameraPos, portalCenter);
    const signedDist = toCam.dot(portalNormal);

    // Projection on doorway plane
    const projectionOnPlane = new THREE.Vector3().copy(toCam).sub(
      new THREE.Vector3().copy(portalNormal).multiplyScalar(signedDist)
    );
    const radialDist = projectionOnPlane.length();
    const isWithinAperture = radialDist <= (this.radius * this.scale * 1.15);
    const currentSide = Math.sign(signedDist);

    if (isWithinAperture && this.lastSide !== 0 && currentSide !== 0 && currentSide !== this.lastSide) {
      if (this.lastSide > 0 && currentSide < 0) {
        // Step into Twilight Realm
        this.isInsideVirtual = true;
        this.twilightWorld.setInsideVirtual(true);
        audioEngine.playCrossingTransition(true);
        this.onRealmTransition?.(true);
      } else if (this.lastSide < 0 && currentSide > 0) {
        // Step back outside to Real World
        this.isInsideVirtual = false;
        this.twilightWorld.setInsideVirtual(false);
        audioEngine.playCrossingTransition(false);
        this.onRealmTransition?.(false);
      }
    }

    this.lastSide = currentSide;
    return toCam.length();
  }

  dispose() {
    this.effectsManager.dispose();
    this.twilightWorld.dispose();
    if (this.group) {
      this.scene.remove(this.group);
      this.group = null;
    }
  }
}
