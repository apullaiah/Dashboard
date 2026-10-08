const cp = require('child_process');

async function testAllMetrics() {
  const targetUrl = 'http://localhost:4173/?token=OFFICER-VIEW-APCTR2026';
  const chrome = cp.spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=9336', '--no-sandbox', targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2500));
  const listRes = await fetch('http://127.0.0.1:9336/json/list');
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

  const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

  await send('Page.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 2000));

  await evaluate(`document.querySelector('[data-view="mandal_plan"]').click()`);
  await new Promise(r => setTimeout(r, 1500));

  const metrics = [
    'villages', 'extent', 'govt_land', 'patta_land', 'vs_available', 'rovers_available',
    'resurvey_completed', 'balance_villages', 'dlr_vs', 'dlr_vro', 'dlr_tah', 'dlr_rdo', 'dlr_jc',
    'sec13_notified', 'ported_webland2'
  ];

  console.log('Testing each metric in Grand Total row:');
  for (const metric of metrics) {
    const res = await evaluate(`
      (function() {
        const btn = document.querySelector('.action-plan-total-row [data-metric="' + ${JSON.stringify(metric)} + '"]');
        if (!btn) return { found: false };
        btn.click();
        const modal = document.querySelector('.modal');
        const title = modal ? modal.querySelector('.modal-head h3')?.textContent?.trim() : null;
        const rowCount = modal ? modal.querySelectorAll('tbody tr').length : 0;
        document.querySelector('[data-action="close-modal"]')?.click();
        return { found: true, btnText: btn.textContent.trim(), title, rowCount };
      })()
    `);
    console.log(`Metric ${metric.padEnd(20)}:`, res);
  }

  // Also test clicking a figure in an individual Mandal row (Bangarupalem)
  console.log('\nTesting Bangarupalem figures:');
  const bpMetrics = ['villages', 'govt_land', 'vs_available', 'rovers_available', 'resurvey_completed', 'balance_villages', 'dlr_tah', 'sec13_notified'];
  for (const metric of bpMetrics) {
    const res = await evaluate(`
      (function() {
        const row = Array.from(document.querySelectorAll('.action-plan-table tbody tr')).find(r => r.textContent.includes('Bangarupalem'));
        if (!row) return { foundRow: false };
        const btn = row.querySelector('[data-metric="' + ${JSON.stringify(metric)} + '"]');
        if (!btn) return { foundBtn: false };
        btn.click();
        const modal = document.querySelector('.modal');
        const title = modal ? modal.querySelector('.modal-head h3')?.textContent?.trim() : null;
        const rowCount = modal ? modal.querySelectorAll('tbody tr').length : 0;
        document.querySelector('[data-action="close-modal"]')?.click();
        return { found: true, btnText: btn.textContent.trim(), title, rowCount };
      })()
    `);
    console.log(`Bangarupalem ${metric.padEnd(20)}:`, res);
  }

  ws.close();
  chrome.kill();
  process.exit(0);
}

testAllMetrics().catch(e => { console.error(e); process.exit(1); });
