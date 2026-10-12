const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let appJs = fs.readFileSync(appPath, 'utf8');

// 1. Ensure robust storage functions
const storageFunctions = `
// MULTI-TIER RESILIENT WHATSAPP CONFIG STORAGE
function getStoredWhatsAppConfig() {
  if (window._ctrWhatsAppConfig && window._ctrWhatsAppConfig.savedAt) {
    return window._ctrWhatsAppConfig;
  }
  try {
    const rawLocal = localStorage.getItem('ctr_resurvey_wa_config');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      window._ctrWhatsAppConfig = parsed;
      return parsed;
    }
  } catch (e) {}
  try {
    const rawSession = sessionStorage.getItem('ctr_resurvey_wa_config');
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      window._ctrWhatsAppConfig = parsed;
      return parsed;
    }
  } catch (e) {}
  return null;
}

function saveStoredWhatsAppConfig(cfg) {
  try {
    const existing = getStoredWhatsAppConfig() || {};
    const merged = {
      enabled: cfg.enabled ?? existing.enabled ?? true,
      verifyToken: cfg.verifyToken || existing.verifyToken || 'CTR_RESURVEY_WA_2026',
      phoneNumberId: (cfg.phoneNumberId !== undefined && cfg.phoneNumberId !== null && cfg.phoneNumberId !== '') ? cfg.phoneNumberId : (existing.phoneNumberId || ''),
      wabaId: (cfg.wabaId !== undefined && cfg.wabaId !== null && cfg.wabaId !== '') ? cfg.wabaId : (existing.wabaId || ''),
      accessToken: (cfg.accessToken && !cfg.accessToken.includes('••••')) ? cfg.accessToken : (existing.accessToken || ''),
      senderName: cfg.senderName || existing.senderName || 'DSLRO, Chittoor',
      surveySenderName: cfg.surveySenderName || existing.surveySenderName || 'DSLRO, Chittoor',
      revenueSenderName: cfg.revenueSenderName || existing.revenueSenderName || 'Joint Collector, Chittoor',
      webhookUrl: cfg.webhookUrl || existing.webhookUrl || \`\${window.location.origin}/api/whatsapp/webhook\`,
      savedAt: cfg.savedAt || new Date().toISOString()
    };
    window._ctrWhatsAppConfig = merged;
    localStorage.setItem('ctr_resurvey_wa_config', JSON.stringify(merged));
    sessionStorage.setItem('ctr_resurvey_wa_config', JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('Error writing wa_config to persistent storage:', e);
  }
}
`;

// Replace existing getStoredWhatsAppConfig block
const helperRegex = /\/\/ MULTI-TIER RESILIENT WHATSAPP CONFIG STORAGE[\s\S]*?^}\s*function/m;
if (appJs.includes('function getStoredWhatsAppConfig()')) {
  // Replace from start of getStoredWhatsAppConfig to end of saveStoredWhatsAppConfig
  const regex = /function getStoredWhatsAppConfig\(\)[\s\S]*?^}\n/m;
  appJs = appJs.replace(regex, '');
  const regex2 = /function saveStoredWhatsAppConfig\(cfg\)[\s\S]*?^}\n/m;
  appJs = appJs.replace(regex2, '');
}
appJs = storageFunctions + '\n' + appJs;

// 2. Update the header actions to include WhatsApp Webhook Settings Radio Button
const oldHeaderAction = `<div class="content-actions">
        <button class="primary-button" id="wa-save-config-btn" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;">
          \${icon('check')} Save Webhook Settings
        </button>
      </div>`;

const newHeaderAction = `<div class="content-actions" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <!-- WHATSAPP WEBHOOK SETTINGS RADIO BUTTON -->
        <label class="wa-tier-radio-card settings-card" id="wa-settings-radio-card" style="margin:0;cursor:pointer;padding:8px 14px;border:2px solid #059669;background:#ffffff;border-radius:10px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(5,150,105,0.15);transition:all 0.2s ease;">
          <input type="radio" name="wa-header-action-radio" id="wa-webhook-settings-radio-input" style="cursor:pointer;" />
          <div class="wa-radio-indicator" style="border-color:#059669;"></div>
          <div class="wa-radio-info" style="display:flex;flex-direction:column;">
            <div class="wa-radio-name" style="font-weight:800;font-size:12px;color:#065f46;display:flex;align-items:center;gap:6px;">
              🔘 WhatsApp Webhook Settings
            </div>
            <div class="wa-radio-sub" style="font-size:10px;color:#64748b;">
              Click radio to open credentials &amp; settings dialogue
            </div>
          </div>
          <span class="wa-radio-pill \${isLiveMode ? 'live' : 'sim'}" id="wa-header-settings-pill" style="margin-left:4px;font-size:10px;padding:3px 8px;font-weight:800;border-radius:12px;background:\${isLiveMode ? '#dcfce7' : '#fef3c7'};color:\${isLiveMode ? '#15803d' : '#b45309'};">
            \${isLiveMode ? '🟢 Live API' : '🟡 Simulation'}
          </span>
        </label>
        <button class="primary-button" id="wa-save-config-btn" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;font-size:12px;padding:8px 16px;font-weight:700;">
          \${icon('check')} Save Webhook Settings
        </button>
      </div>`;

if (appJs.includes(oldHeaderAction)) {
  appJs = appJs.replace(oldHeaderAction, newHeaderAction);
  console.log('Replaced oldHeaderAction with newHeaderAction containing Radio Button');
} else {
  console.log('oldHeaderAction not found, checking existing content_actions');
}

// 3. Update the dialogue box modal footer to include the "Save Webhook Settings" Radio Button
const oldModalFooter = `const footerHtml = \`
      <button type="button" class="soft-button" data-action="close-modal" style="padding:8px 16px;border-radius:6px;font-weight:700;cursor:pointer;">Cancel</button>
      <button type="button" id="wa-modal-save-btn" class="primary-button" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;border:none;padding:9px 20px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(16,185,129,0.25);">
        \${icon('check')} Save Webhook Settings
      </button>
    \`;`;

const newModalFooter = `const footerHtml = \`
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:12px;flex-wrap:wrap;">
        <!-- SAVE WEBHOOK SETTINGS RADIO BUTTON -->
        <label class="wa-tier-radio-card settings-card active" id="wa-modal-save-radio-card" style="margin:0;cursor:pointer;padding:8px 16px;border:2px solid #059669;background:#ecfdf5;border-radius:8px;display:flex;align-items:center;gap:10px;transition:all 0.2s ease;">
          <input type="radio" name="wa-dialog-save-action" id="wa-modal-save-radio-input" checked style="cursor:pointer;" />
          <div class="wa-radio-indicator" style="border-color:#059669;"></div>
          <div style="display:flex;flex-direction:column;">
            <b style="font-size:12px;color:#065f46;">🔘 Save Webhook Settings (Radio)</b>
            <span style="font-size:10px;color:#047857;">Click to permanently lock &amp; store settings</span>
          </div>
        </label>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="soft-button" data-action="close-modal" style="padding:8px 16px;border-radius:6px;font-weight:700;cursor:pointer;">Cancel</button>
          <button type="button" id="wa-modal-save-btn" class="primary-button" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;border:none;padding:9px 20px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(16,185,129,0.25);">
            \${icon('check')} Save Webhook Settings
          </button>
        </div>
      </div>
    \`;`;

if (appJs.includes(oldModalFooter)) {
  appJs = appJs.replace(oldModalFooter, newModalFooter);
  console.log('Replaced oldModalFooter with newModalFooter containing Save Radio Button');
}

// 4. Update the wiring for the radio button in modal and on header
const oldWiring = `  // Save Webhook Settings button -> Opens Settings Dialogue Box
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

const newWiring = `  // Webhook Settings Radio Button & Buttons -> Opens Settings Dialogue Box
  const settingsRadioCard = document.getElementById('wa-settings-radio-card');
  const settingsRadioInput = document.getElementById('wa-webhook-settings-radio-input');

  function triggerSettingsModal() {
    if (settingsRadioInput) settingsRadioInput.checked = true;
    if (settingsRadioCard) settingsRadioCard.classList.add('active');
    openWhatsAppSettingsModal();
  }

  if (settingsRadioCard) {
    settingsRadioCard.onclick = (e) => {
      e.preventDefault();
      triggerSettingsModal();
    };
  }

  if (settingsRadioInput) {
    settingsRadioInput.onchange = () => {
      triggerSettingsModal();
    };
  }

  if (saveBtn) {
    saveBtn.onclick = () => {
      triggerSettingsModal();
    };
  }

  const cardOpenBtn = document.getElementById('wa-card-open-dialog-btn');
  if (cardOpenBtn) {
    cardOpenBtn.onclick = () => {
      triggerSettingsModal();
    };
  }`;

if (appJs.includes(oldWiring)) {
  appJs = appJs.replace(oldWiring, newWiring);
  console.log('Replaced oldWiring with newWiring');
}

// 5. Wire the save radio card inside the modal
const oldSaveBtnListener = `    if (modalSaveBtn) {
      modalSaveBtn.onclick = async () => {`;

const newSaveBtnListener = `    const modalSaveRadioCard = document.getElementById('wa-modal-save-radio-card');

    async function executeSaveSettings() {
      if (modalSaveBtn) {
        modalSaveBtn.disabled = true;
        modalSaveBtn.textContent = 'Saving Settings...';
      }
      if (modalSaveRadioCard) {
        modalSaveRadioCard.classList.add('active');
      }

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

      // 1. Permanently store in multi-tier persistent storage
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

      const headerSettingsPill = document.getElementById('wa-header-settings-pill');
      if (headerSettingsPill) {
        headerSettingsPill.className = \`wa-radio-pill \${liveNow ? 'live' : 'sim'}\`;
        headerSettingsPill.textContent = liveNow ? '🟢 Live API' : '🟡 Simulation';
        headerSettingsPill.style.background = liveNow ? '#dcfce7' : '#fef3c7';
        headerSettingsPill.style.color = liveNow ? '#15803d' : '#b45309';
      }

      // Update notice preview sender if open
      if (senderOverride) {
        senderOverride.value = (currentCadre === 'survey' ? newSurveySender : newRevenueSender);
      }
      updateView();

      // Reset header radio button
      if (settingsRadioInput) settingsRadioInput.checked = false;
      if (settingsRadioCard) settingsRadioCard.classList.remove('active');

      // 6. Close dialogue box
      closeModal();

      // 7. Success toast
      toast('Webhook settings permanently saved!', 'success');
    }

    if (modalSaveRadioCard) {
      modalSaveRadioCard.onclick = (e) => {
        e.preventDefault();
        executeSaveSettings();
      };
    }

    if (modalSaveBtn) {
      modalSaveBtn.onclick = () => executeSaveSettings();
    }`;

// Replace the entire if (modalSaveBtn) { modalSaveBtn.onclick = async () => { ... } } block
const saveBlockRegex = /if \(modalSaveBtn\) \{\s*modalSaveBtn\.onclick = async \(\) => \{[\s\S]*?toast\('Webhook settings permanently saved!', 'success'\);\s*\};\s*\}/m;
if (saveBlockRegex.test(appJs)) {
  appJs = appJs.replace(saveBlockRegex, newSaveBtnListener);
  console.log('Replaced saveBlockRegex with newSaveBtnListener');
} else {
  console.log('saveBlockRegex not found');
}

// Ensure when modal is closed, header radio button is unchecked
const oldCloseModal = `function closeModal() { modalRoot.innerHTML = ''; }`;
const newCloseModal = `function closeModal() {
  modalRoot.innerHTML = '';
  const rInp = document.getElementById('wa-webhook-settings-radio-input');
  const rCard = document.getElementById('wa-settings-radio-card');
  if (rInp) rInp.checked = false;
  if (rCard) rCard.classList.remove('active');
}`;

if (appJs.includes(oldCloseModal)) {
  appJs = appJs.replace(oldCloseModal, newCloseModal);
  console.log('Replaced oldCloseModal');
}

// Save back to public/app.js and app.js
fs.writeFileSync(appPath, appJs, 'utf8');
const rootAppPath = path.join(__dirname, '..', 'app.js');
fs.writeFileSync(rootAppPath, appJs, 'utf8');
console.log('Saved to public/app.js and app.js successfully!');

// 6. Append CSS styles for .settings-card in styles.css and public/styles.css
const stylesPath = path.join(__dirname, '..', 'styles.css');
const publicStylesPath = path.join(__dirname, '..', 'public', 'styles.css');
let css = fs.readFileSync(stylesPath, 'utf8');

const newCssRules = `
/* WhatsApp Webhook Settings Radio Card Styles */
.wa-tier-radio-card.settings-card {
  border-color: #10b981;
  background: #ffffff;
}
.wa-tier-radio-card.settings-card:hover {
  border-color: #059669;
  background: #f0fdf4;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}
.wa-tier-radio-card.settings-card.active,
.wa-tier-radio-card.settings-card:has(input:checked) {
  border-color: #059669;
  background: #ecfdf5;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.22);
}
.wa-tier-radio-card.settings-card .wa-radio-indicator {
  border-color: #059669;
}
.wa-tier-radio-card.settings-card.active .wa-radio-indicator::after,
.wa-tier-radio-card.settings-card:has(input:checked) .wa-radio-indicator::after {
  background: #059669;
  transform: scale(1);
}
`;

if (!css.includes('.wa-tier-radio-card.settings-card')) {
  css += newCssRules;
  fs.writeFileSync(stylesPath, css, 'utf8');
  if (fs.existsSync(publicStylesPath)) {
    fs.writeFileSync(publicStylesPath, css, 'utf8');
  }
  console.log('Appended CSS to styles.css and public/styles.css');
}
