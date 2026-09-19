const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, '../data/store.json');
const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));

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

function cleanNum(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

const MANDAL_ALIASES = {
  'thavanampalle': 'thavanampalli',
  'karvetinagar': 'karvetinagaram',
  'bangarupalyam': 'bangarupalem',
  'v. kota': 'venkatagirikota',
  'v.kota': 'venkatagirikota',
  'v kota': 'venkatagirikota',
  's.r.puram': 'sr puram',
  's r puram': 'sr puram',
  'gangadhara nellore': 'gd nellore',
  'g.d.nellore': 'gd nellore',
  'palamaneru': 'palamaner',
  'penumuru': 'penumur',
  'santhipuram': 'santhipuram',
  'ramakuppam': 'ramakuppam',
  'gudipala': 'gudipala'
};

function norm(str) {
  const s = String(str || '').toLowerCase().trim();
  const alias = MANDAL_ALIASES[s] || s;
  return alias.replace(/[^a-z0-9]/g, '');
}

function teluguSkel(str) {
  return String(str || '').toLowerCase()
    .replace(/^\d+[\s.-]*/, '')
    .replace(/[^a-z]/g, '')
    .replace(/palli|palle|pally/g, 'palli')
    .replace(/puram|pura/g, 'puram')
    .replace(/khandriga|khandri|khandrika/g, 'khandriga')
    .replace(/kota|kote/g, 'kota')
    .replace(/bylu|belu/g, 'belu')
    .replace(/[aeiou]/g, '')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/kh/g, 'k')
    .replace(/w/g, 'v');
}

function matchVillage(code, name, mandal) {
  const c = String(code || '').trim();
  if (c && c !== 'null' && c.length >= 5) {
    const byCode = store.villages.find(v => String(v.village_code || '').trim() === c);
    if (byCode) return byCode;
  }
  const nName = norm(name);
  const nMandal = norm(mandal);
  if (!nName) return null;

  // 1. Direct name + mandal match
  let hit = store.villages.find(v => {
    const vn = norm(v.village_name);
    const vm = norm(v.mandal);
    if (nMandal && vm && nMandal !== vm && !nMandal.includes(vm) && !vm.includes(nMandal)) return false;
    return vn === nName || vn.includes(nName) || nName.includes(vn);
  });
  if (hit) return hit;

  // 2. Skeleton match within mandal
  const skel = teluguSkel(name);
  if (skel.length >= 3) {
    hit = store.villages.find(v => {
      const vm = norm(v.mandal);
      if (nMandal && vm && nMandal !== vm && !nMandal.includes(vm) && !vm.includes(nMandal)) return false;
      const vskel = teluguSkel(v.village_name);
      return vskel === skel || vskel.includes(skel) || skel.includes(vskel);
    });
    if (hit) return hit;
  }

  // 3. Global skeleton match if mandal is not strictly matched
  if (skel.length >= 4) {
    hit = store.villages.find(v => teluguSkel(v.village_name) === skel);
    if (hit) return hit;
  }

  return null;
}

async function verifyAll() {
  console.log('Testing comprehensive subsheets parsing...');

  // 1. Phase 5 Daily Monitoring
  const p5Daily = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '0');
  let p5GtCount = 0;
  let p5GtTodaySum = 0;
  for (let r = 1; r < p5Daily.rows.length; r++) {
    const row = (p5Daily.rows[r].c || []).map(cellVal);
    const mandal = row[2];
    const code = row[3];
    const vName = row[4];
    if (!vName || /total/i.test(vName) || /total/i.test(mandal)) continue;
    const v = matchVillage(code, vName, mandal);
    if (v) {
      p5GtCount++;
      const todayExt = cleanNum(row[15]);
      p5GtTodaySum += todayExt;
    }
  }
  console.log(`Phase 5 Daily: matched ${p5GtCount} villages, today GT extent sum: ${p5GtTodaySum}`);

  // 2. Phase 6 Daily Monitoring
  const p6Daily = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
  let p6GtCount = 0;
  let p6GtTodaySum = 0;
  for (let r = 1; r < p6Daily.rows.length; r++) {
    const row = (p6Daily.rows[r].c || []).map(cellVal);
    const mandal = row[2];
    const code = row[3];
    const vName = row[4];
    if (!vName || /total/i.test(vName) || /total/i.test(mandal)) continue;
    const v = matchVillage(code, vName, mandal);
    if (v) {
      p6GtCount++;
      const todayExt = cleanNum(row[17]);
      p6GtTodaySum += todayExt;
    }
  }
  console.log(`Phase 6 Daily: matched ${p6GtCount} villages, today GT extent sum: ${p6GtTodaySum}`);

  // 3. DLR Entries summary
  const dlrSummary = {
    vs: { today: 0, cum: 0, bal: 0, total: 0 },
    vro: { today: 0, cum: 0, bal: 0, total: 0 },
    tah: { today: 0, cum: 0, bal: 0, total: 0 },
    rdo: { today: 0, cum: 0, bal: 0, total: 0 },
    jc: { today: 0, cum: 0, bal: 0, total: 0 }
  };

  // Phase 5 VS & VRO
  const p5VsVro = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
  let currentTier = 'vs';
  for (let r = 0; r < p5VsVro.rows.length; r++) {
    const row = (p5VsVro.rows[r].c || []).map(cellVal);
    const text = row.join(' ');
    if (r === 16) {
      // Row 16 is VS Total
      console.log('P5 VS Total Row:', row.filter(Boolean));
      dlrSummary.vs.total += cleanNum(row[9]);
      dlrSummary.vs.cum += cleanNum(row[12]);
      dlrSummary.vs.today += cleanNum(row[11]);
      dlrSummary.vs.bal += cleanNum(row[13]);
      currentTier = 'vro';
      continue;
    }
    if (r === 33) {
      // Row 33 is VRO Total
      console.log('P5 VRO Total Row:', row.filter(Boolean));
      dlrSummary.vro.total += cleanNum(row[9]);
      dlrSummary.vro.cum += cleanNum(row[12]);
      dlrSummary.vro.today += cleanNum(row[11]);
      dlrSummary.vro.bal += cleanNum(row[13]);
      continue;
    }
  }

  // Phase 5 Tah RDO
  const p5TahRdo = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
  for (let r = 0; r < p5TahRdo.rows.length; r++) {
    const row = (p5TahRdo.rows[r].c || []).map(cellVal);
    if (r === 11) {
      // Row 11 is Tah Total
      console.log('P5 Tah Total Row:', row.filter(Boolean));
      dlrSummary.tah.total += cleanNum(row[9]);
      dlrSummary.tah.cum += cleanNum(row[12]);
      dlrSummary.tah.today += cleanNum(row[11]);
      dlrSummary.tah.bal += cleanNum(row[13]);
    }
    if (r === 15) {
      // Row 15 is RDO Total
      console.log('P5 RDO Total Row:', row.filter(Boolean));
      dlrSummary.rdo.total += cleanNum(row[9]);
      dlrSummary.rdo.cum += cleanNum(row[12]);
      dlrSummary.rdo.today += cleanNum(row[11]);
      dlrSummary.rdo.bal += cleanNum(row[13]);
    }
  }

  // Phase 6 VS VRO
  const p6VsVro = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
  for (let r = 0; r < p6VsVro.rows.length; r++) {
    const row = (p6VsVro.rows[r].c || []).map(cellVal);
    if (r === 4) {
      // Row 4 is P6 VS Total
      console.log('P6 VS Total Row:', row.filter(Boolean));
      dlrSummary.vs.total += cleanNum(row[10]);
      dlrSummary.vs.cum += cleanNum(row[13]);
      dlrSummary.vs.today += cleanNum(row[12]);
      dlrSummary.vs.bal += cleanNum(row[14]);
    }
    if (r === 8) {
      // Row 8 is P6 VRO Total
      console.log('P6 VRO Total Row:', row.filter(Boolean));
      dlrSummary.vro.total += cleanNum(row[10]);
      dlrSummary.vro.cum += cleanNum(row[13]);
      dlrSummary.vro.today += cleanNum(row[12]);
      dlrSummary.vro.bal += cleanNum(row[14]);
    }
  }

  // Phase 6 Tah
  const p6Tah = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
  for (let r = 0; r < p6Tah.rows.length; r++) {
    const row = (p6Tah.rows[r].c || []).map(cellVal);
    if (r === 0) {
      // 1 village
      console.log('P6 Tah Row 0:', row.filter(Boolean));
      dlrSummary.tah.total += cleanNum(row[9]);
      dlrSummary.tah.cum += cleanNum(row[12]);
      dlrSummary.tah.today += cleanNum(row[11]);
      dlrSummary.tah.bal += cleanNum(row[13]);
    }
  }

  // Phase 4 Tah RDO JC
  const p4TahRdo = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '182095482');
  for (let r = 0; r < p4TahRdo.rows.length; r++) {
    const row = (p4TahRdo.rows[r].c || []).map(cellVal);
    if (r === 20) {
      // Row 20 is P4 Tah Total
      console.log('P4 Tah Total Row:', row.filter(Boolean));
      dlrSummary.tah.total += cleanNum(row[10]);
      dlrSummary.tah.cum += cleanNum(row[13]);
      dlrSummary.tah.today += cleanNum(row[12]);
      dlrSummary.tah.bal += cleanNum(row[14]);
    }
    if (r === 51) {
      // Row 51 is P4 RDO Total
      console.log('P4 RDO Total Row:', row.filter(Boolean));
      dlrSummary.rdo.total += cleanNum(row[10]);
      dlrSummary.rdo.cum += cleanNum(row[13]);
      dlrSummary.rdo.today += cleanNum(row[12]);
      dlrSummary.rdo.bal += cleanNum(row[14]);
    }
    if (r === 68) {
      // Row 68 is P4 JC Total
      console.log('P4 JC Total Row:', row.filter(Boolean));
      dlrSummary.jc.total += cleanNum(row[10]);
      dlrSummary.jc.cum += cleanNum(row[13]);
      dlrSummary.jc.today += cleanNum(row[12]);
      dlrSummary.jc.bal += cleanNum(row[14]);
    }
  }

  console.log('\n=== DLR Logins Summary Across All Subsheets ===');
  console.log(JSON.stringify(dlrSummary, null, 2));

  const grandToday = dlrSummary.vs.today + dlrSummary.vro.today + dlrSummary.tah.today + dlrSummary.rdo.today + dlrSummary.jc.today;
  const grandCum = dlrSummary.vs.cum + dlrSummary.vro.cum + dlrSummary.tah.cum + dlrSummary.rdo.cum + dlrSummary.jc.cum;
  const grandBal = dlrSummary.vs.bal + dlrSummary.vro.bal + dlrSummary.tah.bal + dlrSummary.rdo.bal + dlrSummary.jc.bal;
  const grandTotal = dlrSummary.vs.total + dlrSummary.vro.total + dlrSummary.tah.total + dlrSummary.rdo.total + dlrSummary.jc.total;

  console.log(`\nGrand Totals: Today=${grandToday}, Cum=${grandCum}, Bal=${grandBal}, Total=${grandTotal}`);
}

verifyAll().catch(console.error);
