const https = require('https');

function fetchGviz(sheetId, gid) {
  return new Promise((resolve, reject) => {
    https.get(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const m = b.match(/setResponse\((.*)\);\s*$/s);
        const data = JSON.parse(m[1]);
        resolve(data.table);
      });
    });
  });
}

function cellVal(c) {
  if (!c) return '';
  if (c.f !== undefined && c.f !== null) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

async function debugTiers() {
  console.log('=== P5 VS-VRO (1329023156) ===');
  const tVs = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
  let tier = 'vs_status';
  for (let r = 0; r < tVs.rows.length; r++) {
    const row = (tVs.rows[r].c || []).map(cellVal);
    const joined = row.join(' ').toLowerCase();
    if (joined.includes('vro login') || joined.includes('vro_status')) {
      console.log(`[SWITCH TO VRO] row ${r}:`, row.slice(0, 6));
      tier = 'vro_status';
      continue;
    }
    if (row[4] && row[5]) {
      console.log(`row ${r} [${tier}]:`, row[4], row[5]);
    } else if (joined.includes('total') || row[0] || row[1]) {
      console.log(`header/meta row ${r}:`, row.slice(0, 6));
    }
  }

  console.log('\n=== P5 TAH-RDO-JC (1758823146) ===');
  const tTah = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
  tier = 'tahsildar_status';
  for (let r = 0; r < tTah.rows.length; r++) {
    const row = (tTah.rows[r].c || []).map(cellVal);
    const joined = row.join(' ').toLowerCase();
    if (joined.includes('rdo login')) {
      console.log(`[SWITCH TO RDO] row ${r}:`, row.slice(0, 6));
      tier = 'rdo_status';
      continue;
    }
    if (joined.includes('jc login')) {
      console.log(`[SWITCH TO JC] row ${r}:`, row.slice(0, 6));
      tier = 'jc_status';
      continue;
    }
    if (row[4] && row[5]) {
      console.log(`row ${r} [${tier}]:`, row[4], row[5]);
    } else if (joined.includes('total') || row[0] || row[1]) {
      console.log(`header/meta row ${r}:`, row.slice(0, 6));
    }
  }

  console.log('\n=== P6 VS-VRO (941359880) ===');
  const t6Vs = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
  tier = 'vs_status';
  for (let r = 0; r < t6Vs.rows.length; r++) {
    const row = (t6Vs.rows[r].c || []).map(cellVal);
    const joined = row.join(' ').toLowerCase();
    if (joined.includes('vro login')) {
      console.log(`[SWITCH TO VRO] row ${r}:`, row.slice(0, 6));
      tier = 'vro_status';
      continue;
    }
    if (row[4] && row[5]) {
      console.log(`row ${r} [${tier}]:`, row[4], row[5]);
    } else if (joined.includes('total') || row[0] || row[1]) {
      console.log(`header/meta row ${r}:`, row.slice(0, 6));
    }
  }
}

debugTiers();
