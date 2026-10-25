/**
 * godRays.js — Effect 16: Volumetric God Rays
 * Stacked soft translucent cone meshes projecting animated light shafts from the portal.
 */

import * as THREE from 'three';

const GodRayShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uAudioBass;
    uniform float uIntensity;
    uniform vec3 uColorAccent1;
    uniform vec3 uColorHighlight;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // vUv.x is azimuthal angle [0, 1]
      // vUv.y is length along cone [0 at apex/portal, 1 at base/room]

      // Animated multi-frequency light shafts
      float shafts1 = sin(vUv.x * 18.0 + uTime * 1.8);
      float shafts2 = cos(vUv.x * 32.0 - uTime * 2.5);
      float shaftNoise = pow(max(0.0, shafts1 * 0.5 + shafts2 * 0.5), 2.2);

      // Longitudinal falloff: bright at portal opening, soft fade out into the room
      float lengthFade = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));

      // Rim grazing angle transparency
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float viewAngle = pow(abs(dot(normal, viewDir)), 1.2);

      vec3 col = mix(uColorAccent1, uColorHighlight, shaftNoise * 0.6);
      float alpha = shaftNoise * lengthFade * viewAngle * 0.45 * uIntensity;
      alpha *= (1.0 + uAudioBass * 0.6);

      gl_FragColor = vec4(col, alpha);
    }
  `
};

export class GodRaysEffect {
  constructor(portalGroup) {
    this.portalGroup = portalGroup;
    this.group = null;
    this.cones = [];
    this.intensity = 1.0;
  }

  init(scene, camera, renderer) {
    this.group = new THREE.Group();
    // Portal center y=1.2, project forward along +Z into the room
    this.group.position.set(0, 1.2, 0.05);
    this.portalGroup.add(this.group);

    this.uniforms = {
      uTime: { value: 0 },
      uAudioBass: { value: 0 },
      uIntensity: { value: 1.0 },
      uColorAccent1: { value: new THREE.Color(0x14f1d9) },
      uColorHighlight: { value: new THREE.Color(0xe8f7ff) },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: GodRayShader.vertexShader,
      fragmentShader: GodRayShader.fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // 3 nested concentric cones for deep volumetric density
    const coneConfigs = [
      { rTop: 0.95, rBottom: 1.4, height: 2.8, rotSpeed: 0.05 },
      { rTop: 0.75, rBottom: 1.8, height: 3.4, rotSpeed: -0.07 },
      { rTop: 0.55, rBottom: 2.2, height: 4.0, rotSpeed: 0.09 },
    ];

    coneConfigs.forEach((cfg) => {
      // Cylinder open-ended: radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded
      const geom = new THREE.CylinderGeometry(cfg.rTop, cfg.rBottom, cfg.height, 48, 16, true);
      // Align cylinder so its axis points forward along +Z
      geom.rotateX(Math.PI / 2);
      geom.translate(0, 0, cfg.height / 2);

      const mesh = new THREE.Mesh(geom, this.material);
      this.group.add(mesh);
      this.cones.push({ mesh, rotSpeed: cfg.rotSpeed });
    });
  }

  setIntensity(val) {
    this.intensity = val;
    if (this.uniforms) this.uniforms.uIntensity.value = val;
  }

  setQuality(level) {
    if (this.cones.length > 0) {
      if (level === 'low') {
        this.cones[0].mesh.visible = true;
        this.cones[1].mesh.visible = false;
        this.cones[2].mesh.visible = false;
      } else if (level === 'medium') {
        this.cones[0].mesh.visible = true;
        this.cones[1].mesh.visible = true;
        this.cones[2].mesh.visible = false;
      } else {
        this.cones.forEach((c) => (c.mesh.visible = true));
      }
    }
  }

  setTheme(theme) {
    if (!this.uniforms || !theme) return;
    this.uniforms.uColorAccent1.value.setRGB(theme.accent1.r, theme.accent1.g, theme.accent1.b);
    this.uniforms.uColorHighlight.value.setRGB(theme.highlight.r, theme.highlight.g, theme.highlight.b);
  }

  update(dt, time, state) {
    if (!this.group) return;
    this.uniforms.uTime.value = time;
    this.uniforms.uAudioBass.value = state.audio?.bass || 0;

    this.cones.forEach((c) => {
      c.mesh.rotation.z += c.rotSpeed * dt;
    });
  }

  dispose() {
    if (this.group) {
      this.portalGroup.remove(this.group);
      this.cones.forEach((c) => {
        c.mesh.geometry.dispose();
      });
      this.material?.dispose();
      this.cones = [];
      this.group = null;
    }
  }
}
