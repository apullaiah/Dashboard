const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchUrl(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 25000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, retries));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: async () => data }));
    });
    req.on('timeout', () => {
      req.abort();
      if (retries > 0) setTimeout(() => resolve(fetchUrl(url, retries - 1)), 2000);
      else reject(new Error('Request timed out after retries'));
    });
    req.on('error', err => {
      if (retries > 0) setTimeout(() => resolve(fetchUrl(url, retries - 1)), 2000);
      else reject(err);
    });
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
  if (c.f !== undefined && c.f !== null) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

function cleanNum(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeMandal(val) {
  if (!val) return '';
  const s = String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s.includes('gangadhara') || s === 'gdnellore' || s.includes('gdnellore')) return 'G.D.Nellore';
  if (s.includes('baireddi') || s.includes('baireddy')) return 'Baireddipalle';
  if (s.includes('bangarupal')) return 'Bangarupalem';
  if (s.includes('penumur')) return 'Penumuru';
  if (s.includes('puthalapat')) return 'Puthalapattu';
  if (s.includes('thavanampall')) return 'Thavanampalli';
  if (s.includes('srpuram') || s.includes('srirangarajapuram')) return 'S.R.Puram';
  if (s.includes('venkatagiri') || s === 'vkota') return 'Venkatagirikota';
  if (s.includes('karvetinagar')) return 'Karvetinagar';
  return val.trim();
}

function findVillage(villages, code, vName, mandal, targetPhase) {
  const c = String(code || '').trim();
  const cleanName = String(vName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normM = normalizeMandal(mandal).toLowerCase();

  // Special overrides
  if ((c === '1054034' || cleanName.includes('krishna')) && (normM.includes('venkatagiri') || normM === 'vkota')) {
    const v = villages.find(v => String(v.village_code) === '1062002');
    if (v) return v;
  }
  if (cleanName.includes('battam') || cleanName.includes('dasaralapalli')) {
    const v = villages.find(v => (String(v.village_code) === '1060031' || String(v.village_code) === '1060033') && (v.phase === 'Phase VI' || Math.abs(parseFloat(v.extent) - 489.41) < 5));
    if (v) return v;
  }
  if (cleanName.includes('muthukur') && cleanName.includes('karasana')) {
    const v = villages.find(v => (String(v.village_code) === '1060033' || String(v.village_code) === '1060031') && Math.abs(parseFloat(v.extent) - 91.45) < 5);
    if (v) return v;
  }
  if (c === '1047028' || cleanName.includes('52kanikapuram') || cleanName.includes('kanikapuram52')) {
    const v = villages.find(v => String(v.village_code) === '1047028');
    if (v) return v;
  }
  if (c === '1045001') {
    const v = villages.find(v => String(v.village_code) === '1045001');
    if (v) return v;
  }

  // Find by code within targetPhase if provided
  if (/^\d{5,8}$/.test(c)) {
    if (targetPhase) {
      const byCodePhase = villages.find(v => String(v.village_code || '').trim() === c && v.phase === targetPhase);
      if (byCodePhase) return byCodePhase;
      return null;
    }
    const byCode = villages.find(v => String(v.village_code || '').trim() === c);
    if (byCode) return byCode;
  }

  // Find by name + mandal within targetPhase if provided
  return villages.find(v => {
    if (targetPhase && v.phase !== targetPhase) return false;
    if (normM && normalizeMandal(v.mandal).toLowerCase() !== normM) return false;
    const vn = String(v.village_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return vn === cleanName || vn.includes(cleanName) || cleanName.includes(vn);
  });
}

const STAGE_CONFIG = {
  vs_status: { key: 'vs_status', shortCode: 'VS', name: 'Village Surveyor Login (VS)', label: '1. Village Surveyor Login (VS)' },
  vro_status: { key: 'vro_status', shortCode: 'VRO', name: 'Village Revenue Officer Login (VRO)', label: '2. Village Revenue Officer Login (VRO)' },
  tahsildar_status: { key: 'tahsildar_status', shortCode: 'TAH', name: 'Tahsildar Login (Tah)', label: '⭐ 3. Tahsildar Login (Tah)' },
  rdo_status: { key: 'rdo_status', shortCode: 'RDO', name: 'Revenue Divisional Officer Login (RDO)', label: '4. Revenue Divisional Officer Login (RDO)' },
  jc_status: { key: 'jc_status', shortCode: 'JC', name: 'Joint Collector Approval Login (JC)', label: '5. Joint Collector Approval Login (JC)' },
  dlr_completed: { key: 'dlr_completed', shortCode: 'COMPLETED', name: 'Final ROR Completed', label: 'Final ROR Completed' }
};

async function testSync() {
  const storePath = path.join(__dirname, '../data/store.json');
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  const villages = store.villages;

  // Clean data inconsistencies
  const v468 = villages.find(v => Math.abs(parseFloat(v.extent) - 489.41) < 5 && v.phase === 'Phase VI');
  if (v468) {
    v468.village_name = 'Battamdoddi Dasaralapalli';
    v468.village_code = '1060031';
  }
  const v395 = villages.find(v => Math.abs(parseFloat(v.extent) - 91.45) < 5 && v.phase === 'Phase VI');
  if (v395) {
    v395.village_name = 'Muthukur Karasanapalli';
    v395.village_code = '1060033';
  }
  const vKanika = villages.find(v => String(v.village_code) === '1047028');
  if (vKanika) {
    vKanika.village_name = '52 Kanikapuram';
    vKanika.ported_to_webland = false;
    vKanika.webland_2_status = 'Not Started';
  }
  const vMuthPanjani = villages.find(v => String(v.village_code) === '1060032');
  if (vMuthPanjani) {
    vMuthPanjani.current_stage = 'GT Ongoing';
    vMuthPanjani.gt_status = 'In Progress';
  }

  // Clear ported flags from Phase 5 and 6
  villages.filter(v => v.phase === 'Phase V' || v.phase === 'Phase VI').forEach(v => {
    v.ported_to_webland = false;
    v.webland_2_status = 'Not Started';
    v.blockchain_status = 'Pending';
  });

  const dlrRecords = [];
  function addDlrRecord(rec) { dlrRecords.push(rec); }

  console.log('Fetching Google Spreadsheets DLR data...');

  // 1. Phase-4 DLR Completed (gid 218111872)
  try {
    const p4Comp = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '218111872');
    for (let r = 0; r < p4Comp.rows.length; r++) {
      const row = (p4Comp.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5];
      if (/total/i.test(row.join(' ')) || !vName) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const totEntries = khatas || 1000;
      addDlrRecord({
        id: `p4_comp_${code || r}`, phase: 'Phase IV', login_key: 'dlr_completed', login_name: 'Final ROR Completed', login_short: 'COMP',
        sno: cleanNum(sno), division, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: '', total_entries: totEntries,
        till_yesterday: totEntries, today: 0, cumulative: totEntries, balance: 0,
        target_date: row[11] || '', mutation_date: row[12] || '', remarks: row[13] || 'DLR Completed',
        google_link: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit#gid=218111872'
      });
    }
  } catch (e) { console.error('Error Phase 4 DLR Completed:', e.message); }

  // 2. Phase-4 VS & VRO (gid 1111910402)
  try {
    const p4Vs = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '1111910402');
    for (let r = 0; r < p4Vs.rows.length; r++) {
      const row = (p4Vs.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4] || 'Baireddipalle'; const code = row[5];
      if (/total/i.test(row.join(' ')) || (!code && !vName)) continue;
      if (sno === '' && !code) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p4_vs_${code || r}`, phase: 'Phase IV', login_key: 'vs_status', login_name: STAGE_CONFIG.vs_status.name, login_short: 'VS',
        sno: cleanNum(sno), division, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[19] || '', remarks: row[20] || '',
        google_link: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit#gid=1111910402'
      });
    }
  } catch (e) { console.error('Error Phase 4 VS:', e.message); }

  // 3. Phase-4 Tah, RDO & JC (gid 182095482)
  try {
    const p4Tah = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '182095482');
    let tier = 'tahsildar';
    for (let r = 0; r < p4Tah.rows.length; r++) {
      const row = (p4Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5];
      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/jc\s*login/i.test(c1) || /jc\s*login/i.test(c0)) { tier = 'jc'; continue; }
      if (isTotalRow) { if (tier === 'tahsildar') tier = 'rdo'; else if (tier === 'rdo') tier = 'jc'; continue; }
      if (!vName && !code) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      const loginKey = tier === 'tahsildar' ? 'tahsildar_status' : (tier === 'rdo' ? 'rdo_status' : 'jc_status');
      addDlrRecord({
        id: `p4_${tier}_${code || r}`, phase: 'Phase IV', login_key: loginKey, login_name: STAGE_CONFIG[loginKey].name, login_short: STAGE_CONFIG[loginKey].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || '', remarks: row[17] || '',
        google_link: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit#gid=182095482'
      });
    }
  } catch (e) { console.error('Error Phase 4 Tah-RDO-JC:', e.message); }

  // 4. Phase-5 DLR Completed (gid 167154929)
  try {
    const p5Comp = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '167154929');
    for (let r = 0; r < p5Comp.rows.length; r++) {
      const row = (p5Comp.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4] || 'Adavikothuru'; const code = row[5] || '1045001';
      if (/total/i.test(row.join(' ')) || (!code && !vName)) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const totEntries = khatas || 1000;
      addDlrRecord({
        id: `p5_comp_${code || r}`, phase: 'Phase V', login_key: 'dlr_completed', login_name: 'Final ROR Completed', login_short: 'COMP',
        sno: cleanNum(sno) || 1, division: division || 'Nagari', dios: row[2] || '', mandal: mandal || 'Nagari',
        village_name: vName, village_code: code, total_extent: totExtent, khatas, lpms, date_entry_started: '',
        total_entries: totEntries, till_yesterday: totEntries, today: 0, cumulative: totEntries, balance: 0,
        target_date: row[11] || '', mutation_date: row[12] || '', remarks: row[13] || 'DLR Completed',
        google_link: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit#gid=167154929'
      });
    }
  } catch (e) { console.error('Error Phase 5 DLR Completed:', e.message); }

  // 5. Phase-5 VS - VRO Login (gid 1329023156)
  try {
    const p5Vs = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
    let tier = 'vs_status';
    for (let r = 0; r < p5Vs.rows.length; r++) {
      const row = (p5Vs.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5];
      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim()) || (row[4] === '12' && c0 === '');
      if (isTotalRow && tier === 'vs_status') { tier = 'vro_status'; continue; }
      if (isTotalRow) continue;
      if (!vName || /division/i.test(c1) || /mandal/i.test(row[3])) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p5_${tier === 'vs_status' ? 'vs' : 'vro'}_${code || r}`, phase: 'Phase V', login_key: tier, login_name: STAGE_CONFIG[tier].name, login_short: STAGE_CONFIG[tier].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || row[17] || '', remarks: row[18] || row[17] || '',
        google_link: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit#gid=1329023156'
      });
    }
  } catch (e) { console.error('Error Phase 5 VS-VRO:', e.message); }

  // 6. Phase-5 Tah-RDO-JC Login (gid 1758823146)
  try {
    const p5Tah = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
    let tier = 'tahsildar_status';
    for (let r = 0; r < p5Tah.rows.length; r++) {
      const row = (p5Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5] || (vName === 'Kothapalle' && mandal === 'Gudipala' ? '1055013' : '');
      const isTotalRow = row.some(val => /^total$/i.test(String(val).trim())) || 
                         (c0 === '' && (row[4] === '11' || row[4] === '4' || row[4] === '2'));
      if (isTotalRow) {
        if (tier === 'tahsildar_status') tier = 'rdo_status';
        else if (tier === 'rdo_status') tier = 'jc_status';
        continue;
      }
      if (!vName || /division/i.test(c1) || /mandal/i.test(row[3])) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p5_${tier}_${code || r}`, phase: 'Phase V', login_key: tier, login_name: STAGE_CONFIG[tier].name, login_short: STAGE_CONFIG[tier].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || '', remarks: row[17] || '',
        google_link: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit#gid=1758823146'
      });
    }
  } catch (e) { console.error('Error Phase 5 Tah-RDO-JC:', e.message); }

  // 7. Phase-6 VS - VRO Login (gid 941359880)
  try {
    const p6Vs = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
    let tier = 'vs_status';
    for (let r = 0; r < p6Vs.rows.length; r++) {
      const row = (p6Vs.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5];
      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim()) || (row[4] === '1' && c0 === '');
      if (isTotalRow && tier === 'vs_status') { tier = 'vro_status'; continue; }
      if (isTotalRow) continue;
      if (!vName || /division/i.test(c1) || /mandal/i.test(row[3])) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p6_${tier === 'vs_status' ? 'vs' : 'vro'}_${code || r}`, phase: 'Phase VI', login_key: tier, login_name: STAGE_CONFIG[tier].name, login_short: STAGE_CONFIG[tier].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || '', remarks: row[17] || '',
        google_link: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit#gid=941359880'
      });
    }
  } catch (e) { console.error('Error Phase 6 VS-VRO:', e.message); }

  // 8. Phase-6 TAH - RDO - JC LOGIN (gid 127310674)
  try {
    const p6Tah = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
    let tier = 'tahsildar_status';
    for (let r = 0; r < p6Tah.rows.length; r++) {
      const row = (p6Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4] || '52 Kanikapuram'; const code = row[5];
      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim()) || (row[4] === '3' && c0 === '');
      if (isTotalRow) continue;
      if (!vName || /division/i.test(c1) || /mandal/i.test(row[3])) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p6_${tier}_${code || r}`, phase: 'Phase VI', login_key: tier, login_name: STAGE_CONFIG[tier].name, login_short: STAGE_CONFIG[tier].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || '', remarks: row[17] || '',
        google_link: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit#gid=127310674'
      });
    }
  } catch (e) { console.error('Error Phase 6 Tah-RDO-JC:', e.message); }

  console.log(`Parsed total ${dlrRecords.length} DLR records.`);

  // 9. Attach Vectorization villages
  const p5VectorizationCodes = ['1049023', '1049001', '1050015', '1050001', '1030004'];
  const p6VectorizationCodes = ['1054015', '1043007', '1021014', '1062007', '1055005', '1064013', '1065009'];

  p5VectorizationCodes.forEach(code => {
    const v = villages.find(v => String(v.village_code) === code && v.phase === 'Phase V');
    if (v) {
      v.gt_status = 'Completed';
      v.vectorization_status = 'In Progress';
      v.current_stage = 'Vectorization';
      v.dlr_active_stage = 'vectorization';
    }
  });

  p6VectorizationCodes.forEach(code => {
    const v = villages.find(v => String(v.village_code) === code && v.phase === 'Phase VI');
    if (v) {
      v.gt_status = 'Completed';
      v.vectorization_status = 'In Progress';
      v.current_stage = 'Vectorization';
      v.dlr_active_stage = 'vectorization';
    }
  });

  // Track all village IDs that are actively in DLR
  const dlrMatchedIds = new Set();

  // 10. Initialize dlr_stages_detail for all villages
  villages.forEach(v => {
    const isPorted = Boolean(v.ported_to_webland);
    const totKhathas = Number(v.khatas) || 1000;
    v.dlr_stages_detail = {
      vs_status: { name: STAGE_CONFIG.vs_status.name, today: 0, tillYesterday: isPorted ? totKhathas : 0, cumulative: isPorted ? totKhathas : 0, balance: isPorted ? 0 : totKhathas, total: totKhathas, status: isPorted ? 'Completed' : 'Pending', targetDate: '' },
      vro_status: { name: STAGE_CONFIG.vro_status.name, today: 0, tillYesterday: isPorted ? totKhathas : 0, cumulative: isPorted ? totKhathas : 0, balance: isPorted ? 0 : totKhathas, total: totKhathas, status: isPorted ? 'Completed' : 'Pending', targetDate: '' },
      tahsildar_status: { name: STAGE_CONFIG.tahsildar_status.name, today: 0, tillYesterday: isPorted ? totKhathas : 0, cumulative: isPorted ? totKhathas : 0, balance: isPorted ? 0 : totKhathas, total: totKhathas, status: isPorted ? 'Completed' : 'Pending', targetDate: '' },
      rdo_status: { name: STAGE_CONFIG.rdo_status.name, today: 0, tillYesterday: isPorted ? totKhathas : 0, cumulative: isPorted ? totKhathas : 0, balance: isPorted ? 0 : totKhathas, total: totKhathas, status: isPorted ? 'Completed' : 'Pending', targetDate: '' },
      jc_status: { name: STAGE_CONFIG.jc_status.name, today: 0, tillYesterday: isPorted ? totKhathas : 0, cumulative: isPorted ? totKhathas : 0, balance: isPorted ? 0 : totKhathas, total: totKhathas, status: isPorted ? 'Completed' : 'Pending', targetDate: '' }
    };
  });

  // 11. Apply DLR records to villages
  dlrRecords.forEach(r => {
    const v = findVillage(villages, r.village_code, r.village_name, r.mandal, r.phase);
    if (!v) {
      console.warn(`Could not find village for DLR record: ${r.village_name} (${r.village_code}) [${r.mandal}, ${r.phase}]`);
      return;
    }

    dlrMatchedIds.add(v.id || v.village_code);

    const isStageDone = (r.balance === 0 && r.cumulative > 0) || (r.total_entries > 0 && r.cumulative >= r.total_entries);
    const stageStatus = isStageDone ? 'Completed' : 'In Progress';

    if (v.dlr_stages_detail && v.dlr_stages_detail[r.login_key]) {
      v.dlr_stages_detail[r.login_key] = {
        name: STAGE_CONFIG[r.login_key] ? STAGE_CONFIG[r.login_key].name : r.login_name,
        today: r.today,
        tillYesterday: r.till_yesterday,
        cumulative: r.cumulative,
        balance: r.balance,
        total: r.total_entries,
        status: stageStatus,
        targetDate: r.target_date,
        remarks: r.remarks
      };
    }

    v[r.login_key] = stageStatus;
    if (r.lpms) { v.lpms = r.lpms; v.lpms_arrived = r.lpms; }
    if (r.cumulative > 0) {
      v.dlr_entries_cumulative = r.cumulative;
      v.dlr_entries_balance = r.balance;
    }

    // Cascade stage completions & set current_stage
    if (r.login_key === 'dlr_completed') {
      ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'].forEach(k => {
        v[k] = 'Completed';
        if (v.dlr_stages_detail[k]) v.dlr_stages_detail[k].status = 'Completed';
      });
      v.section13_status = 'Completed';
      v.final_ror_status = 'Completed';
      v.current_stage = 'Final ROR Completed';
      v.dlr_active_stage = 'Completed';
    } else if (r.login_key === 'jc_status') {
      ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status'].forEach(k => {
        v[k] = 'Completed';
        if (v.dlr_stages_detail[k]) v.dlr_stages_detail[k].status = 'Completed';
      });
      if (isStageDone) {
        v.jc_status = 'Completed';
        v.final_ror_status = 'Completed';
        v.current_stage = 'Final ROR Completed';
      } else {
        v.jc_status = 'In Progress';
        v.current_stage = 'Joint Collector Login (JC)';
      }
    } else if (r.login_key === 'rdo_status') {
      ['vs_status', 'vro_status', 'tahsildar_status'].forEach(k => {
        v[k] = 'Completed';
        if (v.dlr_stages_detail[k]) v.dlr_stages_detail[k].status = 'Completed';
      });
      v.rdo_status = stageStatus;
      v.current_stage = 'Revenue Divisional Officer Login (RDO)';
    } else if (r.login_key === 'tahsildar_status') {
      ['vs_status', 'vro_status'].forEach(k => {
        v[k] = 'Completed';
        if (v.dlr_stages_detail[k]) v.dlr_stages_detail[k].status = 'Completed';
      });
      v.tahsildar_status = stageStatus;
      v.current_stage = 'Tahsildar Login (Tah)';
    } else if (r.login_key === 'vro_status') {
      v.vs_status = 'Completed';
      if (v.dlr_stages_detail.vs_status) v.dlr_stages_detail.vs_status.status = 'Completed';
      v.vro_status = stageStatus;
      v.current_stage = 'Village Revenue Officer Login (VRO)';
    } else if (r.login_key === 'vs_status') {
      v.vectorization_status = 'Completed';
      v.vs_status = stageStatus;
      v.current_stage = 'Village Surveyor Login (VS)';
    }
  });

  // 12. Fetch GT Daily Sheets
  console.log('Fetching Google Spreadsheets GT data (Phase 5 & 6)...');
  villages.forEach(v => { v.today_gt_extent = 0.00; });

  try {
    const p5Table = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '0');
    for (let r = 1; r < p5Table.rows.length; r++) {
      const row = (p5Table.rows[r].c || []).map(cellVal);
      let code = String(row[3] || '').trim();
      if (!/^\d{5,8}$/.test(code)) continue;
      const rovers = cleanNum(row[8]);
      const teams = cleanNum(row[9]);
      const startDate = row[12];
      const tillYest = cleanNum(row[14]);
      const today = cleanNum(row[15]);
      const cum = cleanNum(row[16]);
      const bal = cleanNum(row[17]);
      const compDate = row[18];
      const isComp = /yes/i.test(row[19]) || Boolean(compDate) || (bal === 0 && cum > 0);
      const v = villages.find(v => String(v.village_code || '').trim() === code && v.phase === 'Phase V');
      if (v) {
        v.gt_rovers = rovers || v.gt_rovers || 0;
        v.gt_teams = teams || v.gt_teams || 0;
        v.gt_start_date = startDate || v.gt_start_date || '';
        v.gt_completed_date = compDate || v.gt_completed_date || '';
        v.gt_extent_till_yesterday = tillYest;
        v.today_gt_extent = today;
        v.cumulative_gt_extent = cum;
        v.balance_gt_extent = bal;
        if (isComp) v.gt_status = 'Completed';
        else if (today > 0 || cum > 0) v.gt_status = 'In Progress';
        
        // Only set current_stage if village is NOT in DLR and NOT in Vectorization
        const isDlr = dlrMatchedIds.has(v.id || v.village_code);
        const isVec = p5VectorizationCodes.includes(String(v.village_code));
        if (!isDlr && !isVec) {
          if (today > 0 || cum > 0) v.current_stage = 'GT Ongoing';
          else v.current_stage = 'GT Not Started';
        }
      }
    }
  } catch (e) { console.error('Error Phase 5 GT:', e.message); }

  try {
    const p6Table = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
    for (let r = 1; r < p6Table.rows.length; r++) {
      const row = (p6Table.rows[r].c || []).map(cellVal);
      let code = String(row[3] || '').trim();
      if (!/^\d{5,8}$/.test(code)) continue;
      const teamNames = row[5];
      const teamMobiles = row[6];
      const rovers = cleanNum(row[10]);
      const teams = cleanNum(row[11]);
      const startDate = row[14];
      const tillYest = cleanNum(row[16]);
      const today = cleanNum(row[17]);
      const cum = cleanNum(row[18]);
      const bal = cleanNum(row[19]);
      const compDate = row[20];
      const isComp = /yes/i.test(row[21]) || Boolean(compDate) || (bal === 0 && cum > 0);
      const v = villages.find(v => String(v.village_code || '').trim() === code && v.phase === 'Phase VI');
      if (v) {
        v.gt_team_names = teamNames || v.gt_team_names || '';
        v.gt_team_mobiles = teamMobiles || v.gt_team_mobiles || '';
        v.gt_rovers = rovers || v.gt_rovers || 0;
        v.gt_teams = teams || v.gt_teams || 0;
        v.gt_start_date = startDate || v.gt_start_date || '';
        v.gt_completed_date = compDate || v.gt_completed_date || '';
        v.gt_extent_till_yesterday = tillYest;
        v.today_gt_extent = today;
        v.cumulative_gt_extent = cum;
        v.balance_gt_extent = bal;
        if (isComp) v.gt_status = 'Completed';
        else if (today > 0 || cum > 0) v.gt_status = 'In Progress';
        
        // Only set current_stage if village is NOT in DLR and NOT in Vectorization
        const isDlr = dlrMatchedIds.has(v.id || v.village_code);
        const isVec = p6VectorizationCodes.includes(String(v.village_code));
        if (!isDlr && !isVec) {
          if (today > 0 || cum > 0) v.current_stage = 'GT Ongoing';
          else v.current_stage = 'GT Not Started';
        }
      }
    }
  } catch (e) { console.error('Error Phase 6 GT:', e.message); }

  // 13. Audit and verify counts
  console.log('\n--- VERIFICATION OF STAGE COUNTS ---');
  const p5Villages = villages.filter(v => v.phase === 'Phase V');
  const p5StageCounts = {};
  p5Villages.forEach(v => {
    p5StageCounts[v.current_stage] = (p5StageCounts[v.current_stage] || 0) + 1;
  });
  console.log('Phase 5 (Total ' + p5Villages.length + '):', JSON.stringify(p5StageCounts, null, 2));

  const p6Villages = villages.filter(v => v.phase === 'Phase VI');
  const p6StageCounts = {};
  p6Villages.forEach(v => {
    p6StageCounts[v.current_stage] = (p6StageCounts[v.current_stage] || 0) + 1;
  });
  console.log('Phase 6 (Total ' + p6Villages.length + '):', JSON.stringify(p6StageCounts, null, 2));

  // Write store
  store.dlr_records = dlrRecords;
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  console.log('\nSuccessfully saved updated store.json');
}

testSync().catch(err => {
  console.error('Fatal error in testSync:', err);
});
