// Shared vertex shader for all portal rim ShaderMaterials.
// Computes UV, world-space normal, view direction, and world position
// for use in the fragment shaders.
//
// This is imported as a raw string in portal-rim-shader.ts and passed to
// THREE.ShaderMaterial as the vertexShader property.

export const RIM_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vUv = uv;

  // Transform normal to view space (normalMatrix is the inverse transpose of modelViewMatrix)
  vNormal = normalize(normalMatrix * normal);

  // World-space position for lighting and view direction
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;

  // View direction (fragment → camera) for Fresnel calculation
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
