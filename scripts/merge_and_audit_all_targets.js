const fs = require('fs');
const https = require('https');

const store = JSON.parse(fs.readFileSync('./data/store.json', 'utf8').replace(/^\uFEFF/, ''));
const localTargets = JSON.parse(fs.readFileSync('./scratch/extracted_local_targets.json', 'utf8').replace(/^\uFEFF/, ''));

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
  s = s.replace(/^([0-9]+)/, '');
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

  const v = store.villages.find(x => {
    if (normM && normalizeMandal(x.mandal) !== normM) return false;
    const xv = normalizeVillage(x.village_name);
    return xv === normV || xv.includes(normV) || normV.includes(xv);
  });
  if (v) return v;

  if (normV.length >= 5) {
    return store.villages.find(x => {
      const xv = normalizeVillage(x.village_name);
      return xv === normV || (xv.length >= 6 && (xv.includes(normV) || normV.includes(xv)));
    });
  }
  return null;
}

function fetchGviz(id) {
  return new Promise((resolve) => {
    let url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
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

function stdDate(d) {
  if (!d || d === '-' || d.toLowerCase().includes('stop') || d.toLowerCase().includes('nil')) return '';
  const dmy = d.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return d;
}

(async () => {
  const mergedVillages = {};

  // 1. Ingest local extracted targets
  Object.keys(localTargets.villages).forEach(code => {
    const entry = localTargets.villages[code];
    const v = findStoreVillage(code, entry.village_name, entry.mandal);
    if (v) {
      if (!mergedVillages[v.id]) mergedVillages[v.id] = { v, targets: {}, sources: new Set() };
      Object.keys(entry.stage_targets || {}).forEach(k => {
        const val = stdDate(entry.stage_targets[k]);
        if (val) mergedVillages[v.id].targets[k] = val;
      });
      if (entry.ppb_target_month) mergedVillages[v.id].targets.ppb_target_month = entry.ppb_target_month;
      (entry.sources || []).forEach(s => mergedVillages[v.id].sources.add(s));
    }
  });

  // Helper for official sheets
  function addTarget(v, stageKey, rawDate, sourceName) {
    const d = stdDate(rawDate);
    if (!d) return;
    if (!mergedVillages[v.id]) mergedVillages[v.id] = { v, targets: {}, sources: new Set() };
    mergedVillages[v.id].targets[stageKey] = d;
    mergedVillages[v.id].sources.add(sourceName);
  }

  // 2. Official Phase 4
  const p4 = await fetchGviz('17M7sj_XzRKkiM9C-GpHernk_EEQnctOD8MOB0fnVr0A');
  p4?.table?.rows?.forEach(r => {
    const v = findStoreVillage(null, parseVal(r.c[3]), parseVal(r.c[2]));
    if (v) {
      addTarget(v, 'vro', parseVal(r.c[7]), 'Phase 4 Official Sheet');
      addTarget(v, 'tahsildar', parseVal(r.c[8]), 'Phase 4 Official Sheet');
      addTarget(v, 'rdo', parseVal(r.c[9]), 'Phase 4 Official Sheet');
      addTarget(v, 'jc', parseVal(r.c[10]), 'Phase 4 Official Sheet');
    }
  });

  // 3. Official Phase 5
  const p5 = await fetchGviz('1bjvwI7f-heRZxahA7JmL8ZweJWGAu5e1sQPztSergBU');
  p5?.table?.rows?.forEach(r => {
    const v = findStoreVillage(null, parseVal(r.c[3]), parseVal(r.c[2]));
    if (v) {
      addTarget(v, 'gt', parseVal(r.c[7]), 'Phase 5 Official Sheet');
      addTarget(v, 'vectorization', parseVal(r.c[8]), 'Phase 5 Official Sheet');
      addTarget(v, 'vs', parseVal(r.c[9]), 'Phase 5 Official Sheet');
      addTarget(v, 'vro', parseVal(r.c[10]), 'Phase 5 Official Sheet');
      addTarget(v, 'tahsildar', parseVal(r.c[11]), 'Phase 5 Official Sheet');
      addTarget(v, 'rdo', parseVal(r.c[12]), 'Phase 5 Official Sheet');
      addTarget(v, 'jc', parseVal(r.c[13]), 'Phase 5 Official Sheet');
    }
  });

  // 4. Official Phase 6
  const p6 = await fetchGviz('18kcvSTkGP1Vlc5LVGeotVG-3jLr2jx4sLajrouH8dEQ');
  p6?.table?.rows?.forEach(r => {
    const v = findStoreVillage(null, parseVal(r.c[3]), parseVal(r.c[2]));
    if (v) {
      addTarget(v, 'gt', parseVal(r.c[6]), 'Phase 6 Official Sheet');
      addTarget(v, 'vectorization', parseVal(r.c[7]), 'Phase 6 Official Sheet');
      addTarget(v, 'vs', parseVal(r.c[8]), 'Phase 6 Official Sheet');
      addTarget(v, 'vro', parseVal(r.c[9]), 'Phase 6 Official Sheet');
      addTarget(v, 'tahsildar', parseVal(r.c[10]), 'Phase 6 Official Sheet');
      addTarget(v, 'rdo', parseVal(r.c[11]), 'Phase 6 Official Sheet');
      addTarget(v, 'jc', parseVal(r.c[12]), 'Phase 6 Official Sheet');
    }
  });

  // 5. Official Phase 7
  const p7 = await fetchGviz('16RIo0Z4KPCFMDBG67qKB7nF8ztlUT6DQ5nMIbXYh9KA');
  let carryMan = '';
  p7?.table?.rows?.forEach(r => {
    const man = parseVal(r.c[2]);
    if (man) carryMan = man;
    const v = findStoreVillage(null, parseVal(r.c[4]), carryMan);
    if (v) {
      addTarget(v, 'gt', parseVal(r.c[7]), 'Phase 7 Official Sheet');
      addTarget(v, 'vectorization', parseVal(r.c[8]), 'Phase 7 Official Sheet');
      addTarget(v, 'vs', parseVal(r.c[9]), 'Phase 7 Official Sheet');
      addTarget(v, 'vro', parseVal(r.c[10]), 'Phase 7 Official Sheet');
      addTarget(v, 'tahsildar', parseVal(r.c[11]), 'Phase 7 Official Sheet');
      addTarget(v, 'rdo', parseVal(r.c[12]), 'Phase 7 Official Sheet');
      addTarget(v, 'jc', parseVal(r.c[13]), 'Phase 7 Official Sheet');
    }
  });

  console.log(`\n======================================================`);
  console.log(`TOTAL VILLAGES MATCHED WITH TARGETS: ${Object.keys(mergedVillages).length} / ${store.villages.length}`);
  console.log(`======================================================`);

  // Stage distribution
  const stagesCount = {};
  Object.values(mergedVillages).forEach(({ targets }) => {
    Object.keys(targets).forEach(k => {
      stagesCount[k] = (stagesCount[k] || 0) + 1;
    });
  });
  console.log('Stage targets distribution:');
  Object.keys(stagesCount).forEach(k => console.log(`   ${k.padEnd(20)}: ${stagesCount[k]} villages`));

  // Write out merged targets
  const out = {};
  Object.keys(mergedVillages).forEach(vId => {
    const { v, targets, sources } = mergedVillages[vId];
    out[vId] = {
      village_code: v.village_code,
      village_name: v.village_name,
      mandal: v.mandal,
      phase: v.phase,
      targets,
      sources: Array.from(sources)
    };
  });
  fs.writeFileSync('./scratch/merged_village_targets.json', JSON.stringify(out, null, 2));
  console.log('\nSaved merged targets to scratch/merged_village_targets.json');
})();
