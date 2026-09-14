const { handleApi, serveStatic } = require('../server.js');

// Ensure Vercel Node File Trace bundles the 774-village data store
try {
  require('../data/store.json');
} catch (e) {}

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = new URL(req.url, `${proto}://${host}`);

  try {
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    console.error('API Serverless Error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: error.message || 'Serverless Execution Error' }));
    }
  }
};
