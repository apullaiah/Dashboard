const fs = require('fs');
const https = require('https');

const store = JSON.parse(fs.readFileSync('./data/store.json', 'utf8'));

function cleanStr(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeMandal(m) {
  let s = cleanStr(m);
  if (s.includes('bangarupal')) return 'bangarupalem';
  if (s.includes('baireddipal')) return 'baireddipalle';
  if (s.includes('karvetinagar')) return 'karvetinagar';
  if (s.includes('gdnellore') || s.includes('gangadharanellore')) return 'gangadharanellore';
  if (s.includes('peddapanjan')) return 'peddapanjani';
  if (s.includes('puthalapatt')) return 'puthalapattu';
  if (s.includes('srpuram') || s.includes('srirangarajapuram')) return 'srpuram';
  if (s.includes('thavanampall')) return 'thavanampalle';
  if (s.includes('vedurukuppam')) return 'vedurukuppam';
  if (s.includes('venkatagirikota') || s.includes('vkota')) return 'vkota';
  if (s.includes('chittoor')) return 'chittoor';
  if (s.includes('palamaner')) return 'palamaner';
  return s;
}

function normalizeVillage(v) {
  let s = cleanStr(v);
  s = s.replace(/palli$|palle$|pally$/, 'palli');
  s = s.replace(/khandriga$|khandri$|khandrika$/, 'khandriga');
  s = s.replace(/puram$|pura$/, 'puram');
  s = s.replace(/kota$|kote$/, 'kota');
  s = s.replace(/^([0-9]+)/, ''); // remove leading number like 52kanikapuram -> kanikapuram
  return s;
}

function findStoreVillage(code, name, mandal) {
  if (code) {
    const cleanCode = String(code).trim().replace(/\.0$/, '');
    const v = store.villages.find(x => String(x.village_code || '').trim() === cleanCode);
    if (v) return v;
  }
  const normM = normalizeMandal(mandal);
  const normV = normalizeVillage(name);
  if (!normV) return null;

  // Exact mandal + village
  const v = store.villages.find(x => {
    if (normM && normalizeMandal(x.mandal) !== normM) return false;
    const xv = normalizeVillage(x.village_name);
    return xv === normV || xv.includes(normV) || normV.includes(xv);
  });
  if (v) return v;

  // Fallback by name only if >= 5 chars
  if (normV.length >= 5) {
    return store.villages.find(x => {
      const xv = normalizeVillage(x.village_name);
      return xv === normV || (xv.length >= 6 && (xv.includes(normV) || normV.includes(xv)));
    });
  }
  return null;
}

function fetchGviz(id, gid) {
  return new Promise((resolve) => {
    let url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    if (gid) url += `&gid=${gid}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
          if (match) resolve(JSON.parse(match[1]));
          else resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function parseVal(c) {
  if (!c) return '';
  if (c.f) return c.f.trim();
  const v = c.v;
  if (typeof v === 'string') {
    const m = v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = String(parseInt(m[2], 10) + 1).padStart(2, '0');
      const day = String(parseInt(m[3], 10)).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return v.trim();
  }
  return String(v ?? '').trim();
}

(async () => {
  const matchedVillages = new Set();
  const villageTargets = {};

  function setStageTarget(vId, stageKey, targetDate, source) {
    if (!targetDate || targetDate === '-' || targetDate.toLowerCase().includes('stop') || targetDate.toLowerCase().includes('nil')) return;
    if (!villageTargets[vId]) {
      villageTargets[vId] = { stages: {}, sources: new Set() };
    }
    // standardize targetDate format if DD-MM-YYYY -> YYYY-MM-DD
    let stdDate = targetDate;
    const dmy = targetDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
      stdDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    villageTargets[vId].stages[stageKey] = stdDate;
    villageTargets[vId].sources.add(source);
    matchedVillages.add(vId);
  }

  // 1. PHASE 4 OFFICIAL
  console.log('Fetching Phase 4 Official...');
  const p4Gviz = await fetchGviz('17M7sj_XzRKkiM9C-GpHernk_EEQnctOD8MOB0fnVr0A');
  if (p4Gviz?.table?.rows) {
    p4Gviz.table.rows.forEach(r => {
      const div = parseVal(r.c[1]);
      const man = parseVal(r.c[2]);
      const vil = parseVal(r.c[3]);
      const vro = parseVal(r.c[7]);
      const tah = parseVal(r.c[8]);
      const rdo = parseVal(r.c[9]);
      const jc = parseVal(r.c[10]);
      const v = findStoreVillage(null, vil, man);
      if (v) {
        setStageTarget(v.id, 'vro', vro, 'Phase 4 Official');
        setStageTarget(v.id, 'tahsildar', tah, 'Phase 4 Official');
        setStageTarget(v.id, 'rdo', rdo, 'Phase 4 Official');
        setStageTarget(v.id, 'jc', jc, 'Phase 4 Official');
      }
    });
  }

  // 2. PHASE 5 OFFICIAL
  console.log('Fetching Phase 5 Official...');
  const p5Gviz = await fetchGviz('1bjvwI7f-heRZxahA7JmL8ZweJWGAu5e1sQPztSergBU');
  if (p5Gviz?.table?.rows) {
    p5Gviz.table.rows.forEach(r => {
      const man = parseVal(r.c[2]);
      const vil = parseVal(r.c[3]);
      const gt = parseVal(r.c[7]);
      const vec = parseVal(r.c[8]);
      const vs = parseVal(r.c[9]);
      const vro = parseVal(r.c[10]);
      const tah = parseVal(r.c[11]);
      const rdo = parseVal(r.c[12]);
      const jc = parseVal(r.c[13]);
      const v = findStoreVillage(null, vil, man);
      if (v) {
        setStageTarget(v.id, 'gt', gt, 'Phase 5 Official');
        setStageTarget(v.id, 'vectorization', vec, 'Phase 5 Official');
        setStageTarget(v.id, 'vs', vs, 'Phase 5 Official');
        setStageTarget(v.id, 'vro', vro, 'Phase 5 Official');
        setStageTarget(v.id, 'tahsildar', tah, 'Phase 5 Official');
        setStageTarget(v.id, 'rdo', rdo, 'Phase 5 Official');
        setStageTarget(v.id, 'jc', jc, 'Phase 5 Official');
      }
    });
  }

  // 3. PHASE 6 OFFICIAL
  console.log('Fetching Phase 6 Official...');
  const p6Gviz = await fetchGviz('18kcvSTkGP1Vlc5LVGeotVG-3jLr2jx4sLajrouH8dEQ');
  if (p6Gviz?.table?.rows) {
    p6Gviz.table.rows.forEach(r => {
      const man = parseVal(r.c[2]);
      const vil = parseVal(r.c[3]);
      const gt = parseVal(r.c[6]);
      const vec = parseVal(r.c[7]);
      const vs = parseVal(r.c[8]);
      const vro = parseVal(r.c[9]);
      const tah = parseVal(r.c[10]);
      const rdo = parseVal(r.c[11]);
      const jc = parseVal(r.c[12]);
      const v = findStoreVillage(null, vil, man);
      if (v) {
        setStageTarget(v.id, 'gt', gt, 'Phase 6 Official');
        setStageTarget(v.id, 'vectorization', vec, 'Phase 6 Official');
        setStageTarget(v.id, 'vs', vs, 'Phase 6 Official');
        setStageTarget(v.id, 'vro', vro, 'Phase 6 Official');
        setStageTarget(v.id, 'tahsildar', tah, 'Phase 6 Official');
        setStageTarget(v.id, 'rdo', rdo, 'Phase 6 Official');
        setStageTarget(v.id, 'jc', jc, 'Phase 6 Official');
      }
    });
  }

  // 4. PHASE 7 OFFICIAL
  console.log('Fetching Phase 7 Official...');
  const p7Gviz = await fetchGviz('16RIo0Z4KPCFMDBG67qKB7nF8ztlUT6DQ5nMIbXYh9KA');
  if (p7Gviz?.table?.rows) {
    let carryMan = '';
    p7Gviz.table.rows.forEach(r => {
      const man = parseVal(r.c[2]);
      if (man) carryMan = man;
      const vil = parseVal(r.c[4]);
      const gt = parseVal(r.c[7]);
      const vec = parseVal(r.c[8]);
      const vs = parseVal(r.c[9]);
      const vro = parseVal(r.c[10]);
      const tah = parseVal(r.c[11]);
      const rdo = parseVal(r.c[12]);
      const jc = parseVal(r.c[13]);
      const v = findStoreVillage(null, vil, carryMan);
      if (v) {
        setStageTarget(v.id, 'gt', gt, 'Phase 7 Official');
        setStageTarget(v.id, 'vectorization', vec, 'Phase 7 Official');
        setStageTarget(v.id, 'vs', vs, 'Phase 7 Official');
        setStageTarget(v.id, 'vro', vro, 'Phase 7 Official');
        setStageTarget(v.id, 'tahsildar', tah, 'Phase 7 Official');
        setStageTarget(v.id, 'rdo', rdo, 'Phase 7 Official');
        setStageTarget(v.id, 'jc', jc, 'Phase 7 Official');
      }
    });
  }

  console.log('\n--- Match summary from 4 Official Phase Sheets ---');
  console.log(`Matched villages: ${matchedVillages.size}`);
  
  // Sample outputs
  const sampleIds = Array.from(matchedVillages).slice(0, 5);
  sampleIds.forEach(id => {
    const v = store.villages.find(x => x.id === id);
    console.log(`\nVillage: ${v.village_name} (${v.mandal}) [${v.phase}]`);
    console.log('Targets:', villageTargets[id].stages);
    console.log('Sources:', Array.from(villageTargets[id].sources));
  });
})();
