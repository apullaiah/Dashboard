const cp = require('child_process');
const fs = require('fs');
const path = require('path');

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
    '--remote-debugging-port=9444',
    '--window-size=1440,3200',
    '--no-sandbox',
    targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9444/json/list');
    const tabs = await listRes.json();
    const targetTab = tabs.find(t => t.url.includes('4173'));
    if (!targetTab) throw new Error('Target tab not found');

    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
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
    }

    // Wait 2.5s for initial render
    await new Promise(r => setTimeout(r, 2500));

    // 1. Switch to Resurvey tab: [data-overview-tab="resurvey"]
    console.log('Clicking Resurvey Progress tab...');
    await send('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('[data-overview-tab="resurvey"]');
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    // Capture Resurvey GT View
    console.log('Capturing Resurvey GT View...');
    const ssGt = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_overview_gt.png', Buffer.from(ssGt.data, 'base64'));

    // 2. Toggle to DLR Tab in Part 1
    console.log('Toggling to DLR Tab...');
    await send('Runtime.evaluate', {
      expression: `
        const dlrToggle = document.querySelector('[data-resurvey-tab="dlr"]');
        if (dlrToggle) dlrToggle.click();
      `
    });
    await new Promise(r => setTimeout(r, 1200));

    console.log('Capturing Resurvey DLR View...');
    const ssDlr = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_overview_dlr.png', Buffer.from(ssDlr.data, 'base64'));

    // 3. Click on a village in the inline village wise table
    console.log('Clicking on village Belupalli or Lakkanapalli...');
    await send('Runtime.evaluate', {
      expression: `
        const rows = document.querySelectorAll('.ivw-village-row');
        let target = null;
        for (const r of rows) {
          if (r.innerText.includes('Belupalli') || r.innerText.includes('Lakkanapalli')) {
            target = r;
            break;
          }
        }
        if (!target && rows.length > 0) target = rows[0];
        if (target) {
          target.click();
          target.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Capturing Individual Village Progress Card View...');
    const ssCard = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_card.png', Buffer.from(ssCard.data, 'base64'));

    // 4. Click Full Details Modal button
    console.log('Opening full details modal...');
    await send('Runtime.evaluate', {
      expression: `
        const modalBtn = document.querySelector('[data-action="track-village-modal"]');
        if (modalBtn) modalBtn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Capturing Village Details Modal View...');
    const ssModal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_modal.png', Buffer.from(ssModal.data, 'base64'));

    ws.close();
  } finally {
    chrome.kill();
  }
  console.log('All screenshots updated successfully!');
}

main().catch(console.error);
