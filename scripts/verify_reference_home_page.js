const assert = require('assert');

async function run() {
  console.log('--- 1. Testing Server Static Files ---');

  // Test root index HTML
  const indexRes = await fetch('http://localhost:4173/');
  assert.strictEqual(indexRes.status, 200, 'Index should return 200');
  console.log('✓ Index page served successfully');

  // Test styles.css
  const stylesRes = await fetch('http://localhost:4173/styles.css');
  assert.strictEqual(stylesRes.status, 200, 'styles.css should return 200');
  const stylesText = await stylesRes.text();
  assert(stylesText.includes('.gov-dashboard-header'), 'styles.css should have .gov-dashboard-header');
  assert(stylesText.includes('.gov-office-title-red'), 'styles.css should have .gov-office-title-red');
  assert(stylesText.includes('.filter-panel-card'), 'styles.css should have .filter-panel-card');
  assert(stylesText.includes('.ref-kpi-grid'), 'styles.css should have .ref-kpi-grid');
  assert(stylesText.includes('.scope-card'), 'styles.css should have .scope-card');
  assert(stylesText.includes('.floating-time-badge'), 'styles.css should have .floating-time-badge');
  assert(stylesText.includes('@media print'), 'styles.css should have @media print styles');
  console.log('✓ styles.css verified with reference dashboard styles and print media rules');

  // Test app.js
  const appRes = await fetch('http://localhost:4173/app.js');
  assert.strictEqual(appRes.status, 200, 'app.js should return 200');
  const appText = await appRes.text();
  assert(appText.includes('renderGovHeader'), 'app.js should define renderGovHeader');
  assert(appText.includes('renderFilterChipPanel'), 'app.js should define renderFilterChipPanel');
  assert(appText.includes('renderReferenceKpiCards'), 'app.js should define renderReferenceKpiCards');
  assert(appText.includes('renderFloatingTimeWidget'), 'app.js should define renderFloatingTimeWidget');
  assert(appText.includes('updateHomeFilterUI'), 'app.js should define updateHomeFilterUI');
  assert(appText.includes('getFilteredHomeVillages'), 'app.js should define getFilteredHomeVillages');
  assert(appText.includes('data-home-filter'), 'app.js should handle data-home-filter');
  assert(appText.includes('data-kpi-drill'), 'app.js should handle data-kpi-drill');
  assert(appText.includes('ref-home-search'), 'app.js should handle ref-home-search');
  console.log('✓ app.js verified with all reference UI components and event handlers');

  console.log('\n--- 2. Authenticating as Officer ---');
  const loginRes = await fetch('http://localhost:4173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok, `Login failed: ${loginData.error}`);
  assert(loginData.token, 'Token not received');
  console.log('✓ Authentication successful. Officer token received.');

  const authHeaders = {
    'Content-Type': 'application/json',
    'X-User-Role': 'ADMIN',
    'Authorization': `Bearer ${loginData.token}`
  };

  console.log('\n--- 3. Testing Authenticated APIs ---');
  // Test /api/dashboard
  const dashRes = await fetch('http://localhost:4173/api/dashboard', { headers: authHeaders });
  assert.strictEqual(dashRes.status, 200, 'dashboard API should return 200');
  const dashData = await dashRes.json();
  assert(dashData.dailyProgress, 'dashboard API should have dailyProgress');
  assert(dashData.ppbCycles, 'dashboard API should have ppbCycles');
  assert(dashData.ppbCycles.length >= 8, 'dashboard API should have at least 8 PPB cycles');
  console.log(`✓ /api/dashboard verified with dailyProgress and ${dashData.ppbCycles.length} PPB cycles`);

  // Test /api/villages
  const vRes = await fetch('http://localhost:4173/api/villages', { headers: authHeaders });
  assert.strictEqual(vRes.status, 200, 'villages API should return 200');
  const vData = await vRes.json();
  assert(vData.villages && vData.villages.length >= 736, 'villages API should return 736+ villages');
  console.log(`✓ /api/villages returned ${vData.villages.length} villages`);

  console.log('\n--- 4. Simulating Home Client-Side Filtering & Calculations ---');
  const villages = vData.villages;
  const completed = villages.filter(v => v.status === 'Completed' || v.ported_to_webland).length;
  const pending = Math.max(0, villages.length - completed);
  const delayed = villages.filter(v => v.status === 'Delayed' || (Number(v.days_delayed) > 0)).length;
  const onTrack = Math.max(0, pending - delayed);

  console.log(`  Total Scope: ${villages.length}`);
  console.log(`  Completed: ${completed} (${Math.round((completed/villages.length)*100)}%)`);
  console.log(`  Pending: ${pending}`);
  console.log(`  On Track: ${onTrack} (${Math.round((onTrack/pending)*100)}%)`);
  console.log(`  Behind: ${delayed} (${Math.round((delayed/pending)*100)}%)`);

  assert(completed > 0, 'Completed villages should be > 0');
  assert(pending > 0, 'Pending villages should be > 0');

  // Test Division Filter
  const chittoorDiv = villages.filter(v => v.division === 'Chittoor');
  console.log(`  Chittoor Division: ${chittoorDiv.length} villages`);
  assert(chittoorDiv.length > 0, 'Chittoor division should have villages');

  // Test Mandal Filter
  const kuppamMandal = villages.filter(v => v.mandal === 'Kuppam');
  console.log(`  Kuppam Mandal: ${kuppamMandal.length} villages`);
  assert(kuppamMandal.length > 0, 'Kuppam mandal should have villages');

  // Test Month Filter (Sep-26)
  const sepVillages = villages.filter(v => v.ppb_cycle === 'Sep-26' || v.target_month === 'Sep-26');
  console.log(`  Sep-26 Cycle: ${sepVillages.length} villages`);
  assert(sepVillages.length === 37, 'Sep-26 should have exactly 37 villages');

  console.log('\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
