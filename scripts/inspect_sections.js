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

async function inspectSections() {
  const sheets = [
    { name: 'Phase 4 Tah RDO JC', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '182095482' },
    { name: 'Phase 5 Tah RDO JC', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' },
    { name: 'Phase 5 VS VRO', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
    { name: 'Phase 6 VS VRO', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '941359880' },
    { name: 'Phase 6 Tah RDO JC', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '127310674' }
  ];

  for (const s of sheets) {
    console.log(`\n======================================================`);
    console.log(`=== Inspecting sections in ${s.name} ===`);
    const table = await fetchGviz(s.id, s.gid);
    for (let i = 0; i < table.rows.length; i++) {
      const row = (table.rows[i].c || []).map(cellVal);
      const rowStr = row.join(' | ');
      // check if it's a section header or total or has key indicators
      if (/tah|rdo|jc|vs|vro|total|login|stage/i.test(rowStr) || i < 3) {
        console.log(`Row ${i}: [${row[0]}] [${row[1]}] [${row[2]}] [${row[3]}] [${row[4]}] -> ${rowStr.slice(0, 100)}`);
      }
    }
  }
}

inspectSections();
