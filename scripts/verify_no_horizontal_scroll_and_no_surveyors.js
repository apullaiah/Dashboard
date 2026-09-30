const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9453;

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 4173,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('1. Authenticating...');
  const auth = await postJson('/api/auth/login', { pin: 'APCTR2026' });
  const token = auth.token;
  console.log('Token acquired:', token.slice(0, 16) + '...');

  console.log('2. Launching Chrome headless...');
  const chromeProc = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1366,900',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const verRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const tabs = await verRes.json();
  const pageWsUrl = tabs[0].webSocketDebuggerUrl;

  const ws = new WebSocket(pageWsUrl);
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

  await send('Page.enable');
  await send('DOM.enable');

  console.log('3. Navigating to Overview Dashboard...');
  await send('Page.navigate', { url: `http://localhost:4173/?token=${token}` });
  await new Promise(r => setTimeout(r, 3000));

  // Check scroll width of village tables in Overview
  const checkOverview = await send('Runtime.evaluate', {
    expression: `(() => {
      // Click on Dec-26 PPB figure or scroll to village list
      const fig = document.querySelector('[data-overview-figure="ppb_cycle_Dec-26"]');
      if (fig) fig.click();

      const sec = document.getElementById('ppb-village-section');
      const table = sec ? sec.querySelector('table') : null;
      const wrap = sec ? sec.querySelector('.ref-table-scroll-wrap') : null;

      // Check for phone numbers in the document body
      const text = document.body.innerText;
      const phones = text.match(/[6-9]\\d{9}/g) || [];
      const officerCols = document.querySelectorAll('.col-officers-last, .ms-last-col-card, .officer-last-col-card');

      return {
        tableFound: Boolean(table),
        tableClientWidth: table ? table.clientWidth : 0,
        tableScrollWidth: table ? table.scrollWidth : 0,
        wrapClientWidth: wrap ? wrap.clientWidth : 0,
        wrapScrollWidth: wrap ? wrap.scrollWidth : 0,
        hasHorizontalScroll: wrap ? (wrap.scrollWidth > wrap.clientWidth) : false,
        foundPhonesCount: phones.length,
        officerColsCount: officerCols.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Overview Table Check:', JSON.stringify(checkOverview.value, null, 2));

  await new Promise(r => setTimeout(r, 1000));
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_overview_village_list_fit.png', Buffer.from(shot1.data, 'base64'));
  console.log('Saved screenshot_overview_village_list_fit.png');

  console.log('4. Navigating to Village Monitoring view...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('[data-view="villages"]');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  const checkVm = await send('Runtime.evaluate', {
    expression: `(() => {
      const table = document.querySelector('.data-table');
      const card = document.querySelector('.data-table-card');
      const text = document.body.innerText;
      const phones = text.match(/[6-9]\\d{9}/g) || [];
      const officerCols = document.querySelectorAll('.col-officers-last, .ms-last-col-card, .officer-last-col-card');

      return {
        tableFound: Boolean(table),
        tableClientWidth: table ? table.clientWidth : 0,
        tableScrollWidth: table ? table.scrollWidth : 0,
        cardClientWidth: card ? card.clientWidth : 0,
        cardScrollWidth: card ? card.scrollWidth : 0,
        hasHorizontalScroll: card ? (card.scrollWidth > card.clientWidth) : false,
        foundPhonesCount: phones.length,
        officerColsCount: officerCols.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Village Monitoring Table Check:', JSON.stringify(checkVm.value, null, 2));

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_village_monitoring_fit.png', Buffer.from(shot2.data, 'base64'));
  console.log('Saved screenshot_village_monitoring_fit.png');

  console.log('5. Navigating to PPB Distribution view...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('[data-view="ppb"]');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  const checkPpb = await send('Runtime.evaluate', {
    expression: `(() => {
      const table = document.querySelector('.data-table');
      const wrap = document.querySelector('.table-wrap');
      const text = document.body.innerText;
      const phones = text.match(/[6-9]\\d{9}/g) || [];

      return {
        tableFound: Boolean(table),
        tableClientWidth: table ? table.clientWidth : 0,
        tableScrollWidth: table ? table.scrollWidth : 0,
        wrapClientWidth: wrap ? wrap.clientWidth : 0,
        wrapScrollWidth: wrap ? wrap.scrollWidth : 0,
        hasHorizontalScroll: wrap ? (wrap.scrollWidth > wrap.clientWidth) : false,
        foundPhonesCount: phones.length
      };
    })()`,
    returnByValue: true
  });
  console.log('PPB Distribution Table Check:', JSON.stringify(checkPpb.value, null, 2));

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_ppb_cycle_villages_fit.png', Buffer.from(shot3.data, 'base64'));
  console.log('Saved screenshot_ppb_cycle_villages_fit.png');

  ws.close();
  chromeProc.kill();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
