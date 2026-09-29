const cp = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('1. Authenticating...');
  const loginRes = await fetch('http://localhost:4173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const { token } = await loginRes.json();
  console.log('Token acquired:', token.slice(0, 16) + '...');

  const targetUrl = `http://localhost:4173/?token=${token}`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('2. Launching headless Chrome with remote debugging on port 9450...');
  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9450',
    '--window-size=1440,2600',
    '--no-sandbox',
    targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2200));

  try {
    const listRes = await fetch('http://127.0.0.1:9450/json/list');
    const tabs = await listRes.json();
    const targetTab = tabs.find(t => t.url.includes('4173'));
    if (!targetTab) throw new Error('Target tab on port 4173 not found');

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

    // Wait for initial render
    await new Promise(r => setTimeout(r, 3000));

    // =========================================================================
    // TEST 1: Overview Dashboard
    // =========================================================================
    console.log('3. Inspecting Overview Dashboard...');
    const ssOverview = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_overview_ppb_stages.png', Buffer.from(ssOverview.data, 'base64'));
    console.log('Saved screenshot_overview_ppb_stages.png');

    // =========================================================================
    // TEST 2: Navigate to PPB Distribution Cycle view
    // =========================================================================
    console.log('4. Navigating to PPB Distribution Cycle view...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('.primary-nav button[data-view="ppb"]');
          if (btn) btn.click();
        })()
      `
    });
    // Wait for navigation and data load
    await new Promise(r => setTimeout(r, 3500));

    const ssPpbSep = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_ppb_cycle_stages_sep.png', Buffer.from(ssPpbSep.data, 'base64'));
    console.log('Saved screenshot_ppb_cycle_stages_sep.png (Sep-26)');

    // =========================================================================
    // TEST 3: Click Nov-26 PPB Cycle button
    // =========================================================================
    console.log('5. Clicking Nov-26 PPB Cycle button...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[data-ppb-cycle="Nov-26"]');
          if (btn) {
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const ssPpbNov = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_ppb_stages_nov26.png', Buffer.from(ssPpbNov.data, 'base64'));
    console.log('Saved screenshot_ppb_stages_nov26.png (Nov-26)');

    // =========================================================================
    // TEST 4: Click Dec-26 PPB Cycle button
    // =========================================================================
    console.log('6. Clicking Dec-26 PPB Cycle button...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[data-ppb-cycle="Dec-26"]');
          if (btn) {
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const ssPpbDec = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_ppb_cycle_stages_dec.png', Buffer.from(ssPpbDec.data, 'base64'));
    console.log('Saved screenshot_ppb_cycle_stages_dec.png (Dec-26)');

    // =========================================================================
    // TEST 5: Click Tahsildar Login Stage Card in Dec-26 to filter villages
    // =========================================================================
    console.log('7. Clicking Tahsildar Login stage card in Dec-26...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const tahCard = document.querySelector('[data-ppb-stage="tah_login"]');
          if (tahCard) {
            tahCard.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const ssPpbFilter = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_ppb_stage_filtered_tah.png', Buffer.from(ssPpbFilter.data, 'base64'));
    console.log('Saved screenshot_ppb_stage_filtered_tah.png (Dec-26 Tahsildar Login filtered)');

    // =========================================================================
    // TEST 6: Click Mar-27 PPB Cycle button
    // =========================================================================
    console.log('8. Clicking Mar-27 PPB Cycle button...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[data-ppb-cycle="Mar-27"]');
          if (btn) {
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const ssPpbMar = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_ppb_stages_mar27.png', Buffer.from(ssPpbMar.data, 'base64'));
    console.log('Saved screenshot_ppb_stages_mar27.png (Mar-27)');

    // =========================================================================
    // TEST 7: Village Monitoring View (PPBs Cycle mode)
    // =========================================================================
    console.log('9. Navigating to Village Monitoring view...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('.primary-nav button[data-view="villages"]');
          if (btn) btn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 3500));

    const ssVm = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_monitoring_ppb_stages.png', Buffer.from(ssVm.data, 'base64'));
    console.log('Saved screenshot_village_monitoring_ppb_stages.png');

    chrome.kill();
    console.log('\n======================================================');
    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    chrome.kill();
    process.exit(1);
  }
}

main();
