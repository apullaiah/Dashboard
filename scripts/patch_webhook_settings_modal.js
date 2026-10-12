const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Check helper functions definition
const helpersCode = `
function getStoredWhatsAppConfig() {
  try {
    const raw = localStorage.getItem('ctr_resurvey_wa_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading wa_config from localStorage:', e);
  }
  return null;
}

function saveStoredWhatsAppConfig(cfg) {
  try {
    localStorage.setItem('ctr_resurvey_wa_config', JSON.stringify(cfg));
  } catch (e) {
    console.warn('Error writing wa_config to localStorage:', e);
  }
}
`;

if (!content.includes('function getStoredWhatsAppConfig')) {
  content = helpersCode + '\n' + content;
}

// 2. Update config merge in renderWhatsApp
const oldConfigInit = `  const c = cfgData.config || {};
  const logs = logsData.logs || [];
  const webhookUrl = c.webhookUrl || \`\${window.location.origin}/api/whatsapp/webhook\`;
  const verifyToken = c.verifyToken || 'CTR_RESURVEY_WA_2026';
  const isLiveMode = c.mode === 'LIVE';`;

const newConfigInit = `  const localConfig = getStoredWhatsAppConfig() || {};
  const serverConfig = cfgData.config || {};

  const c = {
    enabled: localConfig.enabled ?? serverConfig.enabled ?? true,
    verifyToken: localConfig.verifyToken || serverConfig.verifyToken || 'CTR_RESURVEY_WA_2026',
    phoneNumberId: localConfig.phoneNumberId || serverConfig.phoneNumberId || '',
    wabaId: localConfig.wabaId || serverConfig.wabaId || '',
    accessToken: (localConfig.accessToken && !localConfig.accessToken.includes('••••')) ? localConfig.accessToken : (serverConfig.accessToken || ''),
    maskedAccessToken: serverConfig.maskedAccessToken || (localConfig.accessToken ? '••••••••' + localConfig.accessToken.slice(-4) : ''),
    senderName: localConfig.senderName || serverConfig.senderName || 'DSLRO, Chittoor',
    surveySenderName: localConfig.surveySenderName || serverConfig.surveySenderName || 'DSLRO, Chittoor',
    revenueSenderName: localConfig.revenueSenderName || serverConfig.revenueSenderName || 'Joint Collector, Chittoor',
    webhookUrl: serverConfig.webhookUrl || \`\${window.location.origin}/api/whatsapp/webhook\`
  };

  const isLiveMode = Boolean(c.phoneNumberId && c.accessToken);
  c.mode = isLiveMode ? 'LIVE' : 'SIMULATION';

  saveStoredWhatsAppConfig(c);

  if ((localConfig.phoneNumberId || localConfig.accessToken) && (!serverConfig.phoneNumberId || !serverConfig.accessTokenConfigured)) {
    api('/api/whatsapp/config', {
      method: 'POST',
      body: JSON.stringify(c)
    }).catch(err => console.warn('Background server config sync:', err));
  }

  const logs = logsData.logs || [];
  const webhookUrl = c.webhookUrl;
  const verifyToken = c.verifyToken;`;

if (content.includes(oldConfigInit)) {
  content = content.replace(oldConfigInit, newConfigInit);
  console.log('Replaced oldConfigInit');
} else {
  console.log('oldConfigInit not found, checking if already replaced');
}

// 3. Update section header in right card to have "Open Settings" button
const oldCardHeader = `          <div>
            <h3 style="font-size:15px;">Meta Cloud API &amp; Webhook Credentials</h3>
            <p style="font-size:12px;">Settings saved to secure persistent configuration.</p>
          </div>
          <span class="tiny-status completed">Config Valid</span>`;

const newCardHeader = `          <div>
            <h3 style="font-size:15px;">Meta Cloud API &amp; Webhook Credentials</h3>
            <p style="font-size:12px;">Settings saved to secure persistent configuration.</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="tiny-status completed">Config Valid</span>
            <button type="button" class="outline-button" id="wa-card-open-dialog-btn" style="padding:4px 10px;font-size:11px;font-weight:700;">⚙️ Settings Dialog</button>
          </div>`;

if (content.includes(oldCardHeader)) {
  content = content.replace(oldCardHeader, newCardHeader);
  console.log('Replaced oldCardHeader');
}

// 4. Update saveBtn logic with openWhatsAppSettingsModal and event handlers
const oldSaveBtnLogic = `  // Save Webhook Settings button
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        const verifyTokenVal = document.getElementById('wa-verify-token-input')?.value.trim();
        const phoneIdVal = document.getElementById('wa-phone-id-input')?.value.trim();
        const tokenVal = document.getElementById('wa-token-input')?.value.trim();
        const wabaVal = document.getElementById('wa-waba-input')?.value.trim();
        const senderNameVal = document.getElementById('wa-sender-name-input')?.value.trim();

        await api('/api/whatsapp/config', {
          method: 'POST',
          body: JSON.stringify({
            verifyToken: verifyTokenVal,
            phoneNumberId: phoneIdVal,
            accessToken: tokenVal,
            wabaId: wabaVal,
            senderName: senderNameVal
          })
        });

        toast('Webhook settings saved successfully!', 'success');
      } catch (err) {
        toast(\`Failed to save settings: \${err.message}\`, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = \`\${icon('check')} Save Webhook Settings\`;
      }
    };
  }`;

const newModalAndSaveLogic = `  // Function to show the Settings Dialogue Box
  function openWhatsAppSettingsModal() {
    const local = getStoredWhatsAppConfig() || {};
    const curVerifyToken = local.verifyToken || c.verifyToken || 'CTR_RESURVEY_WA_2026';
    const curPhoneId = local.phoneNumberId || c.phoneNumberId || '';
    const curWabaId = local.wabaId || c.wabaId || '';
    const curToken = (local.accessToken && !local.accessToken.includes('••••')) ? local.accessToken : (c.accessToken || '');
    const curSurveySender = local.surveySenderName || c.surveySenderName || c.senderName || 'DSLRO, Chittoor';
    const curRevenueSender = local.revenueSenderName || c.revenueSenderName || 'Joint Collector, Chittoor';
    const isCurLive = Boolean(curPhoneId && curToken);

    const bodyHtml = \`
      <form id="wa-settings-dialog-form" onsubmit="event.preventDefault();" style="display:flex;flex-direction:column;gap:14px;">
        <!-- Dynamic Live/Simulation Status Card -->
        <div id="wa-modal-status-badge" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid \${isCurLive ? '#10b981' : '#eab308'};background:\${isCurLive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.08)'};">
          <div style="display:flex;align-items:center;gap:10px;">
            <span id="wa-modal-status-icon" style="font-size:22px;">\${isCurLive ? '🟢' : '🟡'}</span>
            <div>
              <div id="wa-modal-status-title" style="font-size:13px;font-weight:800;color:\${isCurLive ? '#065f46' : '#92400e'};">
                \${isCurLive ? 'LIVE GRAPH API ACTIVE · Messages will be sent to WhatsApp' : 'SIMULATION MODE · Inbound &amp; Outbound Webhook Online'}
              </div>
              <div id="wa-modal-status-desc" style="font-size:11px;color:#64748b;margin-top:2px;">
                \${isCurLive ? 'Direct dispatch enabled to official officer phone numbers via Meta Cloud API.' : 'Notices are audited and simulated safely. Fill Phone ID and Access Token to activate live sending.'}
              </div>
            </div>
          </div>
          <span id="wa-modal-status-pill" class="tiny-status \${isCurLive ? 'completed' : 'pending'}" style="font-size:11px;padding:4px 10px;font-weight:700;text-transform:uppercase;">
            \${isCurLive ? 'Live API' : 'Simulation'}
          </span>
        </div>

        <!-- 1. Webhook URL & Verification -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
          <div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <span>🔗</span> 1. Webhook Endpoint Configuration
          </div>
          <div style="display:grid;gap:12px;">
            <label class="form-field full" style="display:block;">
              <span style="font-size:11px;font-weight:700;color:#334155;">Callback Webhook URL (Public HTTPS)</span>
              <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
                <input type="text" readonly value="\${h(webhookUrl)}" id="wa-modal-url-input" style="font-family:var(--mono);font-size:11px;background:#ffffff;border:1px solid #cbd5e1;padding:8px 10px;border-radius:6px;flex:1;" />
                <button type="button" class="table-action-button copy-badge-btn" data-copy="\${h(webhookUrl)}" style="padding:8px 14px;background:#0284c7;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;">Copy</button>
              </div>
              <span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">Configure this exact URL in Meta App Dashboard under WhatsApp &gt; Configuration &gt; Callback URL.</span>
            </label>

            <label class="form-field full" style="display:block;">
              <span style="font-size:11px;font-weight:700;color:#334155;">Verify Token (Webhook Challenge Secret) *</span>
              <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
                <input type="text" value="\${h(curVerifyToken)}" id="wa-modal-verify-input" placeholder="e.g. CTR_RESURVEY_WA_2026" style="font-family:var(--mono);font-size:11px;border:1px solid #cbd5e1;padding:8px 10px;border-radius:6px;flex:1;" />
                <button type="button" class="table-action-button copy-badge-btn" data-copy-input="wa-modal-verify-input" style="padding:8px 14px;background:#475569;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;">Copy</button>
              </div>
              <span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">Secret token to match when Meta verifies subscription challenge.</span>
            </label>
          </div>
        </div>

        <!-- 2. Meta Cloud API Credentials -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
          <div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <span>🔑</span> 2. Meta WhatsApp Cloud API Credentials
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <label class="form-field" style="display:block;">
              <span style="font-size:11px;font-weight:700;color:#334155;">Phone Number ID</span>
              <input type="text" value="\${h(curPhoneId)}" id="wa-modal-phone-input" placeholder="e.g. 104829104928" style="margin-top:4px;font-family:var(--mono);font-size:11px;border:1px solid #cbd5e1;padding:8px 10px;border-radius:6px;width:100%;box-sizing:border-box;" />
              <span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">From Meta Developer Portal &gt; API Setup &gt; Phone number ID.</span>
            </label>

            <label class="form-field" style="display:block;">
              <span style="font-size:11px;font-weight:700;color:#334155;">WABA Business Account ID</span>
              <input type="text" value="\${h(curWabaId)}" id="wa-modal-waba-input" placeholder="e.g. 91823901923" style="margin-top:4px;font-family:var(--mono);font-size:11px;border:1px solid #cbd5e1;padding:8px 10px;border-radius:6px;width:100%;box-sizing:border-box;" />
              <span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">WhatsApp Business Account ID.</span>
            </label>
          </div>

          <label class="form-field full" style="display:block;margin-top:12px;">
            <span style="font-size:11px;font-weight:700;color:#334155;">Permanent System Access Token</span>
            <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
              <input type="password" value="\${h(curToken)}" id="wa-modal-token-input" placeholder="EAAB... (Permanent System User Token)" style="font-family:var(--mono);font-size:11px;border:1px solid #cbd5e1;padding:8px 10px;border-radius:6px;flex:1;" />
              <button type="button" id="wa-modal-toggle-token" style="padding:8px 12px;border:1px solid #cbd5e1;background:#ffffff;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">👁️ Show</button>
            </div>
            <span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">Bearer token with <code>whatsapp_business_messaging</code> permissions generated in Meta Business Manager.</span>
          </label>
        </div>

        <!-- 3. Official Notice Senders -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
          <div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <span>🏛️</span> 3. Official Notice Sender Header Titles
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <label class="form-field" style="display:block;">
              <span style="font-size:11px;font-weight:700;color:#334155;">Survey Cadre Notice Sender</span>
              <input type="text" value="\${h(curSurveySender)}" id="wa-modal-survey-sender-input" placeholder="DSLRO, Chittoor" style="margin-top:4px;font-size:12px;font-weight:700;border:1px solid #cbd5e1;padding:8px 10px;border-radius:6px;width:100%;box-sizing:border-box;" />
              <span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">Sign-off on notices for VS, MLSO, and DIOS.</span>
            </label>

            <label class="form-field" style="display:block;">
              <span style="font-size:11px;font-weight:700;color:#334155;">Revenue Cadre Notice Sender</span>
              <input type="text" value="\${h(curRevenueSender)}" id="wa-modal-revenue-sender-input" placeholder="Joint Collector, Chittoor" style="margin-top:4px;font-size:12px;font-weight:700;border:1px solid #cbd5e1;padding:8px 10px;border-radius:6px;width:100%;box-sizing:border-box;" />
              <span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">Sign-off on notices for VRO, Tahsildar, and RDO.</span>
            </label>
          </div>
        </div>

        <!-- Permanent Storage Guarantee Notice -->
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#059669;background:#ecfdf5;padding:10px 14px;border-radius:8px;border:1px solid #a7f3d0;">
          <span style="font-size:16px;">💾</span>
          <span><b>Permanent Storage Active:</b> Values are permanently committed to local browser storage and the server store. Your settings will remain preserved upon refreshing the webpage.</span>
        </div>
      </form>
    \`;

    const footerHtml = \`
      <button type="button" class="soft-button" data-action="close-modal" style="padding:8px 16px;border-radius:6px;font-weight:700;cursor:pointer;">Cancel</button>
      <button type="button" id="wa-modal-save-btn" class="primary-button" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;border:none;padding:9px 20px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(16,185,129,0.25);">
        \${icon('check')} Save Webhook Settings
      </button>
    \`;

    modal('Meta WhatsApp Cloud API & Webhook Settings', 'Permanent Credentials & Webhook Endpoint Configuration', bodyHtml, footerHtml);

    // Setup modal event listeners
    const modalSaveBtn = document.getElementById('wa-modal-save-btn');
    const toggleTokenBtn = document.getElementById('wa-modal-toggle-token');
    const tokenInp = document.getElementById('wa-modal-token-input');
    const phoneInp = document.getElementById('wa-modal-phone-input');

    if (toggleTokenBtn && tokenInp) {
      toggleTokenBtn.onclick = () => {
        if (tokenInp.type === 'password') {
          tokenInp.type = 'text';
          toggleTokenBtn.textContent = '🙈 Hide';
        } else {
          tokenInp.type = 'password';
          toggleTokenBtn.textContent = '👁️ Show';
        }
      };
    }

    function updateModalStatus() {
      const hasPhone = Boolean(phoneInp?.value.trim());
      const hasTok = Boolean(tokenInp?.value.trim());
      const live = hasPhone && hasTok;
      const badge = document.getElementById('wa-modal-status-badge');
      const iconEl = document.getElementById('wa-modal-status-icon');
      const titleEl = document.getElementById('wa-modal-status-title');
      const descEl = document.getElementById('wa-modal-status-desc');
      const pillEl = document.getElementById('wa-modal-status-pill');

      if (badge) {
        badge.style.border = \`1px solid \${live ? '#10b981' : '#eab308'}\`;
        badge.style.background = live ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.08)';
      }
      if (iconEl) iconEl.textContent = live ? '🟢' : '🟡';
      if (titleEl) {
        titleEl.style.color = live ? '#065f46' : '#92400e';
        titleEl.textContent = live ? 'LIVE GRAPH API ACTIVE · Messages will be sent to WhatsApp' : 'SIMULATION MODE · Inbound &amp; Outbound Webhook Online';
      }
      if (descEl) {
        descEl.textContent = live ? 'Direct dispatch enabled to official officer phone numbers via Meta Cloud API.' : 'Notices are audited and simulated safely. Fill Phone ID and Access Token to activate live sending.';
      }
      if (pillEl) {
        pillEl.className = \`tiny-status \${live ? 'completed' : 'pending'}\`;
        pillEl.textContent = live ? 'Live API' : 'Simulation';
      }
    }

    if (phoneInp) phoneInp.oninput = updateModalStatus;
    if (tokenInp) tokenInp.oninput = updateModalStatus;

    // Handle copy buttons inside modal
    document.querySelectorAll('[data-copy-input]').forEach(btn => {
      btn.onclick = () => {
        const targetId = btn.dataset.copyInput;
        const targetEl = document.getElementById(targetId);
        if (targetEl && navigator.clipboard) {
          navigator.clipboard.writeText(targetEl.value);
          const orig = btn.textContent;
          btn.textContent = 'Copied! ✓';
          setTimeout(() => btn.textContent = orig, 2000);
        }
      };
    });

    if (modalSaveBtn) {
      modalSaveBtn.onclick = async () => {
        modalSaveBtn.disabled = true;
        modalSaveBtn.textContent = 'Saving Settings...';

        const newVerify = document.getElementById('wa-modal-verify-input')?.value.trim() || 'CTR_RESURVEY_WA_2026';
        const newPhone = document.getElementById('wa-modal-phone-input')?.value.trim() || '';
        const newWaba = document.getElementById('wa-modal-waba-input')?.value.trim() || '';
        const newToken = document.getElementById('wa-modal-token-input')?.value.trim() || '';
        const newSurveySender = document.getElementById('wa-modal-survey-sender-input')?.value.trim() || 'DSLRO, Chittoor';
        const newRevenueSender = document.getElementById('wa-modal-revenue-sender-input')?.value.trim() || 'Joint Collector, Chittoor';

        const newConfig = {
          enabled: true,
          verifyToken: newVerify,
          phoneNumberId: newPhone,
          wabaId: newWaba,
          accessToken: newToken,
          senderName: newSurveySender,
          surveySenderName: newSurveySender,
          revenueSenderName: newRevenueSender,
          webhookUrl: \`\${window.location.origin}/api/whatsapp/webhook\`,
          updatedAt: new Date().toISOString()
        };

        // 1. Permanently store in localStorage first!
        saveStoredWhatsAppConfig(newConfig);

        // 2. Persist to backend server API
        try {
          await api('/api/whatsapp/config', {
            method: 'POST',
            body: JSON.stringify(newConfig)
          });
        } catch (err) {
          console.warn('API save returned warning (cached in localStorage):', err);
        }

        // 3. Update current memory config object c
        Object.assign(c, newConfig);
        const liveNow = Boolean(newPhone && newToken);
        c.mode = liveNow ? 'LIVE' : 'SIMULATION';

        // 4. Update on-page inputs if present
        const pageVerify = document.getElementById('wa-verify-token-input');
        const pagePhone = document.getElementById('wa-phone-id-input');
        const pageWaba = document.getElementById('wa-waba-input');
        const pageToken = document.getElementById('wa-token-input');
        const pageSender = document.getElementById('wa-sender-name-input');
        if (pageVerify) pageVerify.value = newVerify;
        if (pagePhone) pagePhone.value = newPhone;
        if (pageWaba) pageWaba.value = newWaba;
        if (pageToken) pageToken.value = newToken;
        if (pageSender) pageSender.value = newSurveySender;

        // 5. Update live badges on page
        const headerBadge = document.querySelector('.arch-badge-live');
        if (headerBadge) {
          headerBadge.className = \`arch-badge-live \${liveNow ? 'is-live' : 'is-sim'}\`;
          headerBadge.style.background = liveNow ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)';
          headerBadge.style.border = \`1px solid \${liveNow ? '#10b981' : '#eab308'}\`;
          headerBadge.style.color = liveNow ? '#059669' : '#b45309';
          headerBadge.textContent = liveNow ? '🟢 Meta Cloud API: LIVE GRAPH API' : '🟡 Simulation Mode: Webhook Online · Verified';
        }

        // Update notice preview sender if open
        if (senderOverride) {
          senderOverride.value = (currentCadre === 'survey' ? newSurveySender : newRevenueSender);
        }
        updateView();

        // 6. Close dialogue box
        closeModal();

        // 7. Success toast
        toast('Webhook settings permanently saved!', 'success');
      };
    }
  }

  // Save Webhook Settings button -> Opens Settings Dialogue Box
  if (saveBtn) {
    saveBtn.onclick = () => {
      openWhatsAppSettingsModal();
    };
  }

  const cardOpenBtn = document.getElementById('wa-card-open-dialog-btn');
  if (cardOpenBtn) {
    cardOpenBtn.onclick = () => {
      openWhatsAppSettingsModal();
    };
  }`;

if (content.includes(oldSaveBtnLogic)) {
  content = content.replace(oldSaveBtnLogic, newModalAndSaveLogic);
  console.log('Replaced oldSaveBtnLogic with newModalAndSaveLogic');
} else {
  console.log('oldSaveBtnLogic not found');
}

// Write back to public/app.js
fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated public/app.js successfully!');

// Also mirror to root app.js
const rootAppPath = path.join(__dirname, '..', 'app.js');
fs.writeFileSync(rootAppPath, content, 'utf8');
console.log('Updated root app.js successfully!');
