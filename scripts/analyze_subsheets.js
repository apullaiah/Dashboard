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

async function analyzeAllSubsheets() {
  const subsheets = [
    // Phase 5 Daily
    { phase: 'Phase 5', type: 'GT_DAILY', title: 'Phase-5 Daily (gid 0)', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '0' },
    // Phase 6 Daily
    { phase: 'Phase 6', type: 'GT_DAILY', title: 'Phase-6 Daily (gid 0)', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '0' },
    // Phase 4 DLR
    { phase: 'Phase 4', type: 'DLR_VS_VRO', title: 'Phase-4 VS & VRO', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '1111910402' },
    { phase: 'Phase 4', type: 'DLR_TAH_RDO_JC', title: 'Phase-4 Tah, RDO & JC', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '182095482' },
    { phase: 'Phase 4', type: 'DLR_COMPLETED', title: 'Phase-4 DLR Completed', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '218111872' },
    // Phase 5 DLR
    { phase: 'Phase 5', type: 'DLR_VS_VRO', title: 'Phase-5 VS & VRO', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
    { phase: 'Phase 5', type: 'DLR_TAH_RDO_JC', title: 'Phase-5 Tah, RDO & JC', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' },
    { phase: 'Phase 5', type: 'DLR_COMPLETED', title: 'Phase-5 DLR Completed', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '167154929' },
    // Phase 6 DLR
    { phase: 'Phase 6', type: 'DLR_VS_VRO', title: 'Phase-6 VS & VRO', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '941359880' },
    { phase: 'Phase 6', type: 'DLR_TAH_RDO_JC', title: 'Phase-6 Tah, RDO & JC', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '127310674' }
  ];

  for (const s of subsheets) {
    console.log(`\n================================================================`);
    console.log(`Analyzing: ${s.title} (${s.phase}, ${s.type})`);
    const table = await fetchGviz(s.id, s.gid);
    const cols = table.cols.map((c, i) => `[${i}] ${c.label || ''}`);
    console.log(`Cols count: ${table.cols.length}, Rows count: ${table.rows.length}`);
    console.log('Cols:', cols.filter(c => !c.endsWith(' ')).join(' | '));
    
    // Print all non-empty rows up to 10
    let validRows = 0;
    for (let i = 0; i < table.rows.length; i++) {
      const r = (table.rows[i].c || []).map(cellVal);
      const isHeader = r.some(x => /mandal|village|division|sl\.no|total entries/i.test(x));
      const hasData = r.some(x => x && x.length > 0);
      if (hasData && validRows < 8) {
        console.log(` Row ${i}:`, JSON.stringify(r.filter((_, idx) => idx < 18)));
        validRows++;
      }
    }
  }
}

analyzeAllSubsheets();
