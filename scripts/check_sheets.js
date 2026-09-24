const https = require('https');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function checkSheets() {
  const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
  for (const s of store.sources) {
    console.log('\n--- Checking source:', s.name, s.spreadsheetId);
    try {
      const html = await fetchUrl('https://docs.google.com/spreadsheets/d/' + s.spreadsheetId + '/htmlview');
      const tabs = [];
      const regex = /id="sheet-button-([^"]+)"[^>]*>([^<]+)</g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        tabs.push({ gid: match[1], name: match[2].trim() });
      }
      console.log('Tabs in ' + s.name + ':', tabs);
    } catch(e) {
      console.log('Error fetching htmlview for ' + s.spreadsheetId + ':', e.message);
    }
  }
}
checkSheets();
