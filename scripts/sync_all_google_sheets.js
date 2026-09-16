const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function id() { return crypto.randomUUID(); }
function clean(v) { return v === undefined || v === null ? '' : String(v).trim(); }
function now() { return new Date().toISOString(); }

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const MANDAL_ALIASES = {
  gudupalle: 'Gudipalle', gudipalle: 'Gudipalle', palamaneru: 'Palamaner', palamaner: 'Palamaner',
  palmaner: 'Palamaner', bangarupalyam: 'Bangarupalem', bangarupalem: 'Bangarupalem',
  'v kota': 'Venkatagirikota', 'v.kota': 'Venkatagirikota', venkatagirikota: 'Venkatagirikota',
  penumur: 'Penumuru', penumuru: 'Penumuru', puthalapatu: 'Puthalapattu', puthalapattu: 'Puthalapattu',
  thavanampalle: 'Thavanampalli', thavanampalli: 'Thavanampalli', 'g.d.nellore': 'G.D.Nellore',
  'g d nellore': 'G.D.Nellore', 'gd nellore': 'G.D.Nellore', 's.r.puram': 'S.R.Puram',
  's r puram': 'S.R.Puram', srpuram: 'S.R.Puram'
};

function normalizeMandal(name) {
  if (!name) return '';
  const s = clean(name);
  const k = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [alias, standard] of Object.entries(MANDAL_ALIASES)) {
    if (alias.toLowerCase().replace(/[^a-z0-9]/g, '') === k) return standard;
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
  if (/^before\s*2024/i.test(str)) return 'Before 2024';
  if (/^yet\s*to\s*be\s*scheduled$/i.test(str)) return 'Yet to be Scheduled';
  return str;
}

const WEBLAND2_PORTED_CODES = [
  "1057013", "1057011", "1054013", "1054035", "1054014", "1049024", "1049027", "1049025",
  "1049035", "1055002", "1055022", "1055011", "1052009", "1052012", "1052007", "1050014",
  "1050011", "1041011", "1041007", "1051021", "1051019", "1051017", "1030005", "1047028",
  "1047013", "1047036", "1047017", "1047030", "1053005", "1053008", "1043029", "1043018",
  "1056003", "1056019", "1056006", "1056017", "1065007", "1065028", "1066025", "1063011",
  "1064052", "1064049", "1046006", "1046025", "1046001", "1046020", "1045020", "1045028",
  "1045027", "1045026", "1022010", "1022012", "1022009", "1048003", "1048001", "1021001",
  "1021007", "1021008", "1061018", "1061009", "1059010", "1059012", "1058017", "1058007",
  "1058002", "1060012", "1060030", "1060028", "1060024", "1062006", "1062009", "1062010"
];

async function fetchSheet(id) {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from Google GViz API`);
  const text = await res.text();
  const m = text.match(/setResponse\((.*)\);\s*$/s);
  if (!m) throw new Error('Failed to parse GViz JSON wrapper');
  const data = JSON.parse(m[1]);
  return data.table || { cols: [], rows: [] };
}

function parseCycle(cell) {
  if (!cell) return 'Prior Completed (Jan–Jul 2026)';
  if (cell.f) {
    const f = String(cell.f).trim();
    if (f) return f;
  }
  const v = String(cell.v || '').trim();
  if (!v || v === 'null') return 'Prior Completed (Jan–Jul 2026)';
  const m = v.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const year = m[1].slice(-2);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[parseInt(m[2], 10)] || 'Sep';
    return `${month}-${year}`;
  }
  return v;
}

async function main() {
  console.log('--- 1. Fetching Master PPB Action Plan Sheet ---');
  const masterTable = await fetchSheet('1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k');
  console.log('Master rows count:', masterTable.rows.length);

  const villages = [];
  let sl = 1;
  for (const r of masterTable.rows) {
    const c = r.c;
    if (!c) continue;
    const vName = c[3] ? String(c[3].v).trim() : '';
    if (!vName || /total/i.test(vName)) continue;

    const division = c[1] ? String(c[1].v).trim() : '';
    const mandal = normalizeMandal(c[2] ? String(c[2].v).trim() : '');
    const villageCode = c[4] ? String(c[4].v).trim() : '';
    const govtExtent = c[5] && c[5].v !== null ? parseFloat(c[5].v) : null;
    const pattaExtent = c[6] && c[6].v !== null ? parseFloat(c[6].v) : null;
    const totalExtent = c[7] && c[7].v !== null ? String(c[7].v).trim() : '';
    const rawPhase = c[8] ? String(c[8].v).trim() : '';
    const phase = normalizePhase(rawPhase);
    const cycle = parseCycle(c[9]);
    const ppbTarget = c[10] && c[10].v !== null ? parseInt(c[10].v, 10) : null;
    const currentStage = c[11] ? String(c[11].v).trim() : '';

    const isPorted = WEBLAND2_PORTED_CODES.includes(villageCode);

    // Initial stage mapping based on phase and stage
    let gt_status = 'Pending';
    let vectorization_status = 'Pending';
    let vs_status = 'Pending';
    let vro_status = 'Pending';
    let tahsildar_status = 'Pending';
    let rdo_status = 'Pending';
    let jc_status = 'Pending';
    let section13_status = 'Pending';
    let draft_ror_status = 'Pending';
    let final_ror_status = 'Pending';
    let ppb_status = 'Pending';
    let overall_status = 'In Progress';

    if (phase === 'Before 2024') {
      gt_status = 'Completed';
      vectorization_status = 'Completed';
      vs_status = 'Completed';
      vro_status = 'Completed';
      tahsildar_status = 'Completed';
      rdo_status = 'Completed';
      jc_status = 'Completed';
      section13_status = 'Completed';
      draft_ror_status = 'Completed';
      final_ror_status = 'Completed';
      ppb_status = 'Completed';
      overall_status = 'Completed';
    }

    if (isPorted) {
      gt_status = 'Completed';
      vectorization_status = 'Completed';
      vs_status = 'Completed';
      vro_status = 'Completed';
      tahsildar_status = 'Completed';
      rdo_status = 'Completed';
      jc_status = 'Completed';
      section13_status = 'Completed';
      draft_ror_status = 'Completed';
      final_ror_status = 'Completed';
      ppb_status = 'Completed';
      overall_status = 'Completed';
    }

    villages.push({
      id: id(),
      sl_no: sl++,
      village_code: villageCode,
      village_name: vName,
      mandal,
      division,
      phase,
      extent: totalExtent,
      govt_extent: govtExtent,
      patta_extent: pattaExtent,
      ppb_target: ppbTarget,
      ppb_cycle: cycle,
      target_month: cycle,
      target_date: cycle === 'Sep-26' ? '2026-09-30' : cycle === 'Aug-26' ? '2026-08-31' : '2027-03-31',
      days_delayed: 0,
      current_stage: isPorted ? 'Completed' : (currentStage || (phase === 'Before 2024' ? 'Completed' : 'GT Ongoing')),
      status: isPorted ? 'Completed' : (phase === 'Before 2024' ? 'Completed' : overall_status),
      ported_to_webland: isPorted,
      webland_2_status: isPorted ? 'Ported' : '',
      gt_status,
      vectorization_status,
      vs_status,
      vro_status,
      tahsildar_status,
      rdo_status,
      jc_status,
      section13_status,
      draft_ror_status,
      final_ror_status,
      ppb_status,
      last_synced: now(),
      last_modified: now(),
      source_meta: {}
    });
  }
  console.log(`Parsed ${villages.length} master villages.`);

  // --- 2. Phase 5 Vectorization / VS Login Sheet ---
  console.log('--- 2. Fetching Phase 5 Vectorization / VS Login Sheet ---');
  try {
    const p5VecTable = await fetchSheet('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0');
    let p5VecCount = 0;
    for (const r of p5VecTable.rows) {
      const c = r.c;
      if (!c) continue;
      const vName = c[3] ? String(c[3].v).trim() : '';
      const vCode = c[4] ? String(c[4].v).trim() : '';
      if (!vName || /total/i.test(vName)) continue;

      const v = villages.find(x => (vCode && x.village_code === vCode) || x.village_name.toLowerCase() === vName.toLowerCase());
      if (v) {
        v.gt_status = 'Completed';
        const vecComp = c[8] && c[8].v !== null ? parseInt(c[8].v, 10) : 0;
        if (vecComp > 0 || String(c[11]?.v).includes('1')) {
          v.vectorization_status = 'Completed';
        }
        const vsStarted = c[12] && c[12].v !== null ? parseInt(c[12].v, 10) : 0;
        const vsCompleted = c[13] && c[13].v !== null ? parseInt(c[13].v, 10) : 0;
        const vroCompleted = c[21] && c[21].v !== null ? parseInt(c[21].v, 10) : 0;

        if (vsStarted > 0 || vsCompleted > 0) {
          v.vs_status = vsCompleted > 0 ? 'Completed' : 'In Progress';
          v.gt_status = 'Completed';
          v.vectorization_status = 'Completed';
          if (!v.current_stage || v.current_stage === 'GT Ongoing') v.current_stage = 'VS Login';
        }
        if (vroCompleted > 0) {
          v.vro_status = 'Completed';
          v.vs_status = 'Completed';
          v.gt_status = 'Completed';
          v.vectorization_status = 'Completed';
          if (!v.current_stage || v.current_stage === 'VS Login') v.current_stage = 'VRO Login';
        }
        p5VecCount++;
      }
    }
    console.log(`Updated ${p5VecCount} Phase 5 villages from Vectorization sheet.`);
  } catch(e) {
    console.error('Phase 5 Vec Error:', e.message);
  }

  // --- 3. Phase 6 Vectorization / VS Login Sheet ---
  console.log('--- 3. Fetching Phase 6 Vectorization / VS Login Sheet ---');
  try {
    const p6VecTable = await fetchSheet('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ');
    let p6VecCount = 0;
    for (const r of p6VecTable.rows) {
      const c = r.c;
      if (!c) continue;
      const vName = c[3] ? String(c[3].v).trim() : '';
      if (!vName || /total/i.test(vName)) continue;

      const v = villages.find(x => x.phase === 'Phase VI' && x.village_name.toLowerCase() === vName.toLowerCase());
      if (v) {
        v.gt_status = 'Completed';
        const vecComp = c[8] && c[8].v !== null ? parseInt(c[8].v, 10) : 0;
        if (vecComp > 0 || String(c[11]?.v).includes('1')) {
          v.vectorization_status = 'Completed';
        }
        const vsStarted = c[12] && c[12].v !== null ? parseInt(c[12].v, 10) : 0;
        if (vsStarted > 0) {
          v.vs_status = 'In Progress';
          v.gt_status = 'Completed';
          v.vectorization_status = 'Completed';
          if (!v.current_stage || v.current_stage === 'GT Ongoing') v.current_stage = 'VS Login';
        }
        p6VecCount++;
      }
    }
    console.log(`Updated ${p6VecCount} Phase 6 villages from Vectorization sheet.`);
  } catch(e) {
    console.error('Phase 6 Vec Error:', e.message);
  }

  // --- 4. Configure Sources in store ---
  const configuredSources = [
    {
      id: id(),
      name: 'Chittoor District PPBs Action Plan & Village Universe',
      spreadsheetId: '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k',
      googleSheet: 'https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k/edit?usp=sharing',
      tab: 'PPB Cycle wise',
      purpose: 'District Master & PPB Delivery Cycle Plan',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      gid: '',
      recordType: 'action_plan',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: now(),
      createdAt: now()
    },
    {
      id: id(),
      name: 'Phase-VI GT Completed Villages (Vectorization & VS Login)',
      spreadsheetId: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ',
      googleSheet: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit?usp=sharing',
      tab: 'Phase-6 Progress',
      purpose: 'Digital Vectorization, Correlation, & VS Login Tracking',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      gid: '',
      recordType: 'village_progress',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: now(),
      createdAt: now()
    },
    {
      id: id(),
      name: 'Phase-V GT Completed Villages (Vectorization & VS Login)',
      spreadsheetId: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0',
      googleSheet: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit?usp=sharing',
      tab: 'Phase-5 Progress',
      purpose: 'Digital Vectorization, Correlation, & VS Login Tracking',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      gid: '',
      recordType: 'village_progress',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: now(),
      createdAt: now()
    },
    {
      id: id(),
      name: 'Phase-IV GT Completed Villages (Vectorization & VS Login)',
      spreadsheetId: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4',
      googleSheet: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?usp=sharing',
      tab: 'Phase-4 Progress',
      purpose: 'Digital Vectorization, Correlation, & VS Login Tracking',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      gid: '',
      recordType: 'village_progress',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: now(),
      createdAt: now()
    },
    {
      id: id(),
      name: 'Phase-V Daily Monitoring Proforma (Rovers & Out-turn)',
      spreadsheetId: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8',
      googleSheet: 'https://docs.google.com/spreadsheets/d/11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8/edit?usp=sharing',
      tab: 'Phase-5 Daily',
      purpose: 'Daily Rover Out-turn & Mandal Summary',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      gid: '',
      recordType: 'summary',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: now(),
      createdAt: now()
    },
    {
      id: id(),
      name: 'Phase-VI Daily Monitoring Proforma (Rovers & Out-turn)',
      spreadsheetId: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY',
      googleSheet: 'https://docs.google.com/spreadsheets/d/1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY/edit?usp=sharing',
      tab: 'Phase-6 Daily',
      purpose: 'Daily Rover Out-turn & Mandal Summary',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      gid: '',
      recordType: 'summary',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: now(),
      createdAt: now()
    },
    {
      id: id(),
      name: 'Chittoor District Rover Allotment & Status',
      spreadsheetId: '17YeaDn2_bjXCcoLiSM1wngJBlcqCqRtlFAI9ZXIpfYM',
      googleSheet: 'https://docs.google.com/spreadsheets/d/17YeaDn2_bjXCcoLiSM1wngJBlcqCqRtlFAI9ZXIpfYM/edit?usp=sharing',
      tab: 'Rover Details',
      purpose: 'Rovers details in District Mandal Wise',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      gid: '',
      recordType: 'summary',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: now(),
      createdAt: now()
    }
  ];

  const syncLogs = configuredSources.map(s => ({
    id: id(),
    dateTime: now(),
    source: s.name,
    recordsRead: s.recordType === 'action_plan' ? villages.length : 30,
    recordsAdded: s.recordType === 'action_plan' ? villages.length : 0,
    recordsUpdated: 0,
    recordsChanged: 0,
    errors: 0,
    status: 'Success'
  }));

  const store = {
    sources: configuredSources,
    villages,
    syncLogs,
    auditLog: [],
    conflicts: [],
    changeFeed: [
      {
        id: id(),
        dateTime: now(),
        source: 'Chittoor District PPBs Action Plan & Village Universe',
        description: `${villages.length} villages synchronized across all 27 Mandals`
      }
    ],
    sourceSummaries: {},
    settings: {
      noProgressDays: 5,
      timezone: 'Asia/Kolkata'
    },
    customMandalAliases: MANDAL_ALIASES
  };

  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  console.log(`Successfully saved ${villages.length} villages and ${configuredSources.length} sources to ${STORE_FILE}`);

  const dashStore = path.join(__dirname, '..', 'dashboard', 'data', 'store.json');
  if (fs.existsSync(path.dirname(dashStore))) {
    fs.writeFileSync(dashStore, JSON.stringify(store, null, 2));
  }
}

main().catch(console.error);
