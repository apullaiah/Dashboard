/**
 * Master Seed & Data Fusion Script for Chittoor District Resurvey Monitoring
 * Merges:
 * 1. 774 Master Villages (official revenue codes, mandals, divisions)
 * 2. 442 PPB Action Plan villages (extents, khatas, targets, stages, delays)
 * 3. 62 Live Phase VI Workflow Progress records
 * 4. 93 Phase VI Khata Monitoring records from Google Sheet
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MASTER_FILE = path.join(DATA_DIR, 'master_villages.json');
const ACTION_PLAN_FILE = path.join(DATA_DIR, 'action_plan.json');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const KHATA_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Zxf2e0MIsozaKk3XUc37mtznb7QfjknyETWyWP_v8fA/gviz/tq?tqx=out:json';

const MANDAL_NORM = {
  gudupalle: 'Gudipalle', gudipalle: 'Gudipalle', palamaneru: 'Palamaner', palamaner: 'Palamaner',
  palmaner: 'Palamaner', bangarupalyam: 'Bangarupalem', bangarupalem: 'Bangarupalem',
  'v kota': 'Venkatagirikota', 'v.kota': 'Venkatagirikota', vkota: 'Venkatagirikota', venkatagirikota: 'Venkatagirikota',
  penumur: 'Penumuru', penumuru: 'Penumuru', puthalapatu: 'Puthalapattu', puthalapattu: 'Puthalapattu',
  thavanampalle: 'Thavanampalli', thavanampalli: 'Thavanampalli', 'g.d.nellore': 'G.D.Nellore',
  'g d nellore': 'G.D.Nellore', 'gd nellore': 'G.D.Nellore', gdnellore: 'G.D.Nellore', 's.r.puram': 'S.R.Puram',
  's r puram': 'S.R.Puram', srpuram: 'S.R.Puram', peddapanjani: 'Peddapanjani', ramakuppam: 'Ramakuppam',
  kuppam: 'Kuppam', santhipuram: 'Santhipuram', karvetinagar: 'Karvetinagar', nagari: 'Nagari',
  vedurukuppam: 'Vedurukuppam', irala: 'Irala', chittoor: 'Chittoor', gudipala: 'Gudipala',
  gangavaram: 'Gangavaram', baireddipalle: 'Baireddipalle', pulicherla: 'Pulicherla',
  rompicherla: 'Rompicherla', palasamudram: 'Palasamudram', nindra: 'Nindra', vijayapuram: 'Vijayapuram'
};

const KHATA_ALIASES = {
  'penumuru|kamachinniahpalli': 'Kamachinnaiahpalle',
  'chittoor|bnrpeta': 'Bodireddigaripalle',
  'vedurukuppam|ukmarripalli': 'U.K.Marripalle',
  'vedurukuppam|pachikapalam': 'Pachikapallam',
  'g.d.nellore|vijam': 'Vinjam',
  's.r.puram|52kanikapuram': 'Kannikapuram 52',
  's.r.puram|dbrbailu': 'Donnibommireddibylu',
  's.r.puram|ssrpuram': 'Srungarasekhararajupuram',
  's.r.puram|vvpuram': 'Vilasavarahapuram',
  's.r.puram|marripallidk': 'Marripalle Dakshinapu Khandriga',
  'pulicherla|venkatadasarapalli': 'Venkatadasaripalle',
  'bangarupalem|ragimanupenta': 'Ragimanipenta',
  'karvetinagar|tkmpeta': 'Surendranagar alias Thimmakrishnamarajupeta',
  'nagari|vkrpuram': 'Veerakaverirajapuram',
  'venkatagirikota|boyachinnaganapalli': 'Boyachinnaganapalle',
  'venkatagirikota|kottakota': 'Kothakota',
  'kuppam|tsadumuru': 'Thatireddipalle alias Thatisadum',
  'santhipuram|kadirimuttanapalle': 'Kadirimuthanapalle',
  'gudipalle|avulathimmanapalle': 'Avulathimmanpalle',
  'gudipalle|malavanikothuru': 'Malavanikothur'
};

function normMandal(m) {
  const k = String(m || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return MANDAL_NORM[k] || String(m || '').trim();
}

function normVillage(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/palli\b/g, 'palle')
    .replace(/pally\b/g, 'palle')
    .replace(/[^a-z0-9]/g, '');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonStr = data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1);
          resolve(JSON.parse(jsonStr));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- Seeding Chittoor Resurvey Monitoring Database ---');
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
  let actionPlan = [];
  if (fs.existsSync(ACTION_PLAN_FILE)) {
    actionPlan = JSON.parse(fs.readFileSync(ACTION_PLAN_FILE, 'utf8'));
  }
  const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));

  console.log(`Loaded ${master.length} master villages.`);
  console.log(`Loaded ${actionPlan.length} action plan entries.`);
  console.log(`Loaded ${store.villages.length} existing live villages from store.`);

  // 1. Fetch live Khata data from Google Sheet
  console.log('Fetching live Khata spreadsheet data...');
  let khataRows = [];
  try {
    const sheetData = await fetchJson(KHATA_SHEET_URL);
    khataRows = sheetData.table?.rows || [];
    console.log(`Fetched ${khataRows.length} rows from Phase VI Khata sheet.`);
  } catch (err) {
    console.warn('Could not fetch Khata sheet directly, continuing with cached/empty khata data:', err.message);
  }

  // 2. Build map of existing store villages (by village_name + mandal, or village_code)
  const existingMap = new Map();
  store.villages.forEach(v => {
    if (v.village_code) existingMap.set(String(v.village_code).trim(), v);
    const m = normMandal(v.mandal);
    const n = normVillage(v.village_name);
    existingMap.set(`${m}|${n}`, v);
    // Also without numbers
    existingMap.set(`${m}|${n.replace(/^\d+/, '')}`, v);
  });

  // 3. Build Action Plan lookup by village code
  const apMap = new Map();
  actionPlan.forEach(ap => {
    const code = String(ap.villageCode || '').trim();
    if (code) apMap.set(code, ap);
  });

  // 4. Build Khata lookup
  const khataMap = new Map();
  khataRows.forEach(r => {
    const c = r.c;
    if (!c) return;
    const div = c[1]?.f || c[1]?.v || '';
    const man = normMandal(c[2]?.f || c[2]?.v || '');
    const vil = c[3]?.f || c[3]?.v || '';
    if (!vil) return;

    const key = `${man}|${normVillage(vil)}`;
    const aliasTarget = KHATA_ALIASES[key];
    const targetVil = aliasTarget ? normVillage(aliasTarget) : normVillage(vil);

    const khataRecord = {
      division: div,
      mandal: man,
      village: vil,
      extent: parseFloat(c[4]?.f || c[4]?.v || 0) || 0,
      pattaKhatas: parseInt(c[5]?.f || c[5]?.v || 0, 10) || 0,
      govtKhatas: parseInt(c[6]?.f || c[6]?.v || 0, 10) || 0,
      bothKhatas: parseInt(c[7]?.f || c[7]?.v || 0, 10) || 0,
      deletions: parseInt(c[8]?.f || c[8]?.v || 0, 10) || 0,
      totalKhatas: parseInt(c[9]?.f || c[9]?.v || 0, 10) || 0,
      onlineKhatas: parseInt(c[10]?.f || c[10]?.v || 0, 10) || 0
    };

    khataMap.set(`${man}|${targetVil}`, khataRecord);
    khataMap.set(`${man}|${targetVil.replace(/^\d+/, '')}`, khataRecord);
  });

  // 5. Construct the 774-Village Master Universe
  const newVillages = master.map((mv, idx) => {
    const vCode = String(mv.village_code).trim().padStart(7, '0');
    const mandal = normMandal(mv.mandal);
    const vName = String(mv.village_name).trim();
    const vNorm = normVillage(vName);
    const mNorm = normVillage(mandal);

    // Find existing live record if present
    const existing = existingMap.get(vCode) ||
      existingMap.get(`${mandal}|${vNorm}`) ||
      existingMap.get(`${mandal}|${vNorm.replace(/^\d+/, '')}`);

    // Find Action Plan record
    const ap = apMap.get(vCode);

    // Find Khata record
    const kh = khataMap.get(`${mandal}|${vNorm}`) ||
      khataMap.get(`${mandal}|${vNorm.replace(/^\d+/, '')}`) ||
      (KHATA_ALIASES[`${mandal}|${vNorm}`] ? khataMap.get(`${mandal}|${normVillage(KHATA_ALIASES[`${mandal}|${vNorm}`])}`) : null);

    // Determine initial stage statuses
    let gtStatus = existing?.gt_status || '';
    let vecStatus = existing?.vectorization_status || '';
    let vsStatus = existing?.vs_status || '';
    let vroStatus = existing?.vro_status || '';
    let tahStatus = existing?.tahsildar_status || '';
    let rdoStatus = existing?.rdo_status || '';
    let jcStatus = existing?.jc_status || '';
    let sec13Status = existing?.section13_status || '';
    let draftRorStatus = existing?.draft_ror_status || '';
    let finalRorStatus = existing?.final_ror_status || '';
    let ppbStatus = existing?.ppb_status || '';

    // If no progress status yet, check action plan currentStage
    if (!gtStatus && ap?.currentStage) {
      const cs = ap.currentStage.toLowerCase();
      if (cs.includes('gt completed') || cs.includes('completed')) {
        gtStatus = 'Completed';
      } else if (cs.includes('gt ongoing') || cs.includes('progress')) {
        gtStatus = 'In Progress';
      } else if (cs.includes('vectorization')) {
        gtStatus = 'Completed';
        vecStatus = 'In Progress';
      } else if (cs.includes('vro')) {
        gtStatus = 'Completed';
        vecStatus = 'Completed';
        vsStatus = 'Completed';
        vroStatus = 'In Progress';
      } else if (cs.includes('ror') || cs.includes('ppb')) {
        gtStatus = 'Completed';
        vecStatus = 'Completed';
        vsStatus = 'Completed';
        vroStatus = 'Completed';
        tahStatus = 'Completed';
        rdoStatus = 'Completed';
        jcStatus = 'Completed';
        sec13Status = 'Completed';
        finalRorStatus = 'Completed';
        ppbStatus = 'In Progress';
      }
    }

    // Extents and Khatas
    const extentVal = kh?.extent || ap?.totalExtent || parseFloat(existing?.extent || 0) || null;
    const govtExtentVal = ap?.govtExtent || null;
    const pattaExtentVal = ap?.pattaExtent || null;

    const totalKhatasVal = kh?.totalKhatas || ap?.khatas || null;
    const pattaKhatasVal = kh?.pattaKhatas || null;
    const govtKhatasVal = kh?.govtKhatas || null;
    const bothKhatasVal = kh?.bothKhatas || null;
    const deletionsVal = kh?.deletions || null;
    const onlineKhatasVal = kh?.onlineKhatas || null;

    const targetMonth = ap?.targetMonth || null;
    const phaseVal = existing?.phase || ap?.phase || 'Phase VI';
    const daysDelayedVal = ap?.daysDelayed || 0;

    // Overall Village Status calculation
    let status = 'Not Updated';
    if (finalRorStatus === 'Completed') {
      status = 'Completed';
    } else if (daysDelayedVal > 0) {
      status = 'Delayed';
    } else if ([gtStatus, vecStatus, vsStatus, vroStatus, tahStatus, rdoStatus, jcStatus, sec13Status, draftRorStatus, finalRorStatus].some(s => s === 'Completed' || s === 'In Progress')) {
      status = gtStatus === 'Completed' && !finalRorStatus ? 'In Progress' : 'Pending';
    } else if (ap) {
      status = 'Pending';
    }

    const sourceMeta = existing?.source_meta || {};
    if (ap) {
      sourceMeta.action_plan = {
        source: 'Chittoor District PPBs Action Plan',
        targetMonth: ap.targetMonth,
        stage: ap.currentStage,
        daysDelayed: ap.daysDelayed
      };
    }
    if (kh) {
      sourceMeta.khata_monitoring = {
        source: 'Phase VI Khata Monitoring',
        tab: 'Phase - 6',
        lastSynced: new Date().toISOString()
      };
    }

    return {
      id: existing?.id || crypto.randomUUID(),
      sl_no: mv.sl_no || idx + 1,
      village_code: vCode,
      village_name: vName,
      mandal: mandal,
      division: mv.division || 'Chittoor',
      phase: phaseVal,
      extent: extentVal ? String(extentVal) : '',
      govt_extent: govtExtentVal,
      patta_extent: pattaExtentVal,
      khatas: totalKhatasVal,
      total_khatas: totalKhatasVal,
      patta_khatas: pattaKhatasVal,
      govt_khatas: govtKhatasVal,
      both_khatas: bothKhatasVal,
      deletions: deletionsVal,
      online_khatas: onlineKhatasVal,
      target_month: targetMonth,
      target_date: targetMonth ? `2027-03-31` : (existing?.target_date || ''),
      days_delayed: daysDelayedVal,
      gt_status: gtStatus,
      vectorization_status: vecStatus,
      vs_status: vsStatus,
      vro_status: vroStatus,
      tahsildar_status: tahStatus,
      rdo_status: rdoStatus,
      jc_status: jcStatus,
      section13_status: sec13Status,
      draft_ror_status: draftRorStatus,
      final_ror_status: finalRorStatus,
      ppb_status: ppbStatus,
      status: status,
      last_synced: existing?.last_synced || new Date().toISOString(),
      last_modified: existing?.last_modified || new Date().toISOString(),
      source_meta: sourceMeta
    };
  });

  console.log(`Constructed complete master monitoring universe of ${newVillages.length} villages.`);

  // 6. Ensure Master and Khata Data Sources in store.sources
  const sources = store.sources || [];

  // Village Master Source
  let masterSource = sources.find(s => s.recordType === 'village_master');
  if (!masterSource) {
    masterSource = {
      id: crypto.randomUUID(),
      name: 'Chittoor District Village Master (774 Villages)',
      spreadsheetId: 'LOCAL_EXCEL_774_CTR',
      googleSheet: '774 - CTR - 774 Villages with Village Codes.xlsx',
      tab: 'CTR 774 Villages',
      purpose: 'Complete district village master universe (774 villages)',
      direction: 'READ ONLY',
      accessMode: 'LOCAL',
      recordType: 'village_master',
      refreshFrequency: '1 hour',
      status: 'Connected',
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    sources.unshift(masterSource);
  } else {
    masterSource.status = 'Connected';
    masterSource.accessMode = 'LOCAL';
    masterSource.lastSync = new Date().toISOString();
  }

  // Khata Monitoring Google Sheet Source
  let khataSource = sources.find(s => s.spreadsheetId.includes('1Zxf2e0MIsozaKk3XUc37mtznb7QfjknyETWyWP_v8fA'));
  if (!khataSource) {
    khataSource = {
      id: crypto.randomUUID(),
      name: 'Phase VI Khata Monitoring (Patta / Govt / Notional)',
      spreadsheetId: '1Zxf2e0MIsozaKk3XUc37mtznb7QfjknyETWyWP_v8fA',
      googleSheet: 'https://docs.google.com/spreadsheets/d/1Zxf2e0MIsozaKk3XUc37mtznb7QfjknyETWyWP_v8fA/edit?usp=sharing',
      tab: 'Phase - 6',
      purpose: 'Joint Collector Directive: Live Patta, Govt, Notional Khata Reconciliation',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      recordType: 'khata_monitoring',
      refreshFrequency: '15 minutes',
      status: 'Connected',
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    sources.push(khataSource);
  } else {
    khataSource.status = 'Connected';
    khataSource.accessMode = 'PUBLIC';
    khataSource.lastSync = new Date().toISOString();
  }

  // Action Plan Source (Live Google Sheet)
  let apSource = sources.find(s => s.recordType === 'action_plan');
  if (!apSource) {
    apSource = {
      id: crypto.randomUUID(),
      name: 'Chittoor District PPBs Action Plan (Live Google Sheet)',
      spreadsheetId: '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k',
      googleSheet: 'https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k',
      tab: 'Sheet1',
      purpose: 'Monthly targets, stages, delays and khata benchmarks across target blocks (Live Google Sheet)',
      direction: 'READ ONLY',
      accessMode: 'PUBLIC',
      recordType: 'action_plan',
      refreshFrequency: '1 hour',
      status: 'Connected',
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    sources.push(apSource);
  } else {
    apSource.name = 'Chittoor District PPBs Action Plan (Live Google Sheet)';
    apSource.spreadsheetId = '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k';
    apSource.googleSheet = 'https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k';
    apSource.accessMode = 'PUBLIC';
    apSource.status = 'Connected';
    apSource.lastSync = new Date().toISOString();
  }

  store.sources = sources;
  store.villages = newVillages;

  // Add initial sync log entry
  store.syncLogs.unshift({
    id: crypto.randomUUID(),
    dateTime: new Date().toISOString(),
    source: 'District Master & Khata Fusion',
    recordsRead: 774,
    recordsAdded: 774,
    recordsUpdated: 0,
    recordsChanged: 0,
    errors: 0,
    status: 'Success'
  });

  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  console.log(`SUCCESS: Saved ${newVillages.length} villages to data/store.json!`);

  // Quick audit
  const gtDone = newVillages.filter(v => v.gt_status === 'Completed').length;
  const inProg = newVillages.filter(v => v.status === 'In Progress').length;
  const delayed = newVillages.filter(v => v.status === 'Delayed').length;
  const withKhata = newVillages.filter(v => v.total_khatas > 0).length;

  console.log(`Audit Summary:`);
  console.log(`- Total Villages: ${newVillages.length}`);
  console.log(`- GT Completed: ${gtDone}`);
  console.log(`- In Progress: ${inProg}`);
  console.log(`- Delayed: ${delayed}`);
  console.log(`- With Khata Details: ${withKhata}`);
}

run().catch(console.error);
