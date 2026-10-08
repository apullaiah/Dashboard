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
  console.log('Token acquired:', token.slice(0, 16) + '...');

  const targetUrl = `http://localhost:4173/?token=${token}#ppb`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('2. Launching headless Chrome with remote debugging on port 9334...');
  const chrome = cp.spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9334',
    '--window-size=1440,2400',
    '--no-sandbox',
    targetUrl
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9334/json/list');
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

    // Wait for dashboard data to load & render PPB view
    console.log('4. Waiting for dashboard data to load in PPB view...');
    await new Promise(r => setTimeout(r, 3500));

    // Ensure we are in PPB view
    await send('Runtime.evaluate', {
      expression: `
        (function() {
          const ppbNav = document.querySelector('[data-view="ppb"]');
          if (ppbNav) ppbNav.click();
          if (window.state) {
            window.state.view = 'ppb';
            if (typeof render === 'function') render();
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // Inspect radio options and counts in PPB stage radio bar
    console.log('5. Inspecting PPB stage radio bar...');
    const radioBarInfo = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const bar = document.querySelector('.ppb-stage-radio-bar');
          if (!bar) return { found: false };
          const radios = Array.from(bar.querySelectorAll('input[name="ppb_stage_filter"]')).map(r => {
            const pill = r.closest('label');
            const text = pill ? pill.innerText.replace(/\\s+/g, ' ').trim() : '';
            return { value: r.value, checked: r.checked, text };
          });
          const rows = document.querySelectorAll('.ppb-village-row, #ppbVillageTableBody tr');
          return { found: true, radios, rowCount: rows.length };
        })()
      `,
      returnByValue: true
    });
    console.log('PPB Radio Bar Info:', JSON.stringify(radioBarInfo.value, null, 2));

    // Capture screenshot 1: All Stages
    const ssAll = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('ppb_radio_stages_all.png', Buffer.from(ssAll.data, 'base64'));
    console.log('✓ Saved ppb_radio_stages_all.png');

    // Click "🔘 DLR Stage" radio button
    console.log('6. Clicking DLR Stage radio button...');
    const clickDlrResult = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const dlrRadio = document.querySelector('input[name="ppb_stage_filter"][value="dlr_stage"]');
          if (dlrRadio) {
            dlrRadio.checked = true;
            dlrRadio.dispatchEvent(new Event('change', { bubbles: true }));
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true
    });
    console.log('DLR Click Result:', clickDlrResult.value);
    await new Promise(r => setTimeout(r, 1000));

    // Inspect DLR subtier bar and filtered rows
    const dlrStateInfo = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const subBar = document.querySelector('.ppb-dlr-subtier-bar');
          const subRadios = subBar ? Array.from(subBar.querySelectorAll('input[name="ppb_dlr_subtier"]')).map(r => {
            const pill = r.closest('label');
            return { value: r.value, checked: r.checked, text: pill ? pill.innerText.replace(/\\s+/g, ' ').trim() : '' };
          }) : [];
          const rows = document.querySelectorAll('#ppbVillageTableBody tr');
          const sampleRows = Array.from(rows).slice(0, 3).map(tr => tr.innerText.replace(/\\s+/g, ' ').trim());
          return {
            subBarFound: !!subBar,
            subRadios,
            rowCount: rows.length,
            sampleRows
          };
        })()
      `,
      returnByValue: true
    });
    console.log('DLR State Info:', JSON.stringify(dlrStateInfo.value, null, 2));

    // Capture screenshot 2: DLR Stage Filter Active
    const ssDlr = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('ppb_radio_stage_dlr.png', Buffer.from(ssDlr.data, 'base64'));
    console.log('✓ Saved ppb_radio_stage_dlr.png');

    // Click "🔘 Draft RoR" radio button
    console.log('7. Clicking Draft RoR radio button...');
    const clickDraftResult = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const draftRadio = document.querySelector('input[name="ppb_stage_filter"][value="draft_ror"]');
          if (draftRadio) {
            draftRadio.checked = true;
            draftRadio.dispatchEvent(new Event('change', { bubbles: true }));
            return { clicked: true };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true
    });
    console.log('Draft RoR Click Result:', clickDraftResult.value);
    await new Promise(r => setTimeout(r, 1000));

    // Inspect Draft RoR rows
    const draftStateInfo = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const rows = document.querySelectorAll('#ppbVillageTableBody tr');
          const sampleRows = Array.from(rows).slice(0, 3).map(tr => tr.innerText.replace(/\\s+/g, ' ').trim());
          return {
            rowCount: rows.length,
            sampleRows
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Draft RoR State Info:', JSON.stringify(draftStateInfo.value, null, 2));

    // Capture screenshot 3: Draft RoR Filter Active
    const ssDraft = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('ppb_radio_stage_draft_ror.png', Buffer.from(ssDraft.data, 'base64'));
    console.log('✓ Saved ppb_radio_stage_draft_ror.png');

    // Open village modal to inspect Stage Radio Options in tracker modal
    console.log('8. Opening Village modal to check Stage Capture Radio Buttons...');
    const modalResult = await send('Runtime.evaluate', {
      expression: `
        (function() {
          // Find first track button or village row
          const trackBtn = document.querySelector('#ppbVillageTableBody tr [onclick*="openVillage"]');
          if (trackBtn) {
            trackBtn.click();
            return { openedVia: 'trackBtn' };
          }
          const row = document.querySelector('#ppbVillageTableBody tr');
          if (row) {
            row.click();
            return { openedVia: 'row' };
          }
          // Or call openVillage directly with first village id
          if (window.state && window.state.villages && window.state.villages.length) {
            openVillage(window.state.villages[0].id);
            return { openedVia: 'directCall', id: window.state.villages[0].id };
          }
          return { openedVia: 'none' };
        })()
      `,
      returnByValue: true
    });
    console.log('Modal Open Result:', modalResult.value);
    await new Promise(r => setTimeout(r, 1200));

    // Inspect modal stage radio group
    const modalRadioInfo = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const modal = document.querySelector('#villageModal');
          const capturePanel = modal ? modal.querySelector('.citizen-stage-capture-panel') : null;
          if (!capturePanel) return { found: false };
          const radios = Array.from(capturePanel.querySelectorAll('input[name="modal_stage_radio"]')).map(r => {
            const pill = r.closest('label');
            return {
              value: r.value,
              checked: r.checked,
              text: pill ? pill.innerText.replace(/\\s+/g, ' ').trim() : ''
            };
          });
          return {
            found: true,
            modalVisible: modal ? !modal.classList.contains('hidden') : false,
            radios
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Modal Stage Capture Radio Info:', JSON.stringify(modalRadioInfo.value, null, 2));

    // Capture screenshot 4: Modal with radio buttons
    const ssModal = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('ppb_modal_radio_stage_capture.png', Buffer.from(ssModal.data, 'base64'));
    console.log('✓ Saved ppb_modal_radio_stage_capture.png');

    console.log('Verification completed successfully!');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
