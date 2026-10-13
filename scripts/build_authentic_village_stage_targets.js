const fs = require('fs');
const path = require('path');
const https = require('https');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');
const DASHBOARD_STORE_PATH = path.join(__dirname, '..', 'dashboard', 'data', 'store.json');
const LOCAL_TARGETS_PATH = path.join(__dirname, '..', 'scratch', 'extracted_local_targets.json');

const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8').replace(/^\uFEFF/, ''));
const localTargets = fs.existsSync(LOCAL_TARGETS_PATH)
  ? JSON.parse(fs.readFileSync(LOCAL_TARGETS_PATH, 'utf8').replace(/^\uFEFF/, ''))
  : { villages: {} };

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
  if (s.includes('gudipala')) return 'gudipala';
  if (s.includes('gudupalle') || s.includes('gudipalle')) return 'gudupalle';
  if (s.includes('kuppam')) return 'kuppam';
  if (s.includes('ramakuppam')) return 'ramakuppam';
  if (s.includes('santhipuram')) return 'santhipuram';
  if (s.includes('nagari')) return 'nagari';
  if (s.includes('nindra')) return 'nindra';
  if (s.includes('vijayapuram')) return 'vijayapuram';
  if (s.includes('irala')) return 'irala';
  if (s.includes('palasamudram')) return 'palasamudram';
  if (s.includes('penumuru')) return 'penumuru';
  if (s.includes('pulicherla')) return 'pulicherla';
  if (s.includes('rompicherla')) return 'rompicherla';
  if (s.includes('yadamari')) return 'yadamari';
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
  const normM = normalizeMandal(mandal);
  const normV = normalizeVillage(name);
  const cleanCode = code ? String(code).trim().replace(/\.0$/, '') : '';

  if (cleanCode && normM) {
    const v = store.villages.find(x => String(x.village_code || '').trim() === cleanCode && normalizeMandal(x.mandal) === normM);
    if (v) return v;
  }
  if (cleanCode) {
    const matches = store.villages.filter(x => String(x.village_code || '').trim() === cleanCode);
    if (matches.length === 1) return matches[0];
  }
  if (normM && normV) {
    const v = store.villages.find(x => {
      if (normalizeMandal(x.mandal) !== normM) return false;
      const xv = normalizeVillage(x.village_name);
      return xv === normV || xv.includes(normV) || normV.includes(xv);
    });
    if (v) return v;
  }
  if (normV && normV.length >= 5) {
    const matches = store.villages.filter(x => {
      const xv = normalizeVillage(x.village_name);
      return xv === normV || (xv.length >= 6 && (xv.includes(normV) || normV.includes(xv)));
    });
    if (matches.length === 1) return matches[0];
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

function addDays(isoDateStr, days) {
  if (!isoDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) return '';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthNameToDate(mStr) {
  if (!mStr) return '';
  const s = mStr.trim();
  if (/Aug.*26/i.test(s)) return '2026-08-31';
  if (/Sep.*26/i.test(s)) return '2026-09-30';
  if (/Oct.*26/i.test(s)) return '2026-10-31';
  if (/Nov.*26/i.test(s)) return '2026-11-30';
  if (/Dec.*26/i.test(s)) return '2026-12-31';
  if (/Jan.*27/i.test(s)) return '2027-01-31';
  if (/Feb.*27/i.test(s)) return '2027-02-28';
  if (/Mar.*27/i.test(s)) return '2027-03-31';
  return '';
}

(async () => {
  console.log('=== Step 1: Ingesting Targets from All Spreadsheets ===');
  const targetMap = {};

  function ensureTargetEntry(v) {
    if (!targetMap[v.id]) {
      targetMap[v.id] = {
        village: v,
        targets: {},
        sources: new Set(),
        ppbMonth: ''
      };
    }
    return targetMap[v.id];
  }

  function setStage(v, stageKey, dateVal, sourceName) {
    const d = stdDate(dateVal);
    if (!d) return;
    const entry = ensureTargetEntry(v);
    entry.targets[stageKey] = d;
    entry.sources.add(sourceName);
  }

  // 1. Ingest local extracted targets
  console.log('Ingesting from scratch/extracted_local_targets.json...');
  Object.keys(localTargets.villages || {}).forEach(code => {
    const item = localTargets.villages[code];
    const v = findStoreVillage(code, item.village_name, item.mandal);
    if (v) {
      const entry = ensureTargetEntry(v);
      Object.keys(item.stage_targets || {}).forEach(k => {
        // Correct date if it was an Excel serial date for target month
        let d = stdDate(item.stage_targets[k]);
        if (k === 'ppb' || k === 'target_date' || k === 'ppb_cycle_date') {
          const correctFromMonth = monthNameToDate(item.ppb_target_month);
          if (correctFromMonth) d = correctFromMonth;
        }
        if (d) entry.targets[k] = d;
      });
      if (item.ppb_target_month) {
        entry.ppbMonth = item.ppb_target_month;
        const mDate = monthNameToDate(item.ppb_target_month);
        if (mDate) {
          entry.targets['ppb'] = mDate;
          entry.targets['target_date'] = mDate;
        }
      }
      (item.sources || []).forEach(s => entry.sources.add(s));
    }
  });

  // 2. Fetch live Official Phase 4 Google Sheet
  console.log('Fetching Phase 4 Official Google Sheet...');
  const p4 = await fetchGviz('17M7sj_XzRKkiM9C-GpHernk_EEQnctOD8MOB0fnVr0A');
  p4?.table?.rows?.forEach(r => {
    const v = findStoreVillage(null, parseVal(r.c[3]), parseVal(r.c[2]));
    if (v) {
      setStage(v, 'vro', parseVal(r.c[7]), 'Phase 4 Official Google Sheet');
      setStage(v, 'tahsildar', parseVal(r.c[8]), 'Phase 4 Official Google Sheet');
      setStage(v, 'rdo', parseVal(r.c[9]), 'Phase 4 Official Google Sheet');
      setStage(v, 'jc', parseVal(r.c[10]), 'Phase 4 Official Google Sheet');
    }
  });

  // 3. Fetch live Official Phase 5 Google Sheet
  console.log('Fetching Phase 5 Official Google Sheet...');
  const p5 = await fetchGviz('1bjvwI7f-heRZxahA7JmL8ZweJWGAu5e1sQPztSergBU');
  p5?.table?.rows?.forEach(r => {
    const v = findStoreVillage(null, parseVal(r.c[3]), parseVal(r.c[2]));
    if (v) {
      setStage(v, 'gt', parseVal(r.c[7]), 'Phase 5 Official Google Sheet');
      setStage(v, 'vectorization', parseVal(r.c[8]), 'Phase 5 Official Google Sheet');
      setStage(v, 'vs', parseVal(r.c[9]), 'Phase 5 Official Google Sheet');
      setStage(v, 'vro', parseVal(r.c[10]), 'Phase 5 Official Google Sheet');
      setStage(v, 'tahsildar', parseVal(r.c[11]), 'Phase 5 Official Google Sheet');
      setStage(v, 'rdo', parseVal(r.c[12]), 'Phase 5 Official Google Sheet');
      setStage(v, 'jc', parseVal(r.c[13]), 'Phase 5 Official Google Sheet');
    }
  });

  // 4. Fetch live Official Phase 6 Google Sheet
  console.log('Fetching Phase 6 Official Google Sheet...');
  const p6 = await fetchGviz('18kcvSTkGP1Vlc5LVGeotVG-3jLr2jx4sLajrouH8dEQ');
  p6?.table?.rows?.forEach(r => {
    const v = findStoreVillage(null, parseVal(r.c[3]), parseVal(r.c[2]));
    if (v) {
      setStage(v, 'gt', parseVal(r.c[6]), 'Phase 6 Official Google Sheet');
      setStage(v, 'vectorization', parseVal(r.c[7]), 'Phase 6 Official Google Sheet');
      setStage(v, 'vs', parseVal(r.c[8]), 'Phase 6 Official Google Sheet');
      setStage(v, 'vro', parseVal(r.c[9]), 'Phase 6 Official Google Sheet');
      setStage(v, 'tahsildar', parseVal(r.c[10]), 'Phase 6 Official Google Sheet');
      setStage(v, 'rdo', parseVal(r.c[11]), 'Phase 6 Official Google Sheet');
      setStage(v, 'jc', parseVal(r.c[12]), 'Phase 6 Official Google Sheet');
    }
  });

  // 5. Fetch live Official Phase 7 Google Sheet
  console.log('Fetching Phase 7 Official Google Sheet...');
  const p7 = await fetchGviz('16RIo0Z4KPCFMDBG67qKB7nF8ztlUT6DQ5nMIbXYh9KA');
  let carryMan = '';
  p7?.table?.rows?.forEach(r => {
    const man = parseVal(r.c[2]);
    if (man) carryMan = man;
    const v = findStoreVillage(null, parseVal(r.c[4]), carryMan);
    if (v) {
      setStage(v, 'gt', parseVal(r.c[7]), 'Phase 7 Official Google Sheet');
      setStage(v, 'vectorization', parseVal(r.c[8]), 'Phase 7 Official Google Sheet');
      setStage(v, 'vs', parseVal(r.c[9]), 'Phase 7 Official Google Sheet');
      setStage(v, 'vro', parseVal(r.c[10]), 'Phase 7 Official Google Sheet');
      setStage(v, 'tahsildar', parseVal(r.c[11]), 'Phase 7 Official Google Sheet');
      setStage(v, 'rdo', parseVal(r.c[12]), 'Phase 7 Official Google Sheet');
      setStage(v, 'jc', parseVal(r.c[13]), 'Phase 7 Official Google Sheet');
    }
  });

  console.log(`\nMatched ${Object.keys(targetMap).length} villages directly from spreadsheets.`);

  console.log('\n=== Step 2: Applying Statutory Stage Timeline Durations (Spreadsheet Rules) ===');
  // Spreadsheet ActionPlan Rules:
  // - Stage 6: 13 Notification (1 day) + Draft ROR (1 day) + Draft PPB eKYC (15 days) = 17 days
  // - Stage 7: Final ROR (1 day) + 22A Layer (10 days) + Webland Porting (1 day) + Tahsildar UAT (10 days) + PPB (1 day) = 23 days
  // Total statutory time from JC login completion to PPB distribution = 17 + 23 = 40 days
  Object.values(targetMap).forEach(entry => {
    const t = entry.targets;
    const jcDate = t.jc;
    const ppbDate = t.ppb || t.target_date;

    // Forward calculation from JC login target if section13 / draft_ror / final_ror / webland_2 are missing
    if (jcDate && /^\d{4}-\d{2}-\d{2}$/.test(jcDate)) {
      if (!t.section13) t.section13 = addDays(jcDate, 1);
      if (!t.draft_ror) t.draft_ror = addDays(jcDate, 2);
      if (!t.final_ror) t.final_ror = addDays(jcDate, 17);
      if (!t.webland_2) t.webland_2 = addDays(jcDate, 28);
      if (!t.ppb) t.ppb = addDays(jcDate, 40);
      if (!t.target_date) t.target_date = t.ppb;
      entry.sources.add('ActionPlan Spreadsheet Statutory Stage Formulas');
    }

    // Backward calculation from PPB target date if final_ror / webland_2 / section13 missing
    if (ppbDate && /^\d{4}-\d{2}-\d{2}$/.test(ppbDate)) {
      if (!t.webland_2) t.webland_2 = addDays(ppbDate, -11);
      if (!t.final_ror) t.final_ror = addDays(ppbDate, -23);
      if (!t.draft_ror) t.draft_ror = addDays(ppbDate, -38);
      if (!t.section13) t.section13 = addDays(ppbDate, -39);
      if (!t.jc) t.jc = addDays(ppbDate, -40);
      entry.sources.add('ActionPlan Spreadsheet Statutory Stage Formulas');
    }
  });

  console.log('\n=== Step 3: Updating All Villages in store.json ===');
  let updatedCount = 0;
  let targetDatesChanged = 0;

  store.villages.forEach(v => {
    const entry = targetMap[v.id];
    if (entry) {
      const datesObj = entry.targets;
      const sourcesList = Array.from(entry.sources);

      const bestTargetDate =
        datesObj.target_date ||
        datesObj.ppb ||
        datesObj.final_ror ||
        datesObj.draft_ror ||
        datesObj.section13 ||
        datesObj.jc ||
        datesObj.rdo ||
        datesObj.tahsildar ||
        datesObj.vro ||
        datesObj.vectorization ||
        datesObj.gt ||
        '';

      v.stage_targets = {
        ...datesObj,
        phase: v.phase,
        ppb_target_month: entry.ppbMonth || v.target_month || '',
        sources: sourcesList
      };

      if (bestTargetDate && bestTargetDate !== 'Completed') {
        if (v.target_date !== bestTargetDate) {
          v.target_date = bestTargetDate;
          targetDatesChanged++;
        }
      }

      updatedCount++;
    } else {
      // Completed villages prior to 2024
      if (v.phase === 'Before 2024' || v.status === 'Completed' || v.final_ror_status === 'Completed') {
        v.stage_targets = {
          phase: v.phase,
          final_ror: v.final_ror_date || 'Prior Completed',
          section13: 'Completed',
          draft_ror: 'Completed',
          webland_2: 'Completed',
          ppb: 'Completed',
          status: 'Completed',
          source: 'Chittoor District Resurvey Universe (Completed Prior to 2024)'
        };
      }
    }
  });

  console.log(`Total villages with stage_targets: ${updatedCount}`);
  console.log(`Total village target_date values updated: ${targetDatesChanged}`);

  // Write updated store.json
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  console.log(`Successfully saved updated store to ${STORE_PATH}`);

  if (fs.existsSync(DASHBOARD_STORE_PATH)) {
    fs.writeFileSync(DASHBOARD_STORE_PATH, JSON.stringify(store, null, 2));
    console.log(`Successfully saved updated store to ${DASHBOARD_STORE_PATH}`);
  }

  // Verification
  console.log('\n=== Step 4: Verification of Sample Village Stage Targets ===');
  const sampleCodes = ['1061010', '1061020', '1061007', '1061019', '1054026', '1049011'];
  sampleCodes.forEach(code => {
    const v = store.villages.find(x => x.village_code === code);
    if (v) {
      console.log(`\n[${v.phase}] Village: ${v.village_name} (${v.mandal}) [Code: ${v.village_code}]`);
      console.log(`  Overall Target Date: ${v.target_date}`);
      console.log('  Stage Targets:', JSON.stringify(v.stage_targets, null, 2));
    }
  });
})();
