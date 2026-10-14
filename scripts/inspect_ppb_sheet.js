const https = require('https');

function fetchGviz(sheetId, gid) {
  const gidParam = gid !== undefined && gid !== null && gid !== '' ? `&gid=${gid}` : '';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gidParam}`;
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const m = data.match(/setResponse\((.*)\);\s*$/s);
          if (!m) return resolve({ error: 'No match' });
          const json = JSON.parse(m[1]);
          resolve(json.table || {});
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  const table = await fetchGviz('1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k');
  console.log('Cols:', (table.cols || []).map(c => c ? (c.label || c.id) : ''));
  if (table.rows && table.rows.length > 0) {
    console.log('Row 0:', table.rows[0].c.map(x => x ? (x.f || x.v) : ''));
    console.log('Row 1:', table.rows[1] ? table.rows[1].c.map(x => x ? (x.f || x.v) : '') : '');
    console.log('Row 2:', table.rows[2] ? table.rows[2].c.map(x => x ? (x.f || x.v) : '') : '');
  }
})();
