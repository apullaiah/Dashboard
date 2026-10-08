const cp = require('child_process');
const fs = require('fs');

async function testScrollRight() {
  const targetUrl = 'http://localhost:4173/?token=OFFICER-VIEW-APCTR2026';
  const chrome = cp.spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=9338', '--window-size=1600,1200', '--no-sandbox', targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const listRes = await fetch('http://127.0.0.1:9338/json/list');
  const tabs = await listRes.json();
  const targetTab = tabs.find(t => t.url.includes('4173'));
  const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (m, p = {}) => new Promise((resolve, reject) => {
    const cur = id++;
    const fn = (evt) => {
      const d = JSON.parse(evt.data);
      if (d.id === cur) { ws.removeEventListener('message', fn); resolve(d.result); }
    };
    ws.addEventListener('message', fn);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', {
    expression: 'document.querySelector("[data-view=\\"mandal_plan\\"]").click()',
    awaitPromise: true
  });
  await new Promise(r => setTimeout(r, 1200));

  await send('Runtime.evaluate', {
    expression: 'document.querySelector(".action-plan-table-scroll").scrollLeft = 900',
    awaitPromise: true
  });
  await new Promise(r => setTimeout(r, 500));

  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_mandal_plan_scrolled_right.png', Buffer.from(data, 'base64'));
  console.log('Saved screenshot_mandal_plan_scrolled_right.png');

  ws.close();
  chrome.kill();
  process.exit(0);
}

testScrollRight().catch(e => { console.error(e); process.exit(1); });
