const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE CSS
console.log('1. Updating styles.css and public/styles.css...');
const cssAdditions = `
/* ==========================================================================
   GT NOT STARTED & PHASE-VII OVERVIEW SECTION
   ========================================================================== */

.gt-unstarted-section-card {
  margin-top: 24px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
  padding: 24px;
  position: relative;
}

.gt-unstarted-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid #f1f5f9;
  flex-wrap: wrap;
}

.gt-unstarted-title-box {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  max-width: 840px;
}

.gt-unstarted-badge-icon {
  font-size: 28px;
  line-height: 1;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 8px;
  border-radius: 10px;
}

.gt-unstarted-headline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.gt-unstarted-headline h3 {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.gt-unstarted-badge-counter {
  background: #fee2e2;
  color: #dc2626;
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid #fca5a5;
}

.gt-unstarted-sub {
  font-size: 12.5px;
  color: #64748b;
  margin: 5px 0 0;
  line-height: 1.5;
}

.gt-extent-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  color: #0f172a;
  font-family: var(--mono);
}

.gt-unstarted-kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin: 20px 0;
}

.gt-kpi-card {
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.gt-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.gt-kpi-card.is-total {
  background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
  border-color: #fecdd3;
}
.gt-kpi-card.is-total .gt-kpi-num { color: #e11d48; }

.gt-kpi-card.is-p7 {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border-color: #ddd6fe;
}
.gt-kpi-card.is-p7 .gt-kpi-num { color: #6d28d9; }

.gt-kpi-card.is-p6 {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-color: #fde68a;
}
.gt-kpi-card.is-p6 .gt-kpi-num { color: #b45309; }

.gt-kpi-card.is-mandals {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #bbf7d0;
}
.gt-kpi-card.is-mandals .gt-kpi-num { color: #15803d; }

.gt-kpi-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
  font-family: var(--mono);
}

.gt-kpi-label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  margin-top: 4px;
}

.gt-kpi-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.gt-unstarted-controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.gt-scope-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.gt-scope-pill {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  transition: all 0.15s ease;
}

.gt-scope-pill:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.gt-scope-pill.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.gt-filter-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gt-select-input {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  font-weight: 600;
  background: #ffffff;
  color: #0f172a;
  outline: none;
}

.gt-search-input {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  width: 220px;
  background: #ffffff;
  color: #0f172a;
  outline: none;
}

.gt-phase-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.gt-phase-pill.pill-phase-7 {
  background: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
}

.gt-phase-pill.pill-phase-6 {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.gt-unstarted-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
`;

['styles.css', 'public/styles.css'].forEach(f => {
  const filePath = path.join(rootDir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('.gt-unstarted-section-card')) {
    content += '\n' + cssAdditions;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Added GT unstarted section CSS to ${f}`);
  }
});

// 2. UPDATE APP.JS AND PUBLIC/APP.JS
console.log('2. Updating app.js and public/app.js...');
['app.js', 'public/app.js'].forEach(f => {
  const filePath = path.join(rootDir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  // A. Designation updates
  content = content.replace(/title:\s*'District Inspectors of Survey \(DIOS\)'/g, "title: 'Deputy Inspectors of Survey (DIOS)'");
  content = content.replace(/broadcastBtn:\s*'⚡ Broadcast Notices to All Flagged District Inspectors \(DIOS\)'/g, "broadcastBtn: '⚡ Broadcast Notices to All Flagged Deputy Inspectors (DIOS)'");
  content = content.replace(/<div class="wa-radio-name">⭐ District Inspectors \(DIOS\)<\/div>/g, '<div class="wa-radio-name">⭐ Deputy Inspectors (DIOS)</div>');
  content = content.replace(/\(District Inspector of Survey - DIOS\)/g, '(Deputy Inspector of Survey - DIOS)');
  content = content.replace(/As District Inspector of Survey \(DIOS\)/g, 'As Deputy Inspector of Survey (DIOS)');

  // B. Phone rendering in renderTableHtml:
  // Find where phone is rendered in officer row:
  const oldPhoneSnippet = `<div style="font-size:11px;color:#475569;">
                      📞 <a href="tel:\${o.phone}" style="color:#0369a1;font-weight:700;font-family:var(--mono);">\${h(o.phone)}</a>
                    </div>`;

  const newPhoneSnippet = `\${o.phone ? \`
                    <div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                      <span>📞 <a href="tel:\${o.phone}" style="color:#0369a1;font-weight:700;font-family:var(--mono);">\${h(o.phone)}</a></span>
                      <span class="wa-sheet-phone-badge" style="background:#dcfce7;color:#15803d;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">✓ In Sheet</span>
                    </div>
                  \` : \`
                    <div style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                      <span style="color:#94a3b8;font-style:italic;">📞 Not in Spreadsheet</span>
                      <span style="background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">(Awaiting in Sheet)</span>
                    </div>
                  \`}`;

  if (content.includes(oldPhoneSnippet)) {
    content = content.replace(oldPhoneSnippet, newPhoneSnippet);
    console.log(`  Updated phone rendering in ${f}`);
  }

  // C. Update attachTableActions for missing phone:
  const oldSendClick = `    document.querySelectorAll('[data-action="send-officer"]').forEach(btn => {
      btn.onclick = async () => {
        const oid = btn.dataset.oid;
        const officer = getActiveOfficers().find(x => x.id === oid);
        if (!officer) return;

        const senderTitle = senderOverride?.value.trim() || defaultSender;
        btn.disabled = true;
        btn.textContent = '⏳ Sending...';

        try {
          const res = await api('/api/whatsapp/send-officer-notice', {
            method: 'POST',
            body: JSON.stringify({ officerId: oid, tier: currentTier, senderTitle })
          });`;

  const newSendClick = `    document.querySelectorAll('[data-action="send-officer"]').forEach(btn => {
      btn.onclick = async () => {
        const oid = btn.dataset.oid;
        const officer = getActiveOfficers().find(x => x.id === oid);
        if (!officer) return;

        let phoneOverride = '';
        if (!officer.phone) {
          const promptMsg = \`Phone number for \${officer.name} (\${officer.role}) is not present in the Google Spreadsheet link.\\n\\n\` +
            \`Rule: Phone numbers are strictly taken from the Google Spreadsheet link.\\n\\n\` +
            \`If you wish to dispatch to \${officer.name} directly, enter the verified 10-digit mobile number, or press Cancel:\`;
          const entered = prompt(promptMsg, '');
          if (!entered) return;
          phoneOverride = entered.replace(/\\D/g, '');
          if (phoneOverride.length < 10) {
            toast('Please enter a valid 10-digit mobile number.', 'error');
            return;
          }
        }

        const senderTitle = senderOverride?.value.trim() || defaultSender;
        btn.disabled = true;
        btn.textContent = '⏳ Sending...';

        try {
          const res = await api('/api/whatsapp/send-officer-notice', {
            method: 'POST',
            body: JSON.stringify({ officerId: oid, tier: currentTier, senderTitle, phoneOverride })
          });`;

  if (content.includes(oldSendClick)) {
    content = content.replace(oldSendClick, newSendClick);
    console.log(`  Updated single send click handling in ${f}`);
  }

  // D. Update modal send click for missing phone:
  const oldModalSend = `    modalSendBtn.onclick = async () => {
      if (!currentModalOfficer) return;
      const officer = currentModalOfficer;
      const senderTitle = senderOverride?.value.trim() || defaultSender;

      modalSendBtn.disabled = true;
      modalSendBtn.textContent = '⏳ Sending...';

      try {
        await api('/api/whatsapp/send-officer-notice', {
          method: 'POST',
          body: JSON.stringify({ officerId: officer.id, tier: currentTier, senderTitle })
        });`;

  const newModalSend = `    modalSendBtn.onclick = async () => {
      if (!currentModalOfficer) return;
      const officer = currentModalOfficer;
      const senderTitle = senderOverride?.value.trim() || defaultSender;

      let phoneOverride = '';
      if (!officer.phone) {
        const promptMsg = \`Phone number for \${officer.name} (\${officer.role}) is not present in the Google Spreadsheet link.\\n\\n\` +
          \`Rule: Phone numbers are strictly taken from the Google Spreadsheet link.\\n\\n\` +
          \`Enter verified 10-digit mobile number to dispatch, or press Cancel:\`;
        const entered = prompt(promptMsg, '');
        if (!entered) return;
        phoneOverride = entered.replace(/\\D/g, '');
        if (phoneOverride.length < 10) {
          toast('Please enter a valid 10-digit mobile number.', 'error');
          return;
        }
      }

      modalSendBtn.disabled = true;
      modalSendBtn.textContent = '⏳ Sending...';

      try {
        await api('/api/whatsapp/send-officer-notice', {
          method: 'POST',
          body: JSON.stringify({ officerId: officer.id, tier: currentTier, senderTitle, phoneOverride })
        });`;

  if (content.includes(oldModalSend)) {
    content = content.replace(oldModalSend, newModalSend);
    console.log(`  Updated modal send click handling in ${f}`);
  }

  // E. Update bulk send button confirmation:
  const oldBulkConfirm = `      const confirmed = confirm(
        \`Are you sure you want to broadcast official resurvey directives to \${count} flagged \${meta.title}?\\n\\n\` +
        \`• Directives will be issued from: "\${senderTitle}"\\n\` +
        \`• Live monitoring links will be attached to each officer notice.\\n\\n\` +
        \`Click OK to proceed with dispatch.\`
      );

      if (!confirmed) return;`;

  const newBulkConfirm = `      const withPhone = activeList.filter(o => o.phone && o.phone.trim().length >= 10);
      const withoutPhone = activeList.filter(o => !o.phone || o.phone.trim().length < 10);

      let confirmMsg = \`Are you sure you want to broadcast official resurvey directives to \${count} flagged \${meta.title}?\\n\\n\` +
        \`• Directives will be issued from: "\${senderTitle}"\\n\` +
        \`• Live monitoring links will be attached to each officer notice.\\n\`;

      if (withoutPhone.length > 0) {
        confirmMsg += \`\\n⚠️ STRICT SPREADSHEET POLICY:\\n\` +
          \`• \${withPhone.length} officers have phone numbers verified from Google Spreadsheets.\\n\` +
          \`• \${withoutPhone.length} officers do NOT have phone numbers in the linked spreadsheets and will be skipped until updated in the Google Spreadsheet.\\n\`;
      }

      confirmMsg += \`\\nClick OK to proceed with dispatch.\`;

      if (!confirm(confirmMsg)) return;

      if (withPhone.length === 0) {
        toast(\`Cannot broadcast: None of the \${count} officers in this tier have phone numbers in the Google Spreadsheet link. Please update the Google Spreadsheet.\`, 'error');
        return;
      }`;

  if (content.includes(oldBulkConfirm)) {
    content = content.replace(oldBulkConfirm, newBulkConfirm);
    console.log(`  Updated bulk send confirmation in ${f}`);
  }

  // F. Add renderGtNotStartedAndPhase7Section and attachGtUnstartedEvents
  if (!content.includes('function renderGtNotStartedAndPhase7Section(')) {
    const helperFunctions = `
/**
 * Dedicated Overview section showing ONLY Ground Truthing (GT) Not Started villages and all Phase-VII villages
 */
function renderGtNotStartedAndPhase7Section(d, allVillages) {
  const rawList = (allVillages || []).filter(v => 
    /phase\\s*(vii|7)/i.test(v.phase) || 
    v.gt_status === 'Not Started' || 
    /not\\s*started/i.test(v.current_stage) ||
    (parseFloat(v.gt_completed_extent) === 0 && parseFloat(v.today_gt_extent) === 0 && parseFloat(v.balance_gt_extent) > 0 && v.gt_status !== 'Completed')
  );
  
  const phase7List = rawList.filter(v => /phase\\s*(vii|7)/i.test(v.phase));
  const phase6Pending = rawList.filter(v => !/phase\\s*(vii|7)/i.test(v.phase));
  
  const totalVillages = rawList.length;
  const totalExtent = rawList.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
  const p7Extent = phase7List.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
  const p6Extent = phase6Pending.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
  
  const mandalsSet = new Set(rawList.map(v => v.mandal).filter(Boolean));
  const mandalsCount = mandalsSet.size;
  
  const mandalOptions = Array.from(mandalsSet).sort().map(m => {
    const c = rawList.filter(v => v.mandal === m).length;
    return \`<option value="\${h(m)}">\${h(m)} (\${c} villages)</option>\`;
  }).join('');

  return \`
    <section class="section-card gt-unstarted-section-card" id="gt-not-started-phase7-section">
      <div class="gt-unstarted-header">
        <div class="gt-unstarted-title-box">
          <div class="gt-unstarted-badge-icon">🚫</div>
          <div>
            <div class="gt-unstarted-headline">
              <h3>Ground Truthing (GT) Not Started &amp; Phase-VII Villages Universe</h3>
              <span class="gt-unstarted-badge-counter">\${totalVillages} Villages</span>
            </div>
            <p class="gt-unstarted-sub">
              Dedicated statutory overview inventory of all revenue villages where Ground Truthing (GT) has not commenced across Chittoor district. Includes all <b>\${phase7List.length} Phase-VII</b> scheduled villages and <b>\${phase6Pending.length} Phase-VI</b> pending commencement villages.
            </p>
          </div>
        </div>
        <div class="gt-unstarted-header-actions">
          <span class="gt-extent-pill">Total: <b>\${formatExtent(totalExtent)} Ac</b></span>
        </div>
      </div>

      <!-- KPI METRIC TILES -->
      <div class="gt-unstarted-kpis-grid">
        <div class="gt-kpi-card is-total">
          <div class="gt-kpi-num">\${totalVillages}</div>
          <div class="gt-kpi-label">Total Villages Pending GT</div>
          <div class="gt-kpi-meta">\${formatExtent(totalExtent)} Total Acres</div>
        </div>
        <div class="gt-kpi-card is-p7">
          <div class="gt-kpi-num">\${phase7List.length}</div>
          <div class="gt-kpi-label">Phase-VII Scheduled</div>
          <div class="gt-kpi-meta">\${formatExtent(p7Extent)} Ac · All GT Not Started</div>
        </div>
        <div class="gt-kpi-card is-p6">
          <div class="gt-kpi-num">\${phase6Pending.length}</div>
          <div class="gt-kpi-label">Phase-VI Pending GT</div>
          <div class="gt-kpi-meta">\${formatExtent(p6Extent)} Ac · GT Yet to Commence</div>
        </div>
        <div class="gt-kpi-card is-mandals">
          <div class="gt-kpi-num">\${mandalsCount}</div>
          <div class="gt-kpi-label">Mandals Covered</div>
          <div class="gt-kpi-meta">Across Chittoor District</div>
        </div>
      </div>

      <!-- INTERACTIVE CONTROLS BAR -->
      <div class="gt-unstarted-controls-bar">
        <div class="gt-scope-pills" id="gt-scope-pills-container">
          <button type="button" class="gt-scope-pill active" data-gt-scope="all">
            All Villages (\${totalVillages})
          </button>
          <button type="button" class="gt-scope-pill" data-gt-scope="p7">
            ⭐ Phase-VII Only (\${phase7List.length})
          </button>
          <button type="button" class="gt-scope-pill" data-gt-scope="p6">
            ⏳ Phase-VI Pending (\${phase6Pending.length})
          </button>
        </div>

        <div class="gt-filter-inputs">
          <select id="gt-unstarted-mandal-select" class="gt-select-input">
            <option value="ALL">All \${mandalsCount} Mandals</option>
            \${mandalOptions}
          </select>
          <input type="text" id="gt-unstarted-search-input" class="gt-search-input" placeholder="Search village, mandal, code..." />
        </div>
      </div>

      <!-- INVENTORY TABLE CONTAINER -->
      <div class="gt-unstarted-table-wrap" id="gt-unstarted-table-container">
        \${renderGtUnstartedTableRows(rawList)}
      </div>
    </section>
  \`;
}

function renderGtUnstartedTableRows(list) {
  if (!list.length) {
    return \`<div style="padding:32px;text-align:center;color:#64748b;font-size:13px;">No villages match the selected scope and filters.</div>\`;
  }
  return \`
    <div style="overflow-x:auto;">
      <table class="performance-table gt-unstarted-table">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th>VILLAGE &amp; MANDAL</th>
            <th>DIVISION</th>
            <th>PHASE CLASSIFICATION</th>
            <th style="text-align:right;">TOTAL EXTENT (AC)</th>
            <th style="text-align:right;">PATTA / GOVT EXTENT</th>
            <th>PPB TARGET / CYCLE</th>
            <th>GROUND TRUTHING STATUS</th>
          </tr>
        </thead>
        <tbody>
          \${list.map((v, idx) => {
            const isP7 = /phase\\s*(vii|7)/i.test(v.phase);
            const ext = parseFloat(v.extent) || 0;
            const patta = parseFloat(v.patta_extent) || 0;
            const govt = parseFloat(v.govt_extent) || 0;
            return \`
              <tr>
                <td class="mono font-bold" style="color:#64748b;">\${idx + 1}</td>
                <td>
                  <div style="font-weight:800;color:#0f172a;font-size:13px;">\${h(v.village_name)}</div>
                  <div style="font-size:11px;color:#475569;margin-top:2px;">
                    <span class="mono" style="color:#0284c7;font-weight:700;">#\${h(v.village_code)}</span> · <b>\${h(v.mandal)}</b> Mandal
                  </div>
                </td>
                <td style="font-weight:600;color:#334155;font-size:12px;">\${h(v.division || '—')}</td>
                <td>
                  <span class="gt-phase-pill \${isP7 ? 'pill-phase-7' : 'pill-phase-6'}">
                    \${isP7 ? '⭐ Phase VII' : '⏳ Phase VI'}
                  </span>
                </td>
                <td style="text-align:right;">
                  <span class="mono font-bold" style="font-size:13px;color:#0f172a;">\${formatExtent(ext)}</span>
                  <div style="font-size:10px;color:#64748b;">Acres</div>
                </td>
                <td style="text-align:right;font-size:11px;">
                  <div style="color:#059669;font-weight:700;">Patta: <span class="mono">\${formatExtent(patta)}</span> Ac</div>
                  <div style="color:#64748b;">Govt: <span class="mono">\${formatExtent(govt)}</span> Ac</div>
                </td>
                <td>
                  <div style="font-weight:700;color:#1e293b;font-size:12px;">\${h(v.ppb_cycle || v.target_month || 'Scheduled')}</div>
                  <div style="font-size:10.5px;color:#64748b;">Target: \${h(v.ppb_target || v.total_khatas || '—')} Khatas</div>
                </td>
                <td>
                  <span class="gt-unstarted-badge">
                    ⏳ GT Not Started
                  </span>
                </td>
              </tr>
            \`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b;display:flex;justify-content:space-between;align-items:center;">
      <span>Showing <b>\${list.length}</b> villages</span>
      <span>Total Extent: <b>\${formatExtent(list.reduce((acc, v) => acc + (parseFloat(v.extent) || 0), 0))} Acres</b></span>
    </div>
  \`;
}

function attachGtUnstartedEvents() {
  const container = document.getElementById('gt-not-started-phase7-section');
  if (!container) return;

  const rawList = (state.villages || []).filter(v => 
    /phase\\s*(vii|7)/i.test(v.phase) || 
    v.gt_status === 'Not Started' || 
    /not\\s*started/i.test(v.current_stage) ||
    (parseFloat(v.gt_completed_extent) === 0 && parseFloat(v.today_gt_extent) === 0 && parseFloat(v.balance_gt_extent) > 0 && v.gt_status !== 'Completed')
  );

  let currentScope = 'all';
  let currentMandal = 'ALL';
  let currentSearch = '';

  const tableWrap = document.getElementById('gt-unstarted-table-container');
  const mandalSelect = document.getElementById('gt-unstarted-mandal-select');
  const searchInput = document.getElementById('gt-unstarted-search-input');

  function updateTable() {
    if (!tableWrap) return;
    let filtered = rawList;

    if (currentScope === 'p7') {
      filtered = filtered.filter(v => /phase\\s*(vii|7)/i.test(v.phase));
    } else if (currentScope === 'p6') {
      filtered = filtered.filter(v => !/phase\\s*(vii|7)/i.test(v.phase));
    }

    if (currentMandal && currentMandal !== 'ALL') {
      filtered = filtered.filter(v => v.mandal === currentMandal);
    }

    if (currentSearch) {
      const q = currentSearch.toLowerCase().trim();
      filtered = filtered.filter(v => 
        (v.village_name || '').toLowerCase().includes(q) ||
        (v.mandal || '').toLowerCase().includes(q) ||
        String(v.village_code || '').toLowerCase().includes(q)
      );
    }

    tableWrap.innerHTML = renderGtUnstartedTableRows(filtered);
  }

  container.querySelectorAll('[data-gt-scope]').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('[data-gt-scope]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScope = btn.dataset.gtScope;
      updateTable();
    };
  });

  if (mandalSelect) {
    mandalSelect.onchange = () => {
      currentMandal = mandalSelect.value;
      updateTable();
    };
  }

  if (searchInput) {
    searchInput.oninput = () => {
      currentSearch = searchInput.value;
      updateTable();
    };
  }
}
`;
    // Insert helper functions before renderDashboard
    content = content.replace('function renderDashboard() {', helperFunctions + '\nfunction renderDashboard() {');
    console.log(`  Added GT unstarted helper functions before renderDashboard in ${f}`);
  }

  // G. Add section inside renderDashboard root.innerHTML
  const oldOverviewWrap = `    <!-- 3. Overview Section: Strictly Abstract of Resurvey and PPB Distribution Cycle -->
    <div class="overview-two-parts-container" id="home-overview-container">
      <!-- PART 1: Resurvey Progress (GT & DLR Logins with interactive single-stream display and benchmarks) -->
      \${renderPart1ResurveyProgress(filtered, d)}

      <!-- PART 2: PPBs Distribution Status (Strict 2-Row Abstract & Monthly Delivery Timelines) -->
      \${renderPart2PpbDistributionStatus(filtered, d)}
    </div>`;

  const newOverviewWrap = `    <!-- 3. Overview Section: Strictly Abstract of Resurvey and PPB Distribution Cycle -->
    <div class="overview-two-parts-container" id="home-overview-container">
      <!-- PART 1: Resurvey Progress (GT & DLR Logins with interactive single-stream display and benchmarks) -->
      \${renderPart1ResurveyProgress(filtered, d)}

      <!-- PART 2: PPBs Distribution Status (Strict 2-Row Abstract & Monthly Delivery Timelines) -->
      \${renderPart2PpbDistributionStatus(filtered, d)}
    </div>

    <!-- 3.5 Dedicated Section: GT Not Started & All Phase-7 Villages -->
    \${renderGtNotStartedAndPhase7Section(d, state.villages || [])}`;

  if (content.includes(oldOverviewWrap)) {
    content = content.replace(oldOverviewWrap, newOverviewWrap);
    console.log(`  Added renderGtNotStartedAndPhase7Section call to Overview in ${f}`);
  }

  // H. Attach events in renderDashboard:
  const oldRenderEnd = `    <!-- Floating Local Time Widget -->
    \${renderFloatingTimeWidget()}
  \`;
}`;

  const newRenderEnd = `    <!-- Floating Local Time Widget -->
    \${renderFloatingTimeWidget()}
  \`;

  attachGtUnstartedEvents();
}`;

  if (content.includes(oldRenderEnd)) {
    content = content.replace(oldRenderEnd, newRenderEnd);
    console.log(`  Added attachGtUnstartedEvents call to renderDashboard in ${f}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  Successfully saved ${f}`);
});

// 3. UPDATE STORE.JSON LOGS
console.log('3. Updating past logs in data/store.json...');
const storePath = path.join(rootDir, 'data', 'store.json');
let storeContent = fs.readFileSync(storePath, 'utf8');
const originalStoreLen = storeContent.length;
storeContent = storeContent.replace(/District Inspector of Survey \(DIOS\)/g, 'Deputy Inspector of Survey (DIOS)');
storeContent = storeContent.replace(/District Inspector of Survey - DIOS/g, 'Deputy Inspector of Survey - DIOS');
storeContent = storeContent.replace(/District Inspectors of Survey \(DIOS\)/g, 'Deputy Inspectors of Survey (DIOS)');
storeContent = storeContent.replace(/As District Inspector of Survey \(DIOS\)/g, 'As Deputy Inspector of Survey (DIOS)');
if (storeContent.length !== originalStoreLen) {
  fs.writeFileSync(storePath, storeContent, 'utf8');
  console.log('  Updated past DIOS labels in data/store.json');
}

console.log('All patch operations complete.');
