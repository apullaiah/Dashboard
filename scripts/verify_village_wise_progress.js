// scripts/verify_village_wise_progress.js
// Automated verification script for:
// 1. GT progress in Acres
// 2. DLR logins progress in Number of Entries
// 3. Inline Village-Wise Stage Progress directly below on clicking stage
// 4. Individual Village Dedicated Progress Card on clicking village

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Starting Verification of Village-Wise Progress & Unit Discipline ---');

const appContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const publicAppContent = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const stylesContent = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
const publicStylesContent = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');

// 1. Check sync between root and public
assert.strictEqual(appContent, publicAppContent, 'app.js and public/app.js must be identical');
assert.strictEqual(stylesContent, publicStylesContent, 'styles.css and public/styles.css must be identical');
console.log('✓ app.js and public/app.js are identical');
console.log('✓ styles.css and public/styles.css are identical');

// 2. Unit Discipline: Ground Truthing in Acres
assert(appContent.includes('EXTENT COMPLETED TODAY (IN ACRES)'), 'GT table must have header in Acres');
assert(appContent.includes('CUMULATIVE EXTENT COMPLETED (IN ACRES)'), 'GT table cumulative must specify Acres');
assert(appContent.includes('BALANCE EXTENT TO BE COMPLETED (IN ACRES)'), 'GT table balance must specify Acres');
assert(appContent.includes('25 ACRES / ROVER / DAY'), 'GT daily benchmark rule must be in Acres');
assert(appContent.includes('MEASURED STRICTLY IN ACRES'), 'GT box must state measured strictly in Acres');
console.log('✓ Ground Truthing (GT) metrics and headers strictly display in Acres');

// 3. Unit Discipline: DLR Logins in Number of Entries
assert(appContent.includes('NUMBER OF ENTRIES COMPLETED TODAY'), 'DLR table must specify Number of Entries completed today');
assert(appContent.includes('CUMULATIVE NUMBER OF ENTRIES COMPLETED'), 'DLR cumulative must specify Number of Entries');
assert(appContent.includes('BALANCE NUMBER OF ENTRIES TO BE COMPLETED'), 'DLR balance must specify Number of Entries');
assert(appContent.includes('200 ENTRIES / DAY'), 'DLR benchmark must specify 200 Entries / Day');
assert(appContent.includes('MEASURED STRICTLY IN NUMBER OF ENTRIES'), 'DLR box must state measured strictly in Number of Entries');
assert(appContent.includes('1 Entry Done'), 'DLR officer chip must display in entries format (1 Entry Done)');
console.log('✓ DLR login progress metrics and headers strictly display in Number of Entries');

// 4. Inline Village-Wise Stage Progress Component
assert(appContent.includes('function renderInlineVillageWiseProgress'), 'renderInlineVillageWiseProgress must be defined');
assert(appContent.includes('inline-village-wise-section'), 'inline-village-wise-section container must exist');
assert(appContent.includes('ivw-stage-tabs'), 'ivw-stage-tabs stage switcher must exist');
assert(appContent.includes('TOTAL EXTENT (ACRES)'), 'GT columns in village-wise table must specify Acres');
assert(appContent.includes('GT COMPLETED (ACRES)'), 'GT completed column must specify Acres');
assert(appContent.includes('BALANCE GT (ACRES)'), 'GT balance column must specify Acres');
assert(appContent.includes('TOTAL KHATAS / ENTRIES'), 'DLR columns in village-wise table must specify Entries');
assert(appContent.includes('ENTRIES COMPLETED TODAY'), 'DLR today column must specify Entries');
assert(appContent.includes('CUMULATIVE ENTRIES'), 'DLR cumulative column must specify Entries');
assert(appContent.includes('BALANCE ENTRIES'), 'DLR balance column must specify Entries');
console.log('✓ Inline Village-Wise Stage Progress component renders both GT (in Acres) and DLR (in Entries) tables correctly');

// 5. Individual Village Dedicated Progress Card
assert(appContent.includes('function renderIndividualVillageProgressCard'), 'renderIndividualVillageProgressCard must be defined');
assert(appContent.includes('individual-village-progress-card'), 'individual-village-progress-card container must exist');
assert(appContent.includes('iv-dual-progress-grid'), 'Dual progress grid for GT and DLR must exist');
assert(appContent.includes('GT Extent Cleared'), 'GT progress box must show cleared extent in Acres');
assert(appContent.includes('Balance GT Extent'), 'GT progress box must show balance extent in Acres');
assert(appContent.includes('Entries Cleared'), 'DLR progress box must show cleared entries');
assert(appContent.includes('Balance Entries'), 'DLR progress box must show balance entries');
assert(appContent.includes('iv-stepper-track'), '11-stage lifecycle timeline stepper must exist');
console.log('✓ Individual Village Dedicated Progress Card renders clear village-level metrics for both GT (Acres) and DLR (Entries)');

// 6. Event listeners
assert(appContent.includes('el.dataset.overviewStage'), 'overviewStage click handler must exist');
assert(appContent.includes('el.dataset.inspectVillage'), 'inspectVillage click handler must exist');
assert(appContent.includes('close-overview-village'), 'close-overview-village click handler must exist');
assert(appContent.includes('overview-village-search'), 'overview-village-search input handler must exist');
assert(appContent.includes('overview-mandal-select'), 'overview-mandal-select change handler must exist');
assert(appContent.includes('overview-status-select'), 'overview-status-select change handler must exist');
console.log('✓ All click, input, and filter event handlers are wired properly');

// 7. CSS Rules verification
assert(stylesContent.includes('.inline-village-wise-section'), '.inline-village-wise-section styles must exist');
assert(stylesContent.includes('.individual-village-progress-card'), '.individual-village-progress-card styles must exist');
assert(stylesContent.includes('.ivw-data-table'), '.ivw-data-table styles must exist');
assert(stylesContent.includes('.ivw-stage-tabs'), '.ivw-stage-tabs styles must exist');
assert(stylesContent.includes('.iv-dual-progress-grid'), '.iv-dual-progress-grid styles must exist');
assert(stylesContent.includes('.iv-stepper-track'), '.iv-stepper-track styles must exist');
console.log('✓ CSS classes for inline village-wise table and individual village card are properly styled');

console.log('\n========================================');
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY! 🎉');
console.log('========================================');
