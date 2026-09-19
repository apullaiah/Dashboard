const cp = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('1. Authenticating to get token...');
  const loginRes = await fetch('http://localhost:4173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const { token } = await loginRes.json();
  console.log('Token acquired:', token.slice(0, 20) + '...');

  const targetUrl = `http://localhost:4173/?token=${token}`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('2. Launching headless Chrome with remote debugging on port 9333...');
  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9333',
    '--window-size=1440,2400',
    '--no-sandbox',
    targetUrl
  ]);

  // Give Chrome a moment to open debug port
  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9333/json/list');
    const tabs = await listRes.json();
    const targetTab = tabs.find(t => t.url.includes('4173'));
    if (!targetTab) {
      throw new Error('Target tab on port 4173 not found in Chrome tabs list');
    }

    console.log('3. Connecting to WebSocket CDP:', targetTab.webSocketDebuggerUrl);
    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

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

    // Wait 3s for data to fetch and render
    console.log('4. Waiting for dashboard data to load...');
    await new Promise(r => setTimeout(r, 3000));

    // Capture initial screenshot (Overview Part 1 with GT active)
    console.log('5. Capturing initial overview screenshot...');
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_overview_gt.png', Buffer.from(ss1.data, 'base64'));
    console.log('  ✓ Saved screenshot_overview_gt.png');

    // Click DLR tab in Part 1
    console.log('6. Clicking DLR tab in Part 1...');
    const clickDlrResult = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const dlrTab = document.querySelector('.resurvey-tab-btn.toggle-tab-dlr, [data-resurvey-tab="dlr"]');
          if (dlrTab) {
            dlrTab.click();
            return { clicked: true, text: dlrTab.innerText };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true
    });
    console.log('  DLR Tab Click Result:', clickDlrResult.value);

    await new Promise(r => setTimeout(r, 1000));

    // Capture DLR tab screenshot
    const ssDlr = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_overview_dlr.png', Buffer.from(ssDlr.data, 'base64'));
    console.log('  ✓ Saved screenshot_overview_dlr.png');

    // Click on a village row (Lakkanapalli or first available row with DLR/GT)
    console.log('7. Clicking on a village row to inspect individual village progress card...');
    const clickVillageResult = await send('Runtime.evaluate', {
      expression: `
        (function() {
          // Look for village row with Lakkanapalli or Belupalli or any row
          const rows = document.querySelectorAll('.ivw-village-row, [data-inspect-village]');
          let targetRow = null;
          for (const row of rows) {
            if (row.innerText.includes('Lakkanapalli') || row.innerText.includes('Belupalli')) {
              targetRow = row;
              break;
            }
          }
          if (!targetRow && rows.length > 0) targetRow = rows[0];
          if (targetRow) {
            targetRow.click();
            return { clicked: true, text: targetRow.innerText.slice(0, 100) };
          }
          return { clicked: false, totalRows: rows.length };
        })()
      `,
      returnByValue: true
    });
    console.log('  Village Row Click Result:', clickVillageResult.value);

    await new Promise(r => setTimeout(r, 1500));

    // Check if individual village progress card is visible
    const checkCard = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const card = document.querySelector('#individual-village-progress-card, .individual-village-progress-card');
          if (card) {
            return {
              found: true,
              hasTodayGt: card.innerText.includes('GT Extent Done Today'),
              hasTodayDlr: card.innerText.includes('DLR Entries Done Today'),
              cardTextSnippet: card.innerText.slice(0, 400)
            };
          }
          return { found: false };
        })()
      `,
      returnByValue: true
    });
    console.log('  Individual Village Progress Card Verification:', checkCard.value);

    // Scroll to the card and capture screenshot
    await send('Runtime.evaluate', {
      expression: `
        const card = document.querySelector('#individual-village-progress-card, .individual-village-progress-card');
        if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await new Promise(r => setTimeout(r, 800));

    const ssCard = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_card.png', Buffer.from(ssCard.data, 'base64'));
    console.log('  ✓ Saved screenshot_village_card.png');

    // Click "Full Details Modal ↗" to test openVillage modal
    console.log('8. Opening full village details modal...');
    const clickModal = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const modalBtn = document.querySelector('[data-action="track-village-modal"]');
          if (modalBtn) {
            modalBtn.click();
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true
    });
    console.log('  Modal Button Click Result:', clickModal.value);

    await new Promise(r => setTimeout(r, 1500));

    // Verify modal has Today Progress Card
    const checkModal = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const modal = document.querySelector('.modal-content, .modal-dialog');
          const vtp = document.querySelector('.village-today-progress-card');
          if (modal) {
            return {
              modalFound: true,
              vtpFound: Boolean(vtp),
              modalSnippet: modal.innerText.slice(0, 300)
            };
          }
          return { modalFound: false };
        })()
      `,
      returnByValue: true
    });
    console.log('  Modal Today Progress Verification:', checkModal.value);

    const ssModal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_modal.png', Buffer.from(ssModal.data, 'base64'));
    console.log('  ✓ Saved screenshot_village_modal.png');

    ws.close();
  } finally {
    chrome.kill();
  }
  console.log('\nAll CDP browser interactions and screenshot captures completed!');
}

main().catch(err => {
  console.error('CDP Interaction Error:', err);
  process.exit(1);
});
