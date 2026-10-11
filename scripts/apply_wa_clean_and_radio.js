const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE CSS
console.log('1. Updating CSS in styles.css and public/styles.css...');
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
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  margin: 16px 0;
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
  background: #ffffff;
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
  let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
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
  let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

  // A. Replace the architecture banner with clean status badge in heading
  const oldHeadingAndArch = `    <div class="content-heading">
      <div>
        <h3>Meta WhatsApp Cloud API &amp; Resurvey Accountability Hub</h3>
        <p>Direct Monitoring &amp; Notice Engine · Official Directives Issued by <b>AD, Chittoor</b>.</p>
      </div>
      <div class="content-actions">
        <button class="primary-button" id="wa-save-config-btn" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;">
          \${icon('check')} Save Webhook Settings
        </button>
      </div>
    </div>

    <!-- ARCHITECTURE BANNER -->
    <section class="whatsapp-arch-card">
      <div class="arch-header">
        <h3><span>📱</span> Architecture: WhatsApp Cloud API &amp; Webhook Service</h3>
        <span class="arch-badge-live">\${isLiveMode ? '🟢 Meta Cloud API: LIVE GRAPH API' : '🟡 Simulation Mode: Webhook Online · Verified'}</span>
      </div>
      <div class="arch-diagram-flow">
        <div class="arch-node wa-node">
          <div class="arch-node-icon">📱</div>
          <div class="arch-node-title">WhatsApp User</div>
          <div class="arch-node-sub">VS / MS / DIOS / Citizen</div>
        </div>
        <div class="arch-arrow">
          <span class="arch-arrow-line">⇄</span>
          <span class="arch-arrow-label">Query / Notice</span>
        </div>
        <div class="arch-node">
          <div class="arch-node-icon">☁️</div>
          <div class="arch-node-title">Meta WhatsApp Cloud API</div>
          <div class="arch-node-sub">Graph API v19.0</div>
        </div>
        <div class="arch-arrow">
          <span class="arch-arrow-line">⇄</span>
          <span class="arch-arrow-label">HTTPS Webhook</span>
        </div>
        <div class="arch-node active-node">
          <div class="arch-node-icon">🏛️</div>
          <div class="arch-node-title">Vercel Serverless Function</div>
          <div class="arch-node-sub">/api/whatsapp/webhook</div>
        </div>
        <div class="arch-arrow">
          <span class="arch-arrow-line">⇄</span>
          <span class="arch-arrow-label">JSON Sync</span>
        </div>
        <div class="arch-node">
          <div class="arch-node-icon">📊</div>
          <div class="arch-node-title">Monitoring Core</div>
          <div class="arch-node-sub">736 Villages · AD Chittoor</div>
        </div>
      </div>
    </section>`;

  const newPolishedHeading = `    <div class="content-heading wa-header-polished">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 4px 12px rgba(16,185,129,0.25);">
          📱
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:18px;font-weight:800;color:var(--navy);">Meta WhatsApp Cloud API &amp; Resurvey Accountability Hub</h3>
            <span class="arch-badge-live \${isLiveMode ? 'is-live' : 'is-sim'}" style="background:\${isLiveMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)'};border:1px solid \${isLiveMode ? '#10b981' : '#eab308'};color:\${isLiveMode ? '#059669' : '#b45309'};font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;">
              \${isLiveMode ? '🟢 Meta Cloud API: LIVE GRAPH API' : '🟡 Simulation Mode: Webhook Online · Verified'}
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

  if (content.includes(oldHeadingAndArch)) {
    content = content.replace(oldHeadingAndArch, newPolishedHeading);
    console.log(`  Replaced architecture diagram with polished heading in ${f}`);
  } else {
    console.warn(`  Could not find oldHeadingAndArch in ${f}`);
  }

  // E. Update bulkSendBtn.onclick to target the selected bulk radio scope
  const oldBulkSendOnclick = `  // Bulk Tier Broadcast Button
  if (bulkSendBtn) {
    bulkSendBtn.onclick = async () => {
      const activeList = getFilteredOfficers();
      const meta = getTierMeta();
      const senderTitle = senderOverride?.value.trim() || defaultSender;
      const count = activeList.length;

      const confirmed = confirm(
        \`🏛️ BROADCAST CONFIRMATION\\n\\n\` +
        \`Sender Designation: \${senderTitle}\\n\` +
        \`Jurisdiction Tier: \${meta.title}\\n\` +
        \`Target Officers: \${count} flagged officers\\n\\n\` +
        \`Do you want to dispatch official WhatsApp notices to all \${count} flagged \${meta.short}?\`
      );

      if (!confirmed) return;

      bulkSendBtn.disabled = true;
      bulkSendBtn.innerHTML = \`⏳ <span>Dispatching notices to all \${meta.short}...</span>\`;

      try {
        const oids = activeList.map(o => o.id);
        const res = await api('/api/whatsapp/broadcast-tier-notices', {
          method: 'POST',
          body: JSON.stringify({ tier: currentTier, officerIds: oids, senderTitle })
        });

        const rep = res.report || {};
        toast(\`Broadcast complete! Dispatched \${rep.totalDispatches || count} notices from \${senderTitle}.\`, 'success');
        bulkSendBtn.innerHTML = \`✓ Dispatched (\${rep.totalDispatches || count})\`;
        bulkSendBtn.style.background = '#059669';

        const freshLogs = await api('/api/whatsapp/logs');
        const logsWrap = document.getElementById('wa-logs-table-container');
        if (logsWrap) logsWrap.innerHTML = renderLogsTable(freshLogs.logs || []);
      } catch (err) {
        toast(\`Broadcast failed: \${err.message}\`, 'error');
        bulkSendBtn.disabled = false;
        bulkSendBtn.textContent = meta.broadcastBtn;
      }
    };
  }`;

  const newBulkSendOnclick = `  // Bulk Tier Broadcast Button (Controlled by Radio Button)
  if (bulkSendBtn) {
    bulkSendBtn.onclick = async () => {
      const active = getActiveOfficers();
      let targetList = active;
      if (currentBulkMode === 'bulk-zero-gt') {
        targetList = active.filter(o => (parseFloat(o.today_gt_extent) || 0) === 0 && (parseFloat(o.balance_gt_extent) || 0) > 0);
      } else if (currentBulkMode === 'bulk-dlr') {
        targetList = active.filter(o => (o.dlr_entries_balance || 0) > 0);
      }

      const meta = getTierMeta();
      const senderTitle = senderOverride?.value.trim() || defaultSender;
      const count = targetList.length;

      const withPhone = targetList.filter(o => o.phone && o.phone.trim().length >= 10);
      const withoutPhone = targetList.filter(o => !o.phone || o.phone.trim().length < 10);

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
      }

      bulkSendBtn.disabled = true;
      bulkSendBtn.innerHTML = \`⏳ <span>Dispatching notices to \${withPhone.length} \${meta.short}...</span>\`;

      try {
        const oids = withPhone.map(o => o.id);
        const res = await api('/api/whatsapp/broadcast-tier-notices', {
          method: 'POST',
          body: JSON.stringify({ tier: currentTier, officerIds: oids, senderTitle })
        });

        const rep = res.report || {};
        toast(\`Broadcast complete! Dispatched \${rep.sentCount || rep.totalDispatches || withPhone.length} notices from \${senderTitle}.\`, 'success');
        bulkSendBtn.innerHTML = \`✓ Dispatched (\${rep.sentCount || rep.totalDispatches || withPhone.length})\`;
        bulkSendBtn.style.background = '#059669';

        const freshLogs = await api('/api/whatsapp/logs');
        const logsWrap = document.getElementById('wa-logs-table-container');
        if (logsWrap) logsWrap.innerHTML = renderLogsTable(freshLogs.logs || []);
      } catch (err) {
        toast(\`Broadcast failed: \${err.message}\`, 'error');
        bulkSendBtn.disabled = false;
        bulkSendBtn.textContent = \`⚡ Broadcast Notices to \${withPhone.length} Verified \${meta.short}\`;
      }
    };
  }`;

  if (content.includes(oldBulkSendOnclick)) {
    content = content.replace(oldBulkSendOnclick, newBulkSendOnclick);
    console.log(`  Updated bulkSendBtn.onclick in ${f}`);
  } else {
    console.warn(`  Could not find oldBulkSendOnclick in ${f}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  Saved ${f}`);
});

console.log('Done patching.');
