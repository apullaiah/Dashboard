const fs = require('fs');
const http = require('http');
const assert = require('assert');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(u, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: () => JSON.parse(data), text: () => data });
        } catch (e) {
          resolve({ status: res.statusCode, text: () => data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing Officer Login & API Data ---');
  const loginRes = await fetch('http://localhost:4173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'APCTR2026' })
  });
  const loginData = await loginRes.json();
  assert(loginData.token, 'Login must return a valid auth token');
  console.log('✓ Officer Login successful');

  const villagesRes = await fetch('http://localhost:4173/api/villages', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const villagesData = await villagesRes.json();
  assert(villagesData.villages && villagesData.villages.length > 0, 'Must return villages array');
  console.log(`✓ Fetched ${villagesData.villages.length} villages from API`);

  // Check Phase 4 villages
  const phase4 = villagesData.villages.filter(v => (v.phase || '').toLowerCase().includes('iv') || (v.phase || '').toLowerCase().includes('phase 4'));
  console.log(`Phase 4 total villages: ${phase4.length}`);
  assert.strictEqual(phase4.length, 101, 'Phase 4 must have exactly 101 villages');

  // Verify Phase 4 current stage breakdown
  const stageCounts = {};
  phase4.forEach(v => {
    const st = v.current_stage || 'Unknown';
    stageCounts[st] = (stageCounts[st] || 0) + 1;
  });
  console.log('Phase 4 current stage distribution:', stageCounts);

  assert.strictEqual(stageCounts['13 Completed'], 27, 'Phase 4 must have 27 villages at 13 Completed');
  assert.strictEqual(stageCounts['Tah Login'], 30, 'Phase 4 must have 30 villages at Tah Login');
  assert.strictEqual(stageCounts['RDO Login'], 30, 'Phase 4 must have 30 villages at RDO Login');
  assert.strictEqual(stageCounts['JC Login'], 12, 'Phase 4 must have 12 villages at JC Login');
  assert.strictEqual(stageCounts['VRO Login'], 2, 'Phase 4 must have 2 villages at VRO Login');
  assert.strictEqual(stageCounts['DLR@VSlogin'] || 0, 0, 'Phase 4 must NOT have any village showing DLR@VSlogin');
  assert.strictEqual(stageCounts['VS Login'] || 0, 0, 'Phase 4 must NOT have any village pending at VS Login');
  console.log('✓ Phase 4 current stages perfectly tally with Google Spreadsheet (0 DLR@VSlogin)!');

  console.log('\n--- 2. Testing Frontend Abstract Implementation in app.js and public/app.js ---');
  const appJs = fs.readFileSync('app.js', 'utf8');
  const publicAppJs = fs.readFileSync('public/app.js', 'utf8');

  [
    { name: 'app.js', code: appJs },
    { name: 'public/app.js', code: publicAppJs }
  ].forEach(({ name, code }) => {
    assert(code.includes('function renderHomeExecutiveAbstract('), `${name} must include renderHomeExecutiveAbstract`);
    assert(code.includes('home-abstract-container'), `${name} must include home-abstract-container`);
    assert(code.includes('data-home-village='), `${name} must render rows with data-home-village`);
    assert(code.includes('selected-village-row'), `${name} must include selected-village-row class`);
    assert(code.includes('data-action="clear-selected-village"'), `${name} must include clear-selected-village action`);
    assert(code.includes('data-action="track-village-modal"'), `${name} must include track-village-modal action`);
    assert(code.includes('el.dataset.homeVillage'), `${name} click handler must handle homeVillage`);
    assert(code.includes('el.dataset.action === \'clear-selected-village\''), `${name} click handler must handle clear-selected-village`);
    assert(code.includes('el.dataset.action === \'track-village-modal\''), `${name} click handler must handle track-village-modal`);
    assert(code.includes('All phases'), `${name} filter panel must include All phases`);
    console.log(`✓ ${name} verified for Executive Abstract, click handlers, and Phase filtering`);
  });

  console.log('\n--- 3. Testing Circular Logo with Chittoor & Kanipakam Gopuram ---');
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const publicIndexHtml = fs.readFileSync('public/index.html', 'utf8');

  [
    { name: 'index.html', code: indexHtml },
    { name: 'public/index.html', code: publicIndexHtml }
  ].forEach(({ name, code }) => {
    assert(code.includes('icon-resurvey-logo'), `${name} must have icon-resurvey-logo`);
    assert(code.includes('CHITTOOR DISTRICT'), `${name} logo must have CHITTOOR DISTRICT text`);
    assert(code.includes('RESURVEY PROJECT'), `${name} logo must have RESURVEY PROJECT text`);
    assert(code.includes('sbArcTop'), `${name} logo must use circular textPath sbArcTop`);
    assert(code.includes('sbGopuramGrad'), `${name} logo must have Gopuram gradient`);
    console.log(`✓ ${name} verified for Circular Logo with Chittoor letters and Kanipakam Gopuram`);
  });

  console.log('\n--- 4. Testing Enlarged Typography and Executive Abstract CSS ---');
  const stylesCss = fs.readFileSync('styles.css', 'utf8');
  const publicStylesCss = fs.readFileSync('public/styles.css', 'utf8');

  [
    { name: 'styles.css', code: stylesCss },
    { name: 'public/styles.css', code: publicStylesCss }
  ].forEach(({ name, code }) => {
    assert(code.includes('.executive-abstract-card'), `${name} must include .executive-abstract-card`);
    assert(code.includes('.village-selected-abstract'), `${name} must include .village-selected-abstract`);
    assert(code.includes('.abstract-numbers-grid'), `${name} must include .abstract-numbers-grid`);
    assert(code.includes('.abstract-stage-pills'), `${name} must include .abstract-stage-pills`);
    assert(code.includes('.selected-village-row'), `${name} must include .selected-village-row`);
    assert(code.includes('font-size: 14.5px') || code.includes('font-size:14.5px'), `${name} body font-size must be enlarged to 14.5px`);
    assert(code.includes('font-size: 13.5px') || code.includes('font-size:13.5px'), `${name} table must have enlarged 13.5px font-size`);
    console.log(`✓ ${name} verified for enlarged typography and abstract card styling`);
  });

  console.log('\n=============================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✓');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
