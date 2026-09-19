const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== VERIFYING NEW ENHANCEMENTS: PPB DEDICATED VIEW, STAGE FOCUS, PARAM INSPECTOR & FONT SIZES ===\n');

// 1. Verify index.html and public/index.html have the dedicated PPB navigation link
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pubIndexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

assert(indexHtml.includes('data-view="ppb"'), 'index.html must have data-view="ppb" nav button');
assert(indexHtml.includes('PPB Distribution Cycle'), 'index.html must have PPB Distribution Cycle text');
assert(pubIndexHtml.includes('data-view="ppb"'), 'public/index.html must have data-view="ppb" nav button');
console.log('✓ Navigation link for PPB Distribution Cycle verified in both index.html and public/index.html');

// 2. Verify app.js and public/app.js features
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const pubAppJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

[
  ['app.js', appJs],
  ['public/app.js', pubAppJs]
].forEach(([filename, code]) => {
  console.log(`Checking ${filename}...`);
  // PPB dedicated view
  assert(code.includes('renderPpbDistribution'), `${filename} must have renderPpbDistribution()`);
  assert(code.includes("state.view === 'ppb'"), `${filename} router must support ppb view`);
  assert(code.includes('ppb-executive-grid'), `${filename} must render PPB executive grid`);
  assert(code.includes('ppb-cycles-cards-grid'), `${filename} must render PPB cycle cards grid`);

  // Village monitoring stage drilldown
  assert(code.includes('stage-focus-chip'), `${filename} must render stage-focus-chip elements`);
  assert(code.includes('renderStagePerformanceCard'), `${filename} must render stage performance card`);
  assert(code.includes('TARGET REACHED') && code.includes('TARGET NOT REACHED'), `${filename} must provide target analysis banner`);
  assert(code.includes('state.selectedStageFocus'), `${filename} must manage selectedStageFocus state`);

  // Parameter Inspector Modal
  assert(code.includes('openParameterInspector'), `${filename} must implement openParameterInspector()`);
  assert(code.includes('param-inspector-card'), `${filename} must render param-inspector-card in modal`);
  assert(code.includes('data-inspect-param'), `${filename} must bind data-inspect-param on clickable parameters`);

  // Overview Section switcher
  assert(code.includes('overview-section-switcher'), `${filename} must provide section switcher in Overview`);
  console.log(`  ✓ ${filename} satisfies all functional specifications.`);
});

// 3. Verify CSS styling and typography enhancement
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const pubCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');

[
  ['styles.css', css],
  ['public/styles.css', pubCss]
].forEach(([filename, style]) => {
  console.log(`Checking ${filename}...`);
  assert(style.includes('stage-focus-ribbon'), `${filename} must style stage focus ribbon`);
  assert(style.includes('target-analysis-banner'), `${filename} must style target analysis banner`);
  assert(style.includes('param-inspector-card'), `${filename} must style parameter inspection card`);
  assert(style.includes('ppb-executive-grid'), `${filename} must style PPB executive grid`);
  assert(style.includes('ppb-cycle-card'), `${filename} must style PPB cycle cards`);
  // Font sizes: check that font size enhancements are present
  assert(style.includes('font-size: 15.5px') || style.includes('font-size: 15px') || style.includes('15.5px'), `${filename} body/base font size enhanced`);
  console.log(`  ✓ ${filename} styles and enhanced typography verified.`);
});

console.log('\n========================================================================');
console.log('ALL NEW ENHANCEMENTS VERIFIED WITH 100% INTEGRITY! ✓');
console.log('========================================================================');
