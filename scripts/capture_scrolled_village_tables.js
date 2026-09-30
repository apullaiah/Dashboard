const cp = require('child_process');
const fs = require('fs');

async function main() {
  const loginRes = await fetch('http://localhost:4173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const { token } = await loginRes.json();
  const targetUrl = `http://localhost:4173/?token=${token}`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9455',
    '--window-size=1366,1100',
    '--no-sandbox',
    targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9455/json/list');
    const tabs = await listRes.json();
    const targetTab = tabs.find(t => t.url.includes('4173'));
    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((res, rej) => {
        const id = msgId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) rej(data.error);
            else res(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise(r => setTimeout(r, 2000));

    // 1. Village Monitoring table view (scrolled to table)
    console.log('1. Village Monitoring Table...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('[data-view="villages"]');
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const t = document.querySelector('.data-table');
        if (t) t.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`
    });
    await new Promise(r => setTimeout(r, 500));
    const ssVm = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_vm_table_scrolled.png', Buffer.from(ssVm.data, 'base64'));

    // 2. PPB Distribution table view (scrolled to table)
    console.log('2. PPB Distribution Table...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('[data-view="ppb"]');
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const t = document.querySelector('.data-table');
        if (t) t.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`
    });
    await new Promise(r => setTimeout(r, 500));
    const ssPpb = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_ppb_table_scrolled.png', Buffer.from(ssPpb.data, 'base64'));

    ws.close();
    chrome.kill();
    console.log('Screenshots saved!');
  } catch (e) {
    console.error(e);
    chrome.kill();
  }
}

main();
