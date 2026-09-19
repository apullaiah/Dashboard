/**
 * Verification Script: 2-Part Overview, Strict 2-Row Abstract Tables, GT & DLR Benchmarks
 * Tests:
 * 1. Overview Section strictly contains 2 parts:
 *    - Part 1: Resurvey Progress (GT & DLR Logins with interactive toggle)
 *    - Part 2: PPBs Distribution status
 * 2. Abstract Table Architecture is strictly TWO ROWS:
 *    - Row 1: All parameters (row-parameters, headers)
 *    - Row 2: All numeric values (row-numerics)
 * 3. Ground Truthing (GT) Tracking:
 *    - Extent completed during the day (todayGtExtent)
 *    - Cumulative extent of GT completed (cumulativeGtExtent)
 *    - Balance extent to be completed (balanceGtExtent)
 *    - Total target extent (totalTargetExtent)
 *    - Benchmark rule: "Every day one team should complete 25 Ac of GT per day per rover."
 *    - Active rovers and capacity calculation (rovers * 25 Ac).
 * 4. DLR Logins Tracking:
 *    - Entries completed today (Today)
 *    - Cumulative entries completed
 *    - Pending / balance entries to be completed
 *    - Benchmark rule: "DLR entries@200 per day."
 *    - 5 officer approval tiers (VS, VRO, Tahsildar, RDO, JC).
 * 5. PPBs Distribution Status:
 *    - Strict 2-row abstract table with target PPBs, printed, distributed, balance pending.
 *    - Month-wise PPB delivery cycles.
 */
const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING 2-PART OVERVIEW, 2-ROW ABSTRACT TABLES & BENCHMARKS ===\n');

// 1. Verify Codebase Implementation in app.js and public/app.js
const targets = [
  { name: 'app.js', code: fs.readFileSync('app.js', 'utf8') },
  { name: 'public/app.js', code: fs.readFileSync('public/app.js', 'utf8') }
];

targets.forEach(({ name, code }) => {
  console.log(`Checking ${name}...`);

  // Function definitions
  assert(code.includes('function calculateStageAbstractMetrics('), `${name} must include calculateStageAbstractMetrics`);
  assert(code.includes('function renderPart1ResurveyProgress('), `${name} must include renderPart1ResurveyProgress`);
  assert(code.includes('function renderPart2PpbDistributionStatus('), `${name} must include renderPart2PpbDistributionStatus`);
  assert(code.includes('function renderHomeExecutiveAbstract('), `${name} must include renderHomeExecutiveAbstract`);

  // Strict 2-Part Overview Elements
  assert(code.includes('part-1-resurvey-progress'), `${name} must have Part 1: Resurvey Progress`);
  assert(code.includes('part-2-ppbs-distribution'), `${name} must have Part 2: PPBs Distribution status`);
  assert(code.includes('toggle-tab-gt'), `${name} must have GT toggle tab`);
  assert(code.includes('toggle-tab-dlr'), `${name} must have DLR toggle tab`);
  assert(code.includes('data-resurvey-tab'), `${name} must handle data-resurvey-tab`);

  // Strict 2-Row Abstract Tables
  assert(code.includes('abstract-two-row-table'), `${name} must include abstract-two-row-table class`);
  assert(code.includes('row-parameters'), `${name} must include row-parameters header row`);
  assert(code.includes('row-numerics'), `${name} must include row-numerics data row`);

  // GT Benchmark: 25 Ac/day/rover
  assert(code.includes('25 Ac of GT per day per rover'), `${name} must state benchmark: 25 Ac of GT per day per rover`);
  assert(code.includes('EXTENT COMPLETED DURING THE DAY (TODAY)'), `${name} must include today GT extent header`);
  assert(code.includes('CUMULATIVE EXTENT OF GT COMPLETED'), `${name} must include cumulative GT extent header`);
  assert(code.includes('BALANCE EXTENT TO BE COMPLETED'), `${name} must include balance GT extent header`);
  assert(code.includes('TOTAL TARGET EXTENT'), `${name} must include total target extent header`);
  assert(code.includes('gt.todayGtExtent'), `${name} must bind gt.todayGtExtent`);
  assert(code.includes('gt.cumulativeGtExtent'), `${name} must bind gt.cumulativeGtExtent`);
  assert(code.includes('gt.balanceGtExtent'), `${name} must bind gt.balanceGtExtent`);

  // DLR Benchmark: 200 entries/day
  assert(code.includes('DLR entries@200 per day'), `${name} must state benchmark: DLR entries@200 per day`);
  assert(code.includes('ENTRIES COMPLETED IN THE DAY (TODAY)'), `${name} must include DLR today entries header`);
  assert(code.includes('CUMULATIVE ENTRIES COMPLETED'), `${name} must include DLR cumulative entries header`);
  assert(code.includes('BALANCE ENTRIES TO BE COMPLETED'), `${name} must include DLR balance entries header`);
  assert(code.includes('Village Surveyor Login (VS Login)'), `${name} must list VS Login`);
  assert(code.includes('VRO Login (Village Revenue Officer)'), `${name} must list VRO Login`);
  assert(code.includes('Tahsildar Login (Tah Login)'), `${name} must list Tahsildar Login`);
  assert(code.includes('RDO Login (Revenue Divisional Officer)'), `${name} must list RDO Login`);
  assert(code.includes('JC Login (Joint Collector Approval)'), `${name} must list JC Login`);
  assert(code.includes('TOTAL DLR WORKFLOW CLEARANCES (5 APPROVAL TIERS)'), `${name} must include DLR total row`);

  // PPBs Distribution Status Elements
  assert(code.includes('PPBs DISTRIBUTION STATUS'), `${name} must include PPBs Distribution Status header`);
  assert(code.includes('TOTAL TARGET PPBs'), `${name} must include TOTAL TARGET PPBs`);
  assert(code.includes('PPBs PRINTED / GENERATED'), `${name} must include PPBs PRINTED / GENERATED`);
  assert(code.includes('DISTRIBUTED / HANDED OVER'), `${name} must include DISTRIBUTED / HANDED OVER`);
  assert(code.includes('BALANCE PENDING DISTRIBUTION'), `${name} must include BALANCE PENDING DISTRIBUTION`);

  console.log(`  ✓ ${name} passes all frontend structural requirements.`);
});

// 2. Verify CSS Styling in styles.css and public/styles.css
const cssTargets = [
  { name: 'styles.css', css: fs.readFileSync('styles.css', 'utf8') },
  { name: 'public/styles.css', css: fs.readFileSync('public/styles.css', 'utf8') }
];

cssTargets.forEach(({ name, css }) => {
  console.log(`Checking ${name}...`);
  assert(css.includes('.overview-two-parts-container'), `${name} must have .overview-two-parts-container`);
  assert(css.includes('.overview-part-card'), `${name} must have .overview-part-card`);
  assert(css.includes('.resurvey-toggle-group'), `${name} must have .resurvey-toggle-group`);
  assert(css.includes('.resurvey-tab-btn'), `${name} must have .resurvey-tab-btn`);
  assert(css.includes('.abstract-two-row-table-wrap'), `${name} must have .abstract-two-row-table-wrap`);
  assert(css.includes('.abstract-two-row-table'), `${name} must have .abstract-two-row-table`);
  assert(css.includes('.row-parameters'), `${name} must have .row-parameters`);
  assert(css.includes('.row-numerics'), `${name} must have .row-numerics`);
  assert(css.includes('.benchmark-summary-bar'), `${name} must have .benchmark-summary-bar`);
  console.log(`  ✓ ${name} passes all CSS styling requirements.`);
});

// 3. Functional Simulation of calculateStageAbstractMetrics with real store data
console.log('\nTesting calculateStageAbstractMetrics logic with real store data...');
const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
const villages = store.villages || [];

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

const clean = value => String(value ?? '').trim();
const isComplete = value => /^(completed|complete|done|yes|y|ported|true|1)$/i.test(clean(value));
const formatExtent = value => {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const appText = fs.readFileSync('app.js', 'utf8');
const fnMatch = appText.match(/function calculateStageAbstractMetrics\([\s\S]*?\n\}/);
assert(fnMatch, 'Could not extract calculateStageAbstractMetrics function from app.js');

const calculateStageAbstractMetrics = new Function(
  'filtered', 'f', 'state', 'clean', 'isComplete', 'formatExtent',
  `return (${fnMatch[0]})(filtered, f);`
);

// Test Case A: District Level Abstract
{
  const res = calculateStageAbstractMetrics(villages, {}, global.state, clean, isComplete, formatExtent);
  console.log('\n--- Test Case A: District Level Abstract (736 Villages) ---');
  console.log(`Villages: ${res.scope.totalCount}, Total Extent: ${formatExtent(res.scope.totalExtent)} Ac`);
  console.log(`GT Today Extent: ${res.gt.todayGtExtent} Ac (Benchmark capacity: ${res.gt.dailyCapacityAc} Ac/day, rovers: ${res.gt.rovers})`);
  console.log(`GT Cumulative Extent: ${res.gt.cumulativeGtExtent} Ac, Balance: ${formatExtent(res.gt.balanceGtExtent)} Ac`);

  assert.strictEqual(res.gt.todayGtExtent, 1382.56, 'District GT today extent must be 1,382.56 Ac');
  assert.strictEqual(res.gt.cumulativeGtExtent, 106543.57, 'District cumulative GT extent must be 106,543.57 Ac');
  assert.strictEqual(res.gt.totalTargetExtent, 277090.35, 'District total target GT extent must be 277,090.35 Ac');
  assert(Math.abs(res.gt.balanceGtExtent - 170546.78) < 0.01, 'District balance GT extent must be 170,546.78 Ac');
  assert.strictEqual(res.gt.benchmarkRateAc, 25, 'GT benchmark must be 25 Ac per day per rover');
  assert.strictEqual(res.gt.rovers, 60, 'District active rovers must be 60');
  assert.strictEqual(res.gt.dailyCapacityAc, 1500, 'District daily capacity must be 1,500 Ac/day (60 * 25)');

  console.log(`DLR Logins: Today=${res.dlr.todayTotal}, Cum=${res.dlr.cumulativeTotal}, Pending=${res.dlr.balanceTotal}, Benchmark=${res.dlr.dlrBenchmarkDaily}/day`);
  assert.strictEqual(res.dlr.todayTotal, 5990, 'District total DLR daily entries must equal 5,990 entries');
  assert.strictEqual(res.dlr.dlrBenchmarkDaily, 200, 'DLR benchmark must be 200 entries/day');
  console.log('✓ District Level Abstract & Benchmarks pass all assertions!');
}

// Test Case B: Phase V Filtered
{
  const p5Villages = villages.filter(v => (v.phase || '').includes('5') || (v.phase || '').includes('V'));
  const res = calculateStageAbstractMetrics(p5Villages, { phase: 'Phase V' }, global.state, clean, isComplete, formatExtent);
  console.log('\n--- Test Case B: Phase V Abstract ---');
  console.log(`Phase V GT Today: ${res.gt.todayGtExtent} Ac, Capacity: ${res.gt.dailyCapacityAc} Ac, Rovers: ${res.gt.rovers}`);
  assert.strictEqual(res.gt.todayGtExtent, 425.96, 'Phase V today GT extent must be 425.96 Ac');
  assert.strictEqual(res.gt.cumulativeGtExtent, 82184.05, 'Phase V cumulative GT extent must be 82,184.05 Ac');
  assert.strictEqual(res.gt.rovers, 24, 'Phase V rovers must be 24');
  assert.strictEqual(res.gt.dailyCapacityAc, 600, 'Phase V daily capacity must be 600 Ac/day');
  console.log('✓ Phase V GT Extents match official records!');
}

// Test Case C: Phase VI Filtered
{
  const p6Villages = villages.filter(v => (v.phase || '').includes('6') || (v.phase || '').includes('VI'));
  const res = calculateStageAbstractMetrics(p6Villages, { phase: 'Phase VI' }, global.state, clean, isComplete, formatExtent);
  console.log('\n--- Test Case C: Phase VI Abstract ---');
  console.log(`Phase VI GT Today: ${res.gt.todayGtExtent} Ac, Capacity: ${res.gt.dailyCapacityAc} Ac, Rovers: ${res.gt.rovers}`);
  assert.strictEqual(res.gt.todayGtExtent, 956.60, 'Phase VI today GT extent must be 956.60 Ac');
  assert.strictEqual(res.gt.cumulativeGtExtent, 24359.52, 'Phase VI cumulative GT extent must be 24,359.52 Ac');
  assert.strictEqual(res.gt.rovers, 36, 'Phase VI rovers must be 36');
  assert.strictEqual(res.gt.dailyCapacityAc, 900, 'Phase VI daily capacity must be 900 Ac/day');
  console.log('✓ Phase VI GT Extents match official records!');
}

console.log('\n========================================================================');
console.log('ALL VERIFICATION TESTS FOR 2-PART OVERVIEW & BENCHMARKS PASSED! ✓');
console.log('========================================================================\n');
