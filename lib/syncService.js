const fs = require('fs');
const path = require('path');
const https = require('https');

const CODE_OVERRIDES = {
  '1060033': '1060031' // Muthukur Karasanapalli
};

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
      if (retries > 0) {
        setTimeout(() => resolve(fetchUrl(url, retries - 1)), 2000);
      } else {
        reject(new Error('Request timed out after retries'));
      }
    });
    req.on('error', err => {
      if (retries > 0) {
        setTimeout(() => resolve(fetchUrl(url, retries - 1)), 2000);
      } else {
        reject(err);
      }
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

function findVillage(villages, code, vName, mandal) {
  const c = String(code || '').trim();
  const mappedCode = CODE_OVERRIDES[c] || c;
  if (/^\d{5,8}$/.test(mappedCode)) {
    const byCode = villages.find(v => String(v.village_code || '').trim() === mappedCode);
    if (byCode) return byCode;
  }
  if (!vName) return null;
  const normM = normalizeMandal(mandal);
  const cleanName = String(vName).toLowerCase().replace(/[^a-z0-9]/g, '');
  return villages.find(v => {
    if (normM && normalizeMandal(v.mandal) !== normM) return false;
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
  dlr_completed: { key: 'dlr_completed', shortCode: 'COMPLETED', name: 'DLR Completed Villages', label: 'DLR Completed Villages' }
};

async function syncAllLiveData(store) {
  const villages = store.villages || [];
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
        id: `p4_comp_${code || r}`, phase: 'Phase IV', login_key: 'dlr_completed', login_name: 'DLR Completed', login_short: 'COMP',
        sno: cleanNum(sno), division, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: '', total_entries: totEntries,
        till_yesterday: totEntries, today: 0, cumulative: totEntries, balance: 0,
        target_date: row[11] || '', mutation_date: row[12] || '', remarks: row[13] || 'DLR Completed'
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
        mutation_date: row[19] || '', remarks: row[20] || ''
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
        mutation_date: row[16] || '', remarks: row[17] || ''
      });
    }
  } catch (e) { console.error('Error Phase 4 Tah-RDO-JC:', e.message); }

  // 4. Phase-5 VS - VRO Login (gid 1329023156)
  try {
    const p5Vs = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
    let tier = 'vs_status';
    for (let r = 0; r < p5Vs.rows.length; r++) {
      const row = (p5Vs.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5];
      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/vro\s*login/i.test(c1) || /vro\s*login/i.test(c0)) { tier = 'vro_status'; continue; }
      if (isTotalRow) { if (tier === 'vs_status') tier = 'vro_status'; continue; }
      if (!vName && !code) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p5_${tier === 'vs_status' ? 'vs' : 'vro'}_${code || r}`, phase: 'Phase V', login_key: tier, login_name: STAGE_CONFIG[tier].name, login_short: STAGE_CONFIG[tier].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || row[17] || '', remarks: row[18] || row[17] || ''
      });
    }
  } catch (e) { console.error('Error Phase 5 VS-VRO:', e.message); }

  // 5. Phase-5 Tah-RDO-JC Login (gid 1758823146)
  try {
    const p5Tah = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
    let tier = 'tahsildar_status';
    for (let r = 0; r < p5Tah.rows.length; r++) {
      const row = (p5Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5];
      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/rdo\s*login/i.test(c1) || /rdo\s*login/i.test(c0)) { tier = 'rdo_status'; continue; }
      if (isTotalRow) { if (tier === 'tahsildar_status') tier = 'rdo_status'; continue; }
      if (!vName && !code) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p5_${tier === 'tahsildar_status' ? 'tah' : 'rdo'}_${code || r}`, phase: 'Phase V', login_key: tier, login_name: STAGE_CONFIG[tier].name, login_short: STAGE_CONFIG[tier].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || '', remarks: row[17] || ''
      });
    }
  } catch (e) { console.error('Error Phase 5 Tah-RDO-JC:', e.message); }

  // 6. Phase-6 VS - VRO Login (gid 941359880)
  try {
    const p6Vs = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
    let tier = 'vs_status';
    for (let r = 0; r < p6Vs.rows.length; r++) {
      const row = (p6Vs.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4]; const code = row[5];
      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/vro\s*login/i.test(c1) || /vro\s*login/i.test(c0)) { tier = 'vro_status'; continue; }
      if (isTotalRow) { if (tier === 'vs_status') tier = 'vro_status'; continue; }
      if (!vName && !code) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p6_${tier === 'vs_status' ? 'vs' : 'vro'}_${code || r}`, phase: 'Phase VI', login_key: tier, login_name: STAGE_CONFIG[tier].name, login_short: STAGE_CONFIG[tier].shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || '', remarks: row[17] || ''
      });
    }
  } catch (e) { console.error('Error Phase 6 VS-VRO:', e.message); }

  // 7. Phase-6 TAH - RDO - JC LOGIN (gid 127310674)
  try {
    const p6Tah = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
    for (let r = 0; r < p6Tah.rows.length; r++) {
      const row = (p6Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0]; const c1 = row[1]; const mandal = normalizeMandal(row[3]); const vName = row[4] || '52 Kanikapuram'; const code = row[5];
      if (/total/i.test(row.join(' ')) || (!code && !vName)) continue;
      if (c0 === '' && !code) continue;
      const totExtent = cleanNum(row[6]); const khatas = cleanNum(row[7]); const lpms = cleanNum(row[8]);
      const dateStarted = row[9]; const totEntries = cleanNum(row[10]); const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]); const cum = cleanNum(row[13]); const balance = cleanNum(row[14]);
      addDlrRecord({
        id: `p6_tah_${code || r}`, phase: 'Phase VI', login_key: 'tahsildar_status', login_name: STAGE_CONFIG.tahsildar_status.name, login_short: STAGE_CONFIG.tahsildar_status.shortCode,
        sno: cleanNum(c0), division: c1, dios: row[2] || '', mandal, village_name: vName, village_code: code,
        total_extent: totExtent, khatas, lpms, date_entry_started: dateStarted, total_entries: totEntries,
        till_yesterday: tillYesterday, today, cumulative: cum, balance, target_date: row[15] || '',
        mutation_date: row[16] || '', remarks: row[17] || ''
      });
    }
  } catch (e) { console.error('Error Phase 6 Tah-RDO-JC:', e.message); }

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

  // Attach dlr_stages_detail to villages
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

  // Apply DLR completed villages
  dlrRecords.filter(r => r.login_key === 'dlr_completed').forEach(r => {
    const v = findVillage(villages, r.village_code, r.village_name, r.mandal);
    if (v) {
      ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'].forEach(k => {
        v[k] = 'Completed';
        v.dlr_stages_detail[k].status = 'Completed';
        v.dlr_stages_detail[k].tillYesterday = r.total_entries;
        v.dlr_stages_detail[k].cumulative = r.total_entries;
        v.dlr_stages_detail[k].balance = 0;
        v.dlr_stages_detail[k].total = r.total_entries;
        v.dlr_stages_detail[k].targetDate = r.target_date;
      });
      v.dlr_entries_cumulative = r.total_entries;
      v.dlr_entries_balance = 0;
      v.dlr_active_stage = 'Completed';
    }
  });

  // Apply active officer login entries
  dlrRecords.filter(r => r.login_key !== 'dlr_completed').forEach(r => {
    const v = findVillage(villages, r.village_code, r.village_name, r.mandal);
    if (v) {
      const isStageDone = (r.balance === 0 && r.cumulative > 0) || (r.total_entries > 0 && r.cumulative >= r.total_entries);
      const isStageActive = r.today > 0 || r.cumulative > 0;
      const stageStatus = isStageDone ? 'Completed' : (isStageActive ? 'In Progress' : 'Pending');

      v.dlr_stages_detail[r.login_key] = {
        name: STAGE_CONFIG[r.login_key].name,
        today: r.today,
        tillYesterday: r.till_yesterday,
        cumulative: r.cumulative,
        balance: r.balance,
        total: r.total_entries,
        status: stageStatus,
        targetDate: r.target_date,
        remarks: r.remarks
      };

      v[r.login_key] = stageStatus;
      if (stageStatus === 'In Progress' && v.current_stage !== 'Final RoR Completed' && !v.ported_to_webland) {
        v.current_stage = STAGE_CONFIG[r.login_key].name;
      }
      if (r.cumulative > 0) {
        v.dlr_entries_cumulative = r.cumulative;
        v.dlr_entries_balance = r.balance;
      }
    }
  });

  store.dlr_records = dlrRecords;

  // Now Sync GT Progress from Google Sheets
  console.log('Fetching Google Spreadsheets GT data (Phase 5 & 6)...');
  // 1. Reset all villages today_gt_extent
  villages.forEach(v => { v.today_gt_extent = 0.00; });

  let p5TodaySum = 0, p5ActiveCount = 0;
  try {
    const p5Table = await fetchGviz('11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', '0');
    for (let r = 1; r < p5Table.rows.length; r++) {
      const row = (p5Table.rows[r].c || []).map(cellVal);
      let code = String(row[3] || '').trim();
      if (CODE_OVERRIDES[code]) code = CODE_OVERRIDES[code];
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
      const v = villages.find(v => String(v.village_code || '').trim() === code);
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
      }
    }
  } catch (e) { console.error('Error Phase 5 GT:', e.message); }

  let p6TodaySum = 0, p6ActiveCount = 0;
  try {
    const p6Table = await fetchGviz('1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', '0');
    for (let r = 1; r < p6Table.rows.length; r++) {
      const row = (p6Table.rows[r].c || []).map(cellVal);
      let code = String(row[3] || '').trim();
      if (CODE_OVERRIDES[code]) code = CODE_OVERRIDES[code];
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
      const v = villages.find(v => String(v.village_code || '').trim() === code);
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
      }
    }
  } catch (e) { console.error('Error Phase 6 GT:', e.message); }

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

  // Try writing to store.json if writable
  const STORE_PATH = path.join(__dirname, '../data/store.json');
  try {
    if (!fs.existsSync(path.dirname(STORE_PATH))) fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    // Read-only filesystem fallback
  }

  const TMP_STORE = path.join('/tmp', 'store.json');
  try {
    fs.writeFileSync(TMP_STORE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {}

  return store;
}

module.exports = {
  syncAllLiveData,
  fetchGviz,
  cleanNum,
  normalizeMandal,
  STAGE_CONFIG
};
