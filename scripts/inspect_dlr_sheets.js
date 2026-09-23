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

const dlrTabs = [
  // Phase 4
  { phase: 'Phase 4', title: 'Phase-4 VS & VRO', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '1111910402' },
  { phase: 'Phase 4', title: 'Phase-4 Tah, RDO & JC Login', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '182095482' },
  { phase: 'Phase 4', title: 'Phase-4 DLR Completed', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '218111872' },
  // Phase 5
  { phase: 'Phase 5', title: 'Phase-5 VS - VRO Login', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
  { phase: 'Phase 5', title: 'Phase-5 Tah-RDO-JC Login', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' },
  { phase: 'Phase 5', title: 'Phase-5 DLR Completed', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '167154929' },
  // Phase 6
  { phase: 'Phase 6', title: 'Phase-6 VS - VRO Login', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '941359880' },
  { phase: 'Phase 6', title: 'Phase-6 TAH - RDO - JC LOGIN', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '127310674' }
];

async function main() {
  for (const t of dlrTabs) {
    console.log(`\n========================================================================`);
    console.log(`=== [${t.phase}] ${t.title} (sheet: ${t.id}, gid: ${t.gid}) ===`);
    try {
      const table = await fetchGviz(t.id, t.gid);
      console.log(`Rows: ${table.rows.length}, Cols: ${table.cols.length}`);
      // Show first 5 rows
      for (let r = 0; r < Math.min(6, table.rows.length); r++) {
        const rowVals = (table.rows[r].c || []).map(cellVal);
        console.log(`  Row ${r}:`, JSON.stringify(rowVals.slice(0, 18)));
      }
      // Show total rows at bottom
      for (let r = Math.max(0, table.rows.length - 4); r < table.rows.length; r++) {
        const rowVals = (table.rows[r].c || []).map(cellVal);
        console.log(`  End Row ${r}:`, JSON.stringify(rowVals.filter(Boolean)));
      }
    } catch (e) {
      console.error(`Error fetching ${t.title}:`, e.message);
    }
  }
}

main();
