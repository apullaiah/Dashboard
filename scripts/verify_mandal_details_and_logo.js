const assert = require('assert');
const fs = require('fs');

async function run() {
  console.log('--- 1. Verifying "Somala" Removal from Overview ---');
  const appJs = fs.readFileSync('app.js', 'utf8');
  const pubAppJs = fs.readFileSync('public/app.js', 'utf8');

  assert(!appJs.includes("'Somala'"), "app.js must not include 'Somala' in mandalsList");
  assert(!pubAppJs.includes("'Somala'"), "public/app.js must not include 'Somala' in mandalsList");
  console.log('✓ "Somala" successfully removed from app.js and public/app.js');

  console.log('\n--- 2. Verifying Chittoor District Map Logo ---');
  assert(appJs.includes('aria-label="Chittoor District Map"'), 'app.js must have Chittoor District Map SVG in header');
  assert(appJs.includes('CHITTOOR</text>'), 'app.js map SVG must have CHITTOOR text label');
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert(indexHtml.includes('id="icon-resurvey-logo"'), 'index.html must have icon-resurvey-logo');
  assert(indexHtml.includes('CHITTOOR</text>'), 'index.html logo must have CHITTOOR label');
  console.log('✓ Chittoor District Map vector logo verified in header emblem and sidebar logo');

  console.log('\n--- 3. Verifying Village Details Table Implementation ---');
  assert(appJs.includes('renderHomeFilteredVillagesSection'), 'app.js must define renderHomeFilteredVillagesSection');
  assert(appJs.includes('renderHomeVillageRows'), 'app.js must define renderHomeVillageRows');
  assert(appJs.includes('home-filtered-villages-section'), 'app.js must render #home-filtered-villages-section');
  assert(appJs.includes('scrollIntoView'), 'app.js must smooth-scroll to village details when Mandal/Month/Stage is clicked');
  console.log('✓ Village Details Table and smooth-scrolling verified in app.js');

  console.log('\n--- 4. Authenticating & Testing APIs ---');
  const loginRes = await fetch('http://localhost:4173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.token, 'Login failed');
  const authHeaders = {
    'Content-Type': 'application/json',
    'X-User-Role': 'ADMIN',
    'Authorization': `Bearer ${loginData.token}`
  };

  const vRes = await fetch('http://localhost:4173/api/villages', { headers: authHeaders });
  assert.strictEqual(vRes.status, 200, 'villages API failed');
  const vData = await vRes.json();
  const villages = vData.villages;
  console.log(`✓ Retrieved ${villages.length} villages from API`);

  console.log('\n--- 5. Simulating Mandal, Month & Stage Village Details ---');
  // Test Mandal: Bangarupalem
  const bangarupalem = villages.filter(v => (v.mandal || '').toLowerCase().includes('bangarupalem'));
  console.log(`  Bangarupalem Mandal: ${bangarupalem.length} villages`);
  assert(bangarupalem.length >= 25, 'Bangarupalem should have 25+ villages');
  bangarupalem.slice(0, 3).forEach(v => {
    assert(v.village_code && v.village_name && v.mandal, 'Village missing essential fields');
    console.log(`    - [${v.village_code}] ${v.village_name} | Stage: ${v.current_stage || 'Not Started'} | Status: ${v.status}`);
  });

  // Test Mandal: Kuppam
  const kuppam = villages.filter(v => (v.mandal || '').toLowerCase().includes('kuppam'));
  console.log(`  Kuppam Mandal: ${kuppam.length} villages`);
  assert(kuppam.length >= 50, 'Kuppam should have 50+ villages');

  // Test Mandal: Gangadhara Nellore / GD Nellore alias
  const gdn = villages.filter(v => {
    const m = (v.mandal || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return m.includes('gangadhara') || m.includes('gdnellore');
  });
  console.log(`  Gangadhara Nellore Mandal: ${gdn.length} villages`);
  assert(gdn.length >= 30, 'GD Nellore should have 30+ villages');

  // Test Target Month: Sep-26
  const sep = villages.filter(v => v.ppb_cycle === 'Sep-26' || v.target_month === 'Sep-26');
  console.log(`  Sep-26 Target Month: ${sep.length} villages`);
  assert.strictEqual(sep.length, 37, 'Sep-26 must have exactly 37 villages');

  // Test Target Month: Aug-26
  const aug = villages.filter(v => v.ppb_cycle === 'Aug-26' || v.target_month === 'Aug-26');
  console.log(`  Aug-26 Target Month: ${aug.length} villages`);
  assert(aug.length >= 20, 'Aug-26 should have 20+ villages');

  // Test Stage: GT
  const gtVillages = villages.filter(v => (v.current_stage || '').toLowerCase().includes('gt'));
  console.log(`  GT Stage Villages: ${gtVillages.length} villages`);
  assert(gtVillages.length > 0, 'Should have villages in GT stage');

  // Test Stage: Completed / Webland
  const compVillages = villages.filter(v => v.status === 'Completed' || v.ported_to_webland);
  console.log(`  Completed / Webland Ported: ${compVillages.length} villages`);
  assert.strictEqual(compVillages.length, 389, 'Completed villages should be 389');

  console.log('\n======================================================');
  console.log('ALL TESTS PASSED: SOMALA REMOVED, LOGO UPDATED, DETAILS TABLE READY');
  console.log('======================================================');
}

run().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
