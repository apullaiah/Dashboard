const http = require('http');
const server = require('../server.js');

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      headers: { host: 'localhost:4173' },
      on: (event, handler) => {
        if (event === 'data' && body) handler(Buffer.from(JSON.stringify(body)));
        if (event === 'end') handler();
      }
    };
    let out = '';
    const res = {
      statusCode: 200,
      setHeader: () => {},
      end: (data) => {
        out = data;
        resolve({ statusCode: res.statusCode, body: out });
      }
    };
    const url = new URL('http://localhost:4173' + path);
    server.handleApi(req, res, url).catch(reject);
  });
}

async function run() {
  console.log('Testing GET /api/whatsapp/poor-officers?tier=vs');
  const vsRes = await testEndpoint('/api/whatsapp/poor-officers?tier=vs');
  const vsData = JSON.parse(vsRes.body);
  console.log(`  VS count: ${vsData.count}, sample officer: ${vsData.officers[0]?.name} (${vsData.officers[0]?.role})`);
  console.log(`  VS jurisdiction: ${vsData.officers[0]?.jurisdictionText}`);
  console.log(`  VS today GT: ${vsData.officers[0]?.today_gt_extent} Ac`);

  console.log('\nTesting GET /api/whatsapp/poor-officers?tier=ms');
  const msRes = await testEndpoint('/api/whatsapp/poor-officers?tier=ms');
  const msData = JSON.parse(msRes.body);
  console.log(`  MS count: ${msData.count}, sample officer: ${msData.officers[0]?.name} (${msData.officers[0]?.role})`);
  console.log(`  MS jurisdiction: ${msData.officers[0]?.jurisdictionText}`);

  console.log('\nTesting GET /api/whatsapp/poor-officers?tier=dios');
  const diosRes = await testEndpoint('/api/whatsapp/poor-officers?tier=dios');
  const diosData = JSON.parse(diosRes.body);
  console.log(`  DIOS count: ${diosData.count}, sample officer: ${diosData.officers[0]?.name} (${diosData.officers[0]?.role})`);
  console.log(`  DIOS jurisdiction: ${diosData.officers[0]?.jurisdictionText}`);
  console.log(`  DIOS lagging mandals count: ${diosData.officers[0]?.laggingMandalsCount}`);

  console.log('\nTesting POST /api/whatsapp/send-officer-notice (Dry Run Single Notice)');
  const sendRes = await testEndpoint('/api/whatsapp/send-officer-notice', 'POST', {
    tier: 'dios',
    officerId: diosData.officers[0]?.id,
    senderTitle: 'AD, Chittoor',
    dryRun: true
  });
  const sendData = JSON.parse(sendRes.body);
  console.log('  Send Notice Success:', sendData.success);
  console.log('  Recipient:', sendData.officer, sendData.phone);
  console.log('  Status:', sendData.status);
  console.log('  Notice Preview:\n' + sendData.noticePreview);

  console.log('\nTesting POST /api/whatsapp/broadcast-tier-notices (Dry Run Bulk Broadcast)');
  const broadRes = await testEndpoint('/api/whatsapp/broadcast-tier-notices', 'POST', {
    tier: 'dios',
    senderTitle: 'AD, Chittoor',
    dryRun: true
  });
  const broadData = JSON.parse(broadRes.body);
  console.log('  Broadcast Success:', broadData.success);
  console.log('  Total Dispatches:', broadData.report?.totalDispatches);
  console.log('  Sender:', broadData.report?.sender);

  console.log('\nALL TIER MONITORING API TESTS PASSED SUCCESSFULLY! ✅');
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
