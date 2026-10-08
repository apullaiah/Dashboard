const fs = require('fs');
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
  if (c.f !== undefined && c.f !== null) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

async function main() {
  const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
  const p5Villages = store.villages.filter(v => (v.phase || '').toLowerCase().includes('phase v') && !(v.phase || '').toLowerCase().includes('vi'));
  const p6Villages = store.villages.filter(v => (v.phase || '').toLowerCase().includes('phase vi') || (v.phase || '').toLowerCase().includes('phase 6'));

  console.log(`Store: Phase 5 has ${p5Villages.length} villages, Phase 6 has ${p6Villages.length} villages.`);

  // Stage distribution in store for Phase 5 & 6
  console.log('\n--- Phase 5 stages in store ---');
  const p5Stages = {};
  p5Villages.forEach(v => p5Stages[v.current_stage] = (p5Stages[v.current_stage] || 0) + 1);
  console.log(p5Stages);

  console.log('\n--- Phase 6 stages in store ---');
  const p6Stages = {};
  p6Villages.forEach(v => p6Stages[v.current_stage] = (p6Stages[v.current_stage] || 0) + 1);
  console.log(p6Stages);

  // Now check Google Sheets for Phase 5:
  console.log('\n=== Fetching Phase 5 Google Sheets (1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0) ===');
  // 1. gid 1329023156 (VS & VRO)
  const p5VsVroTable = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
  console.log('Phase 5 VS & VRO sheet rows:', p5VsVroTable.rows.length);
  p5VsVroTable.rows.forEach((r, idx) => {
    const row = (r.c || []).map(cellVal);
    console.log(`  P5 VS/VRO [${idx}]: Code=${row[5]} Mandal=${row[3]} Village=${row[4]} Extent=${row[6]} C0=${row[0]} C1=${row[1]} C9=${row[9]} C13=${row[13]} C14=${row[14]}`);
  });

  // 2. gid 1758823146 (Tah, RDO, JC)
  const p5TahTable = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
  console.log('\nPhase 5 Tah, RDO, JC sheet rows:', p5TahTable.rows.length);
  p5TahTable.rows.forEach((r, idx) => {
    const row = (r.c || []).map(cellVal);
    console.log(`  P5 Tah/RDO/JC [${idx}]: Code=${row[5]} Mandal=${row[3]} Village=${row[4]} Extent=${row[6]} C0=${row[0]} C1=${row[1]} C13=${row[13]} C14=${row[14]}`);
  });

  // 3. gid 167154929 (DLR Completed)
  const p5CompTable = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '167154929');
  console.log('\nPhase 5 DLR Completed sheet rows:', p5CompTable.rows.length);
  p5CompTable.rows.forEach((r, idx) => {
    const row = (r.c || []).map(cellVal);
    console.log(`  P5 Completed [${idx}]: Code=${row[5]} Mandal=${row[3]} Village=${row[4]} Extent=${row[6]} C0=${row[0]} C1=${row[1]}`);
  });

  // Now check Google Sheets for Phase 6:
  console.log('\n=== Fetching Phase 6 Google Sheets (10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ) ===');
  // 1. gid 941359880 (VS & VRO)
  const p6VsVroTable = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
  console.log('Phase 6 VS & VRO sheet rows:', p6VsVroTable.rows.length);
  p6VsVroTable.rows.forEach((r, idx) => {
    const row = (r.c || []).map(cellVal);
    console.log(`  P6 VS/VRO [${idx}]: Code=${row[5]} Mandal=${row[3]} Village=${row[4]} Extent=${row[6]} C0=${row[0]} C1=${row[1]} C13=${row[13]} C14=${row[14]}`);
  });

  // 2. gid 127310674 (Tah, RDO, JC)
  const p6TahTable = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
  console.log('\nPhase 6 Tah, RDO, JC sheet rows:', p6TahTable.rows.length);
  p6TahTable.rows.forEach((r, idx) => {
    const row = (r.c || []).map(cellVal);
    console.log(`  P6 Tah/RDO/JC [${idx}]: Code=${row[5]} Mandal=${row[3]} Village=${row[4]} Extent=${row[6]} C0=${row[0]} C1=${row[1]} C13=${row[13]} C14=${row[14]}`);
  });
}

main().catch(console.error);
