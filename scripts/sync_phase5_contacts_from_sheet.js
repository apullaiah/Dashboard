const fs = require('fs');
const path = require('path');
const https = require('https');

const STORE_PATH = path.join(__dirname, '../data/store.json');
const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));

function fetchGviz(sheetId, gid) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 25000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
          if (!match) return resolve({ rows: [] });
          resolve(JSON.parse(match[1]).table || { rows: [] });
        } catch(e) { resolve({ rows: [] }); }
      });
    }).on('error', (e) => resolve({ rows: [] }));
  });
}

function cellVal(c) {
  return c && (c.f || c.v) ? String(c.f || c.v).trim() : '';
}

async function run() {
  console.log('Fetching Phase 5 Below 500 tab (gid 2035473489)...');
  const t = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '2035473489');
  let matched = 0;

  t.rows.forEach(r => {
    const row = (r.c || []).map(cellVal);
    const code = row[3];
    const text = row[9] || '';

    if (/^\d{7}$/.test(code) && text.trim()) {
      const v = store.villages.find(x => String(x.village_code) === code);
      if (v) {
        matched++;
        // Extract names and mobiles from the text
        const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
        const namesList = [];
        const mobilesList = [];

        lines.forEach(l => {
          const phoneMatches = l.match(/[6-9]\d{9}/g) || l.match(/[6-9]\d{4}\s*\d{5}/g);
          const cleanPhone = phoneMatches ? phoneMatches[0].replace(/\s+/g, '') : '';
          const namePart = l.replace(/[6-9]\d{9}/g, '').replace(/[6-9]\d{4}\s*\d{5}/g, '').replace(/^\d+[\.\)]\s*/, '').trim();
          if (cleanPhone || namePart) {
            namesList.push(namePart || 'Village Surveyor');
            mobilesList.push(cleanPhone || '');
          }
        });

        v.gt_team_names = namesList.join('\n');
        v.gt_team_mobiles = mobilesList.join('\n');
        console.log(`Updated [${code}] ${v.village_name} (${v.mandal}):`, namesList.join('; '), '| Phones:', mobilesList.join('; '));
      }
    }
  });

  console.log(`\nSuccessfully merged ${matched} Phase-5 village surveyor contacts from Google Sheet into store!`);
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

run();
