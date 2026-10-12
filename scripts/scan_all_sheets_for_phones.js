const https = require('https');

function fetchGviz(sheetId, gid = '0') {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 25000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
          if (!match) return resolve({ rows: [] });
          const json = JSON.parse(match[1]);
          resolve(json.table || { rows: [] });
        } catch(e) { resolve({ rows: [] }); }
      });
    }).on('error', (e) => resolve({ rows: [], error: e.message }));
  });
}

function cellVal(c) {
  if (!c) return '';
  if (c.f) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

async function main() {
  const sheets = [
    // Phase 6 Daily Monitoring
    { title: 'Phase-6 Daily Progress (6th Phase Villages GT Progress)', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '0' },
    { title: 'Phase-6 Daily Abstract', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '1810644102' },
    { title: 'Phase-6 Daily Below 1000', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '1821052001' },
    { title: 'Phase-6 Daily eKYC Notice', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '1584807251' },
    { title: 'Phase-6 Daily ekyc Notice data', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '437928119' },

    // Phase 5 Daily Monitoring
    { title: 'Phase-5 Daily (V - PHASE - VILLAGE WISE)', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '0' },
    { title: 'Phase-5 Daily Abstract', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '1967147062' },
    { title: 'Phase-5 Daily Below 500', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '2035473489' },

    // Phase 6 Completed
    { title: 'Phase-6 Completed DIOS WISE', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '1185036978' },
    { title: 'Phase-6 Completed VS-VRO', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '941359880' },
    { title: 'Phase-6 Completed CSSLR', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '563060141' },
    { title: 'Phase-6 Completed Vectorization', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '0' },
    { title: 'Phase-6 Completed Tah-RDO-JC', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '127310674' },

    // Phase 5 Completed
    { title: 'Phase-5 Completed DIOS WISE', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '642409733' },
    { title: 'Phase-5 Completed VS-VRO', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1329023156' },
    { title: 'Phase-5 Completed CSSLR', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '2048120699' },
    { title: 'Phase-5 Completed Tah-RDO-JC', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '1758823146' },
    { title: 'Phase-5 Completed DLR Completed', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '167154929' },

    // Phase 4 Completed
    { title: 'Phase-4 Completed VS-VRO', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '1111910402' },
    { title: 'Phase-4 Completed Tah-RDO-JC', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '182095482' },
    { title: 'Phase-4 Completed DLR Completed', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', gid: '218111872' },

    // Rover Allotment
    { title: 'Rovers Allotment (Rovers today)', id: '17YeaDn2_bjXCcoLiSM1wngJBlcqCqRtlFAI9ZXIpfYM', gid: '347656125' }
  ];

  for (const s of sheets) {
    try {
      const table = await fetchGviz(s.id, s.gid);
      const rows = table.rows || [];
      const foundPhones = [];

      for (let r = 0; r < rows.length; r++) {
        const row = (rows[r].c || []).map(cellVal);
        row.forEach((cell, colIdx) => {
          const match = cell.match(/[6-9]\d{9}/g);
          if (match) {
            foundPhones.push({ row: r, col: colIdx, phones: match, context: row.slice(Math.max(0, colIdx - 2), colIdx + 4).join(' | ') });
          }
        });
      }

      console.log(`\n======================================================`);
      console.log(`Sheet: ${s.title} (rows: ${rows.length})`);
      if (foundPhones.length > 0) {
        console.log(`  Found ${foundPhones.length} phone occurrences!`);
        foundPhones.slice(0, 10).forEach(p => {
          console.log(`    Row ${p.row}: ${p.phones.join(', ')} --> Context: ${p.context.replace(/\n/g, ' ')}`);
        });
      } else {
        console.log(`  No phones found.`);
      }
    } catch(err) {
      console.error(`Error on ${s.title}:`, err.message);
    }
  }
}

main();
