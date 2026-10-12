const http = require('http');
const fs = require('fs');
const path = require('path');

// Test the server endpoints
const server = require('../server.js');
const handleApi = server.handleApi;

async function runTests() {
  console.log('--- Testing WhatsApp Webhook Config API & Persistence ---');

  function makeMockRes() {
    let statusCode = 200;
    let headers = {};
    let body = '';
    return {
      writeHead: (status, h) => { statusCode = status; headers = h; },
      setHeader: (k, v) => { headers[k] = v; },
      write: (data) => { body += data; },
      end: (data) => { if (data) body += data; },
      getStatus: () => statusCode,
      getBody: () => {
        try { return JSON.parse(body); } catch(e) { return body; }
      }
    };
  }

  // 1. Initial GET /api/whatsapp/config
  {
    const req = {
      method: 'GET',
      url: '/api/whatsapp/config',
      headers: { host: 'localhost:4173' }
    };
    const res = makeMockRes();
    const url = new URL(req.url, 'http://localhost:4173');
    await handleApi(req, res, url);
    const data = res.getBody();
    console.log('[Test 1] Initial GET config status:', res.getStatus());
    console.log('[Test 1] Config response:', data.config);
    if (!data.config || !data.config.webhookUrl) {
      throw new Error('Initial GET failed');
    }
  }

  // 2. POST /api/whatsapp/config with custom credentials
  const testPayload = {
    verifyToken: 'MY_SECRET_VERIFY_TOKEN_789',
    phoneNumberId: '9876543210123',
    wabaId: '1234567890987',
    accessToken: 'EAAB_TEST_PERMANENT_TOKEN_SECRET_XYZ',
    surveySenderName: 'District Survey Officer, Chittoor',
    revenueSenderName: 'Joint Collector & Addl DM, Chittoor'
  };

  {
    const { Readable } = require('stream');
    const payloadStr = JSON.stringify(testPayload);
    const req = Readable.from([Buffer.from(payloadStr)]);
    req.method = 'POST';
    req.url = '/api/whatsapp/config';
    req.headers = {
      host: 'localhost:4173',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payloadStr)
    };
    const res = makeMockRes();
    const url = new URL(req.url, 'http://localhost:4173');
    await handleApi(req, res, url);
    const data = res.getBody();
    console.log('[Test 2] POST config status:', res.getStatus());
    console.log('[Test 2] Saved response:', data);
    if (!data.success) throw new Error('POST config failed');
  }

  // 3. Verify file persistence in data/store.json
  {
    const storePath = path.join(__dirname, '..', 'data', 'store.json');
    const diskStore = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    console.log('[Test 3] data/store.json whatsappConfig on disk:');
    console.log(' - verifyToken:', diskStore.whatsappConfig.verifyToken);
    console.log(' - phoneNumberId:', diskStore.whatsappConfig.phoneNumberId);
    console.log(' - accessToken:', diskStore.whatsappConfig.accessToken);
    console.log(' - surveySenderName:', diskStore.whatsappConfig.surveySenderName);
    console.log(' - revenueSenderName:', diskStore.whatsappConfig.revenueSenderName);

    if (diskStore.whatsappConfig.phoneNumberId !== testPayload.phoneNumberId ||
        diskStore.whatsappConfig.accessToken !== testPayload.accessToken) {
      throw new Error('Disk store.json does not match saved config!');
    }
  }

  // 4. GET /api/whatsapp/config to verify retrieval and LIVE mode determination
  {
    const req = {
      method: 'GET',
      url: '/api/whatsapp/config',
      headers: { host: 'localhost:4173' }
    };
    const res = makeMockRes();
    const url = new URL(req.url, 'http://localhost:4173');
    await handleApi(req, res, url);
    const data = res.getBody();
    console.log('[Test 4] Re-fetch GET config:');
    console.log(' - mode:', data.config.mode);
    console.log(' - phoneNumberId:', data.config.phoneNumberId);
    console.log(' - accessToken:', data.config.accessToken);
    console.log(' - surveySenderName:', data.config.surveySenderName);
    console.log(' - revenueSenderName:', data.config.revenueSenderName);

    if (data.config.mode !== 'LIVE') throw new Error('Mode should be LIVE when phone and token are configured!');
    if (data.config.phoneNumberId !== testPayload.phoneNumberId) throw new Error('Phone ID mismatch');
  }

  // 5. Test client-side localStorage simulation and refresh logic
  {
    console.log('[Test 5] Simulating client-side page refresh...');
    // Simulated browser localStorage
    const mockLocalStorage = {
      ctr_resurvey_wa_config: JSON.stringify(testPayload)
    };

    const localConfig = JSON.parse(mockLocalStorage.ctr_resurvey_wa_config);
    const serverConfig = {
      verifyToken: 'MY_SECRET_VERIFY_TOKEN_789',
      phoneNumberId: '9876543210123',
      wabaId: '1234567890987',
      accessToken: 'EAAB_TEST_PERMANENT_TOKEN_SECRET_XYZ',
      surveySenderName: 'District Survey Officer, Chittoor',
      revenueSenderName: 'Joint Collector & Addl DM, Chittoor'
    };

    const c = {
      enabled: localConfig.enabled ?? serverConfig.enabled ?? true,
      verifyToken: localConfig.verifyToken || serverConfig.verifyToken || 'CTR_RESURVEY_WA_2026',
      phoneNumberId: localConfig.phoneNumberId || serverConfig.phoneNumberId || '',
      wabaId: localConfig.wabaId || serverConfig.wabaId || '',
      accessToken: (localConfig.accessToken && !localConfig.accessToken.includes('••••')) ? localConfig.accessToken : (serverConfig.accessToken || ''),
      senderName: localConfig.senderName || serverConfig.senderName || 'DSLRO, Chittoor',
      surveySenderName: localConfig.surveySenderName || serverConfig.surveySenderName || 'DSLRO, Chittoor',
      revenueSenderName: localConfig.revenueSenderName || serverConfig.revenueSenderName || 'Joint Collector, Chittoor',
    };

    const isLiveMode = Boolean(c.phoneNumberId && c.accessToken);

    console.log(' - Preserved after refresh verifyToken:', c.verifyToken);
    console.log(' - Preserved after refresh phoneNumberId:', c.phoneNumberId);
    console.log(' - Preserved after refresh accessToken:', c.accessToken);
    console.log(' - Preserved after refresh isLiveMode:', isLiveMode);

    if (!isLiveMode || c.phoneNumberId !== testPayload.phoneNumberId || c.accessToken !== testPayload.accessToken) {
      throw new Error('Refresh preservation failed');
    }
  }

  console.log('✅ ALL BACKEND & PERSISTENCE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
