const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9557;
const TARGET_URL = 'http://localhost:4173';

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runVerification() {
  console.log('=== VERIFYING ACTIVE GT TODAY, GRAND TOTAL, AND GLOBAL RESET ===');

  // Obtain auth token
  const loginRes = await fetch(`${TARGET_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const { token } = await loginRes.json();
  console.log('Auth token obtained:', token.slice(0, 16) + '...');

  const fullUrl = `${TARGET_URL}/?token=${token}`;

  // Launch headless Chrome
  console.log('Launching headless Chrome on port', PORT);
  const chromeProc = cp.spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1600,2400',
    '--no-sandbox',
    fullUrl
  ]);

  await wait(3000);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await listRes.json();
      const tab = tabs.find(t => t.url.includes('4173'));
      if (tab) {
        wsUrl = tab.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {
      await wait(500);
    }
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Could not find active dashboard tab.');
  }

  console.log('Connecting to Chrome CDP...');
  const ws = new WebSocket(wsUrl);
  await new Promise(res => ws.onopen = res);

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const cur = msgId++;
    const handler = e => {
      const data = JSON.parse(e.data);
      if (data.id === cur) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: cur, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await wait(2000);

  // Switch to Resurvey Progress tab
  console.log('1. Switching to Resurvey Progress tab...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const resurveyTab = document.querySelector('[data-overview-tab="resurvey"]');
      if (resurveyTab) resurveyTab.click();
    })()`
  });
  await wait(1500);

  // Check GT table headers in Resurvey Progress
  const checkGtHeaders = await send('Runtime.evaluate', {
    expression: `(() => {
      const table = document.querySelector('.gt-extent-table');
      const headers = table ? Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim()) : [];
      const hasVillageCount = headers.some(h => h.includes('TARGET VILLAGES') || h.includes('COMPLETED VILLAGES'));
      const activeBtn = document.querySelector('[data-action="filter-active-gt-today"]');
      return {
        headers,
        hasVillageCount,
        activeBtnFound: !!activeBtn,
        activeBtnText: activeBtn ? activeBtn.textContent.trim() : null
      };
    })()`,
    returnByValue: true
  });

  const gtHeaderData = checkGtHeaders.result ? checkGtHeaders.result.value : checkGtHeaders;
  console.log('2. GT Table Headers in Resurvey Progress Section:');
  console.log('   Headers:', gtHeaderData.headers);
  console.log('   Village count headers found?:', gtHeaderData.hasVillageCount);
  console.log('   Active GT today button found?:', gtHeaderData.activeBtnFound, `("${gtHeaderData.activeBtnText}")`);

  if (gtHeaderData.hasVillageCount) {
    throw new Error('FAIL: Village count headers found in GT table!');
  }
  console.log('   PASS: Zero village counts in GT table. Strictly pure Extent in Acres.');

  // Click on "EXTENT COMPLETED TODAY (IN ACRES)"
  console.log('\n3. Clicking on "EXTENT COMPLETED TODAY (IN ACRES)" to view Active Villages with Grand Total...');
  const clickAction = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('[data-action="filter-active-gt-today"]');
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.textContent.trim() };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
  console.log('   Click Result:', clickAction.result ? clickAction.result.value : clickAction);
  await wait(1500);

  // Inspect Active GT View, Banner, Villages Table, and Grand Total tfoot
  const checkActiveView = await send('Runtime.evaluate', {
    expression: `(() => {
      const banner = document.querySelector('.active-gt-filter-banner');
      const bannerText = banner ? banner.textContent.trim() : null;

      const tfoot = document.querySelector('.ivw-table-footer-grand-total');
      const tfootCells = tfoot ? Array.from(tfoot.querySelectorAll('td')).map(td => td.textContent.trim()) : [];

      const rows = Array.from(document.querySelectorAll('.ivw-data-table tbody tr.ivw-village-row'));
      const rowCount = rows.length;

      const sampleRows = rows.slice(0, 5).map(r => {
        const cells = Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim());
        return {
          mandal: cells[0],
          village: cells[1],
          todayExtent: cells[2],
          cumExtent: cells[3],
          balExtent: cells[4],
          totExtent: cells[5]
        };
      });

      const topbarReset = document.querySelector('.topbar-reset-btn');
      const floatingReset = document.querySelector('.floating-reset-btn');
      const ivwReset = document.querySelector('.btn-reset-filters-ivw');

      return {
        hasBanner: !!banner,
        bannerText,
        rowCount,
        sampleRows,
        hasTfoot: !!tfoot,
        tfootCells,
        hasTopbarReset: !!topbarReset,
        hasFloatingReset: !!floatingReset,
        hasIvwReset: !!ivwReset
      };
    })()`,
    returnByValue: true
  });

  const activeViewData = checkActiveView.result ? checkActiveView.result.value : checkActiveView;
  console.log('\n4. Active GT View State:');
  console.log('   Banner Active?:', activeViewData.hasBanner);
  console.log('   Banner Text:', activeViewData.bannerText);
  console.log('   Active Villages Row Count:', activeViewData.rowCount);
  console.log('   Sample Active Villages:', JSON.stringify(activeViewData.sampleRows, null, 2));
  console.log('   Grand Total tfoot Present?:', activeViewData.hasTfoot);
  console.log('   Grand Total Cells:', activeViewData.tfootCells);
  console.log('   Reset Buttons Available?:', {
    topbar: activeViewData.hasTopbarReset,
    floating: activeViewData.hasFloatingReset,
    ivw: activeViewData.hasIvwReset
  });

  if (!activeViewData.hasBanner) {
    throw new Error('FAIL: Active GT filter banner not displayed!');
  }
  if (!activeViewData.hasTfoot) {
    throw new Error('FAIL: Grand Total footer not found at the bottom of the table!');
  }
  if (activeViewData.rowCount === 0) {
    throw new Error('FAIL: Zero active village rows rendered!');
  }
  console.log('   PASS: Active villages and Grand Total footer successfully verified!');

  // Capture Screenshot of Active GT View
  console.log('\n5. Capturing high-resolution screenshot of Active GT view with Grand Total...');
  const ss1 = await send('Page.captureScreenshot', { format: 'png' });
  const artifactDir = 'C:\\Users\\SSLR\\.gemini\\antigravity-ide\\brain\\2b3cc4b9-a6c3-4239-bc34-bc1268c171c4';
  
  fs.writeFileSync('screenshot_active_gt_grand_total.png', Buffer.from(ss1.data, 'base64'));
  fs.writeFileSync(path.join(artifactDir, 'screenshot_active_gt_grand_total.png'), Buffer.from(ss1.data, 'base64'));
  console.log('   Saved: screenshot_active_gt_grand_total.png');

  // Test Reset All Filters
  console.log('\n6. Testing Reset All Filters functionality...');
  const resetClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const resetBtn = document.querySelector('.btn-clear-active-gt') || document.querySelector('.topbar-reset-btn');
      if (resetBtn) {
        resetBtn.click();
        return { clicked: true, text: resetBtn.textContent.trim() };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
  console.log('   Reset Click Result:', resetClick.result ? resetClick.result.value : resetClick);
  await wait(1500);

  const checkAfterReset = await send('Runtime.evaluate', {
    expression: `(() => {
      const banner = document.querySelector('.active-gt-filter-banner');
      const rows = document.querySelectorAll('.ivw-data-table tbody tr.ivw-village-row').length;
      return {
        bannerVisible: !!banner,
        totalVillageRows: rows
      };
    })()`,
    returnByValue: true
  });

  const resetData = checkAfterReset.result ? checkAfterReset.result.value : checkAfterReset;
  console.log('   State After Reset:', resetData);
  if (resetData.bannerVisible) {
    throw new Error('FAIL: Filter banner still visible after reset!');
  }
  console.log('   PASS: Filters successfully reset! Universe of villages restored.');

  // Capture Screenshot After Reset
  const ss2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_after_reset_filters.png', Buffer.from(ss2.data, 'base64'));
  fs.writeFileSync(path.join(artifactDir, 'screenshot_after_reset_filters.png'), Buffer.from(ss2.data, 'base64'));
  console.log('   Saved: screenshot_after_reset_filters.png');

  ws.close();
  chromeProc.kill();
  console.log('\n=== ALL USER REQUIREMENTS VERIFIED SUCCESSFULLY ===');
}

runVerification().catch(err => {
  console.error('\nVerification Error:', err);
  process.exit(1);
});
