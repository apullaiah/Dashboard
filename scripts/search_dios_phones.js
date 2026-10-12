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

async function run() {
  const targets = [
    { name: 'P6 DIOS WISE', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '1185036978' },
    { name: 'P5 DIOS WISE', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '642409733' },
    { name: 'P6 CSSLR Office', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', gid: '563060141' },
    { name: 'P5 CSSLR office', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', gid: '2048120699' },
    { name: 'P6 eKYC Notice', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '1584807251' },
    { name: 'P6 ekyc Notice data', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '437928119' },
    { name: 'P6 Daily Abstract', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', gid: '1810644102' },
    { name: 'P5 Daily Abstract', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', gid: '1967147062' },
    { name: 'Rover Allotment', id: '17YeaDn2_bjXCcoLiSM1wngJBlcqCqRtlFAI9ZXIpfYM', gid: '347656125' }
  ];

  for (const t of targets) {
    const table = await fetchGviz(t.id, t.gid);
    console.log(`\n=== Checking ${t.name} (rows: ${table.rows.length}) ===`);
    table.rows.forEach((r, idx) => {
      const row = (r.c || []).map(cellVal);
      const text = row.join(' ');
      if (/[6-9]\d{9}/.test(text) || /Prasad|Murthy|Moorthy|Sekhar|Ramana|Chandra/i.test(text)) {
        console.log(`  Row ${idx}:`, row.slice(0, 10).filter(Boolean));
      }
    });
  }
}

run();
