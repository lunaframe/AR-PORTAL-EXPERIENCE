import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

function waitForPort(port, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(check, 300);
        }
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.listeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        } else if (msg.method) {
          const list = this.listeners.get(msg.method) || [];
          for (const fn of list) fn(msg.params);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('1. Starting Vite preview/dev server...');
  const viteProcess = spawn('npx.cmd', ['vite', '--port', '3000'], {
    stdio: 'pipe',
    shell: true
  });

  viteProcess.stdout.on('data', d => console.log('[Vite]', d.toString().trim()));
  viteProcess.stderr.on('data', d => console.error('[Vite err]', d.toString().trim()));

  await waitForPort(3000);
  console.log('✓ Vite server listening on port 3000.');

  console.log('2. Starting Headless Chrome with CDP...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu-sandbox',
    '--window-size=1280,720',
    '--disable-web-security',
    '--user-data-dir=C:\\Users\\rbakh\\AppData\\Local\\Temp\\chrome-test-profile',
    'about:blank'
  ], {
    stdio: 'ignore'
  });

  await waitForPort(9222);
  console.log('✓ Chrome listening on CDP port 9222.');

  const versionInfo = await fetchJson('http://127.0.0.1:9222/json/version');
  console.log('CDP WebSocket URL:', versionInfo.webSocketDebuggerUrl);

  const targets = await fetchJson('http://127.0.0.1:9222/json/list');
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  console.log('Connecting to target:', pageTarget.webSocketDebuggerUrl);

  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();

  const consoleLogs = [];
  const errors = [];

  cdp.on('Runtime.consoleAPICalled', (params) => {
    const text = params.args.map(a => a.value ?? JSON.stringify(a)).join(' ');
    console.log(`[Browser Console ${params.type.toUpperCase()}]`, text);
    consoleLogs.push({ type: params.type, text });
    if (params.type === 'error') {
      errors.push(text);
    }
  });

  cdp.on('Runtime.exceptionThrown', (params) => {
    const desc = params.exceptionDetails.exception?.description || params.exceptionDetails.text;
    console.error('[Browser Exception]', desc);
    errors.push(desc);
  });

  cdp.on('Log.entryAdded', (params) => {
    console.log('[Browser Log]', params.entry.text);
    if (params.entry.level === 'error') {
      errors.push(params.entry.text);
    }
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  console.log('3. Navigating to http://localhost:3000/?debug=1 ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/?debug=1' });

  await new Promise(r => setTimeout(r, 2000));

  console.log('4. Clicking Preview on screen button...');
  const clickRes = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.getElementById('btn-preview');
        if (btn) {
          btn.click();
          return 'Clicked btn-preview';
        }
        return 'btn-preview not found';
      })()
    `,
    returnByValue: true
  });
  console.log('Click result:', clickRes.result.value);

  await new Promise(r => setTimeout(r, 3000));

  console.log('5. Inspecting WebGL, Scene, and Diagnostics...');
  const diagRes = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.app;
        if (!app) return { appError: 'window.app is undefined', typeofApp: typeof window.app };
        const canvas = document.getElementById('webgl-canvas');
        const gl = canvas ? (canvas.getContext('webgl2') || canvas.getContext('webgl')) : null;
        const rect = canvas ? canvas.getBoundingClientRect() : null;
        
        return {
          appExists: true,
          activeMode: app.activeMode,
          isPlaced: app.isPlaced,
          hasScene: !!app.scene,
          hasCamera: !!app.camera,
          cameraPos: app.camera ? [app.camera.position.x, app.camera.position.y, app.camera.position.z] : null,
          smokeCubeInScene: app.scene ? app.scene.children.includes(app.smokeCube) : false,
          gateInScene: app.scene ? app.scene.children.includes(app.gate?.group) : false,
          gatePos: app.gate ? [app.gate.group.position.x, app.gate.group.position.y, app.gate.group.position.z] : null,
          postEnabled: app.post?.isEnabled,
          renderCalls: app.renderer?.info?.render?.calls,
          renderTriangles: app.renderer?.info?.render?.triangles,
          canvasRect: rect ? { width: rect.width, height: rect.height } : null,
          glError: gl ? gl.getError() : null,
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Detailed Diagnostics:', JSON.stringify(diagRes.result.value, null, 2));

  console.log('6. Taking initial screenshot...');
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('preview-initial.png', Buffer.from(screenshot.data, 'base64'));
  console.log('✓ Saved preview-initial.png');

  console.log('\n--- BROWSER CONSOLE ERRORS & WARNINGS COUNT: ---');
  console.log(`Errors: ${errors.length}`);
  errors.forEach((err, i) => console.log(`  ${i+1}. ${err}`));

  cdp.close();
  chromeProcess.kill();
  viteProcess.kill();
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

