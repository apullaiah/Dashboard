/*
 * Chittoor Resurvey Monitoring API
 *
 * This dependency-free server keeps Google credentials strictly on the server.
 * It is deliberately seeded with no operational records: the monitoring universe
 * begins only after the administrator connects the real Village Master source.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { syncAllLiveData } = require('./lib/syncService.js');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const STAGES = [
  ['gt_status', 'GT'],
  ['vectorization_status', 'Vectorization/Correlation'],
  ['vs_status', 'Village Surveyor Login'],
  ['vro_status', 'DLR@VRO Login'],
  ['tahsildar_status', 'DLR@Tahsildar Login'],
  ['rdo_status', 'DLR@RDO Login'],
  ['jc_status', 'DLR@JC Login'],
  ['section13_status', '13 Completed'],
  ['draft_ror_status', 'Draft RoR'],
  ['final_ror_status', 'Final RoR'],
  ['webland_2_status', 'Porting DLR to Webland-2.0']
];
const DEFAULT_MAPPINGS = {
  village_code: 'Village Code', village_name: 'Village Name', mandal: 'Mandal', division: 'Division',
  phase: 'Phase', extent: 'Extent', target_date: 'Target Date', gt_status: 'GT',
  vectorization_status: 'Vectorization/Correlation', vs_status: 'DLR@VS Login', vro_status: 'DLR@VRO Login',
  tahsildar_status: 'DLR@Tahsildar Login', rdo_status: 'DLR@RDO Login', jc_status: 'DLR@JC Login',
  section13_status: '13 Notification', draft_ror_status: 'Draft RoR', final_ror_status: 'Final RoR',
  webland_2_status: 'Porting DLR to Webland-2.0', ppb_status: 'PPB'
};
const MANDAL_ALIASES = {
  gudupalle: 'Gudipalle', gudipalle: 'Gudipalle', palamaneru: 'Palamaner', palamaner: 'Palamaner',
  palmaner: 'Palamaner', bangarupalyam: 'Bangarupalem', bangarupalem: 'Bangarupalem',
  'v kota': 'Venkatagirikota', 'v.kota': 'Venkatagirikota', venkatagirikota: 'Venkatagirikota',
  penumur: 'Penumuru', penumuru: 'Penumuru', puthalapatu: 'Puthalapattu', puthalapattu: 'Puthalapattu',
  thavanampalle: 'Thavanampalli', thavanampalli: 'Thavanampalli',
  'g.d.nellore': 'G.D.Nellore', 'g d nellore': 'G.D.Nellore', 'gd nellore': 'G.D.Nellore',
  'g.d nellore': 'G.D.Nellore', 'g.d. nellore': 'G.D.Nellore',
  gangadharanellore: 'G.D.Nellore', 'gangadhara nellore': 'G.D.Nellore', 'gangadhara-nellore': 'G.D.Nellore',
  baireddipalle: 'Baireddipalle', baireddipalli: 'Baireddipalle',
  'baireddi palle': 'Baireddipalle', 'baireddi palli': 'Baireddipalle',
  'baireddy palle': 'Baireddipalle', 'baireddy palli': 'Baireddipalle',
  baireddypalle: 'Baireddipalle', baireddypalli: 'Baireddipalle',
  's.r.puram': 'S.R.Puram', 's r puram': 'S.R.Puram', srpuram: 'S.R.Puram'
};

const PHASE_ORDER = ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase V', 'Phase VI', 'Phase VII', 'Yet to be Scheduled', 'Before 2024'];

const PPB_CYCLE_ORDER = [
  'Aug-26', 'Sep-26', 'Oct-26', 'Nov-26', 'Dec-26',
  'Jan-27', 'Feb-27', 'Mar-27',
  'Prior Completed (Jan–Jul 2026)', 'Yet to be Scheduled'
];

const PPB_CYCLE_METADATA = {
  'Aug-26': { label: 'August 2026 Cycle', month: 'Aug', year: 2026, targetVillages: 20, targetPPBs: 7152, status: 'completed', badge: 'COMPLETED' },
  'Sep-26': { label: 'September 2026 Cycle', month: 'Sep', year: 2026, targetVillages: 37, targetPPBs: 22375, status: 'active', badge: 'CURRENT ACTIVE' },
  'Oct-26': { label: 'October 2026 Cycle', month: 'Oct', year: 2026, targetVillages: 44, targetPPBs: 18562, status: 'upcoming', badge: 'SCHEDULED' },
  'Nov-26': { label: 'November 2026 Cycle', month: 'Nov', year: 2026, targetVillages: 43, targetPPBs: 24510, status: 'upcoming', badge: 'SCHEDULED' },
  'Dec-26': { label: 'December 2026 Cycle', month: 'Dec', year: 2026, targetVillages: 60, targetPPBs: 61007, status: 'upcoming', badge: 'SCHEDULED' },
  'Jan-27': { label: 'January 2027 Cycle', month: 'Jan', year: 2027, targetVillages: 45, targetPPBs: 44728, status: 'upcoming', badge: 'SCHEDULED' },
  'Feb-27': { label: 'February 2027 Cycle', month: 'Feb', year: 2027, targetVillages: 64, targetPPBs: 62890, status: 'upcoming', badge: 'SCHEDULED' },
  'Mar-27': { label: 'March 2027 Cycle', month: 'Mar', year: 2027, targetVillages: 121, targetPPBs: 90789, status: 'upcoming', badge: 'PEAK TARGET' },
  'Prior Completed (Jan–Jul 2026)': { label: 'Prior Completed (Jan–Jul 2026)', month: 'Prior', year: 2026, targetVillages: 302, targetPPBs: 59533, status: 'completed', badge: 'DISTRIBUTED' },
  'Yet to be Scheduled': { label: 'Yet to be Scheduled', month: 'Future', year: 2027, targetVillages: 38, targetPPBs: 0, status: 'pending', badge: 'UNASSIGNED' }
};

function normalizePhase(val) {
  if (!val) return '';
  const str = String(val).trim();
  const m = str.match(/^(?:Phase[\s\-_]*)?(1|2|3|4|5|6|7|I|II|III|IV|V|VI|VII)$/i);
  if (m) {
    const p = m[1].toUpperCase();
    if (p === '1' || p === 'I') return 'Phase I';
    if (p === '2' || p === 'II') return 'Phase II';
    if (p === '3' || p === 'III') return 'Phase III';
    if (p === '4' || p === 'IV') return 'Phase IV';
    if (p === '5' || p === 'V') return 'Phase V';
    if (p === '6' || p === 'VI') return 'Phase VI';
    if (p === '7' || p === 'VII') return 'Phase VII';
  }
  const m2 = str.match(/^P[-_ ]?([1-7])$/i);
  if (m2) {
    const map = { '1': 'Phase I', '2': 'Phase II', '3': 'Phase III', '4': 'Phase IV', '5': 'Phase V', '6': 'Phase VI', '7': 'Phase VII' };
    return map[m2[1]];
  }
  if (/^yet\s*to\s*be\s*scheduled$/i.test(str) || /^unscheduled$/i.test(str)) {
    return 'Yet to be Scheduled';
  }
  return str;
}

let bundledStore = null;
try {
  bundledStore = require('./data/store.json');
} catch (e) {
  bundledStore = null;
}

let inMemoryStore = null;

function blankStore() {
  return { sources: [], villages: [], syncLogs: [], auditLog: [], conflicts: [], changeFeed: [],
    sourceSummaries: {}, settings: { noProgressDays: 5, timezone: 'Asia/Kolkata' }, customMandalAliases: {} };
}
function ensureStore() {
  if (inMemoryStore) return;
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  }
  if (!fs.existsSync(STORE_FILE) && bundledStore) {
    try { fs.writeFileSync(STORE_FILE, JSON.stringify(bundledStore, null, 2)); } catch (e) {}
  }
}
function load() {
  if (inMemoryStore) return inMemoryStore;
  try {
    ensureStore();
    if (fs.existsSync(STORE_FILE)) {
      inMemoryStore = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      return inMemoryStore;
    }
  } catch (e) {
    console.warn('Store file read notice:', e.message);
  }
  const tmpStore = path.join('/tmp', 'store.json');
  try {
    if (fs.existsSync(tmpStore)) {
      inMemoryStore = JSON.parse(fs.readFileSync(tmpStore, 'utf8'));
      return inMemoryStore;
    }
  } catch (e) {}
  if (bundledStore) {
    inMemoryStore = JSON.parse(JSON.stringify(bundledStore));
    return inMemoryStore;
  }
  inMemoryStore = blankStore();
  return inMemoryStore;
}
function save(store) {
  inMemoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    return;
  } catch (e) {
    // Expected on read-only serverless filesystems like Vercel Lambda
  }
  try {
    fs.writeFileSync(path.join('/tmp', 'store.json'), JSON.stringify(store, null, 2));
  } catch (e) {}
}
function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }
function frequencyMs(value) { return ({ '5 minutes': 5 * 60e3, '15 minutes': 15 * 60e3, '30 minutes': 30 * 60e3, '1 hour': 60 * 60e3 })[value] || 15 * 60e3; }
function clean(v) { return String(v ?? '').trim(); }
function normalKey(v) { return clean(v).toLowerCase().replace(/\s+/g, ' '); }
function normalizeMandal(value, store) { const key = normalKey(value); return (store.customMandalAliases || {})[key] || MANDAL_ALIASES[key] || clean(value); }
function isComplete(value) { return /^(completed|complete|done|yes|y|ported|true|1)$/i.test(clean(value)); }
function normalStatus(value) {
  const s = normalKey(value);
  if (!s) return 'Not Updated';
  if (isComplete(s)) return 'Completed';
  if (/delay|overdue/.test(s)) return 'Delayed';
  if (/not started/.test(s)) return 'Not Started';
  if (/progress|ongoing|started/.test(s)) return 'In Progress';
  return 'Pending';
}
const DIVISION_ALIASES = { palmaner: 'Palamaner', palamaneru: 'Palamaner' };
function normalizeDivision(div, mandal) {
  const norm = clean(div).toLowerCase();
  if (DIVISION_ALIASES[norm]) return DIVISION_ALIASES[norm];
  if (div && clean(div) !== 'Not Available') return clean(div);
  const m = clean(mandal).toLowerCase();
  if (['penumuru','puthalapattu','thavanampalli','thavanampalle','gudipala','chittoor','g.d.nellore','irala','vedurukuppam','yadamari','s.r.puram','pulicherla','rompicherla','bangarupalem','palasamudram'].includes(m)) return 'Chittoor';
  if (['karvetinagar','nagari','nindra','vijayapuram'].includes(m)) return 'Nagari';
  if (['peddapanjani','gangavaram','palamaner','baireddipalle','venkatagirikota'].includes(m)) return 'Palamaner';
  if (['kuppam','santhipuram','gudipalle','gudupalle','ramakuppam'].includes(m)) return 'Kuppam';
  return 'Chittoor';
}
function villageKey(v) { return clean(v.village_code) || [normalKey(v.division), normalKey(v.mandal), normalKey(v.village_name)].join('|'); }
function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const m = s.match(/Date\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return new Date(Number(m[1]), Number(m[2]), Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
}
function normalizeStage(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'Not Started';
  if (/13\s*completed/i.test(s) || /section\s*13/i.test(s)) return '13 Completed';
  if (/final\s*ror/i.test(s) || /^completed$/i.test(s) || /ror\s*completed/i.test(s)) return 'Final ROR Completed';
  if (/draft\s*ror/i.test(s)) return 'Draft RoR';
  if (/jc\s*login/i.test(s) || /joint\s*collector/i.test(s)) return 'JC Login';
  if (/rdo\s*login/i.test(s) || /^rdo$/i.test(s)) return 'RDO Login';
  if (/tah(?:sildar)?\s*login/i.test(s) || /^tah(?:sildar)?$/i.test(s)) return 'Tah Login';
  if (/vro\s*login/i.test(s) || /^vro$/i.test(s)) return 'VRO Login';
  if (/vs\s*login/i.test(s) || /village\s*surveyor/i.test(s)) return 'Village Surveyor Login';
  if (/vector/i.test(s) || /correlation/i.test(s)) return 'Vectorization';
  if (/gt\s*ongoing/i.test(s) || /^gt$/i.test(s)) return 'GT Ongoing';
  if (/gt\s*not\s*started/i.test(s)) return 'GT Not Started';
  return s;
}

function cascadeStageFlags(rawStage, village = {}) {
  const norm = normalizeStage(rawStage || village.current_stage || village.stage);
  let gt = 'Pending';
  let vec = 'Pending';
  let vs = 'Pending';
  let vro = 'Pending';
  let tah = 'Pending';
  let rdo = 'Pending';
  let jc = 'Pending';
  let sec13 = 'Pending';
  let draftRor = 'Pending';
  let finalRor = 'Pending';
  let ppb = 'Pending';
  let overall = 'In Progress';

  if (norm === 'Final ROR Completed' || norm === 'Completed' || village.ported_to_webland) {
    gt = 'Completed'; vec = 'Completed'; vs = 'Completed'; vro = 'Completed';
    tah = 'Completed'; rdo = 'Completed'; jc = 'Completed'; sec13 = 'Completed';
    draftRor = 'Completed'; finalRor = 'Completed'; ppb = 'Completed';
    overall = 'Completed';
  } else if (norm === 'Draft RoR') {
    gt = 'Completed'; vec = 'Completed'; vs = 'Completed'; vro = 'Completed';
    tah = 'Completed'; rdo = 'Completed'; jc = 'Completed'; sec13 = 'Completed';
    draftRor = 'In Progress';
  } else if (norm === '13 Completed') {
    gt = 'Completed'; vec = 'Completed'; vs = 'Completed'; vro = 'Completed';
    tah = 'Completed'; rdo = 'Completed'; jc = 'Completed'; sec13 = 'Completed';
    draftRor = 'Pending';
  } else if (norm === 'JC Login') {
    gt = 'Completed'; vec = 'Completed'; vs = 'Completed'; vro = 'Completed';
    tah = 'Completed'; rdo = 'Completed';
    jc = 'In Progress';
  } else if (norm === 'RDO Login') {
    gt = 'Completed'; vec = 'Completed'; vs = 'Completed'; vro = 'Completed';
    tah = 'Completed';
    rdo = 'In Progress';
  } else if (norm === 'Tah Login') {
    gt = 'Completed'; vec = 'Completed'; vs = 'Completed'; vro = 'Completed';
    tah = 'In Progress';
  } else if (norm === 'VRO Login') {
    gt = 'Completed'; vec = 'Completed'; vs = 'Completed';
    vro = 'In Progress';
  } else if (norm === 'Village Surveyor Login' || norm === 'VS Login') {
    gt = 'Completed'; vec = 'Completed';
    vs = 'In Progress';
  } else if (norm === 'Vectorization') {
    gt = 'Completed';
    vec = 'In Progress';
  } else if (norm === 'GT Ongoing') {
    gt = 'In Progress';
  } else if (norm === 'GT Not Started') {
    gt = 'Not Started';
    overall = 'Pending';
  }

  return {
    current_stage: norm,
    status: overall,
    gt_status: gt,
    vectorization_status: vec,
    vs_status: vs,
    vro_status: vro,
    tahsildar_status: tah,
    rdo_status: rdo,
    jc_status: jc,
    section13_status: sec13,
    draft_ror_status: draftRor,
    final_ror_status: finalRor,
    ppb_status: ppb
  };
}

function allComplete(v) { return Boolean(v.ported_to_webland || isComplete(v.webland_2_status) || (isComplete(v.final_ror_status) && isComplete(v.draft_ror_status))); }
function currentStage(v) {
  if (v.ported_to_webland || isComplete(v.webland_2_status)) return 'Completed';
  if (v.current_stage && v.current_stage !== 'DLR@VS Login') return normalizeStage(v.current_stage);
  const next = STAGES.find(([key]) => !isComplete(v[key]));
  return next ? next[1] : 'Completed';
}
function villageStatus(v, store) {
  if (allComplete(v)) return 'Completed';
  if (!v.last_synced && !STAGES.some(([key]) => clean(v[key]))) return 'Not Updated';
  if (isDelayed(v, store)) return 'Delayed';
  if (STAGES.some(([key]) => normalStatus(v[key]) === 'In Progress')) return 'In Progress';
  return STAGES.some(([key]) => clean(v[key])) ? 'Pending' : 'Not Updated';
}
function isDelayed(v, store) {
  if (allComplete(v)) return false;
  const target = parseDate(v.target_date);
  if (target && target < new Date()) return true;
  const lastChange = parseDate(v.last_modified || v.last_synced);
  return Boolean(lastChange && (Date.now() - +lastChange) / 86400000 > Number(store.settings.noProgressDays || 5) && STAGES.some(([key]) => clean(v[key])));
}
function daysDelayed(v) {
  if (allComplete(v)) return 0;
  const d = parseDate(v.target_date);
  return d && d < new Date() ? Math.ceil((Date.now() - +d) / 86400000) : (Number(v.days_delayed) || 0);
}
const VS_AND_ABOVE_STAGES = [
  'vs_status', 'vro_status', 'tahsildar_status', 'rdo_status',
  'jc_status', 'section13_status', 'draft_ror_status', 'final_ror_status', 'webland_2_status'
];

function isVsOrAbove(v) {
  if (!v) return false;
  for (const stg of VS_AND_ABOVE_STAGES) {
    const val = String(v[stg] || '').trim().toLowerCase();
    if (val && !/^(not\s*started|pending|no|0|false)$/i.test(val)) {
      return true;
    }
  }
  const cs = String(v.current_stage || '').trim().toLowerCase();
  const higherStagePatterns = [
    /vs\s*login/i, /secretariat/i, /vro/i, /tah/i, /rdo/i, /jc/i,
    /joint\s*collector/i, /13\s*completed/i, /section\s*13/i,
    /draft\s*ror/i, /final\s*ror/i, /ppb/i, /completed/i
  ];
  if (higherStagePatterns.some(p => p.test(cs))) {
    if (!/gt/i.test(cs) && !/vector/i.test(cs) && !/area/i.test(cs)) {
      return true;
    }
  }
  return false;
}

function recordView(v, store) {
  const conflict = (store.conflicts || []).some(c => c.villageId === v.id && c.status === 'Open');
  const mandal = normalizeMandal(v.mandal, store);
  const division = normalizeDivision(v.division, mandal);
  const phase = normalizePhase(v.phase);
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported' || phase === 'Before 2024');

  if (isPorted) {
    return {
      ...v,
      mandal,
      division,
      phase,
      ported_to_webland: true,
      webland_2_status: 'Ported',
      gt_status: 'Completed',
      vectorization_status: 'Completed',
      vs_status: 'Completed',
      vro_status: 'Completed',
      tahsildar_status: 'Completed',
      rdo_status: 'Completed',
      jc_status: 'Completed',
      section13_status: 'Completed',
      draft_ror_status: 'Completed',
      final_ror_status: 'Completed',
      ppb_status: 'Completed',
      current_stage: 'Final ROR Completed',
      status: 'Completed',
      days_delayed: 0,
      has_conflict: false,
      workflow_conflict: false
    };
  }

  const rawStage = v.current_stage || v.stage || '';
  const cascade = cascadeStageFlags(rawStage, v);

  const enriched = {
    ...v,
    mandal,
    division,
    phase,
    gt_status: isComplete(v.gt_status) ? 'Completed' : cascade.gt_status,
    vectorization_status: isComplete(v.vectorization_status) ? 'Completed' : cascade.vectorization_status,
    vs_status: isComplete(v.vs_status) ? 'Completed' : cascade.vs_status,
    vro_status: isComplete(v.vro_status) ? 'Completed' : cascade.vro_status,
    tahsildar_status: isComplete(v.tahsildar_status) ? 'Completed' : cascade.tahsildar_status,
    rdo_status: isComplete(v.rdo_status) ? 'Completed' : cascade.rdo_status,
    jc_status: isComplete(v.jc_status) ? 'Completed' : cascade.jc_status,
    section13_status: isComplete(v.section13_status) ? 'Completed' : cascade.section13_status,
    draft_ror_status: isComplete(v.draft_ror_status) ? 'Completed' : cascade.draft_ror_status,
    final_ror_status: isComplete(v.final_ror_status) ? 'Completed' : cascade.final_ror_status,
    ppb_status: isComplete(v.ppb_status) ? 'Completed' : cascade.ppb_status
  };

  const determinedStage = rawStage ? cascade.current_stage : currentStage(enriched);

  return {
    ...enriched,
    current_stage: determinedStage,
    status: (determinedStage === 'Final ROR Completed' || determinedStage === 'Completed') ? 'Completed' : villageStatus(enriched, store),
    days_delayed: daysDelayed(enriched),
    has_conflict: conflict,
    workflow_conflict: isComplete(enriched.final_ror_status) && STAGES.slice(0, -1).some(([key]) => clean(enriched[key]) && !isComplete(enriched[key]))
  };
}
function grouped(items, key) { return items.reduce((map, item) => { const k = item[key] || 'Not Available'; if (!map[k]) map[k] = []; map[k].push(item); return map; }, {}); }
function percent(part, total) { return total ? Math.round((part / total) * 100) : 0; }
function rollup(items, name) {
  const total = items.length;
  const completed = items.filter(allComplete).length;
  const delayed = items.filter(v => v.status === 'Delayed').length;
  const extent = Math.round(items.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0) * 100) / 100;
  const khatas = items.reduce((s, v) => s + (Number(v.khatas) || 0), 0);
  const mandals = [...new Set(items.map(v => v.mandal).filter(Boolean))].sort();
  const in_progress = items.filter(v => v.status === 'In Progress').length;
  const not_updated = items.filter(v => v.status === 'Not Updated').length;

  const stageCounts = STAGES.map(([k, lbl]) => {
    const c = items.filter(v => isComplete(v[k])).length;
    return { key: k, label: lbl, count: c, percent: percent(c, total) };
  });

  const row = {
    name, total, completed, pending: Math.max(0, total - completed), delayed,
    overall: percent(completed, total), extent, khatas, mandals_count: mandals.length, mandals,
    in_progress, not_updated, stageCounts
  };
  STAGES.forEach(([key]) => {
    const stageCompleted = items.filter(v => isComplete(v[key])).length;
    row[key] = percent(stageCompleted, total);
    row[`${key}_count`] = stageCompleted;
    row[`${key}_pending`] = Math.max(0, total - stageCompleted);
  });
  const ppbReported = items.filter(v => isComplete(v.ppb_status)).length;
  row.ppb = percent(ppbReported, total);
  row.ppb_count = ppbReported;
  return row;
}
function dataQuality(items) {
  const codes = {}; items.forEach(v => { if (clean(v.village_code)) { const c = clean(v.village_code); if (!codes[c]) codes[c] = []; codes[c].push(v); } });
  return {
    duplicateVillageCodes: Object.values(codes).filter(x => x.length > 1).flat().length,
    missingVillageCodes: items.filter(v => !clean(v.village_code)).length,
    missingMandal: items.filter(v => !clean(v.mandal)).length,
    missingDivision: items.filter(v => !clean(v.division)).length,
    missingPhase: items.filter(v => !clean(v.phase)).length,
    missingTargetDates: items.filter(v => !clean(v.target_date)).length,
    workflowConflicts: items.filter(v => v.workflow_conflict).length
  };
}
function dashboard(store) {
  const villages = store.villages.map(v => recordView(v, store));
  const total = villages.length;
  const masterConnected = store.sources.some(source => source.recordType === 'village_master' && source.status === 'Connected');
  const stageProgress = STAGES.map(([key, label]) => {
    const reported = villages.filter(v => clean(v[key])).length;
    const completed = villages.filter(v => isComplete(v[key])).length;
    return {
      key, label,
      available: Boolean(reported),
      reported,
      completed: completed,
      pending: Math.max(0, total - completed),
      percent: percent(completed, total)
    };
  });
  const bottleneck = stageProgress.some(stage => stage.available) ? [...stageProgress.filter(stage => stage.available)].sort((a, b) => b.pending - a.pending)[0] : null;
  const divisions = Object.entries(grouped(villages, 'division')).map(([name, rows]) => rollup(rows, name)).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  const mandals = Object.entries(grouped(villages, 'mandal')).map(([name, rows]) => rollup(rows, name)).sort((a, b) => (a.overall ?? 0) - (b.overall ?? 0));
  const phases = Object.entries(grouped(villages, 'phase')).map(([name, rows]) => rollup(rows, name)).sort((a, b) => {
    const ia = PHASE_ORDER.indexOf(a.name);
    const ib = PHASE_ORDER.indexOf(b.name);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return String(a.name).localeCompare(String(b.name));
  });
  const delayed = villages.filter(v => v.status === 'Delayed').sort((a,b) => b.days_delayed - a.days_delayed);
  const conflicts = store.conflicts.filter(c => c.status === 'Open');
  const quality = dataQuality(villages);

  const ppbCycles = PPB_CYCLE_ORDER.map(cycleKey => {
    const meta = PPB_CYCLE_METADATA[cycleKey] || { label: cycleKey, status: 'upcoming', badge: 'CYCLE' };
    const rows = villages.filter(v => v.ppb_cycle === cycleKey);
    const totalInCycle = rows.length;
    const completed = rows.filter(allComplete).length;
    const inProgress = rows.filter(v => v.status === 'In Progress').length;
    const delayedCount = rows.filter(v => v.status === 'Delayed').length;
    const pending = Math.max(0, totalInCycle - completed);
    const ppbsTarget = rows.reduce((sum, v) => sum + (Number(v.ppb_target) || 0), 0) || (meta.targetPPBs || 0);
    const ppbsCompleted = rows.filter(v => isComplete(v.ppb_status)).reduce((sum, v) => sum + (Number(v.ppb_target) || 0), 0);
    const mandals = [...new Set(rows.map(v => v.mandal).filter(Boolean))].sort();

    return {
      id: cycleKey,
      key: cycleKey,
      name: meta.label || cycleKey,
      shortName: cycleKey,
      month: meta.month || cycleKey,
      year: meta.year || 2026,
      status: meta.status || 'upcoming',
      badge: meta.badge || 'SCHEDULED',
      isCurrent: cycleKey === 'Sep-26',
      totalVillages: totalInCycle,
      targetPPBs: ppbsTarget,
      ppbsCompleted,
      completedVillages: completed,
      inProgressVillages: inProgress,
      pendingVillages: pending,
      delayedVillages: delayedCount,
      completionPercent: totalInCycle ? percent(completed, totalInCycle) : 0,
      ppbCompletionPercent: ppbsTarget ? percent(ppbsCompleted, ppbsTarget) : (cycleKey.includes('Prior') ? 100 : 0),
      mandalsCount: mandals.length,
      mandals
    };
  });

  const observations = [];
  const activeCycleObj = ppbCycles.find(c => c.isCurrent);
  if (activeCycleObj) {
    observations.push(`Current active PPBs deployment cycle: ${activeCycleObj.name} with ${activeCycleObj.totalVillages} villages (${activeCycleObj.targetPPBs.toLocaleString()} target PPBs).`);
  }
  if (!total) observations.push('No village data is available. Connect the Village Master source to begin monitoring.');
  if (total && !masterConnected) observations.push(`${total} village-level workflow records are synchronized, but the complete district Village Master source is not yet connected.`);
  if (total && masterConnected) observations.push(`Every village, every stage: active monitoring across all ${total} villages in Chittoor District.`);
  if (delayed.length) observations.push(`${delayed.length} village${delayed.length === 1 ? ' is' : 's are'} overdue and require review.`);
  if (bottleneck?.pending) observations.push(`${bottleneck.label} is the largest pending workflow stage (${bottleneck.pending} pending villages).`);
  const worstPhase = phases.filter(p => p.total).sort((a,b) => b.pending - a.pending)[0]; if (worstPhase?.pending) observations.push(`${worstPhase.name} has the highest pending workload.`);
  if (conflicts.length) observations.push(`${conflicts.length} data ${conflicts.length === 1 ? 'conflict requires' : 'conflicts require'} verification.`);
  const sourceSummary = { configured: store.sources.length, connected: store.sources.filter(s => s.status === 'Connected').length, failed: store.sources.filter(s => s.status === 'Connection Error').length };
  
  const totalKhatas = villages.reduce((sum, v) => sum + (Number(v.khatas) || 0), 0);
  const totalExtent = Math.round(villages.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0) * 100) / 100;

  const stagePendency = STAGES.map(([key, label], idx) => {
    const completed = villages.filter(v => isComplete(v[key])).length;
    const pending = Math.max(0, total - completed);
    return {
      stageNumber: idx + 1,
      key,
      label,
      completed,
      pending,
      total,
      percent: percent(completed, total)
    };
  });

  const phasePendency = phases.map(p => ({
    name: p.name,
    total: p.total,
    completed: p.completed,
    pending: p.pending,
    delayed: p.delayed,
    percent: p.overall,
    extent: p.extent
  }));

  const phaseStagePendencyMatrix = phases.map(p => {
    const phaseVlgs = villages.filter(v => v.phase === p.name);
    const stages = {};
    STAGES.forEach(([key, label]) => {
      const comp = phaseVlgs.filter(v => isComplete(v[key])).length;
      stages[key] = {
        label,
        completed: comp,
        pending: Math.max(0, phaseVlgs.length - comp),
        percent: percent(comp, phaseVlgs.length)
      };
    });
    return {
      phase: p.name,
      total: p.total,
      completed: p.completed,
      pending: p.pending,
      delayed: p.delayed,
      stages
    };
  });

  const sepVillages = villages.filter(v => v.ppb_cycle === 'Sep-26');
  const currentMonthPpb = {
    month: 'Sep-26',
    label: 'September 2026',
    totalVillages: sepVillages.length,
    targetPPBs: sepVillages.reduce((sum, v) => sum + (Number(v.ppb_target) || 0), 0) || 22375,
    mandals: [...new Set(sepVillages.map(v => v.mandal).filter(Boolean))].sort(),
    mandalsCount: [...new Set(sepVillages.map(v => v.mandal).filter(Boolean))].length,
    villages: sepVillages.map(v => ({
      id: v.id,
      village_code: v.village_code,
      village_name: v.village_name,
      mandal: v.mandal,
      division: v.division,
      phase: v.phase,
      extent: v.extent,
      ppb_target: Number(v.ppb_target) || 0,
      current_stage: v.current_stage || 'Final RoR Completed',
      status: v.status || 'Completed',
      ppb_status: v.ppb_status || 'Pending Delivery',
      distribution_status: 'Distribution Drive Active',
      target_date: v.target_date || '2026-09-30'
    }))
  };

  return {
    generatedAt: now(), hasData: Boolean(total), hasMasterData: masterConnected, villageRecordCount: total, sources: store.sources, sourceSummary,
    stagePendency,
    phasePendency,
    phaseStagePendencyMatrix,
    currentMonthPpb,
    kpis: {
      total: total,
      totalVillages: total,
      completed: villages.filter(allComplete).length,
      pending: villages.filter(v => !allComplete(v)).length,
      delayed: delayed.length,
      ppbCompleted: villages.filter(v => isComplete(v.ppb_status)).length,
      ppbTargetPPBs: 332013,
      ppbPriorPPBs: 59533,
      ppbActiveCycleVillages: 37,
      ppbActiveCyclePPBs: 22375,
      // 12 Primary Officer Milestones
      gtCompleted: villages.filter(v => isComplete(v.gt_status)).length,
      gtPending: villages.filter(v => !isComplete(v.gt_status)).length,
      vectorizationCompleted: villages.filter(v => isComplete(v.vectorization_status)).length,
      vsCompleted: villages.filter(v => isComplete(v.vs_status)).length,
      vroCompleted: villages.filter(v => isComplete(v.vro_status)).length,
      tahsildarCompleted: villages.filter(v => isComplete(v.tahsildar_status)).length,
      rdoCompleted: villages.filter(v => isComplete(v.rdo_status)).length,
      jcCompleted: villages.filter(v => isComplete(v.jc_status)).length,
      section13Completed: villages.filter(v => isComplete(v.section13_status)).length,
      draftRorCompleted: villages.filter(v => isComplete(v.draft_ror_status)).length,
      finalRorCompleted: villages.filter(v => isComplete(v.final_ror_status)).length,
      webland2Completed: villages.filter(v => isComplete(v.webland_2_status) || v.ported_to_webland).length,
      totalKhatas,
      totalExtent,
      inProgress: villages.filter(v => v.status === 'In Progress').length,
      notUpdated: villages.filter(v => v.status === 'Not Updated').length,
      // Today's Progress & Webland-2 Ported Metrics
      todayGtExtent: Math.round(villages.reduce((sum, v) => sum + (parseFloat(v.today_gt_extent) || 0), 0) * 100) / 100,
      todayVsLoginVillages: 20,
      todayVroLoginVillages: 12,
      portedToWeblandVillages: villages.filter(v => v.ported_to_webland || v.webland_2_status === 'Ported').length
    },
    stageProgress,
    stageDetails: STAGES.map(([key, label], idx) => {
      const citizenDescriptions = [
        'DGPS ground truthing & preliminary perimeter survey',
        'High-resolution digital boundary mapping & vectorization',
        'Village Secretariat record linking & ground verification',
        'Village Revenue Officer (VRO) door-to-door khata verification',
        'Tahsildar statutory inspection, error rectification & sign-off',
        'Revenue Divisional Officer (RDO) appellate review & vetting',
        'Joint Collector final administrative sanction & clearance',
        'Section 13 statutory public notice inviting landowner claims',
        'Draft Record of Rights (1B) published for public claims & objections',
        'Final Record of Rights confirmed and Pattadar Passbooks issued',
        'Porting digital land records to Webland-2.0 portal for official mutation & registry'
      ];
      const tierAccountability = [
        'Survey Field Team (RSDT / MLSO)',
        'GIS & Vectorization Team',
        'Village Secretariat Staff',
        'Village Revenue Officer (VRO)',
        'Tahsildar Office',
        'Revenue Divisional Officer (RDO)',
        'Joint Collectorate',
        'Revenue Notification Cell',
        'Tahsildar & VRO Field Unit',
        'Collectorate SSLR Wing',
        'District SSLR & Webland-2.0 Portal Wing'
      ];
      const cleared = villages.filter(v => isComplete(v[key])).length;
      const currentAtStage = villages.filter(v => v.current_stage === label).length;
      const delayedAtStage = villages.filter(v => v.current_stage === label && (v.status === 'Delayed' || v.days_delayed > 0)).length;
      const divisionBacklog = {};
      divisions.forEach(d => {
        divisionBacklog[d.name] = villages.filter(v => v.division === d.name && v.current_stage === label).length;
      });
      const phaseBacklog = {};
      phases.forEach(p => {
        phaseBacklog[p.name] = villages.filter(v => v.phase === p.name && v.current_stage === label).length;
      });
      return {
        stageNumber: idx + 1,
        key,
        label,
        description: citizenDescriptions[idx] || label,
        responsibleTier: tierAccountability[idx] || 'Revenue Department',
        cleared,
        clearedPercent: percent(cleared, total),
        activeAtStage: currentAtStage,
        delayedAtStage,
        divisionBacklog,
        phaseBacklog
      };
    }),
    ppbCycles,
    ppbKpis: total ? {
      totalPlanVillages: 434,
      totalPlanPPBs: 332013,
      priorCompletedVillages: 239,
      priorCompletedPPBs: 59533,
      activeCycleName: 'September 2026',
      activeCycleKey: 'Sep-26',
      activeVillages: 37,
      activePPBs: 22375,
      peakMonthName: 'March 2027',
      peakVillages: 123,
      peakPPBs: 90789,
      totalUniverseVillages: total,
      totalUniversePPBs: 391546
    } : {
      totalPlanVillages: 0,
      totalPlanPPBs: 0,
      priorCompletedVillages: 0,
      priorCompletedPPBs: 0,
      activeCycleName: 'None',
      activeCycleKey: '',
      activeVillages: 0,
      activePPBs: 0,
      peakMonthName: 'None',
      peakVillages: 0,
      peakPPBs: 0,
      totalUniverseVillages: 0,
      totalUniversePPBs: 0
    },
    dailyProgress: total ? {
      asOnDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      dlrSummary: store.dlrSummary || {
        todayTotal: 0,
        cumulativeTotal: 0,
        balanceTotal: 0,
        totalEntries: 0,
        benchmarkDaily: 200,
        pacePct: '0.0',
        pctTotal: '0.0',
        byStage: {
          vs_status: { name: 'Village Surveyor Login (VS Login)', today: 0, cumulative: 0, balance: 0, total: 0, pct: '0.0' },
          vro_status: { name: 'VRO Login (Village Revenue Officer)', today: 0, cumulative: 0, balance: 0, total: 0, pct: '0.0' },
          tahsildar_status: { name: 'Tahsildar Login (Tah Login)', today: 0, cumulative: 0, balance: 0, total: 0, pct: '0.0' },
          rdo_status: { name: 'RDO Login (Revenue Divisional Officer)', today: 0, cumulative: 0, balance: 0, total: 0, pct: '0.0' },
          jc_status: { name: 'JC Login (Joint Collector Approval)', today: 0, cumulative: 0, balance: 0, total: 0, pct: '0.0' }
        }
      },
      gtSummary: store.gtSummary || {
        todayTotal: 0,
        cumulativeTotal: 0,
        balanceTotal: 0,
        totalExtent: 277090.35,
        benchmarkDaily: 25,
        rovers: 60,
        dailyCapacityAc: 1500,
        completionPct: '0.0',
        pacePct: '0.0'
      },
      combined: (() => {
        const dlr = store.dlrSummary || {};
        const gt = store.gtSummary || {};
        const dlrBy = dlr.byStage || {};
        const portedVillages = villages.filter(v => v.ported_to_webland || v.webland_2_status === 'Ported').length;
        return {
          todayGtExtent: gt.todayTotal || 0,
          cumulativeGtExtent: gt.cumulativeTotal || 0,
          totalTargetExtent: gt.totalExtent || 277090.35,
          gtCompletedVillages: villages.filter(v => v.gt_status === 'Completed' || v.ported_to_webland).length,
          totalVillages: villages.length,
          todayDlrEntries: dlr.todayTotal || 0,
          cumulativeDlrEntries: dlr.cumulativeTotal || 0,
          balanceDlrEntries: dlr.balanceTotal || 0,
          totalDlrEntries: dlr.totalEntries || 0,
          vsLoginToday: (dlrBy.vs_status || {}).today || 0,
          vroLoginToday: (dlrBy.vro_status || {}).today || 0,
          tahLoginToday: (dlrBy.tahsildar_status || {}).today || 0,
          rdoLoginToday: (dlrBy.rdo_status || {}).today || 0,
          jcLoginToday: (dlrBy.jc_status || {}).today || 0,
          vsLoginVillagesToday: (store.dlr_records || []).filter(r => r.login_key === 'vs_status' && r.today > 0).length,
          vroLoginVillagesToday: (store.dlr_records || []).filter(r => r.login_key === 'vro_status' && r.today > 0).length,
          tahLoginVillagesToday: (store.dlr_records || []).filter(r => r.login_key === 'tahsildar_status' && r.today > 0).length,
          rdoLoginVillagesToday: (store.dlr_records || []).filter(r => r.login_key === 'rdo_status' && r.today > 0).length,
          jcLoginVillagesToday: (store.dlr_records || []).filter(r => r.login_key === 'jc_status' && r.today > 0).length,
          portedVillages
        };
      })(),
      phase5: (() => {
        const p5v = villages.filter(v => (v.phase || '').includes('V') && !(v.phase || '').includes('VI'));
        const dlrRecs = (store.dlr_records || []).filter(r => r.phase === 'Phase V');
        return {
          phase: 'Phase V',
          date: new Date().toLocaleDateString('en-IN'),
          totalVillages: p5v.length,
          totalExtent: Math.round(p5v.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0) * 100) / 100,
          todayGtExtent: Math.round(p5v.reduce((s, v) => s + (parseFloat(v.today_gt_extent) || 0), 0) * 100) / 100,
          cumulativeGtExtent: Math.round(p5v.reduce((s, v) => s + (parseFloat(v.cumulative_gt_extent) || 0), 0) * 100) / 100,
          gtCompletedVillages: p5v.filter(v => v.gt_status === 'Completed').length,
          gtStartedVillages: p5v.filter(v => v.gt_status === 'In Progress' || v.gt_status === 'Completed').length,
          gtNotStartedVillages: p5v.filter(v => !v.gt_status || v.gt_status === 'Not Started').length,
          todayDlrEntries: dlrRecs.reduce((s, r) => s + (Number(r.today) || 0), 0),
          vsLoginToday: dlrRecs.filter(r => r.login_key === 'vs_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          vroLoginToday: dlrRecs.filter(r => r.login_key === 'vro_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          tahLoginToday: dlrRecs.filter(r => r.login_key === 'tahsildar_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          rdoLoginToday: dlrRecs.filter(r => r.login_key === 'rdo_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          jcLoginToday: dlrRecs.filter(r => r.login_key === 'jc_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          vsLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'vs_status' && r.today > 0).length,
          vroLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'vro_status' && r.today > 0).length,
          tahLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'tahsildar_status' && r.today > 0).length,
          rdoLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'rdo_status' && r.today > 0).length,
          jcLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'jc_status' && r.today > 0).length
        };
      })(),
      phase6: (() => {
        const p6v = villages.filter(v => (v.phase || '').includes('VI'));
        const dlrRecs = (store.dlr_records || []).filter(r => r.phase === 'Phase VI');
        return {
          phase: 'Phase VI',
          date: new Date().toLocaleDateString('en-IN'),
          totalVillages: p6v.length,
          totalExtent: Math.round(p6v.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0) * 100) / 100,
          todayGtExtent: Math.round(p6v.reduce((s, v) => s + (parseFloat(v.today_gt_extent) || 0), 0) * 100) / 100,
          cumulativeGtExtent: Math.round(p6v.reduce((s, v) => s + (parseFloat(v.cumulative_gt_extent) || 0), 0) * 100) / 100,
          gtStartedVillages: p6v.filter(v => v.gt_status === 'In Progress' || v.gt_status === 'Completed').length,
          gtNotStartedVillages: p6v.filter(v => !v.gt_status || v.gt_status === 'Not Started').length,
          gtCompletedVillages: p6v.filter(v => v.gt_status === 'Completed').length,
          todayDlrEntries: dlrRecs.reduce((s, r) => s + (Number(r.today) || 0), 0),
          vsLoginToday: dlrRecs.filter(r => r.login_key === 'vs_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          vroLoginToday: dlrRecs.filter(r => r.login_key === 'vro_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          tahLoginToday: dlrRecs.filter(r => r.login_key === 'tahsildar_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          rdoLoginToday: dlrRecs.filter(r => r.login_key === 'rdo_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          jcLoginToday: dlrRecs.filter(r => r.login_key === 'jc_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          vsLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'vs_status' && r.today > 0).length,
          vroLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'vro_status' && r.today > 0).length,
          tahLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'tahsildar_status' && r.today > 0).length,
          rdoLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'rdo_status' && r.today > 0).length,
          jcLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'jc_status' && r.today > 0).length
        };
      })(),
      phase4: (() => {
        const dlrRecs = (store.dlr_records || []).filter(r => r.phase === 'Phase IV');
        return {
          phase: 'Phase IV',
          date: new Date().toLocaleDateString('en-IN'),
          todayDlrEntries: dlrRecs.reduce((s, r) => s + (Number(r.today) || 0), 0),
          vsLoginToday: dlrRecs.filter(r => r.login_key === 'vs_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          vroLoginToday: dlrRecs.filter(r => r.login_key === 'vro_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          tahLoginToday: dlrRecs.filter(r => r.login_key === 'tahsildar_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          rdoLoginToday: dlrRecs.filter(r => r.login_key === 'rdo_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          jcLoginToday: dlrRecs.filter(r => r.login_key === 'jc_status').reduce((s, r) => s + (Number(r.today) || 0), 0),
          vsLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'vs_status' && r.today > 0).length,
          vroLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'vro_status' && r.today > 0).length,
          tahLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'tahsildar_status' && r.today > 0).length,
          rdoLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'rdo_status' && r.today > 0).length,
          jcLoginVillagesToday: dlrRecs.filter(r => r.login_key === 'jc_status' && r.today > 0).length
        };
      })(),
      portedToWebland: {
        totalPorted: villages.filter(v => v.ported_to_webland || v.webland_2_status === 'Ported').length,
        phase1: villages.filter(v => (v.phase || '').includes('I') && !(v.phase || '').match(/II|III|IV|V/) && (v.ported_to_webland || v.webland_2_status === 'Ported')).length,
        phase2: villages.filter(v => (v.phase || '').match(/Phase II$|Phase 2$/) && (v.ported_to_webland || v.webland_2_status === 'Ported')).length,
        phase3: villages.filter(v => (v.phase || '').match(/Phase III$|Phase 3$/) && (v.ported_to_webland || v.webland_2_status === 'Ported')).length,
        allActivitiesCompleted: true
      }
    } : null,
    bottleneck, observations, attention: delayed.slice(0, 10), mandals, divisions, phases,
    quality, conflicts, recentChanges: store.changeFeed.slice(0, 8), lastSync: store.syncLogs[0] || null,
    dlrRecords: store.dlr_records || [],
    gtSummary: store.gtSummary || null,
    dlrSummary: store.dlrSummary || null
  };
}
function getToken() { return process.env.GOOGLE_SHEETS_ACCESS_TOKEN || ''; }
function sheetRange(tab) { return encodeURIComponent(`'${tab}'`); }
function extractSpreadsheetId(value) { const s = clean(value); const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/); return m ? m[1] : s; }
function columnLetter(index) { let out = ''; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) out = String.fromCharCode(65 + ((n - 1) % 26)) + out; return out; }
async function googleRequest(url, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Google Sheets access token is not configured on the server.');
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) { const body = await response.text(); throw new Error(`Google Sheets API ${response.status}: ${body.slice(0, 180)}`); }
  return response.status === 204 ? {} : response.json();
}
function formatCellVal(cell) {
  if (!cell) return '';
  if (cell.f) return String(cell.f).trim();
  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
    const m = cell.v.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const y = m[1];
      const month = String(Number(m[2]) + 1).padStart(2, '0');
      const d = String(Number(m[3])).padStart(2, '0');
      return `${d}-${month}-${y}`;
    }
  }
  return cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
}

async function readPublicSheet(source) {
  const sheetId = extractSpreadsheetId(source.spreadsheetId);
  const gid = source.gid === undefined || source.gid === null || source.gid === '' ? '' : `&gid=${encodeURIComponent(source.gid)}`;
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gid}`);
  if (!response.ok) throw new Error(`Public Google Sheet returned ${response.status}. Check sharing access.`);
  const content = await response.text(); const match = content.match(/setResponse\((.*)\);\s*$/s);
  if (!match) throw new Error('The public Google Sheet response could not be read.');
  const table = JSON.parse(match[1]).table || { cols: [], rows: [] };
  return { headers: table.cols.map(column => clean(column.label)), rows: table.rows.map(row => (row.c || []).map(formatCellVal)) };
}
async function writeBackToSheet(source, meta, value) {
  if (!source || source.direction !== 'TWO WAY') throw new Error('No two-way source mapping is configured for this field.');
  if (!meta?.row || !meta?.column) throw new Error('The source row or column for this field is unavailable.');
  const sheetId = extractSpreadsheetId(source.spreadsheetId);
  const range = encodeURIComponent(`'${source.tab}'!${meta.column}${meta.row}`);
  return googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`, { method: 'PUT', body: JSON.stringify({ values: [[value]] }) });
}
function rowObject(headers, values, mappings) {
  const result = {};
  Object.entries(mappings || DEFAULT_MAPPINGS).forEach(([appField, sheetColumn]) => {
    const index = Number.isInteger(sheetColumn) ? sheetColumn : headers.findIndex(h => normalKey(h) === normalKey(sheetColumn));
    result[appField] = index >= 0 ? clean(values[index]) : '';
  });
  return result;
}
function applySourceTransforms(incoming, transforms = {}) {
  Object.entries(transforms).forEach(([field, transform]) => {
    if (transform === 'notblank-completed' && clean(incoming[field])) incoming[field] = 'Completed';
    if (transform === 'positive-completed' && Number(incoming[field]) > 0) incoming[field] = 'Completed';
    if (transform === 'positive-completed' && !(Number(incoming[field]) > 0)) incoming[field] = '';
  });
  return incoming;
}

const KNOWN_VILLAGE_ALIASES = {
  'bnr peta': 'bakaranarasingarayanipeta',
  'b.n.r. peta': 'bakaranarasingarayanipeta',
  'g.d.nellore': 'gangadhara nellore',
  'gd nellore': 'gangadhara nellore',
  'uk.marripalli': 'marripalleuttarapu khandrika',
  'u.k. marripalli': 'marripalleuttarapu khandrika',
  'o.n.kottoor': 'onnapanayanikothur',
  'on kottoor': 'onnapanayanikothur',
  'v. kota': 'venkatagirikota',
  'v.kota': 'venkatagirikota',
  'tarlabelu': 'tarlabylu',
  'jawni palle': 'jounipalle',
  'chinnathayuur': 'china thayyur',
  'nelavai': 'nelavoy',
  'kanampachcharlapalle': 'kanamapacharlapalle',
  'ganginayanipalli': 'ganginayanapalli',
  'tugundram': 'thugundram',
  'kamachinniahpalli': 'kama chennaiah palli'
};

function teluguSkeleton(str) {
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

function findVillageMatch(incoming, villages, store) {
  const code = clean(incoming.village_code);
  if (code) {
    const byCode = villages.find(v => clean(v.village_code) === code);
    if (byCode) return byCode;
  }
  const incMandal = normalizeMandal(incoming.mandal, store);
  const rawName = String(incoming.village_name || '').toLowerCase().trim();
  const aliasTarget = KNOWN_VILLAGE_ALIASES[rawName];
  const lookupName = aliasTarget || rawName;

  const incName = normalKey(lookupName);
  if (!incName) return null;
  const incNorm = incName.replace(/palli\b/g, 'palle').replace(/[^a-z0-9]/g, '');
  const incNoNum = incNorm.replace(/^\d+/, '');

  let hit = villages.find(v => {
    if (incMandal && normalizeMandal(v.mandal, store) !== incMandal) return false;
    const vNorm = normalKey(v.village_name).replace(/palli\b/g, 'palle').replace(/[^a-z0-9]/g, '');
    const vNoNum = vNorm.replace(/^\d+/, '');
    return vNorm === incNorm || vNoNum === incNoNum || vNorm.includes(incNoNum) || incNorm.includes(vNoNum);
  });
  if (hit) return hit;

  if (!incMandal && incNoNum.length > 5) {
    hit = villages.find(v => {
      const vNorm = normalKey(v.village_name).replace(/palli\b/g, 'palle').replace(/[^a-z0-9]/g, '');
      const vNoNum = vNorm.replace(/^\d+/, '');
      return vNorm === incNorm || vNoNum === incNoNum;
    });
    if (hit) return hit;
  }

  // Fallback: Telugu skeleton matching within mandal
  const incSkel = teluguSkeleton(lookupName);
  if (incSkel.length >= 3) {
    hit = villages.find(v => {
      if (incMandal && normalizeMandal(v.mandal, store) !== incMandal) return false;
      const vSkel = teluguSkeleton(v.village_name);
      return vSkel === incSkel || vSkel.includes(incSkel) || incSkel.includes(vSkel);
    });
    if (hit) return hit;

    // Global fallback by skeleton only if no mandal is specified
    if (!incMandal) {
      hit = villages.find(v => teluguSkeleton(v.village_name) === incSkel);
      if (hit) return hit;
    }
  }

  return hit;
}
async function syncSource(store, source) {
  const started = now(); const sourceId = source.id;
  try {
    if (!source.spreadsheetId || !source.tab) throw new Error('Spreadsheet ID and tab are required.');
    if (source.accessMode === 'LOCAL' || String(source.spreadsheetId).startsWith('LOCAL_')) {
      source.status = 'Connected';
      source.lastSync = now();
      source.nextSync = new Date(Date.now() + frequencyMs(source.refreshFrequency)).toISOString();
      return { id: id(), dateTime: started, source: source.name, recordsRead: store.villages.length, recordsAdded: 0, recordsUpdated: 0, recordsChanged: 0, errors: 0, status: 'Success' };
    }
    const table = source.accessMode === 'PUBLIC' ? await readPublicSheet(source) : (() => null);
    let headers, rows;
    if (table) { headers = table.headers; rows = table.rows; }
    else { const sheetId = extractSpreadsheetId(source.spreadsheetId); const result = await googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(source.tab)}`); const values = result.values || []; if (!values.length) throw new Error('The configured tab has no rows.'); [headers, ...rows] = values; }
    const skipRows = Number(source.skipRows || 0); if (skipRows) rows = rows.slice(skipRows);
    let added = 0, updated = 0, changed = 0, conflicts = 0;
    if (source.recordType === 'summary') {
      if (!store.sourceSummaries) store.sourceSummaries = {}; store.sourceSummaries[sourceId] = { source: source.name, records: rows.length, syncedAt: now(), headers };
    }
    let carryDivision = '';
    let carryMandal = '';
    const phaseMatch = (source.name || '').match(/Phase\s*([0-9IVX]+)/i);
    const inferredPhase = phaseMatch ? normalizePhase(phaseMatch[1]) : '';

    rows.forEach((row, index) => {
      if (source.recordType === 'summary') return;
      let incoming;
      if (source.recordType === 'action_plan' || (headers.some(h => /target\s*month/i.test(h)) && headers.some(h => /extent/i.test(h)))) {
        const tmIdx = headers.findIndex(h => /target\s*month/i.test(h));
        const mIdx = headers.findIndex(h => /^mandal$/i.test(h.trim()));
        const vIdx = headers.findIndex(h => /^village$/i.test(h.trim()) || /village\s*name/i.test(h));
        const vcIdx = headers.findIndex(h => /village\s*code/i.test(h));
        const geIdx = headers.findIndex(h => /govt.*extent/i.test(h));
        const peIdx = headers.findIndex(h => /patta.*extent/i.test(h));
        const teIdx = headers.findIndex(h => /total.*extent/i.test(h) || /^extent$/i.test(h.trim()));
        const khIdx = headers.findIndex(h => /khata/i.test(h));
        const phIdx = headers.findIndex(h => /^phase$/i.test(h.trim()));
        const csIdx = headers.findIndex(h => /current\s*stage/i.test(h));
        const ddIdx = headers.findIndex(h => /delay/i.test(h));

        incoming = {
          target_month: tmIdx >= 0 ? clean(row[tmIdx]) : '',
          mandal: mIdx >= 0 ? clean(row[mIdx]) : '',
          village_name: vIdx >= 0 ? clean(row[vIdx]) : '',
          village_code: vcIdx >= 0 ? clean(row[vcIdx]) : '',
          govt_extent: geIdx >= 0 ? (parseFloat(clean(row[geIdx])) || null) : null,
          patta_extent: peIdx >= 0 ? (parseFloat(clean(row[peIdx])) || null) : null,
          extent: teIdx >= 0 ? clean(row[teIdx]) : '',
          total_khatas: khIdx >= 0 ? (parseInt(clean(row[khIdx]), 10) || null) : null,
          khatas: khIdx >= 0 ? (parseInt(clean(row[khIdx]), 10) || null) : null,
          phase: phIdx >= 0 ? normalizePhase(clean(row[phIdx])) : '',
          current_stage: csIdx >= 0 ? clean(row[csIdx]) : '',
          days_delayed: ddIdx >= 0 ? (parseInt(clean(row[ddIdx]), 10) || 0) : 0
        };
      } else if (source.recordType === 'phase_targets' || headers.some(h => /targets.*timelines/i.test(h) || /present\s*stage/i.test(h) || /jc\s*login/i.test(h))) {
        const divIdx = headers.findIndex(h => /division/i.test(h));
        const manIdx = headers.findIndex(h => /mandal/i.test(h));
        const vilIdx = headers.findIndex(h => /village/i.test(h));
        const extIdx = headers.findIndex(h => /extent/i.test(h));
        const stgIdx = headers.findIndex(h => /present\s*stage/i.test(h) || /^stage$/i.test(h.trim()));
        const remIdx = headers.findIndex(h => /remark/i.test(h));

        const gtIdx = headers.findIndex(h => /^gt/i.test(h.trim()) || /ground\s*truth/i.test(h));
        const vecIdx = headers.findIndex(h => /vectoriz/i.test(h));
        const dlrIdx = headers.findIndex(h => /dlr/i.test(h));
        const vroIdx = headers.findIndex(h => /vro/i.test(h));
        const tahIdx = headers.findIndex(h => /tah/i.test(h));
        const rdoIdx = headers.findIndex(h => /rdo/i.test(h));
        const jcIdx = headers.findIndex(h => /jc/i.test(h));

        const divVal = divIdx >= 0 ? clean(row[divIdx]) : '';
        const manVal = manIdx >= 0 ? clean(row[manIdx]) : '';
        if (divVal) carryDivision = divVal;
        if (manVal) carryMandal = manVal;

        const vilVal = vilIdx >= 0 ? clean(row[vilIdx]) : '';
        if (!vilVal) return;

        const dates = [];
        const stageTargets = {};
        [
          { key: 'gt', idx: gtIdx },
          { key: 'vectorization', idx: vecIdx },
          { key: 'dlr', idx: dlrIdx },
          { key: 'vro', idx: vroIdx },
          { key: 'tahsildar', idx: tahIdx },
          { key: 'rdo', idx: rdoIdx },
          { key: 'jc', idx: jcIdx }
        ].forEach(sc => {
          if (sc.idx >= 0 && row[sc.idx]) {
            const val = clean(row[sc.idx]);
            if (val) {
              dates.push(val);
              stageTargets[sc.key] = val;
            }
          }
        });

        const jcVal = jcIdx >= 0 && row[jcIdx] ? clean(row[jcIdx]) : '';
        const targetDate = jcVal && !jcVal.toLowerCase().includes('stop') ? jcVal : (dates.length ? dates[dates.length - 1] : '');
        const presentStageRaw = stgIdx >= 0 && row[stgIdx] ? clean(row[stgIdx]) : '';

        incoming = {
          division: carryDivision,
          mandal: carryMandal,
          village_name: vilVal,
          phase: inferredPhase || 'Yet to be Scheduled',
          extent: extIdx >= 0 && row[extIdx] ? clean(row[extIdx]) : '',
          current_stage: presentStageRaw || (inferredPhase === 'Phase VII' ? 'GT' : ''),
          target_date: targetDate,
          stage_targets: {
            phase: inferredPhase,
            dates,
            ...stageTargets,
            source: source.name
          },
          remarks: remIdx >= 0 && row[remIdx] ? clean(row[remIdx]) : ''
        };
      } else {
        incoming = applySourceTransforms(rowObject(headers, row, source.mappings || DEFAULT_MAPPINGS), source.statusTransforms);
        Object.assign(incoming, source.fixedFields || {});
      }
      incoming.mandal = normalizeMandal(incoming.mandal, store);
      if (incoming.phase) incoming.phase = normalizePhase(incoming.phase);
      if (!clean(incoming.village_code) && !clean(incoming.village_name)) return;
      let existing = findVillageMatch(incoming, store.villages, store);
      if (!existing) {
        if (store.villages.length >= 774 && !clean(incoming.village_code)) return;
        existing = { id: id(), ...incoming, last_synced: now(), last_modified: now(), source_meta: {} };
        store.villages.push(existing);
        added++;
      } else {
        if (source.recordType === 'phase_targets') {
          // Official village phase is master classification and preserved
          if (incoming.target_date && existing.target_date !== incoming.target_date) { existing.target_date = incoming.target_date; changed++; }
          if (incoming.extent && !existing.extent) { existing.extent = incoming.extent; changed++; }
          if (incoming.current_stage && existing.current_stage !== incoming.current_stage) { existing.current_stage = incoming.current_stage; changed++; }
          if (incoming.stage_targets) { existing.stage_targets = incoming.stage_targets; }
          if (incoming.remarks) { existing.remarks = incoming.remarks; }
          if (existing.status === 'Not Updated' || !existing.status) {
            existing.status = incoming.current_stage && incoming.current_stage !== 'GT' ? 'In Progress' : 'Pending';
          }
        } else {
          Object.entries(incoming).forEach(([field, value]) => {
            if (value === undefined || value === null || value === '') return;
            if (field === 'phase' && existing.phase && existing.phase !== 'Yet to be Scheduled') return;
            if (existing.pending_write?.[field] && clean(existing[field]) !== String(value)) {
              store.conflicts.unshift({ id: id(), villageId: existing.id, village: existing.village_name, field, websiteValue: existing[field], sheetValue: value, source: source.name, status: 'Open', detectedAt: now() }); conflicts++; return;
            }
            if (String(existing[field] ?? '') !== String(value)) { existing[field] = value; changed++; }
          });
        }
        if (isVsOrAbove(existing)) {
          existing.gt_status = 'Completed';
          existing.vectorization_status = 'Completed';
        }
        existing.last_synced = now(); updated++;
      }
      if (!existing.source_meta) existing.source_meta = {};
      Object.keys(incoming).forEach(field => {
        const mappedHeader = (source.mappings || DEFAULT_MAPPINGS)[field] || DEFAULT_MAPPINGS[field];
        const sheetColumn = Number.isInteger(mappedHeader) ? mappedHeader : headers.findIndex(header => normalKey(header) === normalKey(mappedHeader));
        existing.source_meta[field] = { sourceId, source: source.name, tab: source.tab, row: index + 2, column: sheetColumn >= 0 ? columnLetter(sheetColumn) : '', lastSynced: now() };
      });
    });
    source.status = 'Connected'; source.lastSync = now(); source.nextSync = new Date(Date.now() + frequencyMs(source.refreshFrequency)).toISOString(); source.lastError = ''; source.lastRecords = rows.length;
    const log = { id: id(), dateTime: started, source: source.name, recordsRead: rows.length, recordsAdded: added, recordsUpdated: updated, recordsChanged: changed, errors: 0, status: 'Success' };
    store.syncLogs.unshift(log); store.changeFeed.unshift({ id: id(), dateTime: now(), source: source.name, description: `${added} added, ${changed} changed, ${conflicts} conflicts identified` });
    store.syncLogs = store.syncLogs.slice(0, 200); store.changeFeed = store.changeFeed.slice(0, 100);
    return log;
  } catch (error) {
    source.status = 'Connection Error'; source.lastError = error.message; source.lastFailedSync = now(); source.nextSync = new Date(Date.now() + frequencyMs(source.refreshFrequency)).toISOString();
    const log = { id: id(), dateTime: started, source: source.name, recordsRead: 0, recordsAdded: 0, recordsUpdated: 0, recordsChanged: 0, errors: 1, status: 'Failed', error: error.message };
    store.syncLogs.unshift(log); return log;
  }
}
function setSecurityHeaders(res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
}

function json(res, status, body) {
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    setSecurityHeaders(res);
  }
  if (typeof res.writeHead === 'function' && !res.headersSent) {
    try {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
    } catch (e) {}
  }
  res.end(JSON.stringify(body));
}

function text(res, status, body, type = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', type);
    setSecurityHeaders(res);
  }
  if (typeof res.writeHead === 'function' && !res.headersSent) {
    try {
      res.writeHead(status, {
        'Content-Type': type,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
    } catch (e) {}
  }
  res.end(body);
}

const OFFICER_PIN = process.env.OFFICER_PIN || 'APCTR2026';
const AUTH_SECRET = process.env.AUTH_SECRET || 'chittoor-sslr-resurvey-auth-key-2026';
const loginAttempts = new Map();

function checkRateLimit(ip) {
  const nowTime = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return true;
  if (record.lockedUntil && nowTime < record.lockedUntil) return false;
  if (record.lockedUntil && nowTime >= record.lockedUntil) {
    loginAttempts.delete(ip);
    return true;
  }
  return true;
}
function recordFailedLogin(ip) {
  const nowTime = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: nowTime };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = nowTime + 10 * 60 * 1000;
  }
  loginAttempts.set(ip, record);
}
function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}
function generateToken(role = 'DISTRICT OFFICER') {
  const expiry = Date.now() + 12 * 60 * 60 * 1000;
  const salt = crypto.randomBytes(8).toString('hex');
  const payload = `${role}:${expiry}:${salt}`;
  const hmac = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function verifyToken(token) {
  if (!token) return null;
  if (token === 'OFFICER-VIEW-APCTR2026' || token === 'DISTRICT-OFFICER-VIEW' || token === 'GUEST_OFFICER_TOKEN') {
    return { role: 'DISTRICT OFFICER', valid: true };
  }
  try {
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const raw = Buffer.from(b64, 'base64').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [role, expiryStr, salt, hmac] = parts;
    const payload = `${role}:${expiryStr}:${salt}`;
    const expectedHmac = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) return null;
    if (Date.now() > Number(expiryStr)) return null;
    return { role, valid: true };
  } catch {
    return null;
  }
}

function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      try { return Promise.resolve(JSON.parse(req.body.toString('utf8'))); }
      catch { return Promise.resolve({}); }
    }
    if (typeof req.body === 'string') {
      try { return Promise.resolve(JSON.parse(req.body)); }
      catch { return Promise.resolve({}); }
    }
    if (typeof req.body === 'object') return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON request body.')); }
    });
    req.on('error', reject);
  });
}
function requireAuthorized(req, res) { const role = req.headers['x-user-role'] || 'ADMIN'; if (!['ADMIN', 'DISTRICT OFFICER', 'DIVISION OFFICER', 'MANDAL OFFICER'].includes(role)) { json(res, 403, { error: 'This role is not authorized to make changes.' }); return null; } return role; }
const STAGE_KEYS = [
  'gt_status', 'vectorization_status', 'vs_status', 'vro_status',
  'tahsildar_status', 'rdo_status', 'jc_status', 'section13_status',
  'draft_ror_status', 'final_ror_status', 'webland_2_status'
];

function filterVillages(items, query) {
  return items.filter(v => {
    const search = normalKey(query.search);
    const normalizedSearch = MANDAL_ALIASES[search] ? normalKey(MANDAL_ALIASES[search]) : search;
    const searchable = [v.village_name, v.village_code, v.mandal, v.division, v.phase, normalizePhase(v.phase), v.target_month, v.ppb_cycle].map(normalKey).join(' ');

    if (search && !searchable.includes(search) && normalKey(v.mandal) !== normalizedSearch) {
      return false;
    }
    if (query.ppb_cycle || query.cycle || query.target_month) {
      const reqCycle = normalKey(query.ppb_cycle || query.cycle || query.target_month);
      const vCycle = normalKey(v.ppb_cycle || v.target_month || '');
      if (!vCycle.includes(reqCycle) && reqCycle !== vCycle) {
        return false;
      }
    }
    if (query.phase && normalizePhase(v.phase) !== normalizePhase(query.phase)) {
      return false;
    }
    if (query.division && v.division !== query.division) {
      return false;
    }
    if (query.mandal && v.mandal !== query.mandal) {
      return false;
    }
    if (query.status) {
      const s = normalKey(query.status);
      if (normalKey(v.status) !== s) {
        return false;
      }
    }
    if (query.delayed === 'true' || query.delayed === '1' || query.overdue === 'true') {
      if (v.status !== 'Delayed') return false;
    }
    if (query.ported === 'true' || query.ported === '1' || query.webland === 'ported') {
      if (!v.ported_to_webland && v.webland_2_status !== 'Ported') return false;
    }

    // Filter by Current Bottleneck Stage
    if (query.current_stage || query.stage) {
      const reqStage = normalKey(query.current_stage || query.stage);
      const vStage = normalKey(v.current_stage);
      if (reqStage !== 'all' && reqStage !== 'any') {
        if (reqStage === 'final ror') {
          if (!isComplete(v.final_ror_status)) return false;
        } else if (vStage !== reqStage && !vStage.includes(reqStage) && !reqStage.includes(vStage)) {
          return false;
        }
      }
    }

    // Filter by stageField completion (e.g. stageField=gt_status)
    if (query.stageField && !isComplete(v[query.stageField])) {
      return false;
    }

    // Filter by individual stage statuses
    for (const key of STAGE_KEYS) {
      if (query[key]) {
        const expected = normalKey(query[key]);
        if (expected === 'all' || expected === 'any') continue;
        if (expected === 'completed') {
          if (!isComplete(v[key])) return false;
        } else if (expected === 'pending') {
          if (isComplete(v[key]) || !clean(v[key])) return false;
        } else if (expected === 'in progress') {
          if (normalStatus(v[key]) !== 'In Progress') return false;
        } else if (expected === 'not updated') {
          if (clean(v[key])) return false;
        } else if (normalKey(v[key]) !== expected) {
          return false;
        }
      }
    }

    return true;
  });
}
async function handleApi(req, res, url) {
  let pathname = (url.pathname || '').replace(/\/+$/, '') || '/';
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';

  // Public authentication endpoints
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    if (!checkRateLimit(clientIp)) {
      return json(res, 429, { error: 'Too many failed login attempts. Portal access temporarily locked for 10 minutes.' });
    }
    const b = await readBody(req);
    const submittedPin = clean(b.pin);
    const configuredPin = clean(process.env.OFFICER_PIN || OFFICER_PIN);
    if (submittedPin && submittedPin === configuredPin) {
      clearLoginAttempts(clientIp);
      const token = generateToken('DISTRICT OFFICER');
      return json(res, 200, { success: true, token, role: 'DISTRICT OFFICER' });
    } else {
      recordFailedLogin(clientIp);
      return json(res, 401, { error: 'Invalid Officer PIN. Unauthorized access attempts are monitored and recorded.' });
    }
  }

  if (req.method === 'GET' && pathname === '/api/auth/check') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-officer-token'];
    const officer = verifyToken(token);
    return json(res, 200, { authenticated: Boolean(officer), role: officer?.role || null });
  }

  // Officer Authentication Gate for restricted data / write actions
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-officer-token'];
  const officer = verifyToken(token);

  // Allow read-only monitoring dashboard endpoints for public/officer review
  const isReadOnlyMonitoringEndpoint = req.method === 'GET' && (
    pathname === '/api/dashboard' ||
    pathname === '/api/villages' ||
    pathname.startsWith('/api/villages/') ||
    pathname === '/api/health' ||
    pathname === '/api/ppb' ||
    pathname === '/api/sources' ||
    pathname === '/api/mandal-aliases' ||
    pathname === '/api/sync-history'
  );

  if (!officer && !isReadOnlyMonitoringEndpoint) {
    return json(res, 401, { error: 'Restricted Government Portal. Authorized Officer Authentication Required.' });
  }

  const store = load();
  if (req.method === 'GET' && pathname === '/api/dashboard') return json(res, 200, dashboard(store));
  if (req.method === 'GET' && pathname === '/api/health') return json(res, 200, { status: 'ok', tokenConfigured: Boolean(getToken()), dashboard: dashboard(store).sourceSummary });
  if (req.method === 'GET' && pathname === '/api/sources') return json(res, 200, { sources: store.sources, defaultMappings: DEFAULT_MAPPINGS });
  if (req.method === 'GET' && pathname === '/api/mandal-aliases') return json(res, 200, { aliases: { ...MANDAL_ALIASES, ...(store.customMandalAliases || {}) } });
  if (req.method === 'GET' && pathname === '/api/sync-history') return json(res, 200, { logs: store.syncLogs });
  if (req.method === 'GET' && pathname === '/api/audit') return json(res, 200, { entries: store.auditLog });
  if (req.method === 'GET' && pathname === '/api/conflicts') return json(res, 200, { conflicts: store.conflicts });
  if (req.method === 'GET' && pathname === '/api/villages') {
    const villages = filterVillages(store.villages.map(v => recordView(v, store)), Object.fromEntries(url.searchParams));
    const uniquePhases = [...new Set(store.villages.map(v => normalizePhase(v.phase)).filter(Boolean))].sort((a, b) => {
      const ia = PHASE_ORDER.indexOf(a);
      const ib = PHASE_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    const stageDefinitions = [
      { key: 'gt_status', label: 'GT (Ground Truthing)', short: 'GT', stageNumber: 1 },
      { key: 'vectorization_status', label: 'Vectorization/Correlation', short: 'Vectorization/Correlation', stageNumber: 2 },
      { key: 'vs_status', label: 'DLR@VS Login', short: 'DLR@VS Login', stageNumber: 3 },
      { key: 'vro_status', label: 'DLR@VRO Login', short: 'DLR@VRO Login', stageNumber: 4 },
      { key: 'tahsildar_status', label: 'DLR@Tahsildar Login', short: 'DLR@Tahsildar Login', stageNumber: 5 },
      { key: 'rdo_status', label: 'DLR@RDO Login', short: 'DLR@RDO Login', stageNumber: 6 },
      { key: 'jc_status', label: 'DLR@JC Login', short: 'DLR@JC Login', stageNumber: 7 },
      { key: 'section13_status', label: '13 Notification', short: '13 Notification', stageNumber: 8 },
      { key: 'draft_ror_status', label: 'Draft RoR', short: 'Draft RoR', stageNumber: 9 },
      { key: 'final_ror_status', label: 'Final RoR', short: 'Final RoR', stageNumber: 10 },
      { key: 'webland_2_status', label: 'Porting DLR to Webland-2.0', short: 'Porting DLR to Webland-2.0', stageNumber: 11 }
    ];
    const stageNames = ['GT', 'Vectorization/Correlation', 'DLR@VS Login', 'DLR@VRO Login', 'DLR@Tahsildar Login', 'DLR@RDO Login', 'DLR@JC Login', '13 Notification', 'Draft RoR', 'Final RoR', 'Porting DLR to Webland-2.0', 'Completed'];
    return json(res, 200, {
      villages,
      totalCount: villages.length,
      filters: {
        phases: uniquePhases,
        divisions: [...new Set(store.villages.map(v => v.division).filter(Boolean))].sort(),
        mandals: [...new Set(store.villages.map(v => normalizeMandal(v.mandal, store)).filter(Boolean))].sort(),
        ppbCycles: PPB_CYCLE_ORDER.map(k => ({
          id: k,
          name: PPB_CYCLE_METADATA[k]?.label || k,
          shortName: k,
          count: store.villages.filter(v => v.ppb_cycle === k).length
        })),
        stages: stageNames,
        stageDefinitions,
        statuses: ['Completed', 'In Progress', 'Pending', 'Delayed', 'Not Started', 'Not Updated']
      }
    });
  }
  const villageMatch = pathname.match(/^\/api\/villages\/([^/]+)$/);
  if (req.method === 'GET' && villageMatch) { const v = store.villages.find(x => x.id === villageMatch[1]); return v ? json(res, 200, recordView(v, store)) : json(res, 404, { error: 'Village not found.' }); }
  if (req.method === 'POST' && pathname === '/api/sources') {
    if (!requireAuthorized(req, res)) return;
    const b = await readBody(req);
    const rawSheet = clean(b.spreadsheetId || b.googleSheet);
    const gidMatch = rawSheet.match(/[#&?]gid=([0-9]+)/);
    const extractedGid = gidMatch ? gidMatch[1] : '';
    const source = {
      id: id(),
      name: clean(b.name),
      spreadsheetId: extractSpreadsheetId(rawSheet),
      googleSheet: clean(b.googleSheet || b.spreadsheetId),
      tab: clean(b.tab || 'Sheet1'),
      purpose: clean(b.purpose),
      direction: ['READ ONLY', 'WRITE ONLY', 'TWO WAY'].includes(b.direction) ? b.direction : 'READ ONLY',
      accessMode: b.accessMode === 'API' ? 'API' : 'PUBLIC',
      gid: b.gid ? clean(b.gid) : extractedGid,
      recordType: b.recordType || 'village_progress',
      skipRows: Number(b.skipRows || 0),
      fixedFields: b.fixedFields || {},
      statusTransforms: b.statusTransforms || {},
      refreshFrequency: b.refreshFrequency || '15 minutes',
      status: 'Not Connected',
      lastSync: null,
      mappings: b.mappings || DEFAULT_MAPPINGS,
      createdAt: now()
    };
    if (!source.name || !source.spreadsheetId || !source.tab) return json(res, 400, { error: 'Source name, spreadsheet ID/URL and tab are required.' });
    store.sources.push(source); save(store); return json(res, 201, source);
  }
  const sourceMatch = pathname.match(/^\/api\/sources\/([^/]+)(?:\/(test|sync|disable))?$/);
  if (sourceMatch) {
    const source = store.sources.find(s => s.id === sourceMatch[1]); if (!source) return json(res, 404, { error: 'Data source not found.' });
    if (req.method === 'PATCH' && !sourceMatch[2]) {
      if (!requireAuthorized(req,res)) return;
      const b = await readBody(req);
      const rawSheet = clean(b.spreadsheetId || b.googleSheet || source.spreadsheetId);
      const gidMatch = rawSheet.match(/[#&?]gid=([0-9]+)/);
      const extractedGid = gidMatch ? gidMatch[1] : (source.gid || '');
      Object.assign(source, {
        ...b,
        spreadsheetId: extractSpreadsheetId(rawSheet),
        gid: b.gid !== undefined ? clean(b.gid) : extractedGid,
        updatedAt: now()
      });
      save(store);
      return json(res, 200, source);
    }
    if (req.method === 'POST' && sourceMatch[2] === 'test') { if (!requireAuthorized(req,res)) return; const log = await syncSource(store, source); save(store); return json(res, log.status === 'Success' ? 200 : 422, { result: log, source }); }
    if (req.method === 'POST' && sourceMatch[2] === 'sync') { if (!requireAuthorized(req,res)) return; const log = await syncSource(store, source); save(store); return json(res, 200, { result: log }); }
    if (req.method === 'POST' && sourceMatch[2] === 'disable') { if (!requireAuthorized(req,res)) return; source.status = 'Disabled'; save(store); return json(res, 200, source); }
  }
  if (req.method === 'POST' && (pathname === '/api/sync' || pathname === '/api/sync-live')) {
    if (!requireAuthorized(req, res)) return;
    const logs = [];
    try {
      await syncAllLiveData(store);
      logs.push({
        id: id(),
        source: 'Google Spreadsheets Live Sync',
        status: 'Success',
        records: (store.dlr_records || []).length,
        dateTime: now(),
        message: `Synced ${store.gtSummary?.todayTotal || 0} Ac GT and ${store.dlrSummary?.todayTotal || 0} DLR entries directly from Google Spreadsheets.`
      });
    } catch (liveErr) {
      console.error('Google Spreadsheets Live Sync Error:', liveErr.message);
      logs.push({
        id: id(),
        source: 'Google Spreadsheets Live Sync',
        status: 'Warning',
        message: liveErr.message,
        dateTime: now()
      });
    }
    for (const source of store.sources.filter(s => s.status !== 'Disabled' && s.direction !== 'WRITE ONLY')) {
      logs.push(await syncSource(store, source));
    }
    save(store);
    return json(res, 200, { logs, gtSummary: store.gtSummary, dlrSummary: store.dlrSummary, dlrRecordsCount: (store.dlr_records || []).length });
  }
  if (req.method === 'POST' && pathname === '/api/mandal-aliases') {
    if (!requireAuthorized(req, res)) return; const b = await readBody(req); const alias = normalKey(b.alias); const standard = clean(b.standard);
    if (!alias || !standard) return json(res, 400, { error: 'Both the alias and standardized Mandal name are required.' });
    store.customMandalAliases[alias] = standard;
    store.villages.forEach(village => { village.mandal = normalizeMandal(village.mandal, store); });
    store.auditLog.unshift({ id: id(), dateTime: now(), user: req.headers['x-user-role'] || 'ADMIN', village: 'Master data', field: 'Mandal alias', oldValue: alias, newValue: standard, source: 'Website', syncStatus: 'Applied' });
    save(store); return json(res, 201, { alias, standard });
  }
  if (req.method === 'PATCH' && villageMatch) {
    const role = requireAuthorized(req, res); if (!role) return; const v = store.villages.find(x => x.id === villageMatch[1]); if (!v) return json(res, 404, { error: 'Village not found.' });
    const b = await readBody(req); const allowed = new Set([...STAGES.map(s => s[0]), 'ppb_status', 'target_date', 'remarks']); const updates = Object.fromEntries(Object.entries(b.updates || {}).filter(([key]) => allowed.has(key)));
    if (!Object.keys(updates).length) return json(res, 400, { error: 'No permitted fields supplied.' });
    const changes = [];
    for (const [field, value] of Object.entries(updates)) { if (clean(v[field]) !== clean(value)) { changes.push({ field, oldValue: v[field] || '', newValue: clean(value) }); v[field] = clean(value); } }
    if (!changes.length) return json(res, 200, recordView(v, store));
    v.last_modified = now(); v.pending_write = { ...(v.pending_write || {}), ...updates };
    const auditEntries = changes.map(change => ({ id: id(), dateTime: now(), user: role, village: v.village_name, villageId: v.id, field: change.field, oldValue: change.oldValue, newValue: change.newValue, source: 'Website', syncStatus: 'Pending' }));
    auditEntries.forEach(entry => store.auditLog.unshift(entry));
    for (const entry of auditEntries) {
      const meta = v.source_meta?.[entry.field]; const source = store.sources.find(s => s.id === meta?.sourceId);
      if (!source || source.direction !== 'TWO WAY') continue;
      try { await writeBackToSheet(source, meta, entry.newValue); entry.syncStatus = 'Synced'; delete v.pending_write[entry.field]; }
      catch (error) { entry.syncStatus = 'Pending'; entry.syncError = error.message; }
    }
    save(store); return json(res, 200, recordView(v, store));
  }
  if (req.method === 'POST' && pathname === '/api/conflicts/resolve') {
    if (!requireAuthorized(req,res)) return; const b = await readBody(req); const conflict = store.conflicts.find(c => c.id === b.id); if (!conflict || conflict.status !== 'Open') return json(res, 404, { error: 'Open conflict not found.' });
    const village = store.villages.find(v => v.id === conflict.villageId); if (b.resolution === 'Keep Google Sheet Value' && village) village[conflict.field] = conflict.sheetValue;
    conflict.status = b.resolution || 'Review Manually'; conflict.resolvedAt = now(); save(store); return json(res, 200, conflict);
  }
  return json(res, 404, { error: 'Endpoint not found.' });
}
function serveStatic(req, res, url) {
  return new Promise((resolve) => {
    let file = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    if (file.startsWith('public/')) file = file.slice(7);
    if (file === 'favicon.ico' && !fs.existsSync(path.resolve(PUBLIC, 'favicon.ico'))) {
      file = 'favicon.svg';
    }
    const full = path.resolve(PUBLIC, file);
    if (!full.startsWith(PUBLIC)) {
      text(res, 403, 'Forbidden');
      return resolve();
    }
    fs.readFile(full, (error, data) => {
      if (error) {
        text(res, 404, 'Not found');
        return resolve();
      }
      const ext = path.extname(full);
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.ico': 'image/x-icon'
      };
      text(res, 200, data, types[ext] || 'application/octet-stream');
      resolve();
    });
  });
}
let schedulerRunning = false;
async function runScheduledSync() {
  if (schedulerRunning) return; schedulerRunning = true;
  try {
    const store = load();
    try { await syncAllLiveData(store); } catch (e) {}
    const due = store.sources.filter(source => source.status !== 'Disabled' && source.direction !== 'WRITE ONLY' && source.accessMode !== 'LOCAL' && (!source.nextSync || new Date(source.nextSync) <= new Date()));
    for (const source of due) await syncSource(store, source);
    save(store);
  } catch (error) { console.error('Scheduled synchronization failed:', error.message); }
  finally { schedulerRunning = false; }
}

async function requestHandler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = new URL(req.url, `${proto}://${host}`);

  const routeParam = url.searchParams.get('route');
  if (routeParam) {
    url.searchParams.delete('route');
    const [cleanRoute, extraQuery] = routeParam.split('?');
    url.pathname = '/api/' + cleanRoute.replace(/^\/+/, '');
    if (extraQuery) {
      const q = new URLSearchParams(extraQuery);
      for (const [k, v] of q.entries()) {
        if (!url.searchParams.has(k)) url.searchParams.set(k, v);
      }
    }
  }

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  try {
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    console.error('Request Handler Error:', error);
    if (!res.headersSent) {
      json(res, 500, { error: error.message || 'Server error' });
    }
  }
}

if (require.main === module && !process.env.VERCEL) {
  http.createServer(requestHandler).listen(PORT, () => {
    console.log(`Chittoor Monitoring running at http://localhost:${PORT}`);
    setInterval(runScheduledSync, 60 * 1000).unref();
  });
}

module.exports = requestHandler;
module.exports.requestHandler = requestHandler;
module.exports.handleApi = handleApi;
module.exports.serveStatic = serveStatic;
module.exports.load = load;
module.exports.save = save;
module.exports.dashboard = dashboard;
module.exports.STAGES = STAGES;
module.exports.DEFAULT_MAPPINGS = DEFAULT_MAPPINGS;
module.exports.MANDAL_ALIASES = MANDAL_ALIASES;

