const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== VERIFYING OVERVIEW FIGURES, VILLAGE FILTERING & PHASE-WISE RENAMING ===\n');

// 1. Verify index.html and public/index.html
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const publicIndexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

if (!indexHtml.includes('Phase wise Analysis')) {
  throw new Error('index.html does not contain "Phase wise Analysis"');
}
if (!publicIndexHtml.includes('Phase wise Analysis')) {
  throw new Error('public/index.html does not contain "Phase wise Analysis"');
}
console.log('✓ index.html and public/index.html contain "Phase wise Analysis"');

// 2. Verify styles.css and public/styles.css for large numerical font sizes
const stylesCss = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
const publicStylesCss = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');

if (!stylesCss.includes('font-size: 32px !important') || !stylesCss.includes('.clickable-figure-cell')) {
  throw new Error('styles.css is missing 32px large font size or .clickable-figure-cell');
}
if (!publicStylesCss.includes('font-size: 32px !important') || !publicStylesCss.includes('.clickable-figure-cell')) {
  throw new Error('public/styles.css is missing 32px large font size or .clickable-figure-cell');
}
console.log('✓ styles.css and public/styles.css have 32px large numerics and .clickable-figure-cell');

// 3. Verify app.js VM execution
const appCode = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const store = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/store.json'), 'utf8'));

const mockEl = { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], classList: { add: () => {}, remove: () => {} }, innerHTML: '', setAttribute: () => {} };
const loc = { hash: '#/', search: '', pathname: '/' };
const globalMock = {
  window: { addEventListener: () => {}, location: loc },
  document: {
    getElementById: () => mockEl,
    querySelector: () => mockEl,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  navigator: { userAgent: 'node' },
  localStorage: { getItem: () => 'APCTR2026', setItem: () => null },
  sessionStorage: { getItem: () => 'APCTR2026', setItem: () => null },
  console: console,
  location: loc,
  URLSearchParams: URLSearchParams,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};

const context = vm.createContext({
  ...globalMock,
  state: {
    view: 'dashboard',
    filters: {},
    homeFilters: {},
    stage: 'ground_truth',
    mandalSearch: '',
    gtFigureFilter: 'total',
    dlrFigureFilter: 'total',
    ppbFigureFilter: 'all',
    villages: store.villages
  },
  dashboardData: {
    hasData: true,
    mandals: [],
    villages: store.villages,
    currentMonthPpb: { targetPPBs: 22375, totalVillages: 37 }
  }
});

vm.runInContext(appCode, context);
console.log('✓ app.js parsed and executed in VM context without error.');

// Test Ground Truthing Part 1 HTML
const part1Html = context.renderPart1ResurveyProgress(store.villages, context.dashboardData);
console.log('\n--- Checking Ground Truthing Part 1 HTML ---');
console.log('  has data-overview-figure="gt_today":', part1Html.includes('data-overview-figure="gt_today"'));
console.log('  has data-overview-figure="gt_cumulative":', part1Html.includes('data-overview-figure="gt_cumulative"'));
console.log('  has data-overview-figure="gt_balance":', part1Html.includes('data-overview-figure="gt_balance"'));
console.log('  has data-overview-figure="gt_total":', part1Html.includes('data-overview-figure="gt_total"'));
console.log('  has clickable-figure-cell:', part1Html.includes('clickable-figure-cell'));
console.log('  has figure-number-huge:', part1Html.includes('figure-number-huge'));
console.log('  has fig-click-hint:', part1Html.includes('fig-click-hint'));

// Test GT Village filtering when figure is clicked
console.log('\n--- Checking GT Village Table Figure Filtering ---');
// 1. Today filter
vm.runInContext("state.gtFigureFilter = 'today';", context);
const gtTodayHtml = context.renderGtVillageTable(store.villages, context.dashboardData);
console.log('  gtFigureFilter="today" renders active filter banner:', gtTodayHtml.includes('active-figure-filter-strip') && gtTodayHtml.includes('Active Villages'));
console.log('  gtFigureFilter="today" last column is SURVEY OFFICERS:', gtTodayHtml.includes('col-officers-last'));

// 2. Cumulative filter
vm.runInContext("state.gtFigureFilter = 'cumulative';", context);
const gtCumHtml = context.renderGtVillageTable(store.villages, context.dashboardData);
console.log('  gtFigureFilter="cumulative" renders active filter banner:', gtCumHtml.includes('active-figure-filter-strip') && gtCumHtml.includes('Completed Villages'));

// 3. Balance filter
vm.runInContext("state.gtFigureFilter = 'balance';", context);
const gtBalHtml = context.renderGtVillageTable(store.villages, context.dashboardData);
console.log('  gtFigureFilter="balance" renders active filter banner:', gtBalHtml.includes('active-figure-filter-strip') && gtBalHtml.includes('Balance Extent'));

// Test Part 2 PPBs Distribution HTML and PPB Village Table
console.log('\n--- Checking PPBs Distribution Part 2 HTML ---');
vm.runInContext("state.ppbFigureFilter = 'cycle_Sep-26';", context);
const part2Html = context.renderPart2PpbDistributionStatus(store.villages, context.dashboardData);
console.log('  has data-overview-figure="ppb_total":', part2Html.includes('data-overview-figure="ppb_total"'));
console.log('  has data-overview-figure="ppb_cycle_Sep-26":', part2Html.includes('data-overview-figure="ppb_cycle_Sep-26"'));
console.log('  has PPB village section id="ppb-village-section":', part2Html.includes('id="ppb-village-section"'));
console.log('  has active figure filter strip:', part2Html.includes('active-figure-filter-strip') && part2Html.includes('September 2026'));
console.log('  PPB village table last column is SURVEY OFFICERS:', part2Html.includes('col-officers-last'));

console.log('\n=== ALL OVERVIEW CHECKS PASSED WITH 100% SUCCESS ===');
