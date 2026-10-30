import { spawn } from 'child_process';
import http from 'http';

function waitForPort(port, timeout = 10000) {
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
  const viteProcess = spawn('npx.cmd', ['vite', '--port', '3000'], { stdio: 'ignore', shell: true });
  await waitForPort(3000);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu-sandbox',
    '--window-size=1280,720',
    '--disable-web-security',
    '--user-data-dir=C:\\Users\\rbakh\\AppData\\Local\\Temp\\chrome-test-composer',
    'about:blank'
  ], { stdio: 'ignore' });
  await waitForPort(9222);

  const targets = await fetchJson('http://127.0.0.1:9222/json/list');
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = msgId++;
    const handler = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/?debug=1' });
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', { expression: 'document.getElementById("btn-preview")?.click()' });
  await new Promise(r => setTimeout(r, 2000));

  const testComposer = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.app;
        if (!app) return { error: 'no app' };
        
        // Test 1: Just renderer.render
        app.renderer.render(app.scene, app.camera);
        const callsDirect = app.renderer.info.render.calls;
        const triDirect = app.renderer.info.render.triangles;

        // Test 2: Check composer render target options
        const rt = app.post.composer.renderTarget1;
        const rtHasStencil = rt ? rt.stencilBuffer : null;

        // Test 3: Check bloom pass
        const bloomPass = app.post.bloomPass;

        return {
          callsDirect,
          triDirect,
          rtHasStencil,
          bloomEnabled: bloomPass ? bloomPass.enabled : null,
          postEnabled: app.post.isEnabled,
          composerPasses: app.post.composer.passes.map(p => p.constructor.name),
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Composer inspection:', JSON.stringify(testComposer.result.value, null, 2));

  ws.close();
  chromeProcess.kill();
  viteProcess.kill();
  process.exit(0);
}

run().catch(console.error);

