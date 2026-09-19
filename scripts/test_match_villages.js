const fs = require('fs');
const path = require('path');

const store = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/store.json'), 'utf8'));

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

function norm(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findVillage(code, name, mandal) {
  const c = String(code || '').trim();
  if (c && c !== 'null') {
    const byCode = store.villages.find(v => String(v.village_code || '').trim() === c);
    if (byCode) return byCode;
  }
  const nName = norm(name);
  const nMandal = norm(mandal);
  if (!nName) return null;

  return store.villages.find(v => {
    const vn = norm(v.village_name);
    const vm = norm(v.mandal);
    if (nMandal && vm && nMandal !== vm && !nMandal.includes(vm) && !vm.includes(nMandal)) return false;
    return vn === nName || vn.includes(nName) || nName.includes(vn);
  });
}

async function runTest() {
  console.log('Total store villages:', store.villages.length);

  // 1. Phase 5 Daily Monitoring
  const p5Daily = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '0');
  let p5Matched = 0;
  for (let r = 1; r < p5Daily.rows.length; r++) {
    const row = (p5Daily.rows[r].c || []).map(cellVal);
    const mandal = row[2];
    const code = row[3];
    const vName = row[4];
    if (!vName || /total/i.test(vName) || /total/i.test(mandal)) continue;
    const v = findVillage(code, vName, mandal);
    if (v) {
      p5Matched++;
    } else {
      console.log('Unmatched P5 Daily:', code, vName, mandal);
    }
  }
  console.log(`Phase 5 Daily: matched ${p5Matched} villages`);

  // 2. Phase 6 Daily Monitoring
  const p6Daily = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
  let p6Matched = 0;
  for (let r = 1; r < p6Daily.rows.length; r++) {
    const row = (p6Daily.rows[r].c || []).map(cellVal);
    const mandal = row[2];
    const code = row[3];
    const vName = row[4];
    if (!vName || /total/i.test(vName) || /total/i.test(mandal)) continue;
    const v = findVillage(code, vName, mandal);
    if (v) {
      p6Matched++;
    } else {
      console.log('Unmatched P6 Daily:', code, vName, mandal);
    }
  }
  console.log(`Phase 6 Daily: matched ${p6Matched} villages`);

  // 3. Phase 5 VS-VRO DLR
  const p5VsVro = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
  let p5VsVroMatched = 0;
  for (let r = 0; r < p5VsVro.rows.length; r++) {
    const row = (p5VsVro.rows[r].c || []).map(cellVal);
    const mandal = row[3];
    const vName = row[4];
    if (!vName || /total/i.test(vName) || /division/i.test(mandal) || /total/i.test(mandal)) continue;
    const v = findVillage('', vName, mandal);
    if (v) {
      p5VsVroMatched++;
    } else {
      console.log('Unmatched P5 VS-VRO:', vName, mandal);
    }
  }
  console.log(`Phase 5 VS-VRO DLR: matched ${p5VsVroMatched} villages`);

  // 4. Phase 5 Tah-RDO-JC DLR
  const p5TahRdo = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
  let p5TahRdoMatched = 0;
  for (let r = 0; r < p5TahRdo.rows.length; r++) {
    const row = (p5TahRdo.rows[r].c || []).map(cellVal);
    const mandal = row[3];
    const vName = row[4];
    if (!vName || /total/i.test(vName) || /division/i.test(mandal) || /total/i.test(mandal)) continue;
    const v = findVillage('', vName, mandal);
    if (v) {
      p5TahRdoMatched++;
    } else {
      console.log('Unmatched P5 Tah-RDO:', vName, mandal);
    }
  }
  console.log(`Phase 5 Tah-RDO DLR: matched ${p5TahRdoMatched} villages`);

  // 5. Phase 4 Tah-RDO-JC DLR
  const p4TahRdo = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '182095482');
  let p4TahRdoMatched = 0;
  for (let r = 0; r < p4TahRdo.rows.length; r++) {
    const row = (p4TahRdo.rows[r].c || []).map(cellVal);
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (!vName || /total/i.test(vName) || /division/i.test(mandal) || /total/i.test(mandal)) continue;
    const v = findVillage(code, vName, mandal);
    if (v) {
      p4TahRdoMatched++;
    } else {
      console.log('Unmatched P4 Tah-RDO:', code, vName, mandal);
    }
  }
  console.log(`Phase 4 Tah-RDO DLR: matched ${p4TahRdoMatched} villages`);

  // 6. Phase 6 VS-VRO DLR
  const p6VsVro = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
  let p6VsVroMatched = 0;
  for (let r = 0; r < p6VsVro.rows.length; r++) {
    const row = (p6VsVro.rows[r].c || []).map(cellVal);
    const mandal = row[3];
    const vName = row[4];
    const code = row[5];
    if (!vName || /total/i.test(vName) || /division/i.test(mandal) || /total/i.test(mandal)) continue;
    const v = findVillage(code, vName, mandal);
    if (v) {
      p6VsVroMatched++;
    } else {
      console.log('Unmatched P6 VS-VRO:', code, vName, mandal);
    }
  }
  console.log(`Phase 6 VS-VRO DLR: matched ${p6VsVroMatched} villages`);
}

runTest().catch(console.error);
