const fs = require('fs');
const path = require('path');
const https = require('https');

const STORE_PATH = path.join(__dirname, '../data/store.json');
const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
const villages = store.villages;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: async () => data }));
    }).on('error', reject);
  });
}

async function fetchGviz(sheetId, gid) {
  const gidParam = gid !== undefined && gid !== null && gid !== '' ? `&gid=${gid}` : '';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gidParam}`;
  const res = await fetchUrl(url);
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

function cleanNum(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

const CODE_OVERRIDES = {
  '1060033': '1060031' // Muthukur Karasanapalli
};

async function syncGtFromGoogleSheets() {
  console.log('=== SYNCING GT PROGRESS DIRECTLY FROM SOURCE GOOGLE SHEETS ===');
  
  // 1. Reset all villages today_gt_extent to 0.00
  villages.forEach(v => {
    v.today_gt_extent = 0.00;
  });

  // 2. Fetch Phase 5 Daily (gid 0)
  console.log('\nFetching Phase 5 Daily Sheet (11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8)...');
  const p5 = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '0');
  let p5Matched = 0;
  let p5TodaySum = 0;
  let p5ActiveCount = 0;

  for (let r = 1; r < p5.rows.length; r++) {
    const row = (p5.rows[r].c || []).map(cellVal);
    let code = String(row[3] || '').trim();
    if (CODE_OVERRIDES[code]) code = CODE_OVERRIDES[code];
    if (!/^\d{5,8}$/.test(code)) continue; // ignore header and total rows

    const vName = row[4];
    const mandal = row[2];
    const rovers = cleanNum(row[8]);
    const teams = cleanNum(row[9]);
    const startDate = row[12];
    const tillYest = cleanNum(row[14]);
    const today = cleanNum(row[15]);
    const cum = cleanNum(row[16]);
    const bal = cleanNum(row[17]);
    const compDate = row[18];
    const isComp = /yes/i.test(row[19]) || Boolean(compDate) || (bal === 0 && cum > 0);

    const v = villages.find(v => String(v.village_code || '').trim() === code);
    if (v) {
      p5Matched++;
      v.gt_rovers = rovers || v.gt_rovers || 0;
      v.gt_teams = teams || v.gt_teams || 0;
      v.gt_start_date = startDate || v.gt_start_date || '';
      v.gt_completed_date = compDate || v.gt_completed_date || '';
      v.gt_extent_till_yesterday = tillYest;
      v.today_gt_extent = today;
      v.cumulative_gt_extent = cum;
      v.balance_gt_extent = bal;
      if (isComp) {
        v.gt_status = 'Completed';
      } else if (today > 0 || cum > 0) {
        v.gt_status = 'In Progress';
      }
      if (today > 0) {
        p5ActiveCount++;
        p5TodaySum += today;
        console.log(`  Phase 5 Active: [${code}] ${v.village_name} (${v.mandal}) -> Today: ${today} Ac, Cum: ${cum} Ac, Bal: ${bal} Ac`);
      }
    } else {
      console.warn(`  Phase 5 Unmatched code: ${code} (${vName}, ${mandal})`);
    }
  }
  console.log(`Phase 5: Matched ${p5Matched} villages. Active today: ${p5ActiveCount} villages with ${p5TodaySum.toFixed(2)} Ac (Expected: 362.04 Ac).`);

  // 3. Fetch Phase 6 Daily (gid 0)
  console.log('\nFetching Phase 6 Daily Sheet (1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY)...');
  const p6 = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
  let p6Matched = 0;
  let p6TodaySum = 0;
  let p6ActiveCount = 0;

  for (let r = 1; r < p6.rows.length; r++) {
    const row = (p6.rows[r].c || []).map(cellVal);
    let code = String(row[3] || '').trim();
    if (CODE_OVERRIDES[code]) code = CODE_OVERRIDES[code];
    if (!/^\d{5,8}$/.test(code)) continue;

    const vName = row[4];
    const mandal = row[2];
    const teamNames = row[5];
    const teamMobiles = row[6];
    const rovers = cleanNum(row[10]);
    const teams = cleanNum(row[11]);
    const startDate = row[14];
    const tillYest = cleanNum(row[16]);
    const today = cleanNum(row[17]);
    const cum = cleanNum(row[18]);
    const bal = cleanNum(row[19]);
    const compDate = row[20];
    const isComp = /yes/i.test(row[21]) || Boolean(compDate) || (bal === 0 && cum > 0);

    const v = villages.find(v => String(v.village_code || '').trim() === code);
    if (v) {
      p6Matched++;
      v.gt_team_names = teamNames || v.gt_team_names || '';
      v.gt_team_mobiles = teamMobiles || v.gt_team_mobiles || '';
      v.gt_rovers = rovers || v.gt_rovers || 0;
      v.gt_teams = teams || v.gt_teams || 0;
      v.gt_start_date = startDate || v.gt_start_date || '';
      v.gt_completed_date = compDate || v.gt_completed_date || '';
      v.gt_extent_till_yesterday = tillYest;
      v.today_gt_extent = today;
      v.cumulative_gt_extent = cum;
      v.balance_gt_extent = bal;
      if (isComp) {
        v.gt_status = 'Completed';
      } else if (today > 0 || cum > 0) {
        v.gt_status = 'In Progress';
      }
      if (today > 0) {
        p6ActiveCount++;
        p6TodaySum += today;
        console.log(`  Phase 6 Active: [${code}] ${v.village_name} (${v.mandal}) -> Today: ${today} Ac, Cum: ${cum} Ac, Bal: ${bal} Ac`);
      }
    } else {
      console.warn(`  Phase 6 Unmatched code: ${code} (${vName}, ${mandal})`);
    }
  }
  console.log(`Phase 6: Matched ${p6Matched} villages. Active today: ${p6ActiveCount} villages with ${p6TodaySum.toFixed(2)} Ac (Expected: 864.40 Ac).`);

  const grandToday = p5TodaySum + p6TodaySum;
  const grandActive = p5ActiveCount + p6ActiveCount;

  // Compute GT summary scoped to Phase V and Phase VI (currently active GT phases)
  const p5v = villages.filter(v => (v.phase || '').includes('V') && !(v.phase || '').includes('VI'));
  const p6v = villages.filter(v => (v.phase || '').includes('VI'));
  const activeGtVillages = [...p5v, ...p6v];

  const cumulativeGtExtent = Math.round(activeGtVillages.reduce((s, v) => s + (parseFloat(v.cumulative_gt_extent) || 0), 0) * 100) / 100;
  const totalExtent = Math.round(activeGtVillages.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0) * 100) / 100;
  const balanceGtExtent = Math.round(Math.max(0, totalExtent - cumulativeGtExtent) * 100) / 100;
  const completionPct = totalExtent > 0 ? ((cumulativeGtExtent / totalExtent) * 100).toFixed(1) : '0.0';
  const totalRovers = 60;
  const dailyCapacityAc = totalRovers * 25;
  const pacePct = dailyCapacityAc > 0 ? ((grandToday / dailyCapacityAc) * 100).toFixed(1) : '0.0';

  store.gtSummary = {
    todayTotal: Math.round(grandToday * 100) / 100,
    cumulativeTotal: cumulativeGtExtent,
    balanceTotal: balanceGtExtent,
    totalExtent,
    benchmarkDaily: 25,
    rovers: totalRovers,
    dailyCapacityAc,
    completionPct,
    pacePct,
    activeVillagesToday: grandActive,
    lastSynced: new Date().toISOString()
  };

  console.log(`\n======================================================`);
  console.log(`GRAND TOTAL TODAY GT EXTENT: ${grandToday.toFixed(2)} Ac across ${grandActive} active villages.`);
  console.log(`P5+P6 Scope — Cumulative: ${cumulativeGtExtent} Ac | Balance: ${balanceGtExtent} Ac | Total: ${totalExtent} Ac`);
  console.log(`Completion: ${completionPct}% | Pace: ${pacePct}% of daily capacity`);

  // Re-read the latest store before saving to preserve fields written by other scripts (e.g. dlr_records, dlrSummary)
  const latestStore = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  latestStore.villages = store.villages; // updated GT data per village
  latestStore.gtSummary = store.gtSummary; // updated GT summary
  fs.writeFileSync(STORE_PATH, JSON.stringify(latestStore, null, 2), 'utf8');
  console.log('Successfully saved updated data to data/store.json.');

  // Also check if dashboard/data/store.json exists
  const altStore = path.join(__dirname, '../dashboard/data/store.json');
  if (fs.existsSync(altStore)) {
    fs.writeFileSync(altStore, JSON.stringify(latestStore, null, 2), 'utf8');
    console.log('Also updated dashboard/data/store.json.');
  }

}

syncGtFromGoogleSheets().catch(err => {
  console.error('Sync error:', err);
  process.exit(1);
});
