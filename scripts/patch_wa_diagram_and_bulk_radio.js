const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE CSS
console.log('1. Updating styles.css and public/styles.css...');
const cssAdditions = `
/* ==========================================================================
   POLISHED WHATSAPP WEBHOOK & BULK SENDING RADIO BUTTON STYLES
   ========================================================================== */

.wa-header-polished {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 14px;
}

.wa-bulk-radio-strip {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
}

.wa-bulk-strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.wa-bulk-strip-title {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.01em;
}

.wa-bulk-radios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.wa-bulk-radio-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.wa-bulk-radio-card:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.wa-bulk-radio-card.active {
  background: #eff6ff;
  border-color: #0284c7;
  box-shadow: 0 0 0 1px #0284c7;
}

.wa-bulk-radio-card input[type="radio"] {
  display: none;
}

.wa-bulk-radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.wa-bulk-radio-card.active .wa-bulk-radio-indicator {
  border-color: #0284c7;
  background: #0284c7;
  box-shadow: inset 0 0 0 3px #ffffff;
}

.wa-bulk-radio-text {
  flex: 1;
  min-width: 0;
}

.wa-bulk-radio-heading {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.wa-bulk-radio-subtext {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}

.wa-bulk-radio-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  white-space: nowrap;
}

.wa-bulk-radio-pill.bulk {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.wa-bulk-radio-pill.zero-gt {
  background: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}

.wa-bulk-radio-pill.dlr {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}

.wa-bulk-execute-panel {
  margin-top: 14px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%);
  border: 1.5px solid #fecdd3;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.wa-bulk-panel-main {
  font-size: 13.5px;
  font-weight: 800;
  color: #991b1b;
}

.wa-bulk-panel-desc {
  font-size: 11.5px;
  color: #7f1d1d;
  margin-top: 2px;
}

.wa-bulk-send-btn-active {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #ffffff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
  transition: all 0.15s ease;
}

.wa-bulk-send-btn-active:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
}

.wa-bulk-send-btn-active:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
`;

['styles.css', 'public/styles.css'].forEach(f => {
  const filePath = path.join(rootDir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('.wa-header-polished')) {
    content += '\n' + cssAdditions;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Added polished WA styles to ${f}`);
  }
});

// 2. UPDATE APP.JS AND PUBLIC/APP.JS
console.log('2. Updating app.js and public/app.js...');
['app.js', 'public/app.js'].forEach(f => {
  const filePath = path.join(rootDir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace heading and architecture banner with simplified polished header
  const oldHeaderAndArchRegex = /<div class="content-heading">[\s\S]*?<\/div>[\s\S]*?<!-- ARCHITECTURE BANNER -->[\s\S]*?<\/section>/;

  const newPolishedHeader = `<div class="content-heading wa-header-polished">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 4px 12px rgba(16,185,129,0.25);">
          📱
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:18px;font-weight:800;color:var(--navy);">Meta WhatsApp Cloud API &amp; Resurvey Accountability Hub</h3>
            <span class="arch-badge-live \${isLiveMode ? 'is-live' : 'is-sim'}" style="background:\${isLiveMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)'};border:1px solid \${isLiveMode ? '#10b981' : '#eab308'};color:\${isLiveMode ? '#059669' : '#b45309'};font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;">
              \${isLiveMode ? '🟢 LIVE GRAPH API' : '🟡 SIMULATION MODE · ONLINE'}
            </span>
          </div>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">
            Direct Monitoring &amp; Notice Engine · Official Directives Issued by <b>\${h(defaultSender)}</b>.
          </p>
        </div>
      </div>
      <div class="content-actions">
        <button class="primary-button" id="wa-save-config-btn" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;">
          \${icon('check')} Save Webhook Settings
        </button>
      </div>
    </div>`;

  if (oldHeaderAndArchRegex.test(content)) {
    content = content.replace(oldHeaderAndArchRegex, newPolishedHeader);
    console.log(`  Removed pictorial diagram banner and added polished header in ${f}`);
  }

  // Next, update the wa-broadcast-card header & controls to include the Bulk message sending radio button group
  const oldCardHeaderSnippet = `<div class="wa-broadcast-header">
        <div class="wa-broadcast-title">
          <span style="font-size:24px;">🚨</span>
          <div>
            <h3 id="wa-card-main-title">Poor Performing Village Surveyors (VS) Progress Notice</h3>
            <p style="font-size:12px;color:#64748b;margin:2px 0 0;" id="wa-card-sub-title">
              Daily performance extracted from Ground Truthing (GT) and DLR entry registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(defaultSender)}</b>.
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="wa-broadcast-badge" id="wa-card-badge">\${counts.vs} Flagged</span>
          <button type="button" class="wa-dispatch-btn-primary" id="wa-bulk-send-btn">
            ⚡ Broadcast Notices to All Flagged Village Surveyors (VS)
          </button>
        </div>
      </div>`;

  const newCardHeaderWithRadio = `<div class="wa-broadcast-header">
        <div class="wa-broadcast-title">
          <span style="font-size:24px;">🚨</span>
          <div>
            <h3 id="wa-card-main-title">Poor Performing Village Surveyors (VS) Progress Notice</h3>
            <p style="font-size:12px;color:#64748b;margin:2px 0 0;" id="wa-card-sub-title">
              Daily performance extracted from Ground Truthing (GT) and DLR registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(defaultSender)}</b>.
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="wa-broadcast-badge" id="wa-card-badge">\${counts.vs} Flagged</span>
        </div>
      </div>

      <!-- 🔘 BULK MESSAGE SENDING RADIO BUTTON SELECTOR -->
      <div class="wa-bulk-radio-strip">
        <div class="wa-bulk-strip-header">
          <div class="wa-bulk-strip-title">
            <span>🔘</span> <b>MESSAGE DISPATCH &amp; BULK BROADCAST MODE:</b>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:11.5px;font-weight:700;color:#0f172a;white-space:nowrap;">Sender Title:</label>
            <input type="text" id="wa-sender-override-input" value="\${h(defaultSender)}" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:700;width:140px;" />
          </div>
        </div>

        <div class="wa-bulk-radios-grid">
          <!-- Radio 1: Individual Row-by-Row Mode -->
          <label class="wa-bulk-radio-card active" data-bulk-radio="individual">
            <input type="radio" name="wa-dispatch-type-selector" value="individual" checked />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">👤 Individual Send Mode</div>
              <div class="wa-bulk-radio-subtext">Review officer &amp; dispatch single notice</div>
            </div>
            <span class="wa-bulk-radio-pill individual">Single Dispatch</span>
          </label>

          <!-- Radio 2: Bulk Send to All Flagged Officers in Tier -->
          <label class="wa-bulk-radio-card" data-bulk-radio="bulk-all">
            <input type="radio" name="wa-dispatch-type-selector" value="bulk-all" />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">⚡ Bulk Send: All Flagged in Tier</div>
              <div class="wa-bulk-radio-subtext">Broadcast notices to all flagged officers</div>
            </div>
            <span class="wa-bulk-radio-pill bulk" id="wa-radio-all-count">\${counts.vs} Officers</span>
          </label>

          <!-- Radio 3: Bulk Send to Zero GT Today -->
          <label class="wa-bulk-radio-card" data-bulk-radio="bulk-zero-gt">
            <input type="radio" name="wa-dispatch-type-selector" value="bulk-zero-gt" />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">⚠️ Bulk Send: Zero GT Today</div>
              <div class="wa-bulk-radio-subtext">Broadcast to officers with 0.00 Ac progress</div>
            </div>
            <span class="wa-bulk-radio-pill zero-gt" id="wa-radio-gt-count">0 Officers</span>
          </label>

          <!-- Radio 4: Bulk Send to DLR Pending -->
          <label class="wa-bulk-radio-card" data-bulk-radio="bulk-dlr">
            <input type="radio" name="wa-dispatch-type-selector" value="bulk-dlr" />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">🔒 Bulk Send: DLR Pending</div>
              <div class="wa-bulk-radio-subtext">Broadcast to officers with pending DLR entries</div>
            </div>
            <span class="wa-bulk-radio-pill dlr" id="wa-radio-dlr-count">0 Officers</span>
          </label>
        </div>

        <!-- DYNAMIC BULK BROADCAST ACTION BAR (Visible when any Bulk Radio is selected) -->
        <div class="wa-bulk-execute-panel" id="wa-bulk-execute-panel" style="display:none;">
          <div class="wa-bulk-panel-message">
            <div class="wa-bulk-panel-main" id="wa-bulk-panel-main">
              ⚡ Ready to broadcast official WhatsApp notices
            </div>
            <div class="wa-bulk-panel-desc" id="wa-bulk-panel-desc">
              Notices will be issued signed by <b>AD, Chittoor</b> to officers with phone numbers strictly verified in Google Spreadsheet.
            </div>
          </div>
          <button type="button" class="wa-bulk-send-btn-active" id="wa-bulk-send-btn">
            ⚡ Execute Bulk Broadcast Now
          </button>
        </div>
      </div>`;

  if (content.includes(oldCardHeaderSnippet)) {
    content = content.replace(oldCardHeaderSnippet, newCardHeaderWithRadio);
    console.log(`  Added bulk message sending radio buttons in ${f}`);
  }

  // Also remove duplicate sender input from wa-control-strip if present
  const oldControlStripSender = `<div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:11.5px;font-weight:700;color:#0f172a;white-space:nowrap;">Sender Title:</label>
            <input type="text" id="wa-sender-override-input" value="\${h(defaultSender)}" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:700;width:150px;" />
          </div>`;
  // If there are two wa-sender-override-input, replace the second one with empty
  if (content.indexOf('id="wa-sender-override-input"') !== content.lastIndexOf('id="wa-sender-override-input"')) {
    content = content.replace(oldControlStripSender, '');
    console.log(`  Deduplicated sender title input in ${f}`);
  }

  // Update updateView to refresh the bulk radio counts and execute panel
  const oldUpdateViewSnippet = `  function updateView() {
    const meta = getTierMeta();
    const filtered = getFilteredOfficers();
    const active = getActiveOfficers();

    if (mainTitle) mainTitle.textContent = \`Poor Performing \${meta.title} Progress Notice\`;
    if (subTitle) subTitle.innerHTML = \`Daily performance extracted from Ground Truthing (GT) and DLR registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(senderOverride?.value.trim() || defaultSender)}</b>.\`;
    if (cardBadge) cardBadge.textContent = \`\${active.length} Flagged\`;
    if (bulkSendBtn) {
      bulkSendBtn.textContent = meta.broadcastBtn;
      bulkSendBtn.disabled = false;
      bulkSendBtn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
    }

    if (statsContainer) statsContainer.innerHTML = renderStatsHtml();
    if (tableContainer) {
      tableContainer.innerHTML = renderTableHtml(filtered);
      attachTableActions();
    }
  }`;

  const newUpdateViewSnippet = `  let currentBulkMode = 'individual';

  function updateView() {
    const meta = getTierMeta();
    const filtered = getFilteredOfficers();
    const active = getActiveOfficers();

    const zeroToday = active.filter(o => (parseFloat(o.today_gt_extent) || 0) === 0 && (parseFloat(o.balance_gt_extent) || 0) > 0);
    const dlrPending = active.filter(o => (o.dlr_entries_balance || 0) > 0);

    const radioAllCount = document.getElementById('wa-radio-all-count');
    const radioGtCount = document.getElementById('wa-radio-gt-count');
    const radioDlrCount = document.getElementById('wa-radio-dlr-count');

    if (radioAllCount) radioAllCount.textContent = \`\${active.length} Officers\`;
    if (radioGtCount) radioGtCount.textContent = \`\${zeroToday.length} Officers\`;
    if (radioDlrCount) radioDlrCount.textContent = \`\${dlrPending.length} Officers\`;

    if (mainTitle) mainTitle.textContent = \`Poor Performing \${meta.title} Progress Notice\`;
    if (subTitle) subTitle.innerHTML = \`Daily performance extracted from Ground Truthing (GT) and DLR registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(senderOverride?.value.trim() || defaultSender)}</b>.\`;
    if (cardBadge) cardBadge.textContent = \`\${active.length} Flagged\`;

    const bulkPanel = document.getElementById('wa-bulk-execute-panel');
    const bulkPanelMain = document.getElementById('wa-bulk-panel-main');
    const bulkPanelDesc = document.getElementById('wa-bulk-panel-desc');

    if (currentBulkMode === 'individual') {
      if (bulkPanel) bulkPanel.style.display = 'none';
    } else {
      if (bulkPanel) bulkPanel.style.display = 'flex';
      let targetList = active;
      let targetLabel = \`All \${meta.title}\`;
      if (currentBulkMode === 'bulk-zero-gt') {
        targetList = zeroToday;
        targetLabel = \`Zero GT Progress Today (\${meta.short})\`;
      } else if (currentBulkMode === 'bulk-dlr') {
        targetList = dlrPending;
        targetLabel = \`DLR Pending Clearance (\${meta.short})\`;
      }

      const withPhone = targetList.filter(o => o.phone && o.phone.trim().length >= 10);
      const withoutPhone = targetList.filter(o => !o.phone || o.phone.trim().length < 10);

      if (bulkPanelMain) {
        bulkPanelMain.textContent = \`⚡ Bulk WhatsApp Broadcast Queue: \${targetLabel} (\${targetList.length} Flagged)\`;
      }
      if (bulkPanelDesc) {
        bulkPanelDesc.innerHTML = \`Directives issued from <b>\${h(senderOverride?.value.trim() || defaultSender)}</b>. <b>\${withPhone.length}</b> verified with Spreadsheet phones. \${withoutPhone.length > 0 ? \`<span style="color:#b91c1c;">(\${withoutPhone.length} lacking sheet phone will be skipped)</span>\` : ''}\`;
      }
      if (bulkSendBtn) {
        bulkSendBtn.textContent = \`⚡ Broadcast Notices to \${withPhone.length} Verified \${meta.short}\`;
        bulkSendBtn.disabled = withPhone.length === 0;
      }
    }

    if (statsContainer) statsContainer.innerHTML = renderStatsHtml();
    if (tableContainer) {
      tableContainer.innerHTML = renderTableHtml(filtered);
      attachTableActions();
    }
  }`;

  if (content.includes(oldUpdateViewSnippet)) {
    content = content.replace(oldUpdateViewSnippet, newUpdateViewSnippet);
    console.log(`  Updated updateView function in ${f}`);
  }

  // Add click handlers for the bulk radio cards
  const oldRadioHandlers = `  // Radio button click handlers
  document.querySelectorAll('[data-tier-radio]').forEach(card => {`;

  const newRadioHandlers = `  // Bulk Message Sending Radio Button click handlers
  document.querySelectorAll('[data-bulk-radio]').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('[data-bulk-radio]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      currentBulkMode = card.dataset.bulkRadio;

      if (currentBulkMode === 'bulk-zero-gt') {
        currentCategory = 'GT';
      } else if (currentBulkMode === 'bulk-dlr') {
        currentCategory = 'DLR';
      } else {
        currentCategory = 'all';
      }

      document.querySelectorAll('[data-tab-cat]').forEach(b => {
        b.classList.toggle('active', b.dataset.tabCat === currentCategory);
      });

      updateView();
    };
  });

  // Radio button click handlers
  document.querySelectorAll('[data-tier-radio]').forEach(card => {`;

  if (content.includes(oldRadioHandlers)) {
    content = content.replace(oldRadioHandlers, newRadioHandlers);
    console.log(`  Added bulk radio button event listeners in ${f}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  Saved ${f}`);
});

console.log('Patch complete.');
