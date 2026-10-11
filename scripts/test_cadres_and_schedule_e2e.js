const assert = require('assert');
const fs = require('fs');
const http = require('http');

// Load server module
const server = require('../server.js');
const store = require('../data/store.json');
const wa = require('../lib/whatsappService.js');

console.log('=== END-TO-END VERIFICATION: SURVEY & REVENUE CADRES & 6:00 AM SCHEDULE ===');

// 1. VERIFY VERCEL.JSON CRON CONFIGURATION
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert(Array.isArray(vercelConfig.crons), 'vercel.json must have crons array');
const dailyCron = vercelConfig.crons.find(c => c.path === '/api/cron/daily-whatsapp-alerts');
assert(dailyCron, 'vercel.json must configure /api/cron/daily-whatsapp-alerts');
assert.strictEqual(dailyCron.schedule, '30 0 * * *', 'Cron schedule must be 30 0 * * * (00:30 UTC = 06:00 AM IST)');
console.log('✓ Vercel Cron configured: /api/cron/daily-whatsapp-alerts at "30 0 * * *" (06:00 AM IST daily)');

// 2. VERIFY SENDER ALLOCATIONS
assert.strictEqual(wa.getDefaultSenderForTier('vs'), 'DSLRO, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('mlso'), 'DSLRO, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('dios'), 'DSLRO, Chittoor');
console.log('✓ Survey Cadre (VS, MLSO, DIOS) designated sender: DSLRO, Chittoor');

assert.strictEqual(wa.getDefaultSenderForTier('vro'), 'Joint Collector, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('tahsildar'), 'Joint Collector, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('rdo'), 'Joint Collector, Chittoor');
console.log('✓ Revenue Cadre (VRO, Tahsildars, RDOs) designated sender: Joint Collector, Chittoor');

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 4999,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// 3. START IN-MEMORY HTTP SERVER TO TEST ENDPOINTS
const testServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4999');
  await server.handleApi(req, res, url);
});

testServer.listen(4999, async () => {
  try {
    // A. Survey Cadres
    const vsRes = await httpReq('GET', '/api/whatsapp/poor-officers?tier=vs');
    assert.strictEqual(vsRes.tier, 'vs');
    assert.strictEqual(vsRes.defaultSender, 'DSLRO, Chittoor');
    assert(vsRes.count > 0);
    console.log(`✓ GET /api/whatsapp/poor-officers?tier=vs -> ${vsRes.count} VS, Sender: ${vsRes.defaultSender}`);

    const mlsoRes = await httpReq('GET', '/api/whatsapp/poor-officers?tier=mlso');
    assert.strictEqual(mlsoRes.tier, 'mlso');
    assert.strictEqual(mlsoRes.defaultSender, 'DSLRO, Chittoor');
    assert(mlsoRes.count > 0);
    console.log(`✓ GET /api/whatsapp/poor-officers?tier=mlso -> ${mlsoRes.count} MLSO, Sender: ${mlsoRes.defaultSender}`);

    const diosRes = await httpReq('GET', '/api/whatsapp/poor-officers?tier=dios');
    assert.strictEqual(diosRes.tier, 'dios');
    assert.strictEqual(diosRes.defaultSender, 'DSLRO, Chittoor');
    assert.strictEqual(diosRes.count, 6);
    console.log(`✓ GET /api/whatsapp/poor-officers?tier=dios -> 6 DIOS, Sender: ${diosRes.defaultSender}`);

    // B. Revenue Cadres
    const vroRes = await httpReq('GET', '/api/whatsapp/poor-officers?tier=vro');
    assert.strictEqual(vroRes.tier, 'vro');
    assert.strictEqual(vroRes.defaultSender, 'Joint Collector, Chittoor');
    assert(vroRes.count > 0);
    console.log(`✓ GET /api/whatsapp/poor-officers?tier=vro -> ${vroRes.count} VRO, Sender: ${vroRes.defaultSender}`);

    const tahRes = await httpReq('GET', '/api/whatsapp/poor-officers?tier=tahsildar');
    assert.strictEqual(tahRes.tier, 'tahsildar');
    assert.strictEqual(tahRes.defaultSender, 'Joint Collector, Chittoor');
    assert(tahRes.count > 0);
    console.log(`✓ GET /api/whatsapp/poor-officers?tier=tahsildar -> ${tahRes.count} Tahsildars, Sender: ${tahRes.defaultSender}`);

    const rdoRes = await httpReq('GET', '/api/whatsapp/poor-officers?tier=rdo');
    assert.strictEqual(rdoRes.tier, 'rdo');
    assert.strictEqual(rdoRes.defaultSender, 'Joint Collector, Chittoor');
    assert.strictEqual(rdoRes.count, 4);
    console.log(`✓ GET /api/whatsapp/poor-officers?tier=rdo -> 4 RDOs, Sender: ${rdoRes.defaultSender}`);

    // C. Schedule Status
    const schedRes = await httpReq('GET', '/api/whatsapp/schedule-status');
    assert(schedRes.schedule);
    assert.strictEqual(schedRes.schedule.surveyCadreSender, 'DSLRO, Chittoor');
    assert.strictEqual(schedRes.schedule.revenueCadreSender, 'Joint Collector, Chittoor');
    console.log('✓ GET /api/whatsapp/schedule-status -> Schedule status confirmed');

    // D. Daily 6:00 AM Cron Trigger
    const cronRes = await httpReq('POST', '/api/cron/daily-whatsapp-alerts', {});
    assert(cronRes.success);
    assert(cronRes.summary);
    assert(cronRes.summary.totalDispatched > 0);
    console.log(`✓ POST /api/cron/daily-whatsapp-alerts -> Broadcast executed! Total Dispatched: ${cronRes.summary.totalDispatched}`);

    // E. Frontend Code Checks
    const appCode = fs.readFileSync('app.js', 'utf8');
    assert(appCode.includes('wa-schedule-banner-card'), 'app.js must contain wa-schedule-banner-card');
    assert(appCode.includes('wa-cadre-nav-tabs'), 'app.js must contain wa-cadre-nav-tabs');
    assert(appCode.includes('DSLRO, Chittoor'), 'app.js must contain DSLRO, Chittoor');
    assert(appCode.includes('Joint Collector, Chittoor'), 'app.js must contain Joint Collector, Chittoor');
    assert(appCode.includes('data-tier-radio="vro"'), 'app.js must contain VRO radio');
    assert(appCode.includes('data-tier-radio="tahsildar"'), 'app.js must contain Tahsildar radio');
    assert(appCode.includes('data-tier-radio="rdo"'), 'app.js must contain RDO radio');
    console.log('✓ Frontend app.js confirmed with Cadre navigation, 6 cadres, and automated 6:00 AM schedule trigger');

    testServer.close();
    console.log('\nALL E2E VERIFICATIONS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
  } catch (err) {
    console.error('E2E Test Failed:', err);
    testServer.close();
    process.exit(1);
  }
});
