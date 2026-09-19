const assert = require('assert');

async function test() {
  console.log('--- 1. Authenticate with Officer PIN APCTR2026 ---');
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

  console.log('\n--- 2. Fetch /api/dashboard & Validate Overview Metrics ---');
  const dashRes = await fetch('http://localhost:4173/api/dashboard', { headers: authHeaders });
  const d = await dashRes.json();
  assert(dashRes.ok, 'Dashboard API error');

  // Verify Today's GT & DLR logins
  console.log('Validating Today\'s GT & DLR Logins...');
  const c = d.dailyProgress.combined;
  assert(c.todayGtExtent > 0, `Expected todayGtExtent > 0, got ${c.todayGtExtent}`);
  assert.strictEqual(c.cumulativeGtExtent, 106543.57, `Expected cumulativeGtExtent=106543.57, got ${c.cumulativeGtExtent}`);
  assert.strictEqual(c.vsLoginToday, 1688, `Expected vsLoginToday=1688, got ${c.vsLoginToday}`);
  assert.strictEqual(c.vroLoginToday, 1554, `Expected vroLoginToday=1554, got ${c.vroLoginToday}`);
  assert.strictEqual(c.tahLoginToday, 2748, `Expected tahLoginToday=2748, got ${c.tahLoginToday}`);
  assert.strictEqual(c.rdoLoginToday, 0, `Expected rdoLoginToday=0, got ${c.rdoLoginToday}`);
  assert.strictEqual(c.jcLoginToday, 0, `Expected jcLoginToday=0, got ${c.jcLoginToday}`);
  console.log(`✓ Today's GT Extent: ${c.todayGtExtent} Ac (Cum: 1,06,543.57 Ac)`);
  console.log('✓ Today\'s DLR Entries: VS=1688, VRO=1554, Tahsildar=2748, RDO=0, JC=0 (Total 5,990)');

  // Verify Stage-wise Pendency (11 stages)
  console.log('\nValidating Stage-Wise Pendency across 11 Statutory Milestones...');
  assert(Array.isArray(d.stagePendency), 'stagePendency is not an array');
  assert.strictEqual(d.stagePendency.length, 11, `Expected 11 stages, got ${d.stagePendency.length}`);
  d.stagePendency.forEach(s => {
    assert(s.stageNumber >= 1 && s.stageNumber <= 11);
    assert(s.key && s.label);
    assert(typeof s.pending === 'number');
    assert(typeof s.completed === 'number');
    console.log(`  Stage ${s.stageNumber}. ${s.label}: ${s.pending} pending, ${s.completed} cleared (${s.percent}%)`);
  });
  console.log('✓ All 11 statutory stages verified in stagePendency.');

  // Verify Phase x Stage Pendency Matrix
  console.log('\nValidating Phase x Stage Pendency Matrix...');
  assert(Array.isArray(d.phaseStagePendencyMatrix), 'phaseStagePendencyMatrix is not an array');
  assert(d.phaseStagePendencyMatrix.length >= 8, `Expected at least 8 phases, got ${d.phaseStagePendencyMatrix.length}`);
  d.phaseStagePendencyMatrix.forEach(row => {
    assert(row.phase);
    assert(typeof row.total === 'number');
    assert(typeof row.pending === 'number');
    assert(row.stages && Object.keys(row.stages).length === 11);
  });
  console.log(`✓ Phase x Stage Matrix contains ${d.phaseStagePendencyMatrix.length} phases with all 11 stages mapped.`);

  // Verify September 2026 PPB Active Cycle (Current Month)
  console.log('\nValidating PPB Current Month (September 2026) Section Data...');
  const cur = d.currentMonthPpb;
  assert(cur, 'currentMonthPpb object missing');
  assert.strictEqual(cur.month, 'Sep-26');
  assert.strictEqual(cur.totalVillages, 37, `Expected 37 villages, got ${cur.totalVillages}`);
  assert.strictEqual(cur.targetPPBs, 22375, `Expected 22,375 target PPBs, got ${cur.targetPPBs}`);
  console.log(`  Mandals spanned (${cur.mandalsCount}):`, cur.mandals.join(', '));
  assert(cur.mandalsCount >= 10, `Expected at least 10 mandals, got ${cur.mandalsCount}`);
  assert.strictEqual(cur.villages.length, 37, `Expected 37 village records, got ${cur.villages.length}`);
  
  // Validate sample villages
  const first = cur.villages[0];
  assert(first.village_name && first.village_code && first.mandal && first.division && first.phase);
  assert(first.ppb_target > 0, 'Target PPBs must be greater than 0');
  console.log(`✓ September 2026 Cycle verified: 37 Villages, 22,375 Target PPBs across 10 Mandals.`);
  console.log(`  Sample Village: ${first.village_name} (${first.village_code}), Mandal: ${first.mandal}, Target PPBs: ${first.ppb_target}`);

  console.log('\n=============================================');
  console.log('ALL VERIFICATION CHECKS PASSED WITH 100% INTEGRITY!');
  console.log('=============================================');
}

test().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
