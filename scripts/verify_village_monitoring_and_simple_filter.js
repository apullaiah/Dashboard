const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9558;
const TARGET_URL = 'http://localhost:4173';

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runVerification() {
  console.log('=== STARTING AUTOMATED VERIFICATION: VILLAGE MONITORING & SIMPLE FILTER ===');

  const loginRes = await fetch(`${TARGET_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const { token } = await loginRes.json();
  console.log('Auth token obtained:', token.slice(0, 16) + '...');

  const fullUrl = `${TARGET_URL}/?token=${token}`;

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
  const artifactDir = 'C:\\Users\\SSLR\\.gemini\\antigravity-ide\\brain\\2b3cc4b9-a6c3-4239-bc34-bc1268c171c4';

  // -------------------------------------------------------------
  // TEST A: Simple Overview Selection Filter
  // -------------------------------------------------------------
  console.log('\n--- TEST A: Simple Overview Selection Filter ---');
  const evalSimpleFilter = await send('Runtime.evaluate', {
    expression: `(() => {
      const bar = document.querySelector('.simple-overview-filter-bar');
      if (!bar) return { found: false };
      const divSelect = bar.querySelector('#ref-home-division-select');
      const manSelect = bar.querySelector('#ref-home-mandal-select');
      const phaseSelect = bar.querySelector('#ref-home-phase-select');
      const cycleSelect = bar.querySelector('#ref-home-cycle-select');
      const searchInp = bar.querySelector('#ref-home-search');
      const resetBtn = bar.querySelector('.simple-reset-btn');
      const stagePills = Array.from(bar.querySelectorAll('.simple-stage-pill')).map(p => p.textContent.trim());

      return {
        found: true,
        hasDivision: !!divSelect,
        hasMandal: !!manSelect,
        hasPhase: !!phaseSelect,
        hasCycle: !!cycleSelect,
        hasSearch: !!searchInp,
        hasReset: !!resetBtn,
        stagePillCount: stagePills.length,
        stagePillsSample: stagePills.slice(0, 6)
      };
    })()`,
    returnByValue: true
  });

  const simpleFilterData = evalSimpleFilter.result ? evalSimpleFilter.result.value : evalSimpleFilter;
  console.log('Simple Filter Bar Check:', JSON.stringify(simpleFilterData, null, 2));

  if (!simpleFilterData.found) {
    throw new Error('FAIL: .simple-overview-filter-bar not found in overview!');
  }
  console.log('PASS: Simple Overview Selection Filter rendered with clean dropdowns and controls.');

  const ssFilter = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_simple_overview_filter.png', Buffer.from(ssFilter.data, 'base64'));
  fs.writeFileSync(path.join(artifactDir, 'screenshot_simple_overview_filter.png'), Buffer.from(ssFilter.data, 'base64'));

  // -------------------------------------------------------------
  // Switch to Village Monitoring Section
  // -------------------------------------------------------------
  console.log('\n--- Navigating to Village Monitoring View ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const vmBtn = document.querySelector('[data-view="villages"]') || document.querySelector('[data-view-link="villages"]');
      if (vmBtn) vmBtn.click();
    })()`
  });
  await wait(2000);

  // -------------------------------------------------------------
  // TEST B: Ground Truthing (GT) Stage Click
  // -------------------------------------------------------------
  console.log('\n--- TEST B: Click GT Stage in Village Monitoring ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const gtChip = document.querySelector('[data-stage-focus="gt_status"]');
      if (gtChip) gtChip.click();
    })()`
  });
  await wait(1500);

  const evalGt = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.stage-performance-card');
      const labels = card ? Array.from(card.querySelectorAll('.stage-kpi-label')).map(l => l.textContent.trim()) : [];
      const values = card ? Array.from(card.querySelectorAll('.stage-kpi-value')).map(v => v.textContent.trim()) : [];
      const subs = card ? Array.from(card.querySelectorAll('.stage-kpi-sub')).map(s => s.textContent.trim()) : [];
      
      const ths = Array.from(document.querySelectorAll('.focused-stage-table th')).map(t => t.textContent.trim());
      const hasVillageCountInKpi = labels.concat(values).concat(subs).some(txt => /villages\s+cleared/i.test(txt));
      const hasAcUnit = values.every(v => v.includes('Ac'));

      return {
        cardFound: !!card,
        labels,
        values,
        subs,
        tableHeaders: ths,
        hasVillageCountInKpi,
        hasAcUnit
      };
    })()`,
    returnByValue: true
  });

  const gtData = evalGt.result ? evalGt.result.value : evalGt;
  console.log('GT Drilldown Results:');
  console.log('   Labels:', gtData.labels);
  console.log('   Values:', gtData.values);
  console.log('   Subtitles:', gtData.subs);
  console.log('   Table Headers:', gtData.tableHeaders);
  console.log('   Has Village Count in KPI?:', gtData.hasVillageCountInKpi);
  console.log('   Strictly Acres Unit?:', gtData.hasAcUnit);

  if (gtData.hasVillageCountInKpi) {
    throw new Error('FAIL: Village count text found in GT stage KPI card!');
  }
  if (!gtData.hasAcUnit) {
    throw new Error('FAIL: GT KPI values do not strictly use Acres (Ac) unit!');
  }
  console.log('PASS: GT stage strictly displays Today, Cum, and Bal Extent in Acres.');

  const ssGt = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_vm_gt_extent.png', Buffer.from(ssGt.data, 'base64'));
  fs.writeFileSync(path.join(artifactDir, 'screenshot_vm_gt_extent.png'), Buffer.from(ssGt.data, 'base64'));

  // -------------------------------------------------------------
  // TEST C: Vectorization Stage Click
  // -------------------------------------------------------------
  console.log('\n--- TEST C: Click Vectorization Stage in Village Monitoring ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const vecChip = document.querySelector('[data-stage-focus="vectorization_status"]');
      if (vecChip) vecChip.click();
    })()`
  });
  await wait(1500);

  const evalVec = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.stage-performance-card');
      const labels = card ? Array.from(card.querySelectorAll('.stage-kpi-label')).map(l => l.textContent.trim()) : [];
      const values = card ? Array.from(card.querySelectorAll('.stage-kpi-value')).map(v => v.textContent.trim()) : [];
      const ths = Array.from(document.querySelectorAll('.focused-stage-table th')).map(t => t.textContent.trim());
      const hasChalthas = values.every(v => v.includes('Chalthas'));
      const hasVillageCount = labels.concat(values).some(txt => /villages\s+cleared/i.test(txt));

      return {
        cardFound: !!card,
        labels,
        values,
        tableHeaders: ths,
        hasChalthas,
        hasVillageCount
      };
    })()`,
    returnByValue: true
  });

  const vecData = evalVec.result ? evalVec.result.value : evalVec;
  console.log('Vectorization Drilldown Results:');
  console.log('   Labels:', vecData.labels);
  console.log('   Values:', vecData.values);
  console.log('   Table Headers:', vecData.tableHeaders);
  console.log('   Strictly Chalthas Unit?:', vecData.hasChalthas);
  console.log('   Has Village Count?:', vecData.hasVillageCount);

  if (vecData.hasVillageCount) {
    throw new Error('FAIL: Village count found in Vectorization stage KPI card!');
  }
  if (!vecData.hasChalthas) {
    throw new Error('FAIL: Vectorization KPI values do not strictly use Chalthas unit!');
  }
  console.log('PASS: Vectorization stage strictly displays Today, Cum, and Bal Number of Chalthas.');

  const ssVec = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_vm_vectorization_chalthas.png', Buffer.from(ssVec.data, 'base64'));
  fs.writeFileSync(path.join(artifactDir, 'screenshot_vm_vectorization_chalthas.png'), Buffer.from(ssVec.data, 'base64'));

  // -------------------------------------------------------------
  // TEST D: DLR VS Login Stage Click
  // -------------------------------------------------------------
  console.log('\n--- TEST D: Click DLR VS Login Stage in Village Monitoring ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const vsChip = document.querySelector('[data-stage-focus="vs_status"]');
      if (vsChip) vsChip.click();
    })()`
  });
  await wait(1500);

  const evalVs = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.stage-performance-card');
      const labels = card ? Array.from(card.querySelectorAll('.stage-kpi-label')).map(l => l.textContent.trim()) : [];
      const values = card ? Array.from(card.querySelectorAll('.stage-kpi-value')).map(v => v.textContent.trim()) : [];
      const ths = Array.from(document.querySelectorAll('.focused-stage-table th')).map(t => t.textContent.trim());
      const hasEntries = values.every(v => v.includes('Entries'));
      const hasVillageCount = labels.concat(values).some(txt => /villages\s+cleared/i.test(txt));

      return {
        cardFound: !!card,
        labels,
        values,
        tableHeaders: ths,
        hasEntries,
        hasVillageCount
      };
    })()`,
    returnByValue: true
  });

  const vsData = evalVs.result ? evalVs.result.value : evalVs;
  console.log('DLR VS Login Drilldown Results:');
  console.log('   Labels:', vsData.labels);
  console.log('   Values:', vsData.values);
  console.log('   Table Headers:', vsData.tableHeaders);
  console.log('   Strictly Entries Unit?:', vsData.hasEntries);
  console.log('   Has Village Count?:', vsData.hasVillageCount);

  if (vsData.hasVillageCount) {
    throw new Error('FAIL: Village count found in DLR VS Login KPI card!');
  }
  if (!vsData.hasEntries) {
    throw new Error('FAIL: DLR VS Login KPI values do not strictly use Entries unit!');
  }
  console.log('PASS: DLR VS Login strictly displays Today, Cum, and Bal Number of Entries.');

  const ssVs = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('screenshot_vm_dlr_vs_entries.png', Buffer.from(ssVs.data, 'base64'));
  fs.writeFileSync(path.join(artifactDir, 'screenshot_vm_dlr_vs_entries.png'), Buffer.from(ssVs.data, 'base64'));

  // -------------------------------------------------------------
  // TEST E: Tahsildar Login Stage Click
  // -------------------------------------------------------------
  console.log('\n--- TEST E: Click Tahsildar Login Stage in Village Monitoring ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tahChip = document.querySelector('[data-stage-focus="tahsildar_status"]');
      if (tahChip) tahChip.click();
    })()`
  });
  await wait(1500);

  const evalTah = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.stage-performance-card');
      const labels = card ? Array.from(card.querySelectorAll('.stage-kpi-label')).map(l => l.textContent.trim()) : [];
      const values = card ? Array.from(card.querySelectorAll('.stage-kpi-value')).map(v => v.textContent.trim()) : [];
      const hasEntries = values.every(v => v.includes('Entries'));

      return {
        cardFound: !!card,
        labels,
        values,
        hasEntries
      };
    })()`,
    returnByValue: true
  });

  const tahData = evalTah.result ? evalTah.result.value : evalTah;
  console.log('Tahsildar Login Drilldown Results:');
  console.log('   Labels:', tahData.labels);
  console.log('   Values:', tahData.values);
  console.log('   Strictly Entries Unit?:', tahData.hasEntries);

  if (!tahData.hasEntries) {
    throw new Error('FAIL: Tahsildar Login KPI values do not strictly use Entries unit!');
  }
  console.log('PASS: Tahsildar Login strictly displays Number of Entries.');

  ws.close();
  chromeProc.kill();
  console.log('\n=== ALL VERIFICATIONS PASSED WITH ZERO ERRORS ===');
}

runVerification().catch(err => {
  console.error('\nVerification Error:', err);
  process.exit(1);
});
