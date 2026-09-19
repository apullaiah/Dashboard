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

async function inspectDaily() {
  const targets = [
    { title: 'Phase-5 Daily (gid 0)', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '0' },
    { title: 'Phase-6 Daily (gid 0)', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '0' },
    { title: 'Phase-5 Completed: VS - VRO Login (gid 1329023156)', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
    { title: 'Phase-5 Completed: Tah-RDO-JC Login (gid 1758823146)', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' }
  ];

  for (const t of targets) {
    console.log(`\n================================`);
    console.log(`=== ${t.title} ===`);
    const table = await fetchGviz(t.id, t.gid);
    console.log('GViz cols:', JSON.stringify(table.cols.map(c => c.label).filter(Boolean)));
    for (let i = 0; i < Math.min(6, table.rows.length); i++) {
      const row = (table.rows[i].c || []).map(cellVal);
      console.log(`Row ${i}:`, JSON.stringify(row));
    }
  }
}

inspectDaily();
