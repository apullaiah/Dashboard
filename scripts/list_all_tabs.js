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

async function checkSheets() {
  const ids = [
    { p: 'Phase 4', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4' },
    { p: 'Phase 5', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0' },
    { p: 'Phase 6', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ' }
  ];
  for (const item of ids) {
    console.log('=== ' + item.p + ' ===');
    try {
      const html = await fetchHtml(item.id);
      const regex = /<li id="sheet-button-(\d+)"[^>]*><a[^>]*>(.*?)<\/a>/g;
      let match;
      let count = 0;
      while ((match = regex.exec(html)) !== null) {
        count++;
        console.log(`  gid: ${match[1]} -> ${match[2].trim()}`);
      }
      if (count === 0) {
        // try another regex
        const r2 = /\{"name":"(.*?)","pageId":(\d+)/g;
        while ((match = r2.exec(html)) !== null) {
          console.log(`  gid: ${match[2]} -> ${match[1]}`);
        }
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}
checkSheets();
