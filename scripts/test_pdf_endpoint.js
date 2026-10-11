const http = require('http');
const serverModule = require('../server.js');

// Mock request and response to verify /api/reports/mandal-villages-pdf
async function testEndpoint(urlStr) {
  return new Promise(async (resolve, reject) => {
    const url = new URL(urlStr, 'http://localhost:3000');
    const req = {
      method: 'GET',
      headers: { host: 'localhost:3000' }
    };

    let statusCode = 0;
    let headers = {};
    const chunks = [];

    const res = {
      writeHead(code, h) {
        statusCode = code;
        headers = { ...headers, ...h };
      },
      setHeader(k, v) {
        headers[k] = v;
      },
      write(chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        resolve({
          statusCode,
          headers,
          body: Buffer.concat(chunks)
        });
      }
    };

    try {
      await serverModule.handleApi(req, res, url);
    } catch (err) {
      reject(err);
    }
  });
}

async function run() {
  console.log('Testing /api/reports/mandal-villages-pdf (All Mandals)...');
  const res1 = await testEndpoint('http://localhost:3000/api/reports/mandal-villages-pdf');
  console.log('Status:', res1.statusCode);
  console.log('Content-Type:', res1.headers['Content-Type']);
  console.log('Content-Disposition:', res1.headers['Content-Disposition']);
  console.log('Body length:', res1.body.length);
  console.log('PDF Magic Header:', res1.body.slice(0, 8).toString());

  if (res1.statusCode !== 200) throw new Error('Expected 200 OK');
  if (res1.headers['Content-Type'] !== 'application/pdf') throw new Error('Expected application/pdf');
  if (!res1.body.toString('latin1').startsWith('%PDF-1.4')) throw new Error('Expected %PDF-1.4 header');
  if (res1.body.length < 500000) throw new Error('Expected full district PDF > 500KB');

  console.log('\nTesting /api/reports/mandal-villages-pdf?mandal=Bangarupalem...');
  const res2 = await testEndpoint('http://localhost:3000/api/reports/mandal-villages-pdf?mandal=Bangarupalem');
  console.log('Status:', res2.statusCode);
  console.log('Content-Type:', res2.headers['Content-Type']);
  console.log('Content-Disposition:', res2.headers['Content-Disposition']);
  console.log('Body length:', res2.body.length);
  console.log('PDF Magic Header:', res2.body.slice(0, 8).toString());

  if (res2.statusCode !== 200) throw new Error('Expected 200 OK for Bangarupalem');
  if (!res2.headers['Content-Disposition'].includes('Bangarupalem')) throw new Error('Expected filename to contain Bangarupalem');
  if (!res2.body.toString('latin1').startsWith('%PDF-1.4')) throw new Error('Expected %PDF-1.4 header');

  console.log('\nTesting /api/reports/mandal-villages-pdf?division=Chittoor...');
  const res3 = await testEndpoint('http://localhost:3000/api/reports/mandal-villages-pdf?division=Chittoor');
  console.log('Status:', res3.statusCode);
  console.log('Body length:', res3.body.length);

  console.log('\nALL ENDPOINT TESTS PASSED WITH 100% SUCCESS!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
