const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: async () => data }));
    }).on('error', reject);
  });
}

async function fetchGviz(sheetId, gid) {
  const gidParam = gid !== undefined && gid !== null && gid !== '' ? `&gid=${gid}` : '';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gidParam}`;
  const res = await fetchUrl(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const m = text.match(/setResponse\((.*)\);\s*$/s);
  if (!m) throw new Error('No setResponse match');
  const data = JSON.parse(m[1]);
  return data.table || { cols: [], rows: [] };
}

function cellVal(c) {
  if (!c) return '';
  if (c.f) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

async function parseTabs() {
  const tabs = [
    { name: 'P4_VS_VRO', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '1111910402' },
    { name: 'P4_TAH_RDO_JC', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '182095482' },
    { name: 'P5_VS_VRO', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
    { name: 'P5_TAH_RDO_JC', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' },
    { name: 'P6_VS_VRO', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '941359880' },
    { name: 'P6_TAH_RDO_JC', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '127310674' }
  ];

  for (const t of tabs) {
    console.log(`\n======================================================`);
    console.log(`TAB: ${t.name} (id: ${t.id}, gid: ${t.gid})`);
    const table = await fetchGviz(t.id, t.gid);
    console.log(`Cols count: ${table.cols.length}, Rows count: ${table.rows.length}`);
    console.log('Cols label from GViz:', table.cols.map((c, i) => `[${i}] ${c.label}`).filter(x => !x.endsWith(' ')));

    for (let r = 0; r < table.rows.length; r++) {
      const row = (table.rows[r].c || []).map(cellVal);
      // print non-empty cells with their col index
      const filled = row.map((val, colIdx) => val ? `[col${colIdx}]=${val}` : '').filter(Boolean);
      console.log(`Row ${r}: ${filled.join(' | ')}`);
    }
  }
}

parseTabs();
