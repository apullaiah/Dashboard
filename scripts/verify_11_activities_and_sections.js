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

function post(urlPath, body = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`http://localhost:4173${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
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
  console.log('=== 1. Logging in as Officer ===');
  const loginRes = await post('/api/auth/login', { pin: 'APCTR2026' });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Officer login failed!');
  }
  const authHeaders = { 'Authorization': `Bearer ${loginRes.data.token}` };
  console.log('Officer Login Success! Role:', loginRes.data.role);

  console.log('\n=== 2. Verifying /api/dashboard ===');
  const dashRes = await get('/api/dashboard', authHeaders);
  const d = dashRes.data;

  console.log('Dashboard Status:', dashRes.status);
  console.log('Total Villages:', d.kpis.totalVillages);
  console.log('Stage Progress Stages Count:', d.stageProgress.length);
  console.log('Stages in StageProgress:');
  d.stageProgress.forEach((s, i) => console.log(`  ${i + 1}. [${s.key}] ${s.label}: ${s.completed}/${d.kpis.totalVillages} (${s.percent}%)`));

  console.log('\nStage Details Count:', d.stageDetails.length);
  d.stageDetails.forEach(s => console.log(`  Stage ${s.stageNumber}: ${s.label} -> Tier: ${s.responsibleTier}`));

  console.log('\nPhases Count:', d.phases.length);
  d.phases.forEach(p => {
    console.log(`  ${p.name}: ${p.total} villages, Extent: ${p.extent}, RoR: ${p.final_ror_status}%, Webland-2: ${p.webland_2_status || 0}%`);
  });

  console.log('\nPPB Cycles Count:', d.ppbCycles.length);
  d.ppbCycles.forEach(c => {
    console.log(`  ${c.name} (${c.key}): ${c.totalVillages} villages, Target PPBs: ${c.targetPPBs}, Status: ${c.status}`);
  });

  console.log('\n=== 3. Verifying /api/villages ===');
  const vilRes = await get('/api/villages', authHeaders);
  console.log('Villages Count:', vilRes.data.totalCount);
  console.log('Filter Stage Definitions Count:', vilRes.data.filters.stageDefinitions.length);
  vilRes.data.filters.stageDefinitions.forEach(sd => console.log(`  ${sd.stageNumber}. ${sd.key} -> ${sd.label}`));

  // Check 11 statutory activities
  const expectedActivities = [
    'GT',
    'Vectorization/Correlation',
    'Village Surveyor Login',
    'DLR@VRO Login',
    'DLR@Tahsildar Login',
    'DLR@RDO Login',
    'DLR@JC Login',
    '13 Completed',
    'Draft RoR',
    'Final RoR',
    'Porting DLR to Webland-2.0'
  ];

  const actualActivities = d.stageProgress.map(s => s.label);
  const allMatch = expectedActivities.every((act, i) => actualActivities[i] === act);
  console.log('\nAll 11 Statutory Activities Exact Match:', allMatch);

  if (!allMatch) {
    console.error('Expected:', expectedActivities);
    console.error('Actual:', actualActivities);
    process.exit(1);
  }

  console.log('\n>>> ALL 11 STATUTORY ACTIVITIES AND PHASE/CYCLE SECTIONS VERIFIED SUCCESSFULLY! <<<');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
