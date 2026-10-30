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
    '--user-data-dir=C:\\Users\\rbakh\\AppData\\Local\\Temp\\chrome-inspect-profile',
    'about:blank'
  ], { stdio: 'ignore' });
  await waitForPort(9222);

  const targets = await fetchJson('http://127.0.0.1:9222/json/list');
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
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

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[Browser Console]', data.params.type, data.params.args.map(a => a.value ?? JSON.stringify(a)).join(' '));
    } else if (data.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
    }
  });

  await send('Page.navigate', { url: 'http://localhost:3000/?debug=1' });
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', { expression: 'document.getElementById("btn-preview")?.click()' });
  await new Promise(r => setTimeout(r, 2000));

  const check = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.app;
        if (!app) return { error: 'window.app is null or undefined' };
        return {
          hasApp: true,
          hasScene: !!app.scene,
          hasCamera: !!app.camera,
          cameraPos: app.camera ? [app.camera.position.x, app.camera.position.y, app.camera.position.z] : null,
          smokeCubeInScene: app.scene ? app.scene.children.includes(app.smokeCube) : false,
          gateInScene: app.scene ? app.scene.children.includes(app.gate?.group) : false,
          postEnabled: app.post?.isEnabled,
          renderCalls: app.renderer?.info?.render?.calls,
          renderTriangles: app.renderer?.info?.render?.triangles,
          renderPoints: app.renderer?.info?.render?.points,
          renderLines: app.renderer?.info?.render?.lines,
          renderFrame: app.renderer?.info?.render?.frame,
          activeMode: app.activeMode,
          isPlaced: app.isPlaced,
        };
      })()
    `,
    returnByValue: true
  });

  console.log('App state check:', JSON.stringify(check.result.value, null, 2));

  ws.close();
  chromeProcess.kill();
  viteProcess.kill();
  process.exit(0);
}

run().catch(console.error);
