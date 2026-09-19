const fs = require('fs');

async function fetchGviz(sheetId, gid) {
  const gidParam = gid ? `&gid=${gid}` : '';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gidParam}`;
  const res = await fetch(url);
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

async function inspectSubsheets() {
  const targets = [
    // Phase 5 Daily
    { title: 'Phase-5 Daily: V - PHASE - VILLAGE WISE', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '0' },
    { title: 'Phase-5 Daily: ABSTRACT', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '1967147062' },
    // Phase 6 Daily
    { title: 'Phase-6 Daily: 6th Phase Villages GT Progress', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '0' },
    { title: 'Phase-6 Daily: ABSTRACT', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '1810644102' },
    // Phase 5 GT Completed
    { title: 'Phase-5 Completed: CSSLR office (first subsheet)', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '2048120699' },
    { title: 'Phase-5 Completed: VS - VRO Login', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
    { title: 'Phase-5 Completed: Tah-RDO-JC Login', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' },
    { title: 'Phase-5 Completed: DLR Completed', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '167154929' },
    // Phase 6 GT Completed
    { title: 'Phase-6 Completed: CSSLR Office', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '563060141' },
    { title: 'Phase-6 Completed: VS - VRO Login', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '941359880' },
    { title: 'Phase-6 Completed: TAH - RDO - JC LOGIN', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '127310674' },
    // Phase 4 GT Completed
    { title: 'Phase-4 Completed: VS & VRO', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '1111910402' },
    { title: 'Phase-4 Completed: Tah, RDO & JC Login', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '182095482' },
    { title: 'Phase-4 Completed: DLR Completed', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '218111872' }
  ];

  for (const t of targets) {
    try {
      console.log(`\n======================================================`);
      console.log(`=== ${t.title} ===`);
      const table = await fetchGviz(t.id, t.gid);
      console.log(`Total cols: ${table.cols.length}, Total rows: ${table.rows.length}`);
      // Find header row (sometimes row 0 or 1 or table.cols)
      const colLabels = table.cols.map(c => c.label);
      console.log('Cols from GViz meta:', JSON.stringify(colLabels.filter(Boolean)));
      // print first 5 rows
      for (let r = 0; r < Math.min(5, table.rows.length); r++) {
        const rowData = (table.rows[r].c || []).map(cellVal);
        console.log(`Row ${r}:`, JSON.stringify(rowData.slice(0, 15)));
      }
    } catch (e) {
      console.error(`Error on ${t.title}:`, e.message);
    }
  }
}

inspectSubsheets();
