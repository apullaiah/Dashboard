const assert = require('assert');
const fs = require('fs');
const path = require('path');

const store = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'store.json'), 'utf8'));
const {
  DIOS_DIRECTORY,
  MANDAL_SURVEYOR_DIRECTORY,
  getPoorVS,
  getPoorMS,
  getPoorDIOS,
  formatOfficerNotice,
  sendOfficerNotices
} = require('../lib/whatsappService.js');

async function testAll() {
  console.log('=== TEST 1: DEPUTY INSPECTORS OF SURVEY (DIOS) DESIGNATION ===');
  Object.values(DIOS_DIRECTORY).forEach(d => {
    assert.strictEqual(d.role, 'Deputy Inspector of Survey (DIOS)', `DIOS role must be Deputy Inspector of Survey (DIOS), found: ${d.role}`);
  });
  console.log('✓ All DIOS in directory are named "Deputy Inspector of Survey (DIOS)"');

  const diosOfficers = getPoorDIOS(store);
  assert(diosOfficers.length > 0, 'Must have DIOS officers');
  diosOfficers.forEach(d => {
    assert.strictEqual(d.role, 'Deputy Inspector of Survey (DIOS)', `getPoorDIOS role must be Deputy Inspector of Survey (DIOS)`);
  });
  console.log(`✓ getPoorDIOS returns ${diosOfficers.length} officers with role "Deputy Inspector of Survey (DIOS)"`);

  const sampleNotice = formatOfficerNotice(diosOfficers[0], 'dios', 'https://chittor-resurvey-dashboard.vercel.app', 'AD, Chittoor');
  assert(sampleNotice.includes('To: *' + diosOfficers[0].name + '* (Deputy Inspector of Survey - DIOS)'), 'Notice must have Deputy Inspector of Survey - DIOS');
  assert(sampleNotice.includes('As Deputy Inspector of Survey (DIOS), you are instructed'), 'Notice directive must have Deputy Inspector of Survey (DIOS)');
  console.log('✓ Notice text properly addresses Deputy Inspector of Survey (DIOS)');

  console.log('\n=== TEST 2: STRICT GOOGLE SPREADSHEET PHONE POLICY ===');
  // Check DIOS phones are strictly empty because they are not in the spreadsheet
  Object.values(DIOS_DIRECTORY).forEach(d => {
    assert.strictEqual(d.phone, '', `DIOS phone must be strictly empty (not in spreadsheet), found: "${d.phone}"`);
  });
  console.log('✓ DIOS phone numbers are strictly empty (not in spreadsheet)');

  // Check MS phones are strictly empty because they are not in the spreadsheet
  Object.values(MANDAL_SURVEYOR_DIRECTORY).forEach(m => {
    assert.strictEqual(m.phone, '', `MS phone must be strictly empty (not in spreadsheet), found: "${m.phone}"`);
  });
  console.log('✓ Mandal Surveyor phone numbers are strictly empty (not in spreadsheet)');

  // Check Village Surveyors with spreadsheet phones
  const vsList = getPoorVS(store);
  const vsWithSheetPhone = vsList.filter(v => v.phone && v.phone.length >= 10);
  console.log(`✓ Village Surveyors: ${vsWithSheetPhone.length} of ${vsList.length} have phones verified from Google Spreadsheet`);
  assert(vsWithSheetPhone.length > 100, 'Over 100 VS should have verified phone numbers from Google Spreadsheet');

  // Test dry-run send with empty phone (should be skipped, not sent to fake number)
  const bulkReport = await sendOfficerNotices({ tier: 'dios', dryRun: true }, store);
  assert.strictEqual(bulkReport.sentCount, 0, 'No DIOS notices should be sent since phones are not in spreadsheet');
  const skippedCount = bulkReport.results.filter(r => r.status.includes('Skipped')).length;
  assert.strictEqual(skippedCount, 6, 'All 6 DIOS must be skipped due to missing spreadsheet phone');
  console.log('✓ Bulk notice dispatch safely skips officers awaiting spreadsheet phone numbers');

  console.log('\n=== TEST 3: OVERVIEW GT NOT STARTED & PHASE-VII UNIVERSE ===');
  const allVillages = store.villages || [];
  const unstarted = allVillages.filter(v => 
    /phase\s*(vii|7)/i.test(v.phase) || 
    v.gt_status === 'Not Started' || 
    /not\s*started/i.test(v.current_stage) ||
    (parseFloat(v.gt_completed_extent) === 0 && parseFloat(v.today_gt_extent) === 0 && parseFloat(v.balance_gt_extent) > 0 && v.gt_status !== 'Completed')
  );

  assert.strictEqual(unstarted.length, 107, `Expected exactly 107 unstarted villages, got ${unstarted.length}`);
  const p7 = unstarted.filter(v => /phase\s*(vii|7)/i.test(v.phase));
  const p6 = unstarted.filter(v => !/phase\s*(vii|7)/i.test(v.phase));
  assert.strictEqual(p7.length, 91, `Expected 91 Phase VII villages, got ${p7.length}`);
  assert.strictEqual(p6.length, 16, `Expected 16 Phase VI unstarted villages, got ${p6.length}`);
  console.log(`✓ Universe verified: 107 Total (${p7.length} Phase-VII + ${p6.length} Phase-VI unstarted)`);

  const mandals = new Set(unstarted.map(v => v.mandal).filter(Boolean));
  assert.strictEqual(mandals.size, 23, `Expected 23 mandals, got ${mandals.size}`);
  console.log(`✓ Mandals covered: ${mandals.size}`);

  const totalExtent = unstarted.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0);
  console.log(`✓ Total Extent: ${totalExtent.toFixed(2)} Acres`);

  console.log('\n=== TEST 4: FRONTEND APP.JS & STYLES PARITY ===');
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const publicAppJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.strictEqual(appJs, publicAppJs, 'app.js and public/app.js must be identical');
  console.log('✓ app.js and public/app.js are 100% identical');

  const stylesCss = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  const publicStylesCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
  assert.strictEqual(stylesCss, publicStylesCss, 'styles.css and public/styles.css must be identical');
  console.log('✓ styles.css and public/styles.css are 100% identical');

  assert(appJs.includes('renderGtNotStartedAndPhase7Section'), 'app.js must include renderGtNotStartedAndPhase7Section');
  assert(appJs.includes('attachGtUnstartedEvents'), 'app.js must include attachGtUnstartedEvents');
  assert(appJs.includes('Deputy Inspectors of Survey (DIOS)'), 'app.js must include Deputy Inspectors of Survey (DIOS)');
  assert(appJs.includes('✓ In Sheet'), 'app.js must include ✓ In Sheet badge');
  assert(appJs.includes('Not in Spreadsheet'), 'app.js must include Not in Spreadsheet indication');
  console.log('✓ All UI features and badges confirmed present in frontend codebase');

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉');
}

testAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
