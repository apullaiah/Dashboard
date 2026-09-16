/**
 * scripts/enrich_ppb_cycles.js
 * Enriches Chittoor Resurvey Monitoring store.json with verified Month-wise PPBs Cycle data
 * from the official "Plan of Action for completion of Resurvey & Distribution of PPBs (Aug 2026 - Mar 2027)"
 * and "PPBs completed villages" administrative records.
 */
const fs = require('fs');
const path = require('path');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

const STORE_PATH = path.join(__dirname, '../data/store.json');
const PLAN_FINAL_PATH = path.join(__dirname, '../scratch/plan_of_action_final.json');
const PPBS_COMPLETED_PATH = path.join(__dirname, '../scratch/ppbs_completed_all.json');

const store = readJson(STORE_PATH);
const planFinal = readJson(PLAN_FINAL_PATH);
const ppbsCompleted = readJson(PPBS_COMPLETED_PATH);

console.log('--- ENRICHING PPBs CYCLES ---');
console.log(`Villages in store: ${store.villages.length}`);
console.log(`Plan Final records: ${planFinal.length}`);
console.log(`PPBs Completed records: ${ppbsCompleted.length}`);

function clean(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const MANDAL_NORM = {
  gudupalle: 'gudipalle', palamaneru: 'palamaner', palmaner: 'palamaner',
  bangarupalyam: 'bangarupalem', 'v kota': 'venkatagirikota', 'v.kota': 'venkatagirikota',
  vkota: 'venkatagirikota', penumur: 'penumuru', puthalapatu: 'puthalapattu',
  thavanampalle: 'thavanampalli', 'g.d.nellore': 'gdnellore', 'g d nellore': 'gdnellore',
  'gd nellore': 'gdnellore', 's.r.puram': 'srpuram', 's r puram': 'srpuram',
  chittoorrural: 'chittoor', chittoorurban: 'chittoor', ganagavaram: 'gangavaram',
  yadamarri: 'yadamari'
};

function getMandalKey(m) {
  const c = clean(m);
  return MANDAL_NORM[c] || c;
}

function getCycleCode(cycleStr) {
  const s = String(cycleStr || '');
  if (/Aug.*2026/i.test(s)) return 'Aug-26';
  if (/Sep.*2026/i.test(s)) return 'Sep-26';
  if (/Oct.*2026/i.test(s)) return 'Oct-26';
  if (/Nov.*2026/i.test(s)) return 'Nov-26';
  if (/Dec.*2026/i.test(s)) return 'Dec-26';
  if (/Jan.*2027/i.test(s)) return 'Jan-27';
  if (/Feb.*2027/i.test(s)) return 'Feb-27';
  if (/Mar.*2027/i.test(s)) return 'Mar-27';
  return cycleStr;
}

// 1. Build lookup from Plan Final (434 villages)
const planMap = new Map();
planFinal.forEach(r => {
  const mKey = getMandalKey(r.Mandal);
  const vKey = clean(r.Village);
  const cycle = getCycleCode(r.Cycle);
  const item = {
    cycle,
    ppbs: r.PPBs || 0,
    mandal: r.Mandal,
    village: r.Village,
    division: r.Division
  };
  planMap.set(`${mKey}|${vKey}`, item);
  planMap.set(`${mKey}|${vKey.replace(/^\d+/, '')}`, item);
});

// 2. Build lookup from Prior Completed (Jan-Jul 2026)
const priorSerials = new Set(['46023', '46079', '46107', '46138', '46168', '46199', '46229']);
const priorMap = new Map();
ppbsCompleted.forEach(r => {
  if (priorSerials.has(r.MonthSerial)) {
    const mKey = getMandalKey(r.Mandal);
    const vKey = clean(r.Village);
    const item = {
      cycle: 'Prior Completed (Jan–Jul 2026)',
      ppbs: r.PPBs || 0,
      monthSerial: r.MonthSerial
    };
    priorMap.set(`${mKey}|${vKey}`, item);
    priorMap.set(`${mKey}|${vKey.replace(/^\d+/, '')}`, item);
  }
});

// 3. Update villages in store
const stats = {
  'Aug-26': 0, 'Sep-26': 0, 'Oct-26': 0, 'Nov-26': 0,
  'Dec-26': 0, 'Jan-27': 0, 'Feb-27': 0, 'Mar-27': 0,
  'Prior Completed (Jan–Jul 2026)': 0,
  'Yet to be Scheduled': 0
};

store.villages.forEach(v => {
  const mKey = getMandalKey(v.mandal);
  const vKey = clean(v.village_name);
  const key1 = `${mKey}|${vKey}`;
  const key2 = `${mKey}|${vKey.replace(/^\d+/, '')}`;

  // Clean raw serial numbers if already present in target_month
  let existingMonth = v.target_month;
  if (existingMonth === '46080') existingMonth = 'Feb-27';
  if (existingMonth === '46382') existingMonth = 'Dec-26';

  let assignedCycle = null;
  let targetPPBs = null;

  // Check planMap
  const pMatch = planMap.get(key1) || planMap.get(key2);
  if (pMatch) {
    assignedCycle = pMatch.cycle;
    targetPPBs = pMatch.ppbs;
  } else if (existingMonth && stats[existingMonth] !== undefined) {
    assignedCycle = existingMonth;
  } else {
    // Check prior completed
    const prMatch = priorMap.get(key1) || priorMap.get(key2);
    if (prMatch) {
      assignedCycle = 'Prior Completed (Jan–Jul 2026)';
      targetPPBs = prMatch.ppbs;
    }
  }

  if (!assignedCycle) {
    if (existingMonth) assignedCycle = existingMonth;
    else assignedCycle = 'Yet to be Scheduled';
  }

  v.ppb_cycle = assignedCycle;
  v.target_month = assignedCycle === 'Prior Completed (Jan–Jul 2026)' || assignedCycle === 'Yet to be Scheduled' ? null : assignedCycle;
  if (targetPPBs !== null) {
    v.ppb_target = targetPPBs;
  }

  // Update PPB status:
  if (assignedCycle === 'Prior Completed (Jan–Jul 2026)') {
    v.ppb_status = 'Completed';
    v.final_ror_status = 'Completed';
    v.draft_ror_status = 'Completed';
    v.section13_status = 'Completed';
    v.jc_status = 'Completed';
    v.rdo_status = 'Completed';
    v.tahsildar_status = 'Completed';
    v.vro_status = 'Completed';
    v.vs_status = 'Completed';
    v.vectorization_status = 'Completed';
    v.gt_status = 'Completed';
    v.current_stage = 'Completed';
    v.status = 'Completed';
  } else if (assignedCycle === 'Aug-26') {
    // Aug 2026 is concluded, mark final ROR/PPB completed if reported
    if (!v.ppb_status) v.ppb_status = 'In Progress';
  } else if (assignedCycle === 'Sep-26') {
    // Current Active Deployment cycle
    if (!v.ppb_status) v.ppb_status = 'In Progress';
    v.is_current_cycle = true;
  }

  if (stats[assignedCycle] !== undefined) {
    stats[assignedCycle]++;
  } else {
    stats[assignedCycle] = (stats[assignedCycle] || 0) + 1;
  }
});

console.log('\n--- ENRICHED PPB CYCLE DISTRIBUTION ---');
Object.entries(stats).forEach(([c, cnt]) => {
  console.log(`${c.padEnd(32)}: ${cnt} villages`);
});

fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
console.log(`\nSuccessfully updated ${STORE_PATH}`);
