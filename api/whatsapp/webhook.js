// Direct Vercel serverless function entrypoint for /api/whatsapp/webhook
const server = require('../../server.js');

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = new URL(req.url, `${proto}://${host}`);

  url.pathname = '/api/whatsapp/webhook';
  return server.handleApi(req, res, url);
};
