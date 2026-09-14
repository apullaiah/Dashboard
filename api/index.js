let handleApi = null;
let serveStatic = null;
let initError = null;

try {
  const server = require('../server.js');
  handleApi = server.handleApi;
  serveStatic = server.serveStatic;
} catch (err) {
  initError = err;
  console.error('Failed to initialize server module:', err);
}

module.exports = async (req, res) => {
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      error: 'Serverless initialization error',
      message: initError.message,
      stack: initError.stack
    }, null, 2));
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = new URL(req.url, `${proto}://${host}`);

  // Resolve rewritten route if passed via query param (e.g. /api/index.js?route=auth/check)
  const route = url.searchParams.get('route');
  if (route !== null && route !== undefined) {
    url.pathname = '/api/' + route.replace(/^\/+/, '');
  } else if (url.pathname === '/api/index.js' || url.pathname === '/api') {
    const matched = req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri'];
    if (matched && matched.startsWith('/api/')) {
      url.pathname = matched;
    }
  }

  try {
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    console.error('API Serverless Execution Error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        error: error.message || 'Serverless Execution Error',
        stack: error.stack
      }, null, 2));
    }
  }
};
