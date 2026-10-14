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

async function fetchGviz(sheetId, tabOrGid) {
  let param = '';
  if (tabOrGid !== undefined && tabOrGid !== null && tabOrGid !== '') {
    if (/^\d+$/.test(String(tabOrGid).trim())) {
      param = `&gid=${tabOrGid}`;
    } else {
      param = `&sheet=${encodeURIComponent(tabOrGid)}`;
    }
  }
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${param}`;
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

function parseJurisdiction(raw) {
  if (!raw) return [];
  return raw.split(/(?:^\s*\d+[\.\)]|\s*\d+[\.\)]|(?<=[a-zA-Z\s])\d+(?=[a-zA-Z])|\s*,\s*|\s*;\s*|\n+)/)
    .map(s => s.trim().replace(/^[\d\.\)\s]+/, '').replace(/[\d\.\)\s]+$/, ''))
    .filter(s => s.length > 1 && !/^\d+$/.test(s));
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

async function syncAllLiveData(store) {
  const villages = store.villages || [];

  // 0. Clean data inconsistencies
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

  // Clear ported and legacy stage flags from Phase 5 and 6
  villages.filter(v => v.phase === 'Phase V' || v.phase === 'Phase VI').forEach(v => {
    v.ported_to_webland = false;
    v.webland_2_status = 'Not Started';
    v.blockchain_status = 'Pending';
    v.jc_status = 'Pending';
    v.dlr_active_stage = 'Pending';
    v.final_ror_status = 'Pending';
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

  // 9. Sync Vectorization & Correlation Stages from respective Google Spreadsheets
  const vecRecords = [];
  function addVecRecord(rec) { vecRecords.push(rec); }

  console.log('Fetching Google Spreadsheets Vectorization & Correlation data...');
  // 9a. Phase-5 Vectorization & Correlation
  try {
    const p5Vec = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', 'Vectorization');
    for (let r = 0; r < p5Vec.rows.length; r++) {
      const row = (p5Vec.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[2]); const vName = row[3]; const code = row[4];
      if (/total/i.test(row.join(' ')) || (!vName && !code) || !mandal || /^\d+$/.test(String(vName).trim())) continue;
      if (sno === '' && !code && !vName) continue;
      const govtExtent = cleanNum(row[5]); const pattaExtent = cleanNum(row[6]); const totExtent = cleanNum(row[7]);
      const gtCompDate = row[8] || ''; const khatas = cleanNum(row[9]); const lpms = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]); const today = cleanNum(row[12]); const cumulative = cleanNum(row[13]); const balance = cleanNum(row[14]);
      const targetDate = row[15] || ''; const remarks = row[16] || '';
      addVecRecord({
        id: `p5_vec_${code || r}`, phase: 'Phase V', stage_type: 'Vectorization',
        sno: cleanNum(sno) || r + 1, division, mandal, village_name: vName, village_code: code,
        govt_extent: govtExtent, patta_extent: pattaExtent, total_extent: totExtent,
        gt_completed_date: gtCompDate, khatas, lpms,
        till_yesterday: tillYesterday, today, cumulative, balance, target_date: targetDate, remarks,
        google_link: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit#gid=2048120699'
      });
    }
  } catch (e) { console.error('Error Phase 5 Vectorization:', e.message); }

  try {
    const p5Corr = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', 'Correlation-Area Comparision');
    for (let r = 0; r < p5Corr.rows.length; r++) {
      const row = (p5Corr.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[2]); const vName = row[3]; const code = row[4];
      if (/total/i.test(row.join(' ')) || (!vName && !code) || !mandal || /^\d+$/.test(String(vName).trim()) || /^nil$/i.test(String(sno).trim())) continue;
      const govtExtent = cleanNum(row[5]); const pattaExtent = cleanNum(row[6]); const totExtent = cleanNum(row[7]);
      const gtCompDate = row[8] || ''; const khatas = cleanNum(row[9]); const lpms = cleanNum(row[10]);
      const remarksStage = row[11] || ''; const targetPorting = row[12] || ''; const remarks = row[14] || '';
      addVecRecord({
        id: `p5_corr_${code || r}`, phase: 'Phase V', stage_type: 'Correlation',
        sno: cleanNum(sno) || r + 1, division, mandal, village_name: vName, village_code: code,
        govt_extent: govtExtent, patta_extent: pattaExtent, total_extent: totExtent,
        gt_completed_date: gtCompDate, khatas, lpms,
        till_yesterday: 0, today: 0, cumulative: 0, balance: 0, target_date: targetPorting, remarks: remarksStage || remarks,
        google_link: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit'
      });
    }
  } catch (e) { console.error('Error Phase 5 Correlation:', e.message); }

  // 9b. Phase-6 Vectorization & Correlation
  try {
    const p6Vec = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', 'Vectorization');
    for (let r = 0; r < p6Vec.rows.length; r++) {
      const row = (p6Vec.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[2]); const vName = row[3]; const code = row[4];
      if (/total/i.test(row.join(' ')) || (!vName && !code) || !mandal || /^\d+$/.test(String(vName).trim())) continue;
      if (sno === '' && !code && !vName) continue;
      const govtExtent = cleanNum(row[5]); const pattaExtent = cleanNum(row[6]); const totExtent = cleanNum(row[7]);
      const gtCompDate = row[8] || ''; const khatas = cleanNum(row[9]); const lpms = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]); const today = cleanNum(row[12]); const cumulative = cleanNum(row[13]); const balance = cleanNum(row[14]);
      const targetDate = row[15] || ''; const remarks = row[16] || '';
      addVecRecord({
        id: `p6_vec_${code || r}`, phase: 'Phase VI', stage_type: 'Vectorization',
        sno: cleanNum(sno) || r + 1, division, mandal, village_name: vName, village_code: code,
        govt_extent: govtExtent, patta_extent: pattaExtent, total_extent: totExtent,
        gt_completed_date: gtCompDate, khatas, lpms,
        till_yesterday: tillYesterday, today, cumulative, balance, target_date: targetDate, remarks,
        google_link: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit#gid=563060141'
      });
    }
  } catch (e) { console.error('Error Phase 6 Vectorization:', e.message); }

  try {
    const p6Corr = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', 'Correlation Stage');
    for (let r = 0; r < p6Corr.rows.length; r++) {
      const row = (p6Corr.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[2]); const vName = row[3]; const code = row[4];
      if (/total/i.test(row.join(' ')) || (!vName && !code) || !mandal || /^\d+$/.test(String(vName).trim()) || /^nil$/i.test(String(sno).trim())) continue;
      const govtExtent = cleanNum(row[5]); const pattaExtent = cleanNum(row[6]); const totExtent = cleanNum(row[7]);
      const gtCompDate = row[8] || ''; const khatas = cleanNum(row[9]); const lpms = cleanNum(row[10]);
      const remarksStage = row[11] || ''; const targetPorting = row[12] || ''; const remarks = row[14] || '';
      addVecRecord({
        id: `p6_corr_${code || r}`, phase: 'Phase VI', stage_type: 'Correlation',
        sno: cleanNum(sno) || r + 1, division, mandal, village_name: vName, village_code: code,
        govt_extent: govtExtent, patta_extent: pattaExtent, total_extent: totExtent,
        gt_completed_date: gtCompDate, khatas, lpms,
        till_yesterday: 0, today: 0, cumulative: 0, balance: 0, target_date: targetPorting, remarks: remarksStage || remarks,
        google_link: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit'
      });
    }
  } catch (e) { console.error('Error Phase 6 Correlation:', e.message); }

  // 9c. Phase-4 Vectorization & Correlation
  try {
    const p4Vec = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', 'Vectorization');
    for (let r = 0; r < p4Vec.rows.length; r++) {
      const row = (p4Vec.rows[r].c || []).map(cellVal);
      const sno = row[0]; const division = row[1]; const mandal = normalizeMandal(row[2]); const vName = row[3]; const code = row[4];
      if (/total/i.test(row.join(' ')) || (!vName && !code) || !mandal || /^\d+$/.test(String(vName).trim()) || /^nil$/i.test(String(sno).trim())) continue;
      const govtExtent = cleanNum(row[5]); const pattaExtent = cleanNum(row[6]); const totExtent = cleanNum(row[7]);
      const gtCompDate = row[8] || ''; const khatas = cleanNum(row[9]); const lpms = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]); const today = cleanNum(row[12]); const cumulative = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addVecRecord({
        id: `p4_vec_${code || r}`, phase: 'Phase IV', stage_type: 'Vectorization',
        sno: cleanNum(sno) || r + 1, division, mandal, village_name: vName, village_code: code,
        govt_extent: govtExtent, patta_extent: pattaExtent, total_extent: totExtent,
        gt_completed_date: gtCompDate, khatas, lpms,
        till_yesterday: tillYesterday, today, cumulative, balance, target_date: row[15] || '', remarks: row[16] || '',
        google_link: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit'
      });
    }
  } catch (e) { console.error('Error Phase 4 Vectorization:', e.message); }

  console.log(`Parsed total ${vecRecords.length} Vectorization & Correlation records from Google Spreadsheets.`);
  store.vectorization_records = vecRecords;

  // Apply Vectorization & Correlation records to villages
  const vecMatchedCodes = new Set();
  vecRecords.forEach(r => {
    const v = findVillage(villages, r.village_code, r.village_name, r.mandal, r.phase);
    if (v) {
      vecMatchedCodes.add(String(v.village_code));
      v.gt_status = 'Completed';
      const isDone = (r.balance === 0 && r.cumulative > 0);
      v.vectorization_status = isDone ? 'Completed' : 'In Progress';
      v.vectorization_today = r.today || 0;
      v.vectorization_cumulative = r.cumulative || 0;
      v.vectorization_balance = r.balance || 0;
      v.vectorization_target = (r.cumulative || 0) + (r.balance || 0);
      v.vectorization_target_date = r.target_date || '';
      if (r.lpms) { v.lpms = r.lpms; v.lpms_arrived = r.lpms; }
      if (!v.chalthas) v.chalthas = Math.max(2, Math.round((parseFloat(v.extent) || 500) / 75));

      // If not yet picked up by later DLR officer stages, set current_stage
      if (!v.vs_status || v.vs_status === 'Pending' || v.vs_status === 'Not Started') {
        v.current_stage = 'Vectorization & Correlation';
        v.dlr_active_stage = 'vectorization';
      }
    }
  });

  // Calculate Vectorization Summary
  const vecTodayTotal = vecRecords.reduce((s, r) => s + (Number(r.today) || 0), 0);
  const vecCumulativeTotal = vecRecords.reduce((s, r) => s + (Number(r.cumulative) || 0), 0);
  const vecBalanceTotal = vecRecords.reduce((s, r) => s + (Number(r.balance) || 0), 0);
  const vecTotalEntries = vecRecords.reduce((s, r) => s + ((Number(r.cumulative) || 0) + (Number(r.balance) || 0)), 0);
  const vecCompletedCount = vecRecords.filter(r => r.balance === 0 && r.cumulative > 0).length;
  const vecPendingCount = vecRecords.filter(r => r.balance > 0 || (r.cumulative === 0 && r.balance === 0)).length;

  store.vectorizationSummary = {
    todayTotal: vecTodayTotal,
    cumulativeTotal: vecCumulativeTotal,
    balanceTotal: vecBalanceTotal,
    totalEntries: vecTotalEntries,
    villageCount: vecRecords.length,
    completedVillagesCount: vecCompletedCount,
    pendingVillagesCount: vecPendingCount,
    pctTotal: vecTotalEntries > 0 ? ((vecCumulativeTotal / vecTotalEntries) * 100).toFixed(1) : '0.0',
    lastSynced: new Date().toISOString()
  };

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

  // Ensure all villages with JC login completed or DLR completed are marked as Final ROR, Webland Porting, and Blockchain Tech (Phases 1-4)
  villages.forEach(v => {
    if (v.phase !== 'Phase V' && v.phase !== 'Phase VI') {
      const isJcComplete = v.jc_status === 'Completed' ||
                           v.dlr_active_stage === 'Completed' ||
                           (v.dlr_stages_detail && v.dlr_stages_detail.jc_status && v.dlr_stages_detail.jc_status.status === 'Completed');
      if (isJcComplete) {
        v.final_ror_status = 'Completed';
        const cs = (v.current_stage || '').toLowerCase();
        if (!v.ported_to_webland && !cs.includes('webland') && !cs.includes('blockchain')) {
          v.current_stage = 'Final ROR Completed';
        }
      }
    }
    // Ported to Webland and Blockchain Technology Stage assignments (Phase 1-4)
    if (v.phase !== 'Phase V' && v.phase !== 'Phase VI') {
      if (v.ported_to_webland || v.webland_2_status === 'Ported') {
        if ((v.phase || '').includes('2024') || (v.ppb_cycle || '').includes('Prior')) {
          v.current_stage = 'Block Chain Tech Stage';
          v.blockchain_status = 'Completed';
        } else {
          v.current_stage = 'Webland Porting';
        }
      }
    }
    if (!v.lpms) {
      v.lpms = Number(v.khatas) || Number(v.ppb_target) || Math.round((parseFloat(v.extent) || 500) * 1.25) || 850;
      v.lpms_arrived = v.lpms;
    }
    if (!v.chalthas) {
      v.chalthas = Math.max(2, Math.round((parseFloat(v.extent) || 500) / 75));
    }
  });

  // 12. Fetch GT Daily Sheets
  console.log('Fetching Google Spreadsheets GT data (Phase 5 & 6)...');
  villages.forEach(v => { v.today_gt_extent = 0.00; });

  let p5TodaySum = 0, p5ActiveCount = 0;
  try {
    const p5Table = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '0');
    for (let r = 1; r < p5Table.rows.length; r++) {
      const row = (p5Table.rows[r].c || []).map(cellVal);
      let code = String(row[3] || '').trim();
      if (code === '1060033') code = '1060031';
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
      const v = villages.find(v => String(v.village_code || '').trim() === code && (v.phase === 'Phase V' || !v.phase));
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
        if (today > 0) { p5ActiveCount++; p5TodaySum += today; }

        const isDlr = dlrMatchedIds.has(v.id || v.village_code);
        const isVec = vecMatchedCodes.has(String(v.village_code));
        if (!isDlr && !isVec) {
          if (today > 0 || cum > 0) v.current_stage = 'GT Ongoing';
          else v.current_stage = 'GT Not Started';
        }
      }
    }
  } catch (e) { console.error('Error Phase 5 GT:', e.message); }

  let p6TodaySum = 0, p6ActiveCount = 0;
  try {
    const p6Table = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
    for (let r = 1; r < p6Table.rows.length; r++) {
      const row = (p6Table.rows[r].c || []).map(cellVal);
      let code = String(row[3] || '').trim();
      if (code === '1060033') code = '1060031';
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
      const v = villages.find(v => String(v.village_code || '').trim() === code && (v.phase === 'Phase VI' || v.phase === 'Before 2024' || !v.phase));
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
        if (today > 0) { p6ActiveCount++; p6TodaySum += today; }

        const isDlr = dlrMatchedIds.has(v.id || v.village_code);
        const isVec = vecMatchedCodes.has(String(v.village_code));
        if (!isDlr && !isVec) {
          if (today > 0 || cum > 0) v.current_stage = 'GT Ongoing';
          else v.current_stage = 'GT Not Started';
        }
      }
    }
  } catch (e) { console.error('Error Phase 6 GT:', e.message); }

  // Build DLR Summary
  const byStage = {};
  ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'].forEach(key => {
    const recs = dlrRecords.filter(r => r.login_key === key);
    const today = recs.reduce((s, r) => s + (Number(r.today) || 0), 0);
    const cumulative = recs.reduce((s, r) => s + (Number(r.cumulative) || 0), 0);
    const balance = recs.reduce((s, r) => s + (Number(r.balance) || 0), 0);
    const total = recs.reduce((s, r) => s + (Number(r.total_entries) || 0), 0);
    const pct = total > 0 ? ((cumulative / total) * 100).toFixed(1) : '0.0';
    const names = {
      vs_status: 'Village Surveyor Login (VS Login)',
      vro_status: 'VRO Login (Village Revenue Officer)',
      tahsildar_status: 'Tahsildar Login (Tah Login)',
      rdo_status: 'RDO Login (Revenue Divisional Officer)',
      jc_status: 'JC Login (Joint Collector Approval)'
    };
    byStage[key] = { name: names[key], today, cumulative, balance, total, pct, villageCount: recs.length };
  });

  const allActive = ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'];
  const dlrTodayTotal = allActive.reduce((s, k) => s + byStage[k].today, 0);
  const dlrCumulativeTotal = allActive.reduce((s, k) => s + byStage[k].cumulative, 0);
  const dlrBalanceTotal = allActive.reduce((s, k) => s + byStage[k].balance, 0);
  const dlrTotalEntries = allActive.reduce((s, k) => s + byStage[k].total, 0);
  const dlrBenchmarkDaily = 200;
  const dlrPacePct = dlrBenchmarkDaily > 0 ? ((dlrTodayTotal / dlrBenchmarkDaily) * 100).toFixed(1) : '0.0';
  const dlrPctTotal = dlrTotalEntries > 0 ? ((dlrCumulativeTotal / dlrTotalEntries) * 100).toFixed(1) : '0.0';

  store.dlrSummary = {
    todayTotal: dlrTodayTotal,
    cumulativeTotal: dlrCumulativeTotal,
    balanceTotal: dlrBalanceTotal,
    totalEntries: dlrTotalEntries,
    benchmarkDaily: dlrBenchmarkDaily,
    pacePct: dlrPacePct,
    pctTotal: dlrPctTotal,
    byStage,
    lastSynced: new Date().toISOString()
  };

  const grandTodayGt = Math.round((p5TodaySum + p6TodaySum) * 100) / 100;
  const grandActiveGt = p5ActiveCount + p6ActiveCount;

  const p5v = villages.filter(v => (v.phase || '').includes('V') && !(v.phase || '').includes('VI'));
  const p6v = villages.filter(v => (v.phase || '').includes('VI'));
  const activeGtVillages = [...p5v, ...p6v];

  const cumulativeGtExtent = Math.round(activeGtVillages.reduce((s, v) => s + (parseFloat(v.cumulative_gt_extent) || 0), 0) * 100) / 100;
  const totalGtExtent = Math.round(activeGtVillages.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0) * 100) / 100;
  const balanceGtExtent = Math.round(Math.max(0, totalGtExtent - cumulativeGtExtent) * 100) / 100;
  const completionPctGt = totalGtExtent > 0 ? ((cumulativeGtExtent / totalGtExtent) * 100).toFixed(1) : '0.0';
  const totalRovers = 60;
  const dailyCapacityAc = totalRovers * 25;
  const pacePctGt = dailyCapacityAc > 0 ? ((grandTodayGt / dailyCapacityAc) * 100).toFixed(1) : '0.0';

  store.gtSummary = {
    todayTotal: grandTodayGt,
    cumulativeTotal: cumulativeGtExtent,
    balanceTotal: balanceGtExtent,
    totalExtent: totalGtExtent,
    benchmarkDaily: 25,
    rovers: totalRovers,
    dailyCapacityAc,
    completionPct: completionPctGt,
    pacePct: pacePctGt,
    activeVillagesToday: grandActiveGt,
    lastSynced: new Date().toISOString()
  };

  store.dlr_records = dlrRecords;

  // Sync DIOS and MLSO contacts strictly from Google Spreadsheet
  try {
    await syncContactsFromGoogleSheet(store);
  } catch (e) {
    console.error('Error syncing DIOS & MLSO contacts in syncAllLiveData:', e.message);
  }

  store.lastSync = {
    id: `sync_${Date.now()}`,
    source: 'Google Spreadsheets Live Sync',
    status: 'Success',
    dateTime: new Date().toISOString(),
    recordsProcessed: villages.length,
    dlrRecordsCount: dlrRecords.length,
    gtTodayAc: grandTodayGt,
    dlrTodayEntries: dlrTodayTotal
  };

  // Persist to store.json
  const STORE_PATH = path.join(__dirname, '../data/store.json');
  try {
    if (!fs.existsSync(path.dirname(STORE_PATH))) fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing store.json:', e.message);
  }

  const TMP_STORE = path.join('/tmp', 'store.json');
  try {
    fs.writeFileSync(TMP_STORE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {}

  return store;
}

/**
 * Synchronizes Deputy Inspectors of Survey (DIOS) and Mandal Level Survey Officers (MLSO)
 * phone numbers strictly from the official Contacts Google Spreadsheet (1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk)
 */
async function syncContactsFromGoogleSheet(store) {
  const sheetId = '1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk';
  try {
    // 1. Dy. IOS (gid: 84494485)
    const diosTable = await fetchGviz(sheetId, '84494485');
    if (diosTable && Array.isArray(diosTable.rows) && diosTable.rows.length > 0) {
      const diosMap = {};
      let curDios = null;
      diosTable.rows.forEach(r => {
        const c = (r.c || []).map(cellVal);
        const name = c[1] ? c[1].trim() : '';
        const phone = (c[2] || '').replace(/\D/g, '').slice(-10);
        const division = c[3] ? c[3].trim() : '';
        const mandal = c[4] ? c[4].trim() : '';

        if (name) {
          curDios = {
            name,
            role: 'Deputy Inspector of Survey (DIOS)',
            phone,
            division,
            mandals: []
          };
          diosMap[name] = curDios;
          const parts = name.split('.').map(s => s.trim()).filter(Boolean);
          const spaced = parts.join('. ');
          if (spaced && spaced !== name) {
            diosMap[spaced] = curDios;
          }
        }
        if (curDios && mandal && !curDios.mandals.includes(mandal)) {
          curDios.mandals.push(mandal);
        }
      });
      store.dios = diosMap;
    }

    // 2. MLSOs (gid: 1361756935)
    const mlsoTable = await fetchGviz(sheetId, '1361756935');
    if (mlsoTable && Array.isArray(mlsoTable.rows) && mlsoTable.rows.length > 0) {
      const msMap = {};
      mlsoTable.rows.forEach(r => {
        const c = (r.c || []).map(cellVal);
        const mandal = c[1] ? c[1].trim() : '';
        const name = c[2] ? c[2].trim() : '';
        const phone = (c[3] || '').replace(/\D/g, '').slice(-10);

        if (mandal && name) {
          const entry = {
            name,
            role: 'Mandal Surveyor (MS)',
            phone,
            mandal
          };
          msMap[mandal] = entry;
          const norm = normalizeMandal(mandal);
          if (norm && norm !== mandal) {
            msMap[norm] = entry;
          }
          if (mandal.toLowerCase().includes('chittoor (rural)')) {
            msMap['Chittoor'] = entry;
          }
        }
      });
      store.mandalSurveyors = msMap;
    }

    // 3. Village Surveyors (VS) & Village Jurisdiction (gid: 0)
    const vsTable = await fetchGviz(sheetId, '0');
    if (vsTable && Array.isArray(vsTable.rows) && vsTable.rows.length > 0) {
      const vsList = [];
      const villages = store.villages || [];
      for (let r = 1; r < vsTable.rows.length; r++) {
        const row = (vsTable.rows[r].c || []).map(cellVal);
        const sno = row[0];
        const division = row[2] ? row[2].trim() : '';
        const mandal = normalizeMandal(row[3]);
        const rawJur = row[4] ? row[4].trim() : '';
        const secName = row[5] ? row[5].trim() : '';
        const vsName = row[6] ? row[6].trim() : '';
        const phone = (row[7] || '').replace(/\D/g, '').slice(-10);
        if (!mandal || !vsName) continue;
        const jurVillages = parseJurisdiction(rawJur);
        const vsRecord = {
          sno: cleanNum(sno) || r,
          division,
          mandal,
          secretariat_name: secName,
          secretariat_code: String(11090000 + (r * 17)),
          surveyor_name: vsName,
          name: vsName,
          phone,
          vs_designation: 'Village Surveyor (Grade-II)',
          staff_team: 'Panchayat Secretary · VRO · Digital Asst',
          jurisdiction_raw: rawJur,
          jurisdiction_villages: jurVillages,
          jurisdiction: rawJur,
          status: /suspen/i.test(vsName) ? 'Under Suspension' : 'Active on Field Resurvey'
        };
        vsList.push(vsRecord);

        // Map to villages in store
        jurVillages.forEach(vn => {
          const cleanVn = String(vn).toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanM = String(mandal).toLowerCase().replace(/[^a-z0-9]/g, '');
          const matched = villages.find(v => {
            if (String(normalizeMandal(v.mandal)).toLowerCase().replace(/[^a-z0-9]/g, '') !== cleanM) return false;
            const cv = String(v.village_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return cv === cleanVn || cv.includes(cleanVn) || cleanVn.includes(cv);
          });
          if (matched) {
            matched.vs_name = vsName;
            matched.vs_phone = phone;
            matched.secretariat = secName;
            matched.vs_jurisdiction = rawJur;
            matched.vs_jurisdiction_villages = jurVillages;
          }
        });
      }
      store.villageSurveyors = vsList;
      console.log(`Synced ${vsList.length} Village Surveyors with jurisdictions from Google Spreadsheet.`);
    }
  } catch (err) {
    console.error('Error syncing contacts from Google Sheet:', err.message);
  }
  return store;
}

module.exports = {
  syncAllLiveData,
  syncContactsFromGoogleSheet,
  fetchGviz,
  fetchUrl,
  cleanNum,
  normalizeMandal,
  parseJurisdiction,
  findVillage,
  STAGE_CONFIG
};
