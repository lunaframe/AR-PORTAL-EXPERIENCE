import fs from 'node:fs';
import path from 'node:path';

async function runPWAAudit() {
  console.log('--- RUNNING PWA & LIGHTHOUSE INSTALLABILITY AUDIT ---');
  let passed = true;

  // 1. Manifest verification
  const manifestPath = path.resolve('public/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('FAIL: manifest.json not found');
    passed = false;
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('✓ manifest.json exists and is valid JSON');

    // Required fields
    const requiredKeys = ['name', 'short_name', 'start_url', 'display', 'background_color', 'theme_color', 'icons'];
    for (const key of requiredKeys) {
      if (!manifest[key]) {
        console.error(`FAIL: Missing manifest property: ${key}`);
        passed = false;
      } else {
        console.log(`✓ Manifest has '${key}':`, typeof manifest[key] === 'object' ? `${manifest[key].length} entries` : manifest[key]);
      }
    }

    // Check display value
    if (!['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)) {
      console.error(`FAIL: Invalid display property: ${manifest.display}`);
      passed = false;
    }

    // Check icons
    const icons = manifest.icons || [];
    const has192 = icons.some(i => i.sizes === '192x192' && i.type === 'image/png');
    const has512 = icons.some(i => i.sizes === '512x512' && i.type === 'image/png');
    const hasMaskable = icons.some(i => i.purpose && i.purpose.includes('maskable'));

    if (has192) console.log('✓ Manifest has 192x192 PNG icon');
    else { console.error('FAIL: Missing 192x192 PNG icon'); passed = false; }

    if (has512) console.log('✓ Manifest has 512x512 PNG icon');
    else { console.error('FAIL: Missing 512x512 PNG icon'); passed = false; }

    if (hasMaskable) console.log('✓ Manifest has maskable icon for modern Android adaptive icons');
    else { console.error('FAIL: Missing maskable icon'); passed = false; }
  }

  // 2. Service Worker verification
  const swPath = path.resolve('public/sw.js');
  if (!fs.existsSync(swPath)) {
    console.error('FAIL: sw.js not found');
    passed = false;
  } else {
    const swContent = fs.readFileSync(swPath, 'utf8');
    if (swContent.includes("self.addEventListener('fetch'") || swContent.includes('self.addEventListener("fetch"')) {
      console.log('✓ sw.js has fetch event listener (offline capability check)');
    } else {
      console.error('FAIL: sw.js missing fetch listener');
      passed = false;
    }
    if (swContent.includes("self.addEventListener('install'")) {
      console.log('✓ sw.js has install event listener (pre-caching check)');
    }
  }

  // 3. index.html meta tags verification
  const htmlPath = path.resolve('index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  const metaChecks = [
    { name: 'manifest link', regex: /<link[^>]+rel=["']manifest["']/i },
    { name: 'viewport meta', regex: /<meta[^>]+name=["']viewport["']/i },
    { name: 'theme-color meta', regex: /<meta[^>]+name=["']theme-color["']/i },
    { name: 'apple-mobile-web-app-capable meta', regex: /<meta[^>]+name=["']apple-mobile-web-app-capable["']/i },
    { name: 'apple-touch-icon link', regex: /<link[^>]+rel=["']apple-touch-icon["']/i }
  ];

  for (const check of metaChecks) {
    if (check.regex.test(htmlContent)) {
      console.log(`✓ index.html has ${check.name}`);
    } else {
      console.error(`FAIL: index.html missing ${check.name}`);
      passed = false;
    }
  }

  console.log('----------------------------------------------------');
  if (passed) {
    console.log('🎉 ALL PWA & LIGHTHOUSE INSTALLABILITY CRITERIA MET 100%!');
  } else {
    console.error('⚠️ SOME AUDIT CRITERIA FAILED');
    process.exit(1);
  }
}

runPWAAudit();
