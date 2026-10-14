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
        } catch(e) { resolve({ rows: [], error: e.message }); }
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
  const id = '1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk';
  console.log('Fetching Contacts Sheet:', id);
  const table = await fetchGviz(id, '0');
  console.log(`Cols: ${table.cols ? table.cols.length : 0}, Rows: ${table.rows ? table.rows.length : 0}`);
  if (table.cols) {
    console.log('Col labels:', table.cols.map(c => c.label).filter(Boolean));
  }
  if (table.rows) {
    table.rows.slice(0, 30).forEach((r, idx) => {
      const row = (r.c || []).map(cellVal);
      console.log(`[Row ${idx}]`, row.filter(Boolean));
    });
  }
}

run();
