import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

function waitForPort(port, timeout = 12000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => resolve());
      req.on('error', () => {
        if (Date.now() - start > timeout) reject(new Error(`Timeout port ${port}`));
        else setTimeout(check, 300);
      });
    };
    check();
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  console.log('1. Starting Vite dev server...');
  const viteProcess = spawn('npx.cmd', ['vite', '--port', '3000'], { stdio: 'ignore', shell: true });
  await waitForPort(3000);
  console.log('   ✓ Vite running on port 3000');

  console.log('2. Launching Headless Chrome with remote debugging...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu-sandbox',
    '--window-size=1280,800',
    '--disable-web-security',
    '--user-data-dir=C:\\Users\\rbakh\\AppData\\Local\\Temp\\chrome-dream-gate-capture',
    'about:blank'
  ], { stdio: 'ignore' });
  await waitForPort(9222);
  console.log('   ✓ Chrome running on port 9222');

  const targets = await fetchJson('http://127.0.0.1:9222/json/list');
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const consoleLogs = [];
  const consoleErrors = [];
  const exceptions = [];

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push({ type: data.params.type, text });
      if (data.params.type === 'error') {
        consoleErrors.push(text);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      exceptions.push(data.params.exceptionDetails.text + (data.params.exceptionDetails.exception?.description || ''));
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('3. Navigating to http://localhost:3000/?debug=1 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/?debug=1' });
  await new Promise(r => setTimeout(r, 2500));

  console.log('4. Entering 3D Preview mode (#btn-preview)...');
  await send('Runtime.evaluate', { expression: 'document.getElementById("btn-preview")?.click()' });
  
  // Wait 4 seconds for gate summon sequence (open progress 0 -> 1)
  console.log('   Waiting 4 seconds for Gate summon and portal aperture opening...');
  await new Promise(r => setTimeout(r, 4000));

  // Inspect render state
  const inspect1 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.app;
        if (!app) return { error: 'window.app not found' };
        return {
          mode: app.activeMode,
          isPlaced: app.isPlaced,
          gateOpenProgress: app.gate.surface.openProgress,
          currentFps: app.currentFps,
          frameCount: app.frameCount,
          renderCalls: app.renderer.info.render.calls,
          triangles: app.renderer.info.render.triangles,
          canvasSize: {
            width: app.canvas.width,
            height: app.canvas.height,
            clientWidth: app.canvas.clientWidth,
            clientHeight: app.canvas.clientHeight
          },
          activeRealm: app.realms.activeRealmId
        };
      })()
    `,
    returnByValue: true
  });
  console.log('   Render state (Sky Garden):', JSON.stringify(inspect1.result.value, null, 2));

  const artifactDir = 'C:\\Users\\rbakh\\.gemini\\antigravity\\brain\\c781745e-8be9-4625-8aeb-a497fbbb7d18';

  // 1. Capture Sky Garden
  console.log('5. Capturing Gate + Sky Garden Realm...');
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot-gate-skygarden.png'), Buffer.from(shot1.data, 'base64'));
  fs.writeFileSync('screenshot-gate-skygarden.png', Buffer.from(shot1.data, 'base64'));
  console.log('   ✓ Saved screenshot-gate-skygarden.png');

  // 2. Switch to Midnight Ocean
  console.log('6. Switching to Midnight Ocean realm...');
  await send('Runtime.evaluate', {
    expression: 'document.querySelector(\'[data-realm="midnightOcean"]\')?.click()'
  });
  await new Promise(r => setTimeout(r, 2500));

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot-midnight-ocean.png'), Buffer.from(shot2.data, 'base64'));
  fs.writeFileSync('screenshot-midnight-ocean.png', Buffer.from(shot2.data, 'base64'));
  console.log('   ✓ Saved screenshot-midnight-ocean.png');

  // 3. Switch to Star Library
  console.log('7. Switching to Star Library realm...');
  await send('Runtime.evaluate', {
    expression: 'document.querySelector(\'[data-realm="starLibrary"]\')?.click()'
  });
  await new Promise(r => setTimeout(r, 2500));

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot-star-library.png'), Buffer.from(shot3.data, 'base64'));
  fs.writeFileSync('screenshot-star-library.png', Buffer.from(shot3.data, 'base64'));
  console.log('   ✓ Saved screenshot-star-library.png');

  console.log('8. Analyzing Console and Shader Diagnostics...');
  console.log('   Total console logs recorded:', consoleLogs.length);
  console.log('   Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('   Errors detected:', consoleErrors);
  }
  console.log('   Uncaught Exceptions count:', exceptions.length);
  if (exceptions.length > 0) {
    console.error('   Exceptions detected:', exceptions);
  }

  // Check if any shader errors occurred
  const shaderErrors = consoleLogs.filter(l => l.text.includes('Shader Error') || l.text.includes('THREE.WebGLProgram'));
  console.log('   Shader Errors count (with checkShaderErrors=true):', shaderErrors.length);
  if (shaderErrors.length > 0) {
    console.error('   Shader Errors:', shaderErrors);
  }

  ws.close();
  chromeProcess.kill();
  viteProcess.kill();
  console.log('🎉 Done capturing all realms!');
}

run().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});

