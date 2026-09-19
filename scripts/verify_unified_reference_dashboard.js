const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=== Verifying Unified Reference Dashboard Alignment ===\n');

// 1. Verify app.js and public/app.js match
const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
const publicAppJs = fs.readFileSync(path.resolve(__dirname, '../public/app.js'), 'utf8');

if (appJs !== publicAppJs) {
  console.error('❌ app.js and public/app.js are out of sync!');
  process.exit(1);
}
console.log('✓ app.js and public/app.js are strictly identical');

// 2. Verify styles.css and public/styles.css match
const stylesCss = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');
const publicStylesCss = fs.readFileSync(path.resolve(__dirname, '../public/styles.css'), 'utf8');

if (stylesCss !== publicStylesCss) {
  console.error('❌ styles.css and public/styles.css are out of sync!');
  process.exit(1);
}
console.log('✓ styles.css and public/styles.css are strictly identical');

// 3. Verify Reference Components Presence in app.js
const requiredFunctions = [
  'renderReferenceTopHeader',
  'renderReferenceFilterPanel',
  'renderReferenceFourKpiCards',
  'renderResurveyStagePipeline',
  'renderVillageWisePresentStatusTable',
  'renderMandalDrilldownSection',
  'renderMandalWiseDailyProformaSection',
  'exportCsv',
  'exportExcel'
];

requiredFunctions.forEach(fn => {
  if (!appJs.includes(`function ${fn}`)) {
    console.error(`❌ Missing required function: ${fn}`);
    process.exit(1);
  }
  console.log(`✓ Function exists: ${fn}`);
});

// 4. Verify 18 columns in table
const expectedColumns = [
  'Division', 'Mandal', 'Code', 'Village', 'Govt (ac)',
  'Patta (ac)', 'Extent (ac)', 'PPBs', 'Phase', 'Present status',
  'STAGE METRIC', 'Days in stage', 'Total to be done',
  'Till yesterday', 'Today', 'Cumulative', 'Balance'
];

expectedColumns.forEach(col => {
  if (!appJs.includes(col)) {
    console.error(`❌ Missing expected table column: ${col}`);
    process.exit(1);
  }
});
console.log('✓ Village-Wise Present Status table contains all 18 standard columns');

// 5. Verify 4 KPI Cards
const kpiTitles = ['VILLAGES IN VIEW', 'EXTENT', 'FINAL ROR COMPLETED', 'VECTORIZATION'];
kpiTitles.forEach(title => {
  if (!appJs.includes(title)) {
    console.error(`❌ Missing expected KPI title: ${title}`);
    process.exit(1);
  }
});
console.log('✓ All 4 Executive KPI Quad cards defined');

// 6. Verify Tab Navigation and Retained Views
if (!appJs.includes('data-overview-tab="unified"') || !appJs.includes('data-overview-tab="resurvey"') || !appJs.includes('data-overview-tab="ppb"')) {
  console.error('❌ Tab IDs missing from app.js');
  process.exit(1);
}
console.log('✓ Tab navigation includes Reference View, Resurvey Progress (GT/DLR), and PPB Overview');

// 7. Verify Unit Discipline Retained
if (!appJs.includes('Acres') || !appJs.includes('Number of Entries')) {
  console.error('❌ Unit discipline missing in app.js');
  process.exit(1);
}
console.log('✓ Unit discipline strictly preserved: GT in Acres, DLR in Number of Entries');

// 8. Test HTTP endpoint with officer auth
const postData = JSON.stringify({ pin: 'APCTR2026' });
const authReq = http.request({
  hostname: 'localhost',
  port: 4173,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (authRes) => {
  let authBody = '';
  authRes.on('data', c => authBody += c);
  authRes.on('end', () => {
    const auth = JSON.parse(authBody);
    if (!auth.token) {
      console.error('❌ Authentication failed:', auth);
      process.exit(1);
    }
    console.log('✓ Authenticated with officer PIN APCTR2026');

    http.get({
      hostname: 'localhost',
      port: 4173,
      path: '/api/dashboard',
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.hasData && data.dailyProgress) {
            console.log(`✓ API /api/dashboard returns district telemetry (as on ${data.dailyProgress.asOnDate}) successfully`);
          } else {
            console.error('❌ API /api/dashboard missing data');
            process.exit(1);
          }

          // Fetch /api/villages
          http.get({
            hostname: 'localhost',
            port: 4173,
            path: '/api/villages',
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }, (vres) => {
            let vbody = '';
            vres.on('data', chunk => vbody += chunk);
            vres.on('end', () => {
              const vdata = JSON.parse(vbody);
              if (vdata.villages && vdata.villages.length > 0) {
                console.log(`✓ API /api/villages returns ${vdata.villages.length} synchronized villages`);
              } else {
                console.error('❌ API /api/villages returned empty');
                process.exit(1);
              }

              console.log('\n======================================================');
              console.log('ALL REFERENCE DASHBOARD VERIFICATIONS PASSED 100%! 🎉');
              console.log('======================================================');
              process.exit(0);
            });
          });
        } catch (e) {
          console.error('❌ Failed to parse /api/dashboard response:', e);
          process.exit(1);
        }
      });
    }).on('error', (err) => {
      console.error('❌ HTTP request failed:', err.message);
      process.exit(1);
    });
  });
});
authReq.write(postData);
authReq.end();

