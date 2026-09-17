/**
 * Verification Script: Table Form Executive Abstract, GT Extents, and DLR Logins
 * Tests:
 * 1. Abstract in Table Form: Scope Table, GT Extent Table, DLR Logins Table, 10-Stage Pipeline Table.
 * 2. Ground Truthing (GT) Tracking:
 *    - Extent completed during the day (todayGtExtent)
 *    - Cumulative extent of GT completed (cumulativeGtExtent)
 *    - Balance extent to be completed (balanceGtExtent)
 *    - Total target extent (totalTargetExtent)
 * 3. DLR Logins Tracking (VS, VRO, Tah, RDO, JC):
 *    - Entries completed in the day (Today)
 *    - Cumulative entries completed
 *    - Balance entries to be completed
 *    - Clearance percentages and totals across all 5 approval tiers.
 * 4. Village Executive Abstract Table when village is selected.
 */
const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING TABLE FORM ABSTRACT, GT EXTENTS & DLR LOGINS ===\n');

// 1. Verify Codebase Implementation in app.js and public/app.js
const targets = [
  { name: 'app.js', code: fs.readFileSync('app.js', 'utf8') },
  { name: 'public/app.js', code: fs.readFileSync('public/app.js', 'utf8') }
];

targets.forEach(({ name, code }) => {
  console.log(`Checking ${name}...`);

  // Function definitions
  assert(code.includes('function calculateStageAbstractMetrics('), `${name} must include calculateStageAbstractMetrics`);
  assert(code.includes('function renderHomeExecutiveAbstract('), `${name} must include renderHomeExecutiveAbstract`);

  // Table form elements
  assert(code.includes('abstract-data-table'), `${name} must include abstract-data-table class`);
  assert(code.includes('scope-master-abstract-card'), `${name} must include scope-master-abstract-card`);
  assert(code.includes('gt-extent-abstract-card'), `${name} must include gt-extent-abstract-card`);
  assert(code.includes('dlr-logins-abstract-card'), `${name} must include dlr-logins-abstract-card`);
  assert(code.includes('resurvey-pipeline-abstract-card'), `${name} must include resurvey-pipeline-abstract-card`);

  // GT metrics
  assert(code.includes('EXTENT COMPLETED DURING THE DAY (TODAY)'), `${name} must include today GT extent header`);
  assert(code.includes('CUMULATIVE EXTENT OF GT COMPLETED'), `${name} must include cumulative GT extent header`);
  assert(code.includes('BALANCE EXTENT TO BE COMPLETED'), `${name} must include balance GT extent header`);
  assert(code.includes('TOTAL TARGET EXTENT'), `${name} must include total target extent header`);
  assert(code.includes('gt.todayGtExtent'), `${name} must bind gt.todayGtExtent`);
  assert(code.includes('gt.cumulativeGtExtent'), `${name} must bind gt.cumulativeGtExtent`);
  assert(code.includes('gt.balanceGtExtent'), `${name} must bind gt.balanceGtExtent`);

  // DLR Logins metrics
  assert(code.includes('ENTRIES COMPLETED IN THE DAY (TODAY)'), `${name} must include DLR today entries header`);
  assert(code.includes('CUMULATIVE ENTRIES COMPLETED'), `${name} must include DLR cumulative entries header`);
  assert(code.includes('BALANCE ENTRIES TO BE COMPLETED'), `${name} must include DLR balance entries header`);
  assert(code.includes('Village Surveyor Login (VS Login)'), `${name} must list VS Login`);
  assert(code.includes('VRO Login (Village Revenue Officer)'), `${name} must list VRO Login`);
  assert(code.includes('Tahsildar Login (Tah Login)'), `${name} must list Tahsildar Login`);
  assert(code.includes('RDO Login (Revenue Divisional Officer)'), `${name} must list RDO Login`);
  assert(code.includes('JC Login (Joint Collector Approval)'), `${name} must list JC Login`);
  assert(code.includes('TOTAL DLR WORKFLOW CLEARANCES (5 APPROVAL TIERS)'), `${name} must include DLR total row`);

  // Village Executive Abstract Table
  assert(code.includes('VILLAGE EXECUTIVE ABSTRACT TABLE'), `${name} must include Village Table header`);
  assert(code.includes('village-specs-table'), `${name} must include village-specs-table`);
  assert(code.includes('village-trajectory-table'), `${name} must include village-trajectory-table`);

  console.log(`  ✓ ${name} passes all frontend structural requirements.`);
});

// 2. Verify CSS Styling in styles.css and public/styles.css
const cssTargets = [
  { name: 'styles.css', css: fs.readFileSync('styles.css', 'utf8') },
  { name: 'public/styles.css', css: fs.readFileSync('public/styles.css', 'utf8') }
];

cssTargets.forEach(({ name, css }) => {
  console.log(`Checking ${name}...`);
  assert(css.includes('.abstract-data-table'), `${name} must have .abstract-data-table`);
  assert(css.includes('.abstract-table-card'), `${name} must have .abstract-table-card`);
  assert(css.includes('.gt-focus-active'), `${name} must have .gt-focus-active`);
  assert(css.includes('.dlr-focus-active'), `${name} must have .dlr-focus-active`);
  assert(css.includes('.highlight-col-today'), `${name} must have .highlight-col-today`);
  assert(css.includes('.highlight-col-cum'), `${name} must have .highlight-col-cum`);
  assert(css.includes('.highlight-col-bal'), `${name} must have .highlight-col-bal`);
  assert(css.includes('.extent-big-today'), `${name} must have .extent-big-today`);
  assert(css.includes('.entries-today-val'), `${name} must have .entries-today-val`);
  console.log(`  ✓ ${name} passes all CSS table form requirements.`);
});

// 3. Functional Simulation of calculateStageAbstractMetrics
console.log('\nTesting calculateStageAbstractMetrics logic with real store data...');
const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
const villages = store.villages || [];

// Mock state and global dashboard
global.state = {
  villages,
  dashboard: {
    dailyProgress: {
      asOnDate: '16-09-2026',
      combined: {
        todayGtExtent: 1382.56,
        cumulativeGtExtent: 106543.57,
        totalTargetExtent: 277090.35,
        totalVillages: 152,
        gtCompletedVillages: 60,
        vsLoginToday: 44,
        vroLoginToday: 17,
        tahLoginToday: 9,
        rdoLoginToday: 3,
        jcLoginToday: 2
      },
      phase5: {
        totalExtent: 116517.28,
        todayGtExtent: 425.96,
        cumulativeGtExtent: 82184.05,
        totalVillages: 60,
        gtCompletedVillages: 49,
        vsLoginToday: 40,
        vroLoginToday: 17,
        tahLoginToday: 9,
        rdoLoginToday: 3
      },
      phase6: {
        totalExtent: 160573.07,
        todayGtExtent: 956.60,
        cumulativeGtExtent: 24359.52,
        totalVillages: 92,
        gtCompletedVillages: 11,
        vsLoginToday: 4,
        vroLoginToday: 0,
        tahLoginToday: 0,
        rdoLoginToday: 0
      }
    }
  }
};

// Evaluate helper functions from app.js
const clean = value => String(value ?? '').trim();
const isComplete = value => /^(completed|complete|done|yes|y|ported|true|1)$/i.test(clean(value));
const formatExtent = value => {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Extract and evaluate calculateStageAbstractMetrics
const appText = fs.readFileSync('app.js', 'utf8');
const fnMatch = appText.match(/function calculateStageAbstractMetrics\([\s\S]*?\n\}/);
assert(fnMatch, 'Could not extract calculateStageAbstractMetrics function from app.js');

const calculateStageAbstractMetrics = new Function(
  'filtered', 'f', 'state', 'clean', 'isComplete', 'formatExtent',
  `return (${fnMatch[0]})(filtered, f);`
);

// Test Case A: All District (736 Villages)
{
  const res = calculateStageAbstractMetrics(villages, {}, global.state, clean, isComplete, formatExtent);
  console.log('\n--- Test Case A: District Level Abstract (736 Villages) ---');
  console.log(`Villages: ${res.scope.totalCount}, Total Extent: ${formatExtent(res.scope.totalExtent)} Ac`);
  console.log(`GT Today Extent: ${res.gt.todayGtExtent} Ac`);
  console.log(`GT Cumulative Extent: ${res.gt.cumulativeGtExtent} Ac`);
  console.log(`GT Balance Extent: ${res.gt.balanceGtExtent} Ac`);
  console.log(`GT Total Target Extent: ${res.gt.totalTargetExtent} Ac`);

  assert.strictEqual(res.gt.todayGtExtent, 1382.56, 'District GT today extent must be 1,382.56 Ac');
  assert.strictEqual(res.gt.cumulativeGtExtent, 106543.57, 'District cumulative GT extent must be 106,543.57 Ac');
  assert.strictEqual(res.gt.totalTargetExtent, 277090.35, 'District total target GT extent must be 277,090.35 Ac');
  assert(Math.abs(res.gt.balanceGtExtent - 170546.78) < 0.01, 'District balance GT extent must be 170,546.78 Ac');

  console.log('DLR Logins Metrics:');
  res.dlr.stages.forEach(st => {
    console.log(`  ${st.name}: Today=${st.today}, Cumulative=${st.cumulative}, Balance=${st.balance}, Clear%=${st.pct}%`);
  });
  console.log(`DLR Total Steps: ${res.dlr.totalSteps}, Today Total=${res.dlr.todayTotal}, Cum Total=${res.dlr.cumulativeTotal}, Balance=${res.dlr.balanceTotal}`);

  assert.strictEqual(res.dlr.todayTotal, 75, 'District total DLR daily entries must equal 75 (44+17+9+3+2)');
  assert(res.dlr.stages.find(s => s.short === 'VS Login').cumulative >= 515, 'VS Login cumulative should be ~519-520');
  assert(res.dlr.stages.find(s => s.short === 'VRO Login').cumulative >= 500, 'VRO Login cumulative should be ~506');
  assert(res.dlr.stages.find(s => s.short === 'Tah Login').cumulative >= 460, 'Tah Login cumulative should be ~463');
  assert(res.dlr.stages.find(s => s.short === 'RDO Login').cumulative >= 425, 'RDO Login cumulative should be ~430');
  assert(res.dlr.stages.find(s => s.short === 'JC Login').cumulative >= 415, 'JC Login cumulative should be ~418');
  console.log('✓ District Level Abstract passes all assertions!');
}

// Test Case B: Phase V Filtered
{
  const p5Villages = villages.filter(v => (v.phase || '').includes('5') || (v.phase || '').includes('V'));
  const res = calculateStageAbstractMetrics(p5Villages, { phase: 'Phase V' }, global.state, clean, isComplete, formatExtent);
  console.log('\n--- Test Case B: Phase V Abstract ---');
  console.log(`Phase V Villages: ${res.scope.totalCount}`);
  console.log(`Phase V GT Today: ${res.gt.todayGtExtent} Ac, Cumulative: ${res.gt.cumulativeGtExtent} Ac, Balance: ${res.gt.balanceGtExtent} Ac`);
  assert.strictEqual(res.gt.todayGtExtent, 425.96, 'Phase V today GT extent must be 425.96 Ac');
  assert.strictEqual(res.gt.cumulativeGtExtent, 82184.05, 'Phase V cumulative GT extent must be 82,184.05 Ac');
  assert.strictEqual(res.gt.totalTargetExtent, 116517.28, 'Phase V total target extent must be 116,517.28 Ac');
  assert(Math.abs(res.gt.balanceGtExtent - 34333.23) < 0.01, 'Phase V balance GT extent must be 34,333.23 Ac');
  console.log('✓ Phase V GT Extents match official departmental records!');
}

// Test Case C: Phase VI Filtered
{
  const p6Villages = villages.filter(v => (v.phase || '').includes('6') || (v.phase || '').includes('VI'));
  const res = calculateStageAbstractMetrics(p6Villages, { phase: 'Phase VI' }, global.state, clean, isComplete, formatExtent);
  console.log('\n--- Test Case C: Phase VI Abstract ---');
  console.log(`Phase VI Villages: ${res.scope.totalCount}`);
  console.log(`Phase VI GT Today: ${res.gt.todayGtExtent} Ac, Cumulative: ${res.gt.cumulativeGtExtent} Ac, Balance: ${res.gt.balanceGtExtent} Ac`);
  assert.strictEqual(res.gt.todayGtExtent, 956.60, 'Phase VI today GT extent must be 956.60 Ac');
  assert.strictEqual(res.gt.cumulativeGtExtent, 24359.52, 'Phase VI cumulative GT extent must be 24,359.52 Ac');
  assert.strictEqual(res.gt.totalTargetExtent, 160573.07, 'Phase VI total target extent must be 160,573.07 Ac');
  assert(Math.abs(res.gt.balanceGtExtent - 136213.55) < 0.01, 'Phase VI balance GT extent must be 136,213.55 Ac');
  console.log('✓ Phase VI GT Extents match official departmental records!');
}

// Test Case D: Mandal Filter (e.g. Bangarupalem)
{
  const manVillages = villages.filter(v => (v.mandal || '').toLowerCase().includes('bangarupalem'));
  const res = calculateStageAbstractMetrics(manVillages, { mandal: 'Bangarupalem' }, global.state, clean, isComplete, formatExtent);
  console.log('\n--- Test Case D: Bangarupalem Mandal Abstract ---');
  console.log(`Bangarupalem Villages: ${res.scope.totalCount}`);
  console.log(`Bangarupalem Total Extent: ${formatExtent(res.scope.totalExtent)} Ac`);
  console.log(`Bangarupalem GT Cumulative: ${formatExtent(res.gt.cumulativeGtExtent)} Ac, Balance: ${formatExtent(res.gt.balanceGtExtent)} Ac`);
  assert(res.gt.balanceGtExtent >= 0, 'Balance GT extent must be non-negative');
  assert(res.dlr.stages.length === 5, 'Must have 5 DLR stages for mandal');
  console.log('✓ Bangarupalem Mandal dynamically computes scope extent and balance!');
}

console.log('\n========================================================================');
console.log('ALL VERIFICATION TESTS FOR TABLE FORM ABSTRACT & LOGINS COMPLETED! ✓');
console.log('========================================================================\n');
