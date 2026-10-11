const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING CLEAN WHATSAPP UI & RADIO BUTTON BULK MESSAGING ===');

const appContent = fs.readFileSync('app.js', 'utf8');
const publicAppContent = fs.readFileSync('public/app.js', 'utf8');
const stylesContent = fs.readFileSync('styles.css', 'utf8');
const publicStylesContent = fs.readFileSync('public/styles.css', 'utf8');

// 1. ARCHITECTURE DIAGRAM REMOVAL
assert(!appContent.includes('whatsapp-arch-card'), 'whatsapp-arch-card must be removed from app.js');
assert(!publicAppContent.includes('whatsapp-arch-card'), 'whatsapp-arch-card must be removed from public/app.js');
assert(!appContent.includes('arch-diagram-flow'), 'arch-diagram-flow must be removed from app.js');
assert(!publicAppContent.includes('arch-diagram-flow'), 'arch-diagram-flow must be removed from public/app.js');
console.log('✓ Architecture pictorial diagram completely removed from app.js & public/app.js');

// 2. POLISHED HEADER & MINIMALIST LAYOUT
assert(appContent.includes('wa-header-polished'), 'wa-header-polished must be in app.js');
assert(stylesContent.includes('.wa-header-polished'), 'wa-header-polished must be styled in styles.css');
assert(appContent.includes('isLiveMode ? \'🟢 Meta Cloud API: LIVE GRAPH API\''), 'Live status badge present in polished header');
console.log('✓ Polished executive header with compact status badge verified');

// 3. BULK MESSAGE SENDING RADIO BUTTON SELECTORS
assert(appContent.includes('name="wa-dispatch-type-selector" value="individual"'), 'Individual radio button present');
assert(appContent.includes('name="wa-dispatch-type-selector" value="bulk-all"'), 'Bulk All radio button present');
assert(appContent.includes('name="wa-dispatch-type-selector" value="bulk-zero-gt"'), 'Bulk Zero GT radio button present');
assert(appContent.includes('name="wa-dispatch-type-selector" value="bulk-dlr"'), 'Bulk DLR radio button present');
assert(appContent.includes('wa-bulk-execute-panel'), 'Bulk execute panel present');
assert(stylesContent.includes('.wa-bulk-radio-strip'), 'Bulk radio strip styled');
assert(stylesContent.includes('.wa-bulk-execute-panel'), 'Bulk execute panel styled');
console.log('✓ All 4 dispatch radio buttons and interactive execute panel verified in HTML & CSS');

// 4. JAVASCRIPT EVENT LOGIC FOR BULK RADIOS
assert(appContent.includes('currentBulkMode = card.dataset.bulkRadio;'), 'Bulk radio click updates currentBulkMode');
assert(appContent.includes('currentBulkMode === \'bulk-zero-gt\''), 'Zero GT bulk filter supported in JS');
assert(appContent.includes('currentBulkMode === \'bulk-dlr\''), 'DLR pending bulk filter supported in JS');
console.log('✓ Interactive radio switching and bulk filtering logic verified');

// 5. PARITY CHECKS
assert.strictEqual(appContent, publicAppContent, 'app.js and public/app.js must be identical');
assert.strictEqual(stylesContent, publicStylesContent, 'styles.css and public/styles.css must be identical');
console.log('✓ 100% Code and CSS parity between root and public directories');

console.log('\nALL WHATSAPP CLEAN & RADIO BROADCAST VERIFICATIONS PASSED! 🎉');
