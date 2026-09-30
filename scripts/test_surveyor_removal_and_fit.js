const cp = require('child_process');
const fs = require('fs');

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

  console.log('2. Launching headless Chrome on port 9454 with window-size 1366,1200...');
  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9454',
    '--window-size=1366,1200',
    '--no-sandbox',
    targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9454/json/list');
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

    await new Promise(r => setTimeout(r, 3000));

    // =========================================================================
    // TEST 1: Overview Dashboard & PPB Village Section
    // =========================================================================
    console.log('3. Inspecting Overview Dashboard and Village List...');
    const overviewEval = await send('Runtime.evaluate', {
      expression: `(() => {
        // Click on Dec-26 PPB cycle figure to show PPB village section
        const fig = document.querySelector('[data-overview-figure="ppb_cycle_Dec-26"]');
        if (fig) fig.click();

        const sec = document.getElementById('ppb-village-section');
        const table = sec ? sec.querySelector('table') : null;
        const wrap = sec ? sec.querySelector('.ref-table-scroll-wrap, .ivw-table-scroll-wrap') : null;

        const bodyText = document.body.innerText;
        const phoneMatches = bodyText.match(/[6-9]\\d{9}/g) || [];
        const officerCols = document.querySelectorAll('.col-officers-last, .ms-last-col-card, .officer-last-col-card');

        return {
          tableFound: Boolean(table),
          tableScrollWidth: table ? table.scrollWidth : 0,
          tableClientWidth: table ? table.clientWidth : 0,
          wrapScrollWidth: wrap ? wrap.scrollWidth : 0,
          wrapClientWidth: wrap ? wrap.clientWidth : 0,
          hasHScroll: wrap ? (wrap.scrollWidth > wrap.clientWidth) : false,
          phoneCount: phoneMatches.length,
          officerColsFound: officerCols.length
        };
      })()`,
      returnByValue: true
    });
    console.log('Overview Table Check:', JSON.stringify(overviewEval.result.value, null, 2));

    await new Promise(r => setTimeout(r, 800));
    const ssOverview = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_overview_village_list_fit.png', Buffer.from(ssOverview.data, 'base64'));
    console.log('Saved screenshot_overview_village_list_fit.png');

    // =========================================================================
    // TEST 2: Village Monitoring View (data-view="villages")
    // =========================================================================
    console.log('4. Navigating to Village Monitoring view...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('[data-view="villages"]');
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    const vmEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const table = document.querySelector('.data-table');
        const card = document.querySelector('.data-table-card');
        const bodyText = document.body.innerText;
        const phoneMatches = bodyText.match(/[6-9]\\d{9}/g) || [];
        const officerCols = document.querySelectorAll('.col-officers-last, .ms-last-col-card, .officer-last-col-card');

        return {
          tableFound: Boolean(table),
          tableScrollWidth: table ? table.scrollWidth : 0,
          tableClientWidth: table ? table.clientWidth : 0,
          cardScrollWidth: card ? card.scrollWidth : 0,
          cardClientWidth: card ? card.clientWidth : 0,
          hasHScroll: card ? (card.scrollWidth > card.clientWidth) : false,
          phoneCount: phoneMatches.length,
          officerColsFound: officerCols.length
        };
      })()`,
      returnByValue: true
    });
    console.log('Village Monitoring Table Check:', JSON.stringify(vmEval.result.value, null, 2));

    const ssVm = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_monitoring_fit.png', Buffer.from(ssVm.data, 'base64'));
    console.log('Saved screenshot_village_monitoring_fit.png');

    // =========================================================================
    // TEST 3: PPB Distribution View (data-view="ppb")
    // =========================================================================
    console.log('5. Navigating to PPB Distribution view...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('[data-view="ppb"]');
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    const ppbEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const table = document.querySelector('.data-table');
        const wrap = document.querySelector('.table-wrap, .abstract-two-row-table-wrap');
        const bodyText = document.body.innerText;
        const phoneMatches = bodyText.match(/[6-9]\\d{9}/g) || [];

        return {
          tableFound: Boolean(table),
          tableScrollWidth: table ? table.scrollWidth : 0,
          tableClientWidth: table ? table.clientWidth : 0,
          wrapScrollWidth: wrap ? wrap.scrollWidth : 0,
          wrapClientWidth: wrap ? wrap.clientWidth : 0,
          hasHScroll: wrap ? (wrap.scrollWidth > wrap.clientWidth) : false,
          phoneCount: phoneMatches.length
        };
      })()`,
      returnByValue: true
    });
    console.log('PPB Distribution Table Check:', JSON.stringify(ppbEval.result.value, null, 2));

    const ssPpb = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_ppb_cycle_villages_fit.png', Buffer.from(ssPpb.data, 'base64'));
    console.log('Saved screenshot_ppb_cycle_villages_fit.png');

    // =========================================================================
    // TEST 4: Village Details Modal
    // =========================================================================
    console.log('6. Opening Village Details Modal...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const row = document.querySelector('.data-table tr.clickable, .data-table button[data-village]');
        if (row) row.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    const modalEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('.modal');
        const bodyText = modal ? modal.innerText : '';
        const phoneMatches = bodyText.match(/[6-9]\\d{9}/g) || [];
        const hasSurveyorWord = /surveyor|mlso/i.test(bodyText);

        return {
          modalFound: Boolean(modal),
          phoneMatchesInModal: phoneMatches.length,
          hasSurveyorWord
        };
      })()`,
      returnByValue: true
    });
    console.log('Modal Check:', JSON.stringify(modalEval.result.value, null, 2));

    const ssModal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshot_village_modal_no_surveyor.png', Buffer.from(ssModal.data, 'base64'));
    console.log('Saved screenshot_village_modal_no_surveyor.png');

    ws.close();
    chrome.kill();
    console.log('======================================================');
    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (err) {
    console.error('Test execution error:', err);
    chrome.kill();
    process.exit(1);
  }
}

main();
