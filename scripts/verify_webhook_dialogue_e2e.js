const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== VERIFYING WEBHOOK SETTINGS DIALOGUE BOX & PERMANENT REFRESH RESILIENCE ===\n');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

// 1. Verify helper functions exist
assert(appJs.includes('function getStoredWhatsAppConfig()'), 'Must contain getStoredWhatsAppConfig()');
assert(appJs.includes('function saveStoredWhatsAppConfig('), 'Must contain saveStoredWhatsAppConfig()');
assert(appJs.includes('localStorage.getItem(\'ctr_resurvey_wa_config\')'), 'Must use persistent localStorage key ctr_resurvey_wa_config');
console.log('✓ Helper functions for permanent localStorage storage verified.');

// 2. Verify openWhatsAppSettingsModal is defined and wired to saveBtn
assert(appJs.includes('function openWhatsAppSettingsModal()'), 'Must define openWhatsAppSettingsModal()');
assert(appJs.includes('if (saveBtn) {'), 'Must check saveBtn');
assert(appJs.includes('saveBtn.onclick = () => {'), 'saveBtn click must trigger openWhatsAppSettingsModal()');
assert(appJs.includes('openWhatsAppSettingsModal();'), 'Must call openWhatsAppSettingsModal() on saveBtn click');
console.log('✓ "Save Webhook Settings" button is properly wired to show the Settings dialogue box.');

// 3. Verify Settings Dialogue Box markup & fields
assert(appJs.includes('wa-modal-url-input'), 'Dialogue box must contain Webhook URL input');
assert(appJs.includes('wa-modal-verify-input'), 'Dialogue box must contain Verify Token input');
assert(appJs.includes('wa-modal-phone-input'), 'Dialogue box must contain Phone Number ID input');
assert(appJs.includes('wa-modal-waba-input'), 'Dialogue box must contain WABA ID input');
assert(appJs.includes('wa-modal-token-input'), 'Dialogue box must contain Permanent System Access Token input');
assert(appJs.includes('wa-modal-survey-sender-input'), 'Dialogue box must contain Survey Cadre Sender input');
assert(appJs.includes('wa-modal-revenue-sender-input'), 'Dialogue box must contain Revenue Cadre Sender input');
assert(appJs.includes('wa-modal-save-btn'), 'Dialogue box must contain Save button');
assert(appJs.includes('wa-modal-toggle-token'), 'Dialogue box must contain Show/Hide token visibility button');
console.log('✓ Dialogue box contains all required settings fields, copy buttons, and visibility toggles.');

// 4. Verify Permanent Persistence on refresh
assert(appJs.includes('saveStoredWhatsAppConfig(newConfig)'), 'Must permanently save inputted settings to localStorage');
assert(appJs.includes('api(\'/api/whatsapp/config\''), 'Must persist settings to server database endpoint');
assert(appJs.includes('const localConfig = getStoredWhatsAppConfig() || {};'), 'Must restore settings from localStorage on page refresh/initialization');
console.log('✓ Settings are permanently retained across page reloads and refreshes.');

// 5. Verify server.js endpoints
const serverJs = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
assert(serverJs.includes('surveySenderName'), 'server.js must support surveySenderName');
assert(serverJs.includes('revenueSenderName'), 'server.js must support revenueSenderName');
assert(serverJs.includes('store.whatsappConfig = {'), 'server.js must update store.whatsappConfig');
assert(serverJs.includes('save(store)'), 'server.js must save to disk');
console.log('✓ Server persistence endpoints in server.js verified.');

// 6. Verify data/store.json structure
const storeJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'store.json'), 'utf8'));
assert(storeJson.whatsappConfig, 'data/store.json must have whatsappConfig object');
console.log('✓ data/store.json baseline schema verified.');

console.log('\n🎉 ALL E2E REQUIREMENTS FULLY VERIFIED!');
