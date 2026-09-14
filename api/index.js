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

  // Resolve rewritten route if passed via query param or headers
  const routeParam = url.searchParams.get('route');
  if (routeParam) {
    url.searchParams.delete('route');
    const [cleanRoute, extraQuery] = routeParam.split('?');
    url.pathname = '/api/' + cleanRoute.replace(/^\/+/, '');
    if (extraQuery) {
      const q = new URLSearchParams(extraQuery);
      for (const [k, v] of q.entries()) {
        if (!url.searchParams.has(k)) url.searchParams.set(k, v);
      }
    }
  } else if (url.pathname === '/api/index.js' || url.pathname === '/api' || url.pathname === '/api/') {
    const matched = req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-matched-path'];
    if (matched && matched.startsWith('/api/')) {
      const [matchedPath, matchedQuery] = matched.split('?');
      url.pathname = matchedPath;
      if (matchedQuery) {
        const q = new URLSearchParams(matchedQuery);
        for (const [k, v] of q.entries()) {
          if (!url.searchParams.has(k)) url.searchParams.set(k, v);
        }
      }
    }
  }

  // Ensure clean pathname without trailing slash (except root)
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
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
