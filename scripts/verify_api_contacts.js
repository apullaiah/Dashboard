const http = require('http');

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4173${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- Checking /api/dashboard ---');
  const d = await fetchJson('/api/dashboard');
  console.log('Mandals Count in /api/dashboard:', (d.mandals || []).length);
  const mandalsWithMs = (d.mandals || []).filter(m => m.ms_name && m.ms_phone);
  console.log(`Mandals with MS details: ${mandalsWithMs.length} / ${(d.mandals || []).length}`);
  
  (d.mandals || []).slice(0, 5).forEach(m => {
    console.log(`  - [${m.name}]: MS = ${m.ms_name}, Role = ${m.ms_role}, Phone = ${m.ms_phone}`);
  });

  console.log('\n--- Checking /api/villages ---');
  const vData = await fetchJson('/api/villages');
  const villages = vData.villages || [];
  console.log(`Total Villages: ${villages.length}`);
  const withTeams = villages.filter(v => v.gt_team_names || v.gt_team_mobiles);
  console.log(`Villages with explicit GT team entries in store: ${withTeams.length}`);
  withTeams.slice(0, 5).forEach(v => {
    console.log(`  - [${v.village_name} / ${v.mandal}]: Officer(s) = ${v.gt_team_names} | Mobile(s) = ${v.gt_team_mobiles}`);
  });

  // Verify that all 27 Mandals have valid MS mapping
  console.log('\n--- Checking 27 Mandals Directory Coverage ---');
  const uniqueMandals = [...new Set(villages.map(v => v.mandal).filter(Boolean))].sort();
  console.log(`Distinct Mandals in villages: ${uniqueMandals.length}`);
  let missing = 0;
  uniqueMandals.forEach(m => {
    const found = (d.mandals || []).find(dm => dm.name.toLowerCase() === m.toLowerCase());
    if (!found || !found.ms_name || found.ms_name === 'Concerned Mandal Surveyor') {
      console.warn(`  Warning: Mandal "${m}" might not have specific MS assignment.`);
      missing++;
    } else {
      console.log(`  OK: [${m}] -> ${found.ms_name} (${found.ms_phone})`);
    }
  });
  console.log(`Mandals correctly assigned: ${uniqueMandals.length - missing} / ${uniqueMandals.length}`);
}

verify().catch(console.error);
