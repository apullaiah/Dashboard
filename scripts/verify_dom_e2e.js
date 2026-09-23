const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING DOM SIMULATION TEST FOR 2-PART OVERVIEW & 2-ROW TABLES ===\n');

// 1. Mock minimal DOM environment
class ClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  contains(cls) { return this.classes.has(cls); }
  toString() { return Array.from(this.classes).join(' '); }
}

class Element {
  constructor(tagName, id = '') {
    this.tagName = (tagName || 'div').toUpperCase();
    this.id = id;
    this.classList = new ClassList();
    this.dataset = {};
    this.children = [];
    this._innerHTML = '';
    this.outerHTML = '';
  }

  set innerHTML(html) {
    this._innerHTML = html;
  }
  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(sel) {
    // simplified selector
    return null;
  }

  querySelectorAll(sel) {
    return [];
  }
}

// 2. Load and verify app.js directly
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Check that renderDashboard only contains Part 1 and Part 2 inside overview-two-parts-container
const overviewRegex = /<div class="overview-two-parts-container"[\s\S]*?<\/div>/;
const match = appCode.match(overviewRegex);
assert(match, 'overview-two-parts-container must be present in renderDashboard()');

const overviewSnippet = match[0];
assert(overviewSnippet.includes('renderPart1ResurveyProgress'), 'Must render Part 1: Resurvey Progress');
assert(overviewSnippet.includes('renderPart2PpbDistributionStatus'), 'Must render Part 2: PPBs Distribution Status');

// Ensure extraneous cards are NOT in overview-two-parts-container
assert(!overviewSnippet.includes('Sequential Workflow Progress'), 'Workflow progress should not be in Overview container');
assert(!overviewSnippet.includes('Today’s officer review'), 'Officer review should not be in Overview container');
assert(!overviewSnippet.includes('Mandals requiring attention'), 'Mandal attention should not be in Overview container');
assert(!overviewSnippet.includes('Division performance'), 'Division performance should not be in Overview container');
assert(!overviewSnippet.includes('Current bottleneck'), 'Bottleneck should not be in Overview container');

console.log('✓ Overview section in app.js strictly contains only Part 1 and Part 2.');

// 3. Test renderPart1ResurveyProgress HTML output
// We can evaluate calculateStageAbstractMetrics, renderPart1ResurveyProgress, and renderPart2PpbDistributionStatus
const store = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'store.json'), 'utf8'));

global.state = {
  dashboard: store.dashboard,
  villages: store.villages,
  homeFilters: { phase: 'All phases', mandal: 'All mandals', month: 'All months', division: 'All' },
  resurveyProgressTab: 'gt'
};

global.h = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
global.icon = () => '<svg></svg>';
global.clean = s => String(s || '').trim();
global.isComplete = v => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'completed' || s === 'true' || s === 'yes' || s === '1' || s.includes('done') || s.includes('complete');
};
global.formatExtent = num => {
  const n = parseFloat(num);
  if (isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Evaluate the functions
const extractFn = (name) => {
  const re = new RegExp(`function ${name}\\s*\\([\\s\\S]*?\\n\\}`, 'g');
  const m = appCode.match(re);
  return m ? m[0] : null;
};

global.renderGtVillageTable = () => '<div id="gt-abstract-table">GT Village Table</div>';
global.renderDlrSequenceBar = () => '<div id="dlr-sequence-bar">DLR Sequence Bar</div>';
global.renderDlrVillageTable = () => '<div id="dlr-village-table">DLR Village Table</div>';

eval(extractFn('calculateStageAbstractMetrics'));
eval(extractFn('renderPart1ResurveyProgress'));
eval(extractFn('renderPart2PpbDistributionStatus'));

// Test GT View
global.state.resurveyProgressTab = 'gt';
const gtHtml = renderPart1ResurveyProgress(store.villages, store.dashboard);

assert(gtHtml.includes('id="part-1-resurvey-progress"'), 'Part 1 container ID must be present');
assert(gtHtml.includes('PART 1 OF 2 · RESURVEY PROGRESS'), 'Part 1 badge must be present');
assert(gtHtml.includes('data-resurvey-tab="gt"'), 'GT toggle tab must be present');
assert(gtHtml.includes('data-resurvey-tab="dlr"'), 'DLR toggle tab must be present');
assert(gtHtml.includes('25 Ac of GT per day per rover'), 'GT benchmark banner must be present');
assert(gtHtml.includes('1,382.56 Ac'), 'GT today extent must be present in GT view');
assert(gtHtml.includes('1,06,543.57 Ac'), 'GT cumulative extent must be present');
assert(gtHtml.includes('1,70,546.78 Ac'), 'GT balance extent must be present');
assert(gtHtml.includes('1,500.00 Ac/day'), 'GT daily capacity must be present');
assert(gtHtml.includes('60 Active Rovers') || gtHtml.includes('>60<'), 'GT 60 active rovers must be present');

// When in GT view, verify DLR specifics are hidden
assert(!gtHtml.includes('DLR entries@200 per day'), 'DLR benchmark must NOT show in GT view');
assert(!gtHtml.includes('id="dlr-abstract-two-row-table"'), 'DLR table must NOT show in GT view');

// Count rows in GT abstract table
const gtTableMatches = gtHtml.match(/<tr class="row-parameters">[\s\S]*?<\/tr>[\s\S]*?<tr class="row-numerics">[\s\S]*?<\/tr>/);
assert(gtTableMatches, 'GT Table must strictly have row-parameters followed by row-numerics');
const gtTheadTrCount = (gtHtml.match(/<thead>[\s\S]*?<\/thead>/)[0].match(/<tr/g) || []).length;
const gtTbodyTrCount = (gtHtml.match(/<tbody>[\s\S]*?<\/tbody>/)[0].match(/<tr/g) || []).length;
assert.strictEqual(gtTheadTrCount, 1, 'GT table thead must have exactly 1 row of parameters');
assert.strictEqual(gtTbodyTrCount, 1, 'GT table tbody must have exactly 1 row of numerics');

console.log('✓ Part 1 in GT view renders strictly 2 rows, correct benchmark, and hides DLR content.');

// Test DLR View
global.state.resurveyProgressTab = 'dlr';
const dlrHtml = renderPart1ResurveyProgress(store.villages, store.dashboard);

assert(dlrHtml.includes('DLR entries@200 per day'), 'DLR benchmark must show in DLR view');
assert(dlrHtml.includes('+75'), 'Today completed entries must show');
assert(dlrHtml.includes('2,336'), 'Cumulative DLR entries must show');
assert(dlrHtml.includes('200 Entries / Day') || dlrHtml.includes('Target Entries/Day'), 'DLR benchmark capacity must show');
assert(dlrHtml.includes('Village Surveyor Login (VS Login)'), 'VS Login tier must show');
assert(dlrHtml.includes('VRO Login (Village Revenue Officer)'), 'VRO Login tier must show');
assert(dlrHtml.includes('Tahsildar Login (Tah Login)'), 'Tahsildar Login tier must show');
assert(dlrHtml.includes('RDO Login (Revenue Divisional Officer)'), 'RDO Login tier must show');
assert(dlrHtml.includes('JC Login (Joint Collector Approval)'), 'JC Approval tier must show');

// When in DLR view, verify GT specifics are hidden
assert(!dlrHtml.includes('25 Ac of GT per day per rover'), 'GT benchmark must NOT show in DLR view');
assert(!dlrHtml.includes('id="gt-abstract-two-row-table"'), 'GT table must NOT show in DLR view');

// Check row counts in DLR tables
const dlrTheadTrCounts = dlrHtml.match(/<thead>[\s\S]*?<\/thead>/g) || [];
const dlrTbodyTrCounts = dlrHtml.match(/<tbody>[\s\S]*?<\/tbody>/g) || [];
assert(dlrTheadTrCounts.length >= 2, 'DLR view should have summary table and 5-tier table');
dlrTheadTrCounts.forEach((th, idx) => {
  const trs = (th.match(/<tr/g) || []).length;
  assert.strictEqual(trs, 1, `DLR table #${idx + 1} thead must have exactly 1 row of parameters`);
});
dlrTbodyTrCounts.forEach((tb, idx) => {
  const trs = (tb.match(/<tr/g) || []).length;
  assert.strictEqual(trs, 1, `DLR table #${idx + 1} tbody must have exactly 1 row of numerics`);
});

console.log('✓ Part 1 in DLR view renders strictly 2 rows, 5 officer tiers, correct benchmark, and hides GT content.');

// Test Part 2 (PPBs Distribution Status)
const part2Html = renderPart2PpbDistributionStatus(store.dashboard);
assert(part2Html.includes('id="part-2-ppbs-distribution"'), 'Part 2 container ID must be present');
assert(part2Html.includes('PART 2 OF 2 · PPBs DISTRIBUTION STATUS'), 'Part 2 badge must be present');
assert(part2Html.includes('3,91,552'), 'Total target PPBs must be present');
assert(part2Html.includes('2,48,630'), 'Printed PPBs must be present');
assert(part2Html.includes('2,18,940'), 'Distributed PPBs must be present');
assert(part2Html.includes('1,420'), 'Today distributed PPBs must be present');
assert(part2Html.includes('SEP-26'), 'Sep-26 cycle column must be present');

const part2Theads = part2Html.match(/<thead>[\s\S]*?<\/thead>/g) || [];
const part2Tbodies = part2Html.match(/<tbody>[\s\S]*?<\/tbody>/g) || [];
assert.strictEqual(part2Theads.length, 2, 'Part 2 should have 2 tables (Summary & Month-wise Timeline)');
part2Theads.forEach((th, idx) => {
  const trs = (th.match(/<tr/g) || []).length;
  assert.strictEqual(trs, 1, `Part 2 table #${idx + 1} thead must have exactly 1 row of parameters`);
});
part2Tbodies.forEach((tb, idx) => {
  const trs = (tb.match(/<tr/g) || []).length;
  assert.strictEqual(trs, 1, `Part 2 table #${idx + 1} tbody must have exactly 1 row of numerics`);
});

console.log('✓ Part 2 PPBs Distribution Status renders strictly 2-row tables for summary and monthly delivery cycles.');

console.log('\n========================================================================');
console.log('ALL E2E DOM SIMULATION ASSERTIONS PASSED WITH 100% COMPLIANCE! ✓');
console.log('========================================================================\n');
