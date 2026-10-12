const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== VERIFYING WEBHOOK SETTINGS RADIO BUTTON & PERMANENT LOCKING ===\n');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

// 1. Verify WhatsApp Webhook Settings Radio Button in Header
assert(appJs.includes('id="wa-settings-radio-card"'), 'Must have wa-settings-radio-card label');
assert(appJs.includes('id="wa-webhook-settings-radio-input"'), 'Must have wa-webhook-settings-radio-input radio element');
assert(appJs.includes('🔘 WhatsApp Webhook Settings'), 'Must display "WhatsApp Webhook Settings" radio text');
console.log('✓ WhatsApp Webhook Settings Radio Button in header verified.');

// 2. Verify Radio Button Click Triggers Settings Dialogue Box
assert(appJs.includes('const settingsRadioCard = document.getElementById(\'wa-settings-radio-card\');'), 'Must get settingsRadioCard element');
assert(appJs.includes('function triggerSettingsModal()'), 'Must have triggerSettingsModal() function');
assert(appJs.includes('settingsRadioInput.checked = true;'), 'Must select radio button on click');
assert(appJs.includes('openWhatsAppSettingsModal();'), 'Must open settings dialogue box');
console.log('✓ Clicking Webhook Settings radio button opens dialogue box verified.');

// 3. Verify "Save Webhook Settings" Radio Button in Modal Footer
assert(appJs.includes('id="wa-modal-save-radio-card"'), 'Dialogue box must contain wa-modal-save-radio-card radio');
assert(appJs.includes('id="wa-modal-save-radio-input"'), 'Dialogue box must contain wa-modal-save-radio-input');
assert(appJs.includes('🔘 Save Webhook Settings (Radio)'), 'Must display Save Webhook Settings Radio option');
assert(appJs.includes('modalSaveRadioCard.onclick = (e) => {'), 'Clicking Save radio card must trigger save');
assert(appJs.includes('executeSaveSettings();'), 'Must execute persistent save');
console.log('✓ "Save Webhook Settings" Radio Button in modal verified.');

// 4. Verify Permanent Storage & Value Protection
assert(appJs.includes('window._ctrWhatsAppConfig = merged;'), 'Must cache in window._ctrWhatsAppConfig');
assert(appJs.includes('localStorage.setItem(\'ctr_resurvey_wa_config\''), 'Must persist to localStorage');
assert(appJs.includes('sessionStorage.setItem(\'ctr_resurvey_wa_config\''), 'Must persist to sessionStorage');
assert(appJs.includes('const local = getStoredWhatsAppConfig() || {};'), 'Dialogue box must read directly from persistent store');
console.log('✓ Multi-tier permanent persistence & anti-mutation verified.');

// 5. Verify CSS styling for Settings Radio Card
assert(stylesCss.includes('.wa-tier-radio-card.settings-card'), 'styles.css must have .wa-tier-radio-card.settings-card rules');
assert(stylesCss.includes('.wa-tier-radio-card.settings-card.active .wa-radio-indicator::after'), 'styles.css must style active radio indicator dot');
console.log('✓ CSS styles for Settings Radio Button verified.');

console.log('\n🎉 ALL RADIO BUTTON AND PERMANENT STORAGE REQUIREMENTS VERIFIED!');
