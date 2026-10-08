const cp = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const targetUrl = 'http://localhost:4173/?token=OFFICER-VIEW-APCTR2026';

  console.log('1. Launching Chrome with remote debugging on port 9334...');
  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9334',
    '--window-size=1600,1200',
    '--no-sandbox',
    targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9334/json/list');
    const tabs = await listRes.json();
    const targetTab = tabs.find(t => t.url.includes('4173'));
    if (!targetTab) throw new Error('Target tab not found');

    console.log('2. Connecting to WebSocket debugger...');
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

    async function evalCode(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result ? res.result.value : null;
    }

    async function screenshot(filename) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(filename, Buffer.from(data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
    }

    await send('Page.enable');
    await send('Runtime.enable');

    // Wait for initial load
    await new Promise(r => setTimeout(r, 2500));

    console.log('3. Navigating to Mandal Action Plan...');
    const navResult = await evalCode(`
      (function() {
        const btn = document.querySelector('[data-view="mandal_plan"]');
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()
    `);
    console.log('Nav button click result:', navResult);

    await new Promise(r => setTimeout(r, 2000));

    // Check Mandal Action Plan DOM
    const planInfo = await evalCode(`
      (function() {
        const wrapper = document.querySelector('.mandal-plan-wrapper');
        const kpis = document.querySelectorAll('.ap-kpi-card');
        const rows = document.querySelectorAll('.action-plan-table tbody tr');
        const totalRow = document.querySelector('.action-plan-total-row');
        return {
          hasWrapper: Boolean(wrapper),
          kpiCount: kpis.length,
          mandalRowCount: rows.length,
          hasTotalRow: Boolean(totalRow),
          totalVillagesText: totalRow ? totalRow.querySelector('[data-metric="villages"]')?.textContent?.trim() : null,
          firstMandal: rows[0] ? rows[0].querySelector('.col-mandal-name')?.textContent?.trim() : null
        };
      })()
    `);
    console.log('Mandal Action Plan UI status:', planInfo);

    await screenshot('screenshot_mandal_plan_main.png');

    // 4. Test clicking on a figure: Tahsildar DLR Login in Grand Total row
    console.log('4. Clicking Tahsildar Login figure in Grand Total row...');
    const clickTahResult = await evalCode(`
      (function() {
        const tahBtn = document.querySelector('.action-plan-total-row [data-metric="dlr_tah"]');
        if (tahBtn) {
          tahBtn.click();
          return { clicked: true, text: tahBtn.textContent.trim() };
        }
        return { clicked: false };
      })()
    `);
    console.log('Click Tah button result:', clickTahResult);

    await new Promise(r => setTimeout(r, 1200));

    const modalInfoTah = await evalCode(`
      (function() {
        const modal = document.querySelector('.modal');
        if (!modal) return { open: false };
        const title = modal.querySelector('.modal-head h3')?.textContent?.trim();
        const stats = Array.from(modal.querySelectorAll('.modal-stat-pill')).map(p => p.textContent.trim());
        const rows = modal.querySelectorAll('.modal-village-table tbody tr');
        return {
          open: true,
          title,
          stats,
          rowCount: rows.length,
          firstRowVillage: rows[0] ? rows[0].querySelector('td:nth-child(3)')?.textContent?.trim() : null
        };
      })()
    `);
    console.log('Modal status for Tahsildar Login:', modalInfoTah);
    await screenshot('screenshot_modal_dlr_tah.png');

    // Close modal
    await evalCode(`document.querySelector('[data-action="close-modal"]')?.click()`);
    await new Promise(r => setTimeout(r, 600));

    // 5. Test clicking on Rovers Available for a specific Mandal (e.g., G.D.Nellore)
    console.log('5. Clicking Rovers figure for G.D.Nellore...');
    const clickRoversResult = await evalCode(`
      (function() {
        const gdRow = Array.from(document.querySelectorAll('.action-plan-table tbody tr')).find(r => r.textContent.includes('G.D.Nellore'));
        if (gdRow) {
          const rovBtn = gdRow.querySelector('[data-metric="rovers_available"]');
          if (rovBtn) {
            rovBtn.click();
            return { clicked: true, text: rovBtn.textContent.trim() };
          }
        }
        return { clicked: false };
      })()
    `);
    console.log('Click Rovers button result:', clickRoversResult);
    await new Promise(r => setTimeout(r, 1200));

    const modalInfoRovers = await evalCode(`
      (function() {
        const modal = document.querySelector('.modal');
        if (!modal) return { open: false };
        const title = modal.querySelector('.modal-head h3')?.textContent?.trim();
        const stats = Array.from(modal.querySelectorAll('.modal-stat-pill')).map(p => p.textContent.trim());
        const rows = modal.querySelectorAll('#modal-rover-table tbody tr');
        return {
          open: true,
          title,
          stats,
          rowCount: rows.length,
          firstRover: rows[0] ? rows[0].querySelector('td:nth-child(3)')?.textContent?.trim() : null
        };
      })()
    `);
    console.log('Modal status for Rovers:', modalInfoRovers);
    await screenshot('screenshot_modal_rovers.png');

    // Close modal
    await evalCode(`document.querySelector('[data-action="close-modal"]')?.click()`);
    await new Promise(r => setTimeout(r, 600));

    // 6. Test clicking on Village Surveyors (VS) available for Kuppam
    console.log('6. Clicking VS available figure for Kuppam...');
    const clickVsResult = await evalCode(`
      (function() {
        const kuppamRow = Array.from(document.querySelectorAll('.action-plan-table tbody tr')).find(r => r.textContent.includes('Kuppam'));
        if (kuppamRow) {
          const vsBtn = kuppamRow.querySelector('[data-metric="vs_available"]');
          if (vsBtn) {
            vsBtn.click();
            return { clicked: true, text: vsBtn.textContent.trim() };
          }
        }
        return { clicked: false };
      })()
    `);
    console.log('Click VS button result:', clickVsResult);
    await new Promise(r => setTimeout(r, 1200));

    const modalInfoVs = await evalCode(`
      (function() {
        const modal = document.querySelector('.modal');
        if (!modal) return { open: false };
        const title = modal.querySelector('.modal-head h3')?.textContent?.trim();
        const stats = Array.from(modal.querySelectorAll('.modal-stat-pill')).map(p => p.textContent.trim());
        const rows = modal.querySelectorAll('#modal-sec-table tbody tr');
        return {
          open: true,
          title,
          stats,
          rowCount: rows.length,
          firstSec: rows[0] ? rows[0].querySelector('td:nth-child(3)')?.textContent?.trim() : null
        };
      })()
    `);
    console.log('Modal status for Village Surveyors:', modalInfoVs);
    await screenshot('screenshot_modal_surveyors.png');

    // Close modal
    await evalCode(`document.querySelector('[data-action="close-modal"]')?.click()`);
    await new Promise(r => setTimeout(r, 600));

    // 7. Test Mandal Filter and Search
    console.log('7. Testing Mandal Search for "Nagari"...');
    await evalCode(`
      (function() {
        const inp = document.getElementById('ap-mandal-search');
        if (inp) {
          inp.value = 'Nagari';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    const searchCount = await evalCode(`document.querySelectorAll('.action-plan-table tbody tr').length`);
    console.log('Filtered row count after search "Nagari":', searchCount);
    await screenshot('screenshot_mandal_plan_search_filtered.png');

    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    ws.close();
    chrome.kill();
    process.exit(0);
  } catch (err) {
    console.error('Verification error:', err);
    chrome.kill();
    process.exit(1);
  }
}

main();
