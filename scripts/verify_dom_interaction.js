// scripts/verify_dom_interaction.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Verifying DOM rendering and interactive functions ---');

const appContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

// Test data
const sampleVillages = [
  {
    id: 'vlg-101',
    village_code: '1061001',
    village_name: 'PEDDUR',
    mandal: 'Bangarupalem',
    division: 'Chittoor',
    phase: 'Phase V',
    ppb_cycle: 'September 2026',
    extent: '1450.50',
    patta_extent: '1200.00',
    govt_extent: '250.50',
    khatas: '850',
    ppb_target: '720',
    gt_status: 'Completed',
    vectorization_status: 'Completed',
    vs_status: 'Completed',
    vro_status: 'Completed',
    tahsildar_status: 'Completed',
    rdo_status: 'Pending',
    jc_status: 'Pending',
    section13_status: 'Pending',
    draft_ror_status: 'Pending',
    final_ror_status: 'Pending',
    webland_2_status: 'Pending',
    status: 'In Progress'
  },
  {
    id: 'vlg-102',
    village_code: '1061002',
    village_name: 'MOGILI',
    mandal: 'Bangarupalem',
    division: 'Chittoor',
    phase: 'Phase V',
    ppb_cycle: 'October 2026',
    extent: '2100.25',
    patta_extent: '1800.00',
    govt_extent: '300.25',
    khatas: '1240',
    ppb_target: '950',
    gt_status: 'In Progress',
    vectorization_status: 'Pending',
    vs_status: 'Pending',
    vro_status: 'Pending',
    tahsildar_status: 'Pending',
    rdo_status: 'Pending',
    jc_status: 'Pending',
    section13_status: 'Pending',
    draft_ror_status: 'Pending',
    final_ror_status: 'Pending',
    webland_2_status: 'Pending',
    status: 'In Progress'
  }
];

// Evaluate the functions in a controlled sandbox
const vm = require('vm');
const context = {
  console,
  sampleVillages,
  state: {
    overviewActiveStage: 'gt_status',
    overviewVillageSearch: '',
    overviewMandalFilter: 'All',
    overviewStatusFilter: 'All',
    overviewSelectedVillageId: null,
    homeFilters: {}
  },
  h: str => String(str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)),
  icon: name => `<svg class="icon-${name}"></svg>`,
  isComplete: val => {
    if (!val) return false;
    const s = String(val).toLowerCase().trim();
    return s === 'completed' || s === 'done' || s === 'yes' || s === 'true' || s === 'cleared';
  },
  formatExtent: n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  clean: s => (s == null ? '' : String(s).trim())
};

// Extract renderIndividualVillageProgressCard & renderInlineVillageWiseProgress
const fn1Match = appContent.match(/function renderIndividualVillageProgressCard\([\s\S]*?\n\}/);
const fn2Match = appContent.match(/function renderInlineVillageWiseProgress\([\s\S]*?\n\}/);

assert(fn1Match, 'renderIndividualVillageProgressCard must be extractable');
assert(fn2Match, 'renderInlineVillageWiseProgress must be extractable');

vm.createContext(context);
vm.runInContext(fn1Match[0], context);
vm.runInContext(fn2Match[0], context);

// Test 1: Render GT stage inline
context.state.overviewActiveStage = 'gt_status';
const gtHtml = vm.runInContext('renderInlineVillageWiseProgress(sampleVillages, {})', context);
assert(gtHtml.includes('GT EXTENT TODAY (AC)'), 'GT table must include GT EXTENT TODAY (AC)');
assert(gtHtml.includes('GT COMPLETED (ACRES)'), 'GT table must include GT COMPLETED (ACRES)');
assert(gtHtml.includes('BALANCE GT (ACRES)'), 'GT table must include BALANCE GT (ACRES)');
assert(gtHtml.includes('TOTAL EXTENT'), 'GT table must include TOTAL EXTENT');
assert(gtHtml.includes('PROGRESS IN ACRES'), 'GT header must indicate PROGRESS IN ACRES');
assert(gtHtml.includes('25 Acres per rover per day'), 'GT header must state daily benchmark in Acres');
console.log('✓ renderInlineVillageWiseProgress renders GT progress correctly in Acres');

// Test 2: Render DLR stage inline (e.g. Tahsildar Login)
context.state.overviewActiveStage = 'tahsildar_status';
const dlrHtml = vm.runInContext('renderInlineVillageWiseProgress(sampleVillages, {})', context);
assert(dlrHtml.includes('TOTAL ENTRIES'), 'DLR table must include TOTAL ENTRIES');
assert(dlrHtml.includes('ENTRIES COMPLETED TODAY'), 'DLR table must include ENTRIES COMPLETED TODAY');
assert(dlrHtml.includes('CUMULATIVE ENTRIES'), 'DLR table must include CUMULATIVE ENTRIES');
assert(dlrHtml.includes('BALANCE ENTRIES'), 'DLR table must include BALANCE ENTRIES');
assert(dlrHtml.includes('PROGRESS IN NUMBER OF ENTRIES'), 'DLR header must indicate PROGRESS IN NUMBER OF ENTRIES');
assert(dlrHtml.includes('200 DLR entries per day'), 'DLR header must state statutory benchmark in entries');
console.log('✓ renderInlineVillageWiseProgress renders DLR progress correctly in Number of Entries');

// Test 3: Select an individual village
context.state.overviewSelectedVillageId = 'vlg-101';
const villageCardHtml = vm.runInContext('renderIndividualVillageProgressCard(sampleVillages[0])', context);
assert(villageCardHtml.includes('PEDDUR'), 'Card must show village name');
assert(villageCardHtml.includes('1061001'), 'Card must show village code');
assert(villageCardHtml.includes('GROUND TRUTHING (GT) PROGRESS'), 'Card must have GT progress section');
assert(villageCardHtml.includes('MEASURED STRICTLY IN ACRES'), 'Card must state GT measured strictly in Acres');
assert(villageCardHtml.includes('1,450.50 <small>Acres</small>'), 'Card must show extent in Acres');
assert(villageCardHtml.includes('GT Extent Done Today'), 'Card must show GT Extent Done Today');
assert(villageCardHtml.includes('DLR REVENUE OFFICER LOGINS'), 'Card must have DLR logins section');
assert(villageCardHtml.includes('MEASURED STRICTLY IN NUMBER OF ENTRIES'), 'Card must state DLR measured strictly in Number of Entries');
assert(villageCardHtml.includes('DLR Entries Done Today'), 'Card must show DLR Entries Done Today');
assert(villageCardHtml.includes('3/5 Tiers Cleared'), 'Card must show 3 of 5 tiers cleared for sample village');
assert(villageCardHtml.includes('COMPLETE 11-STAGE RESURVEY LIFECYCLE FOR PEDDUR'), 'Card must include 11-stage stepper');
console.log('✓ renderIndividualVillageProgressCard renders individual village metrics with strict unit discipline and 11 stages');

// Test 4: When a village is selected, renderInlineVillageWiseProgress renders the card above the table
const fullHtmlWithSelectedVillage = vm.runInContext('renderInlineVillageWiseProgress(sampleVillages, {})', context);
assert(fullHtmlWithSelectedVillage.includes('id="individual-village-progress-card"'), 'Selected village card must appear inside inline section');
console.log('✓ Selected village progress card integrates seamlessly into inline village section');

console.log('\n========================================');
console.log('DOM & INTERACTIVE VERIFICATIONS PASSED! 🎉');
console.log('========================================');
