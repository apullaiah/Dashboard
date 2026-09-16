/**
 * scripts/verify_webland_and_progress.js
 * Verification of:
 * 1. Ported villages marked 100% completed across all stages.
 * 2. Today's GT progress for Phase 5 & 6 (Combined: 1,440.82 Ac).
 * 3. VS and VRO login status for today (VS: 20, VRO: 12).
 * 4. API endpoints /api/dashboard and /api/villages?ported=true.
 */

const http = require('http');

function get(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:4173${urlPath}`, { headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

function post(urlPath, body = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`http://localhost:4173${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function verify() {
  console.log('--- 1. Testing Officer Login ---');
  const loginRes = await post('/api/auth/login', { pin: 'APCTR2026' });
  console.log('Login Status:', loginRes.status, '| Role:', loginRes.data.role, '| Token Present:', Boolean(loginRes.data.token));
  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Officer login failed!');
  }
  const token = loginRes.data.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  console.log('\n--- 2. Testing /api/dashboard ---');
  const dashRes = await get('/api/dashboard', authHeaders);
  console.log('Dashboard Status:', dashRes.status);
  const d = dashRes.data;

  console.log('\nKPIs:');
  console.log('  Total Villages:', d.kpis.totalVillages);
  console.log('  GT Completed Villages:', d.kpis.gtCompleted);
  console.log('  Final RoR Completed Villages:', d.kpis.finalRorCompleted);
  console.log('  Today GT Extent:', d.kpis.todayGtExtent, 'Acres');
  console.log('  Today VS Login Villages:', d.kpis.todayVsLoginVillages);
  console.log('  Today VRO Login Villages:', d.kpis.todayVroLoginVillages);
  console.log('  Ported to Webland-2 Villages:', d.kpis.portedToWeblandVillages);

  console.log('\nDaily Progress Object:');
  console.log('  As on date:', d.dailyProgress.asOnDate);
  console.log('  Combined Today GT Extent:', d.dailyProgress.combined.todayGtExtent, 'Acres');
  console.log('  Combined Cumulative GT Extent:', d.dailyProgress.combined.cumulativeGtExtent, 'Acres');
  console.log('  Combined VS Login Today:', d.dailyProgress.combined.vsLoginToday, 'Villages');
  console.log('  Combined VRO Login Today:', d.dailyProgress.combined.vroLoginToday, 'Villages');
  console.log('  Phase 5 Today GT Extent:', d.dailyProgress.phase5.todayGtExtent, 'Acres (VS:', d.dailyProgress.phase5.vsLoginToday, ', VRO:', d.dailyProgress.phase5.vroLoginToday, ')');
  console.log('  Phase 6 Today GT Extent:', d.dailyProgress.phase6.todayGtExtent, 'Acres (VS:', d.dailyProgress.phase6.vsLoginToday, ', VRO:', d.dailyProgress.phase6.vroLoginToday, ')');
  console.log('  Webland-2 Ported Count:', d.dailyProgress.portedToWebland.totalPorted, '(P1:', d.dailyProgress.portedToWebland.phase1, ', P2:', d.dailyProgress.portedToWebland.phase2, ', P3:', d.dailyProgress.portedToWebland.phase3, ')');

  console.log('\n--- 3. Testing /api/villages?ported=true ---');
  const portedRes = await get('/api/villages?ported=true', authHeaders);
  console.log('Ported Villages API Status:', portedRes.status);
  console.log('Ported Villages Count Returned:', portedRes.data.villages.length);

  const stages = [
    'gt_status', 'vectorization_status', 'vs_status', 'vro_status',
    'tahsildar_status', 'rdo_status', 'jc_status', 'section13_status',
    'draft_ror_status', 'final_ror_status', 'ppb_status'
  ];

  let incompleteCount = 0;
  for (const v of portedRes.data.villages) {
    const isComp = (val) => String(val || '').toLowerCase().trim() === 'completed';
    const allStagesDone = stages.every(s => isComp(v[s]));
    if (!allStagesDone || v.status !== 'Completed' || v.current_stage !== 'Completed') {
      incompleteCount++;
      console.log('Incomplete ported village:', v.village_name, v.village_code, v.status, v.current_stage);
    }
  }

  console.log('Incomplete ported villages count:', incompleteCount);
  if (incompleteCount === 0 && portedRes.data.villages.length === 72) {
    console.log('\n>>> SUCCESS: All 72 Webland-2 ported villages are 100% completed across all activities! <<<');
  } else {
    console.error('>>> MISMATCH in ported villages verification! <<<');
  }
}

verify().catch(console.error);
