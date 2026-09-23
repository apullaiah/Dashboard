const https = require('https');
const fs = require('fs');
const path = require('path');

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

const store = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/store.json'), 'utf8'));
const villages = store.villages;

async function auditAllDlr() {
  console.log('=== AUDITING ALL DLR LOGIN SUB-SHEETS (VS, VRO, TAH, RDO, JC) ===');

  const results = {
    vs: [],
    vro: [],
    tahsildar: [],
    rdo: [],
    jc: []
  };

  // Helper to record entry
  function addEntry(stage, phase, villageCode, villageName, mandal, division, tot, tillYest, today, cum, bal, targetDate) {
    results[stage].push({
      phase,
      stage,
      villageCode: String(villageCode || '').trim(),
      villageName: String(villageName || '').trim(),
      mandal: String(mandal || '').trim(),
      division: String(division || '').trim(),
      total: tot,
      tillYesterday: tillYest,
      today: today,
      cumulative: cum,
      balance: bal,
      targetDate: targetDate || ''
    });
  }

  // 1. Phase 4 VS & VRO (1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4, gid 1111910402)
  console.log('\n--- 1. Phase 4 VS & VRO ---');
  const p4VsVro = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '1111910402');
  let p4CurrentTier = 'vs';
  for (let r = 0; r < p4VsVro.rows.length; r++) {
    const row = (p4VsVro.rows[r].c || []).map(cellVal);
    const c0 = row[0];
    const c1 = row[1];
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (/total/i.test(c0) || /total/i.test(c1) || /total/i.test(vName) || /total/i.test(mandal)) continue;
    if (!vName && !code) continue;
    // Check if transition to VRO
    if (/vro/i.test(c1) || /vro/i.test(mandal) || /vro/i.test(vName)) { p4CurrentTier = 'vro'; continue; }

    const tot = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const cum = cleanNum(row[13]);
    const bal = cleanNum(row[14]);
    const targetDate = row[9];
    addEntry(p4CurrentTier, 'Phase IV', code, vName, mandal, c1, tot, tillYest, today, cum, bal, targetDate);
  }

  // 2. Phase 4 Tah, RDO & JC (1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4, gid 182095482)
  console.log('\n--- 2. Phase 4 Tah, RDO & JC ---');
  const p4TahRdo = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '182095482');
  let p4Tier = 'tahsildar';
  for (let r = 0; r < p4TahRdo.rows.length; r++) {
    const row = (p4TahRdo.rows[r].c || []).map(cellVal);
    const c0 = row[0];
    const c1 = row[1];
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (/jc\s*login/i.test(c1) || /jc\s*login/i.test(mandal)) { p4Tier = 'jc'; continue; }
    if (/total/i.test(c0) || /total/i.test(c1) || /total/i.test(vName)) {
      if (r <= 20) p4Tier = 'rdo';
      continue;
    }
    if (!vName && !code) continue;

    const tot = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const cum = cleanNum(row[13]);
    const bal = cleanNum(row[14]);
    const targetDate = row[9];
    addEntry(p4Tier, 'Phase IV', code, vName, mandal, c1, tot, tillYest, today, cum, bal, targetDate);
  }

  // 3. Phase 5 VS - VRO (1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0, gid 1329023156)
  console.log('\n--- 3. Phase 5 VS - VRO ---');
  const p5VsVro = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
  let p5Tier = 'vs';
  for (let r = 0; r < p5VsVro.rows.length; r++) {
    const row = (p5VsVro.rows[r].c || []).map(cellVal);
    const c0 = row[0];
    const c1 = row[1];
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (/total/i.test(c0) || /total/i.test(c1) || /total/i.test(vName) || /total/i.test(mandal)) {
      if (r >= 16) p5Tier = 'vro';
      continue;
    }
    if (!vName && !code) continue;

    const tot = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const cum = cleanNum(row[13]);
    const bal = cleanNum(row[14]);
    const targetDate = row[9];
    addEntry(p5Tier, 'Phase V', code, vName, mandal, c1, tot, tillYest, today, cum, bal, targetDate);
  }

  // 4. Phase 5 Tah - RDO - JC (1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0, gid 1758823146)
  console.log('\n--- 4. Phase 5 Tah - RDO - JC ---');
  const p5TahRdo = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
  let p5TahTier = 'tahsildar';
  for (let r = 0; r < p5TahRdo.rows.length; r++) {
    const row = (p5TahRdo.rows[r].c || []).map(cellVal);
    const c0 = row[0];
    const c1 = row[1];
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (/total/i.test(c0) || /total/i.test(c1) || /total/i.test(vName) || /total/i.test(mandal)) {
      if (r <= 11) p5TahTier = 'rdo';
      continue;
    }
    if (!vName && !code) continue;

    const tot = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const cum = cleanNum(row[13]);
    const bal = cleanNum(row[14]);
    const targetDate = row[9];
    addEntry(p5TahTier, 'Phase V', code, vName, mandal, c1, tot, tillYest, today, cum, bal, targetDate);
  }

  // 5. Phase 6 VS - VRO (10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ, gid 941359880)
  console.log('\n--- 5. Phase 6 VS - VRO ---');
  const p6VsVro = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
  let p6Tier = 'vs';
  for (let r = 0; r < p6VsVro.rows.length; r++) {
    const row = (p6VsVro.rows[r].c || []).map(cellVal);
    const c0 = row[0];
    const c1 = row[1];
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (/total/i.test(c0) || /total/i.test(c1) || /total/i.test(vName) || /division\s*name/i.test(c1)) {
      if (r >= 5) p6Tier = 'vro';
      continue;
    }
    if (!vName && !code) continue;

    const tot = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const cum = cleanNum(row[13]);
    const bal = cleanNum(row[14]);
    const targetDate = row[9];
    addEntry(p6Tier, 'Phase VI', code, vName, mandal, c1, tot, tillYest, today, cum, bal, targetDate);
  }

  // 6. Phase 6 TAH - RDO - JC (10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ, gid 127310674)
  console.log('\n--- 6. Phase 6 TAH - RDO - JC ---');
  const p6TahRdo = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
  let p6TahTier = 'tahsildar';
  for (let r = 0; r < p6TahRdo.rows.length; r++) {
    const row = (p6TahRdo.rows[r].c || []).map(cellVal);
    const c0 = row[0];
    const c1 = row[1];
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (/total/i.test(c0) || /total/i.test(c1) || /total/i.test(vName)) continue;
    if (!vName && !code) continue;

    const tot = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const cum = cleanNum(row[13]);
    const bal = cleanNum(row[14]);
    const targetDate = row[9];
    addEntry(p6TahTier, 'Phase VI', code, vName, mandal, c1, tot, tillYest, today, cum, bal, targetDate);
  }

  // Summary per stage
  console.log('\n======================================================');
  console.log('SUMMARY OF ALL EXTRACTED DLR ENTRIES:');
  for (const [stg, list] of Object.entries(results)) {
    const totToday = list.reduce((s, x) => s + x.today, 0);
    const totCum = list.reduce((s, x) => s + x.cumulative, 0);
    const totBal = list.reduce((s, x) => s + x.balance, 0);
    const totEntries = list.reduce((s, x) => s + x.total, 0);
    console.log(`\nStage: ${stg.toUpperCase()} (${list.length} village entries across sheets):`);
    console.log(`  Today Entries      : ${totToday}`);
    console.log(`  Cumulative Entries : ${totCum}`);
    console.log(`  Balance Entries    : ${totBal}`);
    console.log(`  Total Entries      : ${totEntries}`);
    list.forEach(item => {
      console.log(`    [${item.phase}] ${item.mandal} - ${item.villageName} (${item.villageCode}): tot=${item.total}, tillYest=${item.tillYesterday}, today=${item.today}, cum=${item.cumulative}, bal=${item.balance}, targetDate=${item.targetDate}`);
    });
  }
}

auditAllDlr();
