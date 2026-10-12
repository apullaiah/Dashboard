const https = require('https');

function fetchGviz(sheetId, gid = '0') {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 25000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
          if (!match) return resolve({ rows: [] });
          const json = JSON.parse(match[1]);
          resolve(json.table || { rows: [] });
        } catch(e) { resolve({ rows: [] }); }
      });
    }).on('error', (e) => resolve({ rows: [], error: e.message }));
  });
}

function cellVal(c) {
  if (!c) return '';
  if (c.f) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

async function run() {
  console.log('=== Checking Phase 6 Daily (gid=0) ===');
  const p6 = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
  console.log('P6 rows:', p6.rows.length);
  for (let r = 0; r < Math.min(15, p6.rows.length); r++) {
    const row = (p6.rows[r].c || []).map(cellVal);
    console.log(`P6 R${r}: mandal=${row[2]}, code=${row[3]}, village=${row[4]}, names=${row[5]}, mobiles=${row[6]}`);
  }

  console.log('\n=== Checking Phase 5 Below 500 (gid=2035473489) ===');
  const p5 = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '2035473489');
  console.log('P5 Below 500 rows:', p5.rows.length);
  for (let r = 0; r < Math.min(15, p5.rows.length); r++) {
    const row = (p5.rows[r].c || []).map(cellVal);
    console.log(`P5 R${r}:`, row.slice(0, 10).filter(Boolean));
  }
}

run();
