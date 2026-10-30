/**
 * gate.js — Master Dream Gate Orchestrator
 * Coordinates arch frame, dream-mist surface, realm sigils, and sequence controllers.
 */

import * as THREE from 'three';
import { GateFrameEffect } from './gateFrame.js';
import { GateSurfaceEffect } from './gateSurface.js';
import { GateSigilsEffect } from './gateSigils.js';
import { GateSequenceController } from './gateSequence.js';
import { audioEngine } from '../audio/engine.js';

export class DreamGate {
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
    this.width = 1.1;
    this.height = 2.1;

    // Crossing state
    this.isInsideVirtual = false;
    this.lastSide = 1; // +1 front, -1 inside
    this.onRealmTransition = null;

    // Active realm
    this.activeRealm = 'skyGarden';

    // Subsystems
    this.frame = new GateFrameEffect(this.group);
    this.surface = new GateSurfaceEffect(this.group);
    this.sigils = new GateSigilsEffect(this.group);
    this.sequence = new GateSequenceController(this.group, this.surface);

    this.effectsManager.register('gate_frame', 'gate', this.frame);
    this.effectsManager.register('gate_surface', 'gate', this.surface);
    this.effectsManager.register('gate_sigils', 'gate', this.sigils);
    this.effectsManager.register('gate_sequence', 'gate', this.sequence);

    this.sigils.onRealmSelect = (realmId) => {
      this.setRealm(realmId);
    };
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

    audioEngine.setupGateHum(this.group.position);
    this.sequence.summon();
  }

  setRealm(realmId) {
    if (this.activeRealm === realmId && this.sigils.activeRealm === realmId) return;
    this.activeRealm = realmId;
    audioEngine.setRealm(realmId);
    audioEngine.playFragmentChime(4, this.group.position);
    this.sigils.selectRealm(realmId, false);
  }

  setScale(scale) {
    this.scale = Math.max(0.4, Math.min(2.5, scale));
    this.group.scale.set(this.scale, this.scale, this.scale);
  }

  setRotation(angle) {
    this.group.rotation.y = angle;
  }

  remove(onDone) {
    if (!this.isPlaced) return;
    this.sequence.dissolve();
    this.sequence.onSequenceComplete = (st) => {
      if (st === 'closed') {
        this.group.visible = false;
        this.isPlaced = false;
        this.isOpen = false;
        onDone?.();
      }
    };
  }

  /**
   * Effect 5 & Interaction: Doorway Plane Crossing Detection
   */
  checkCrossing(cameraPos) {
    if (!this.isPlaced || this.sequence.state !== 'open') return 2.0;

    const gateCenter = new THREE.Vector3(0, 1.0, 0).applyMatrix4(this.group.matrixWorld);
    const gateNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();
    const toCam = new THREE.Vector3().subVectors(cameraPos, gateCenter);
    const signedDist = toCam.dot(gateNormal);

    // Radial distance on doorway plane
    const projOnPlane = new THREE.Vector3().copy(toCam).sub(
      new THREE.Vector3().copy(gateNormal).multiplyScalar(signedDist)
    );
    const isWithinAperture = projOnPlane.length() <= (0.75 * this.scale);
    const currentSide = Math.sign(signedDist);

    if (isWithinAperture && this.lastSide !== 0 && currentSide !== 0 && currentSide !== this.lastSide) {
      if (this.lastSide > 0 && currentSide < 0) {
        // Step into Dream Realm
        this.isInsideVirtual = true;
        audioEngine.playCrossingTransition(true);
        this.onRealmTransition?.(true);
      } else if (this.lastSide < 0 && currentSide > 0) {
        // Step back outside into Real World
        this.isInsideVirtual = false;
        audioEngine.playCrossingTransition(false);
        this.onRealmTransition?.(false);
      }
    }

    this.lastSide = currentSide;
    return toCam.length();
  }

  dispose() {
    this.effectsManager.dispose();
    if (this.group) {
      this.scene.remove(this.group);
      this.group = null;
    }
  }
}
