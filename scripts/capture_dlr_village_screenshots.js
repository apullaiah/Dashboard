const cp = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  const loginRes = await fetch('http://localhost:4173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const { token } = await loginRes.json();
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9555',
    '--window-size=1440,3200',
    '--no-sandbox',
    'http://localhost:4173/?token=' + token
  ]);

  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9555/json/list');
    const tabs = await listRes.json();
    const ws = new WebSocket(tabs.find(t => t.url.includes('4173')).webSocketDebuggerUrl);
    await new Promise(res => ws.onopen = res);

    let id = 1;
    const send = (method, params = {}) => new Promise(res => {
      const cur = id++;
      const h = e => {
        const d = JSON.parse(e.data);
        if (d.id === cur) { ws.removeEventListener('message', h); res(d.result); }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });

    await new Promise(r => setTimeout(r, 2000));
    await send('Runtime.evaluate', { expression: `document.querySelector('[data-overview-tab="resurvey"]').click();` });
    await new Promise(r => setTimeout(r, 1200));
    await send('Runtime.evaluate', { expression: `document.querySelector('[data-resurvey-tab="dlr"]').click();` });
    await new Promise(r => setTimeout(r, 1000));

    // Filter to Lakkanapalli
    await send('Runtime.evaluate', {
      expression: `
        const input = document.getElementById('overview-village-search');
        if (input) {
          input.value = 'Lakkanapalli';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click on Lakkanapalli row
    await send('Runtime.evaluate', {
      expression: `
        const r = document.querySelector('.ivw-village-row');
        if (r) { r.click(); r.scrollIntoView({ block: 'center' }); }
      `
    });
    await new Promise(r => setTimeout(r, 1200));

    const ssCard = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_card_dlr.png', Buffer.from(ssCard.data, 'base64'));
    console.log('Saved screenshot_village_card_dlr.png');

    // Click modal
    await send('Runtime.evaluate', { expression: `document.querySelector('[data-action="track-village-modal"]').click();` });
    await new Promise(r => setTimeout(r, 1200));

    const ssModal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_modal_dlr.png', Buffer.from(ssModal.data, 'base64'));
    console.log('Saved screenshot_village_modal_dlr.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}
run().catch(console.error);
