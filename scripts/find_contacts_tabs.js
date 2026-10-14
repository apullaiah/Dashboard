const https = require('https');

function getHtml(id) {
  return new Promise((resolve) => {
    https.get(`https://docs.google.com/spreadsheets/d/${id}/htmlview`, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(''));
  });
}

(async () => {
  const html = await getHtml('1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk');
  const sheetMatches = html.matchAll(/name:\s*"([^"]+)"[^}]*gid:\s*"([^"]+)"/g);
  console.log('--- Tabs in Contacts Sheet (1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk) ---');
  for (const m of sheetMatches) {
    console.log(`Tab: "${m[1]}" (gid: ${m[2]})`);
  }
  // also check for item id and name in bootstrap data
  const alt = html.matchAll(/item\s*id="sheet-button-([0-9]+)"[^>]*>([^<]+)</g);
  for (const m of alt) {
    console.log(`Button Tab: "${m[2]}" (gid: ${m[1]})`);
  }
})();
