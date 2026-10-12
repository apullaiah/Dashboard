const https = require('https');

function fetchHtml(sheetId) {
  return new Promise((resolve, reject) => {
    const url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/htmlview';
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 25000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function run() {
  const html = await fetchHtml('1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k');
  const regex = /items\.push\(\{[^\}]*name:\s*"([^"]+)"[^\}]*gid:\s*"([^"]+)"/g;
  let m;
  console.log('Master sheet tabs:');
  while ((m = regex.exec(html)) !== null) {
    console.log('  name:', m[1], 'gid:', m[2]);
  }
}

run();
