const https = require('https');

function fetchGviz(sheetId, gid = '0') {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
          if (!match) return reject(new Error('No match: ' + data.slice(0, 100)));
          resolve(JSON.parse(match[1]).table);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function cellVal(c) {
  if (!c) return '';
  if (c.f) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

async function run() {
  const targets = [
    { title: 'Master Universe', id: '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k', gid: '0' },
    { title: 'Phase-5 Daily', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '0' },
    { title: 'Phase-5 Daily Abstract', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '1967147062' },
    { title: 'Phase-6 Daily', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '0' },
    { title: 'Phase-6 Daily Abstract', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '1810644102' },
    { title: 'Phase-5 Completed VS-VRO', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
    { title: 'Phase-5 Completed Tah-RDO-JC', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' },
    { title: 'Phase-6 Completed VS-VRO', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '941359880' },
    { title: 'Phase-4 Completed VS-VRO', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '1111910402' },
    { title: 'Phase-4 Completed Tah-RDO-JC', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '182095482' }
  ];

  for (const t of targets) {
    try {
      console.log(`\n======================================================`);
      console.log(`=== ${t.title} ===`);
      const table = await fetchGviz(t.id, t.gid);
      // find any cells matching phone numbers or officer names
      let foundPhones = [];
      for (let r = 0; r < table.rows.length; r++) {
        const row = (table.rows[r].c || []).map(cellVal);
        row.forEach((cell, colIdx) => {
          if (/[6-9]\d{9}/.test(cell)) {
            foundPhones.push({ row: r, col: colIdx, val: cell });
          }
        });
      }
      console.log(`Rows: ${table.rows.length}, Found phones in ${foundPhones.length} cells`);
      if (foundPhones.length > 0) {
        console.log('Sample phones:', foundPhones.slice(0, 5));
      }
      // Print first 3 rows
      for (let r = 0; r < Math.min(3, table.rows.length); r++) {
        const row = (table.rows[r].c || []).map(cellVal).filter(Boolean);
        console.log(`Row ${r}:`, row.slice(0, 8));
      }
    } catch (e) {
      console.error(`Error on ${t.title}:`, e.message);
    }
  }
}

run();
