const https = require('https');

function fetchGviz(sheetId, gid = '0') {
  return new Promise((resolve) => {
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
  const sheetId = '1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk';

  console.log('===========================================================');
  console.log('=== Tab: Dy. IOS (gid: 84494485) ===');
  console.log('===========================================================');
  const diosTable = await fetchGviz(sheetId, '84494485');
  console.log('Cols:', diosTable.cols?.map(c => c.label));
  diosTable.rows?.forEach((r, idx) => {
    const row = (r.c || []).map(cellVal);
    console.log(`[DIOS Row ${idx}]`, row);
  });

  console.log('\n===========================================================');
  console.log('=== Tab: MLSOs (gid: 1361756935) ===');
  console.log('===========================================================');
  const mlsoTable = await fetchGviz(sheetId, '1361756935');
  console.log('Cols:', mlsoTable.cols?.map(c => c.label));
  mlsoTable.rows?.forEach((r, idx) => {
    const row = (r.c || []).map(cellVal);
    console.log(`[MLSO Row ${idx}]`, row);
  });
}

run();
