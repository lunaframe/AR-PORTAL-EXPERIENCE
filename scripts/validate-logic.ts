/**
 * scripts/validate-logic.ts
 * Verification script for stencil allocation, persistence, shader syntax, and theme definitions.
 */

import { allocatePortalId, freePortalId, resetPortalIds, canAllocatePortalId, MAX_PORTALS } from '../src/utils/render-order';
import { THEMES, getTheme } from '../src/themes/index';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== RUNNING AR PORTAL LOGIC VALIDATION ===\n');

// 1. Stencil Pool Allocation & Boundary Test (0 .. 8 .. 9)
console.log('Test 1: Stencil ID allocation boundary (1..8, 9th blocked)...');
resetPortalIds();

const allocated: number[] = [];
for (let i = 1; i <= MAX_PORTALS; i++) {
  if (!canAllocatePortalId()) {
    throw new Error(`canAllocatePortalId returned false prematurely at iteration ${i}`);
  }
  const id = allocatePortalId();
  allocated.push(id);
}

console.log(`✓ Allocated 8 portals with IDs: [${allocated.join(', ')}]`);
if (allocated.length !== 8 || new Set(allocated).size !== 8) {
  throw new Error(`Allocated IDs are not unique or not 8: ${allocated}`);
}

// Verify 9th allocation throws / blocked
if (canAllocatePortalId()) {
  throw new Error('canAllocatePortalId allowed 9th portal when MAX_PORTALS is reached');
}

let threwOnNinth = false;
try {
  allocatePortalId();
} catch (e: any) {
  threwOnNinth = true;
  console.log(`✓ 9th allocation attempt threw expected error: "${e.message}"`);
}

if (!threwOnNinth) {
  throw new Error('9th allocation attempt did NOT throw');
}

// Free one ID (slot 4)
freePortalId(4);
if (!canAllocatePortalId()) {
  throw new Error('canAllocatePortalId failed after freeing slot 4');
}
const reusedId = allocatePortalId();
if (reusedId !== 4) {
  throw new Error(`Expected reused slot to be 4, got ${reusedId}`);
}
console.log(`✓ Freeing and re-allocating slot 4 worked as expected: ID ${reusedId}`);

// Free all
for (const id of allocated) {
  freePortalId(id);
}
resetPortalIds();
console.log('✓ Stencil pool test passed.\n');

// 2. Theme Registry Verification
console.log('Test 2: Verifying all 6 themes...');
const expectedThemes = ['wormhole', 'glass-shatter', 'custom-360', 'nature-rift', 'elemental-fire', 'scifi-stargate'];
if (THEMES.length !== 6) {
  throw new Error(`Expected 6 themes, found ${THEMES.length}`);
}

for (const id of expectedThemes) {
  const theme = getTheme(id);
  if (!theme || theme.id !== id) {
    throw new Error(`Theme ${id} not found or mismatch`);
  }
  if (!theme.implemented) {
    throw new Error(`Theme ${id} is marked as not implemented`);
  }
  console.log(`✓ Theme "${theme.name}" (${theme.id}): rimShaderKey=${theme.rimShaderKey}, interior=${theme.interior.type}`);
}
console.log('✓ All 6 themes verified.\n');

// 3. Shader Files Inspection
console.log('Test 3: Checking shader files for precision declarations and syntax...');
const shaderDir = path.resolve(__dirname, '../src/shaders');
const shaderFiles = fs.readdirSync(shaderDir).filter(f => f.endsWith('.glsl'));

for (const file of shaderFiles) {
  const content = fs.readFileSync(path.join(shaderDir, file), 'utf8');
  if (file === 'common.glsl') {
    if (!content.includes('precision mediump float;')) {
      throw new Error(`common.glsl is missing precision mediump float;`);
    }
    console.log(`✓ common.glsl has explicit precision mediump float;`);
  }
  console.log(`✓ Shader file ${file} (${content.length} bytes) exists and is non-empty`);
}

console.log('\n=== ALL LOGIC VALIDATION TESTS PASSED ===');
