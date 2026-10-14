const https = require('https');

const sheets = [
  { name: 'Universe / PPBs', id: '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k' },
  { name: 'Phase 6', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ' },
  { name: 'Phase 5', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0' },
  { name: 'Phase 4', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4' },
  { name: 'Contacts', id: '1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk' },
  { name: 'Phase 5 Daily', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8' },
  { name: 'Phase 6 Daily', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY' },
  { name: 'Rovers', id: '17YeaDn2_bjXCcoLiSM1wngJBlcqCqRtlFAI9ZXIpfYM' }
];

function fetchText(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(res.headers.location));
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', err => resolve(''));
  });
}

(async () => {
  for (const s of sheets) {
    const html = await fetchText(`https://docs.google.com/spreadsheets/d/${s.id}/htmlview`);
    const tabs = [];
    const regex = /<li id="sheet-button-([^"]+)"[^>]*><a[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      tabs.push({ gid: m[1], name: m[2] });
    }
    console.log(`${s.name} (${s.id}):`);
    tabs.forEach(t => console.log(`   gid=${t.gid} -> "${t.name}"`));
  }
})();
