const fs = require('fs');

async function fetchGviz(sheetId, gid) {
  const gidParam = gid ? `&gid=${gid}` : '';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gidParam}`;
  const res = await fetch(url);
  const text = await res.text();
  const m = text.match(/setResponse\((.*)\);\s*$/s);
  const data = JSON.parse(m[1]);
  return data.table || { cols: [], rows: [] };
}

function cellVal(c) {
  if (!c) return '';
  if (c.f) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

function cleanNum(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function testSync() {
  console.log('--- 1. Fetching Phase 5 Daily Monitoring (GT) ---');
  const p5Daily = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '0');
  console.log('P5 Daily rows:', p5Daily.rows.length);

  console.log('--- 2. Fetching Phase 6 Daily Monitoring (GT) ---');
  const p6Daily = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
  console.log('P6 Daily rows:', p6Daily.rows.length);

  console.log('--- 3. Fetching Phase 4 Tah RDO JC DLR ---');
  const p4TahRdoJc = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '182095482');
  console.log('P4 Tah RDO JC rows:', p4TahRdoJc.rows.length);

  console.log('--- 4. Fetching Phase 5 VS VRO DLR ---');
  const p5VsVro = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
  console.log('P5 VS VRO rows:', p5VsVro.rows.length);

  console.log('--- 5. Fetching Phase 5 Tah RDO JC DLR ---');
  const p5TahRdoJc = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
  console.log('P5 Tah RDO JC rows:', p5TahRdoJc.rows.length);

  console.log('--- 6. Fetching Phase 6 VS VRO DLR ---');
  const p6VsVro = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
  console.log('P6 VS VRO rows:', p6VsVro.rows.length);

  console.log('--- 7. Fetching Phase 6 Tah RDO JC DLR ---');
  const p6TahRdoJc = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
  console.log('P6 Tah RDO JC rows:', p6TahRdoJc.rows.length);

  console.log('All GViz fetched successfully!');
}

testSync().catch(console.error);
