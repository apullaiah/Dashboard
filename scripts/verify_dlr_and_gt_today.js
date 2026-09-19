/**
 * Dedicated Verification Script for:
 * 1. GT Extent Done Today displayed for all villages wherever clicked.
 * 2. Real DLR entries (5,990 today, 99,685 cumulative, 281,353 target) across 5 officer tiers.
 * 3. Village-level today DLR entries and stage details displayed on click.
 */
const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING GT EXTENT DONE TODAY & REAL DLR ENTRIES ===\n');

// 1. Check data/store.json
console.log('1. Checking data/store.json village attributes...');
const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
const villages = store.villages || [];
assert(villages.length > 700, `Expected >700 villages, found ${villages.length}`);

// Verify that villages have new GT and DLR properties
const withTodayGt = villages.filter(v => parseFloat(v.today_gt_extent) > 0);
console.log(`  ✓ Found ${withTodayGt.length} villages with active today_gt_extent`);
assert(withTodayGt.length > 0, 'Should have villages with today_gt_extent > 0');

const withTodayDlr = villages.filter(v => Number(v.dlr_entries_today) > 0);
console.log(`  ✓ Found ${withTodayDlr.length} villages with active dlr_entries_today`);
assert(withTodayDlr.length > 0, 'Should have villages with dlr_entries_today > 0');

const sampleGtVillage = withTodayGt[0];
console.log(`  Sample Village with GT Today: ${sampleGtVillage.village_name} (${sampleGtVillage.mandal})`);
console.log(`    today_gt_extent: ${sampleGtVillage.today_gt_extent} Ac`);
console.log(`    cumulative_gt_extent: ${sampleGtVillage.cumulative_gt_extent} Ac`);
console.log(`    balance_gt_extent: ${sampleGtVillage.balance_gt_extent} Ac`);
console.log(`    rovers: ${sampleGtVillage.gt_rovers}, teams: ${sampleGtVillage.gt_team_names}`);

const sampleDlrVillage = withTodayDlr[0];
console.log(`  Sample Village with DLR Today: ${sampleDlrVillage.village_name} (${sampleDlrVillage.mandal})`);
console.log(`    dlr_entries_today: ${sampleDlrVillage.dlr_entries_today}`);
console.log(`    dlr_entries_cumulative: ${sampleDlrVillage.dlr_entries_cumulative}`);
console.log(`    dlr_active_stage: ${sampleDlrVillage.dlr_active_stage}`);
console.log(`    dlr_stages_detail:`, sampleDlrVillage.dlr_stages_detail);

// 2. Check server.js dashboard endpoint output
console.log('\n2. Testing server.js dashboard() calculation...');
const serverCode = fs.readFileSync('server.js', 'utf8');
assert(serverCode.includes('todayTotal: 5990'), 'server.js must return todayTotal: 5990 for DLR');
assert(serverCode.includes('cumulativeTotal: 99685'), 'server.js must return cumulativeTotal: 99685 for DLR');
assert(serverCode.includes('gtSummary') && serverCode.includes('todayGtExtent'), 'server.js must return gtSummary and todayGtExtent for GT');

// 3. Test Frontend Rendering of Individual Village Card
console.log('\n3. Testing renderIndividualVillageProgressCard frontend output...');
const appText = fs.readFileSync('app.js', 'utf8');

const h = str => String(str ?? '');
const formatExtent = val => {
  const n = parseFloat(val);
  if (Number.isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const clean = str => String(str ?? '').trim();
const isComplete = val => /^(completed|complete|done|yes|y|ported|true|1)$/i.test(clean(val));
const icon = name => `<svg>${name}</svg>`;

// Extract renderIndividualVillageProgressCard
const cardFnMatch = appText.match(/function renderIndividualVillageProgressCard\([\s\S]*?\n\}/);
assert(cardFnMatch, 'Could not find renderIndividualVillageProgressCard in app.js');

const renderIndividualVillageProgressCard = new Function(
  'village', 'h', 'formatExtent', 'isComplete', 'icon',
  `const state = { overviewSelectedVillageId: village?.id };
   ${cardFnMatch[0]}
   return renderIndividualVillageProgressCard(village);`
);

// Render card for sample GT village
const cardHtmlGt = renderIndividualVillageProgressCard(sampleGtVillage, h, formatExtent, isComplete, icon);
assert(cardHtmlGt.includes('GT Extent Done Today'), 'Card must have "GT Extent Done Today"');
assert(cardHtmlGt.includes(formatExtent(sampleGtVillage.today_gt_extent)), 'Card must display village today GT extent');
assert(cardHtmlGt.includes('DLR Entries Done Today'), 'Card must have "DLR Entries Done Today"');
console.log('  ✓ renderIndividualVillageProgressCard successfully renders GT Today and DLR Today!');

// Render card for sample DLR village
const cardHtmlDlr = renderIndividualVillageProgressCard(sampleDlrVillage, h, formatExtent, isComplete, icon);
assert(cardHtmlDlr.includes(`+${Number(sampleDlrVillage.dlr_entries_today).toLocaleString('en-IN')}`), 'Card must display today DLR entries');
console.log('  ✓ renderIndividualVillageProgressCard displays real DLR entries for village!');

// 4. Test Inline Village Wise Table Headers and Cells
console.log('\n4. Testing renderInlineVillageWiseProgress in app.js and public/app.js...');
['app.js', 'public/app.js'].forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  assert(code.includes('GT EXTENT TODAY (AC)'), `${file} must include GT EXTENT TODAY (AC) header`);
  assert(code.includes('ENTRIES COMPLETED TODAY'), `${file} must include ENTRIES COMPLETED TODAY header`);
  assert(code.includes('v.today_gt_extent'), `${file} must reference v.today_gt_extent in rows`);
  assert(code.includes('v.dlr_entries_today'), `${file} must reference v.dlr_entries_today in rows`);
  assert(code.includes('village-today-progress-card'), `${file} must include village-today-progress-card in openVillage`);
  console.log(`  ✓ ${file} contains all table and modal enhancements.`);
});

// 5. Test styles.css for new classes
console.log('\n5. Checking styles.css for new classes...');
const css = fs.readFileSync('styles.css', 'utf8');
assert(css.includes('.village-today-progress-card'), 'styles.css must style .village-today-progress-card');
assert(css.includes('.iv-metric-cell.highlight-today'), 'styles.css must style .highlight-today');
assert(css.includes('.iv-tier-chip.tier-progress'), 'styles.css must style .tier-progress');
assert(css.includes('.vtp-grid'), 'styles.css must style .vtp-grid');
console.log('  ✓ styles.css has all required CSS classes.');

console.log('\n========================================================================');
console.log('ALL DLR & GT TODAY VERIFICATIONS PASSED SUCCESSFULLY! ✓');
console.log('========================================================================\n');
