const fs = require('fs');
const path = require('path');
const https = require('https');

const STORE_PATH = path.join(__dirname, '../data/store.json');
const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
const villages = store.villages || [];

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
        console.log(`Timeout on ${url}, retrying (${retries} left)...`);
        setTimeout(() => resolve(fetchUrl(url, retries - 1)), 2000);
      } else {
        reject(new Error('Request timed out after retries'));
      }
    });
    req.on('error', err => {
      if (retries > 0) {
        console.log(`Error ${err.message} on ${url}, retrying (${retries} left)...`);
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

const CODE_OVERRIDES = {
  '1060033': '1060031' // Muthukur Karasanapalli
};

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

function findVillage(code, vName, mandal) {
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
  vs_status: {
    key: 'vs_status',
    shortCode: 'VS',
    name: 'Village Surveyor Login (VS)',
    label: '1. Village Surveyor Login (VS)'
  },
  vro_status: {
    key: 'vro_status',
    shortCode: 'VRO',
    name: 'Village Revenue Officer Login (VRO)',
    label: '2. Village Revenue Officer Login (VRO)'
  },
  tahsildar_status: {
    key: 'tahsildar_status',
    shortCode: 'TAH',
    name: 'Tahsildar Login (Tah)',
    label: '⭐ 3. Tahsildar Login (Tah)'
  },
  rdo_status: {
    key: 'rdo_status',
    shortCode: 'RDO',
    name: 'Revenue Divisional Officer Login (RDO)',
    label: '4. Revenue Divisional Officer Login (RDO)'
  },
  jc_status: {
    key: 'jc_status',
    shortCode: 'JC',
    name: 'Joint Collector Approval Login (JC)',
    label: '5. Joint Collector Approval Login (JC)'
  },
  dlr_completed: {
    key: 'dlr_completed',
    shortCode: 'COMPLETED',
    name: 'DLR Completed Villages',
    label: 'DLR Completed Villages'
  }
};

async function run() {
  console.log('=== EXTRACTING DIRECT DLR DATA FROM GOOGLE SPREADSHEETS ===');

  const dlrRecords = [];

  // Helper to add raw record
  function addDlrRecord(rec) {
    dlrRecords.push(rec);
  }

  // --- 1. Phase-4 DLR Completed (gid 218111872) ---
  console.log('Fetching Phase-4 DLR Completed (gid 218111872)...');
  try {
    const p4Comp = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '218111872');
    for (let r = 0; r < p4Comp.rows.length; r++) {
      const row = (p4Comp.rows[r].c || []).map(cellVal);
      const sno = row[0];
      const division = row[1];
      const mandal = normalizeMandal(row[3]);
      const vName = row[4];
      const code = row[5];
      if (/total/i.test(row.join(' ')) || !vName) continue;
      const totExtent = cleanNum(row[6]);
      const khatas = cleanNum(row[7]);
      const lpms = cleanNum(row[8]);
      const totEntries = khatas || 1000;

      addDlrRecord({
        id: `p4_comp_${code || r}`,
        phase: 'Phase IV',
        login_key: 'dlr_completed',
        login_name: 'DLR Completed',
        login_short: 'COMP',
        sno: cleanNum(sno),
        division,
        dios: row[2] || '',
        mandal,
        village_name: vName,
        village_code: code,
        total_extent: totExtent,
        khatas,
        lpms,
        date_entry_started: '',
        total_entries: totEntries,
        till_yesterday: totEntries,
        today: 0,
        cumulative: totEntries,
        balance: 0,
        target_date: row[11] || '',
        mutation_date: row[12] || '',
        remarks: row[13] || 'DLR Completed'
      });
    }
  } catch (e) {
    console.error('Error in Phase 4 DLR Completed:', e.message);
  }

  // --- 2. Phase-4 VS & VRO (gid 1111910402) ---
  console.log('Fetching Phase-4 VS & VRO (gid 1111910402)...');
  try {
    const p4Vs = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '1111910402');
    for (let r = 0; r < p4Vs.rows.length; r++) {
      const row = (p4Vs.rows[r].c || []).map(cellVal);
      const sno = row[0];
      const division = row[1];
      const mandal = normalizeMandal(row[3]);
      const vName = row[4] || 'Baireddipalle';
      const code = row[5];
      if (/total/i.test(row.join(' ')) || (!code && !vName)) continue;
      if (sno === '' && !code) continue;

      const totExtent = cleanNum(row[6]);
      const khatas = cleanNum(row[7]);
      const lpms = cleanNum(row[8]);
      const dateStarted = row[9];
      const totEntries = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]);
      const cum = cleanNum(row[13]);
      const balance = cleanNum(row[14]);
      const targetDate = row[15] || '';
      const remarks = row[20] || '';

      addDlrRecord({
        id: `p4_vs_${code || r}`,
        phase: 'Phase IV',
        login_key: 'vs_status',
        login_name: STAGE_CONFIG.vs_status.name,
        login_short: 'VS',
        sno: cleanNum(sno),
        division,
        dios: row[2] || '',
        mandal,
        village_name: vName,
        village_code: code,
        total_extent: totExtent,
        khatas,
        lpms,
        date_entry_started: dateStarted,
        total_entries: totEntries,
        till_yesterday: tillYesterday,
        today,
        cumulative: cum,
        balance,
        target_date: targetDate,
        mutation_date: row[19] || '',
        remarks
      });
    }
  } catch (e) {
    console.error('Error in Phase 4 VS:', e.message);
  }

  // --- 3. Phase-4 Tah, RDO & JC Login (gid 182095482) ---
  console.log('Fetching Phase-4 Tah, RDO & JC Login (gid 182095482)...');
  try {
    const p4Tah = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '182095482');
    let tier = 'tahsildar'; // 0..19 Tahsildar, 21..50 RDO, 52..67 JC
    for (let r = 0; r < p4Tah.rows.length; r++) {
      const row = (p4Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0];
      const c1 = row[1];
      const mandal = normalizeMandal(row[3]);
      const vName = row[4];
      const code = row[5];

      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/jc\s*login/i.test(c1) || /jc\s*login/i.test(c0)) {
        tier = 'jc';
        continue;
      }
      if (isTotalRow) {
        if (tier === 'tahsildar') tier = 'rdo';
        else if (tier === 'rdo') tier = 'jc';
        continue;
      }
      if (!vName && !code) continue;

      const sno = cleanNum(c0);
      const division = c1;
      const totExtent = cleanNum(row[6]);
      const khatas = cleanNum(row[7]);
      const lpms = cleanNum(row[8]);
      const dateStarted = row[9];
      const totEntries = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]);
      const cum = cleanNum(row[13]);
      const balance = cleanNum(row[14]);
      const targetDate = row[15] || '';
      const remarks = row[17] || '';

      const loginKey = tier === 'tahsildar' ? 'tahsildar_status' : (tier === 'rdo' ? 'rdo_status' : 'jc_status');

      addDlrRecord({
        id: `p4_${tier}_${code || r}`,
        phase: 'Phase IV',
        login_key: loginKey,
        login_name: STAGE_CONFIG[loginKey].name,
        login_short: STAGE_CONFIG[loginKey].shortCode,
        sno,
        division,
        dios: row[2] || '',
        mandal,
        village_name: vName,
        village_code: code,
        total_extent: totExtent,
        khatas,
        lpms,
        date_entry_started: dateStarted,
        total_entries: totEntries,
        till_yesterday: tillYesterday,
        today,
        cumulative: cum,
        balance,
        target_date: targetDate,
        mutation_date: row[16] || '',
        remarks
      });
    }
  } catch (e) {
    console.error('Error in Phase 4 Tah-RDO-JC:', e.message);
  }

  // --- 4. Phase-5 VS - VRO Login (gid 1329023156) ---
  console.log('Fetching Phase-5 VS - VRO Login (gid 1329023156)...');
  try {
    const p5Vs = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
    let tier = 'vs_status'; // rows 0..14 VS, rows 16..31 VRO
    for (let r = 0; r < p5Vs.rows.length; r++) {
      const row = (p5Vs.rows[r].c || []).map(cellVal);
      const c0 = row[0];
      const c1 = row[1];
      const mandal = normalizeMandal(row[3]);
      const vName = row[4];
      const code = row[5];

      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/vro\s*login/i.test(c1) || /vro\s*login/i.test(c0)) {
        tier = 'vro_status';
        continue;
      }
      if (isTotalRow) {
        if (tier === 'vs_status') tier = 'vro_status';
        continue;
      }
      if (!vName && !code) continue;

      const sno = cleanNum(c0);
      const division = c1;
      const totExtent = cleanNum(row[6]);
      const khatas = cleanNum(row[7]);
      const lpms = cleanNum(row[8]);
      const dateStarted = row[9];
      const totEntries = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]);
      const cum = cleanNum(row[13]);
      const balance = cleanNum(row[14]);
      const targetDate = row[15] || '';
      const mutationDate = row[16] || row[17] || '';
      const remarks = row[18] || row[17] || '';

      addDlrRecord({
        id: `p5_${tier === 'vs_status' ? 'vs' : 'vro'}_${code || r}`,
        phase: 'Phase V',
        login_key: tier,
        login_name: STAGE_CONFIG[tier].name,
        login_short: STAGE_CONFIG[tier].shortCode,
        sno,
        division,
        dios: row[2] || '',
        mandal,
        village_name: vName,
        village_code: code,
        total_extent: totExtent,
        khatas,
        lpms,
        date_entry_started: dateStarted,
        total_entries: totEntries,
        till_yesterday: tillYesterday,
        today,
        cumulative: cum,
        balance,
        target_date: targetDate,
        mutation_date: mutationDate,
        remarks
      });
    }
  } catch (e) {
    console.error('Error in Phase 5 VS-VRO:', e.message);
  }

  // --- 5. Phase-5 Tah-RDO-JC Login (gid 1758823146) ---
  console.log('Fetching Phase-5 Tah-RDO-JC Login (gid 1758823146)...');
  try {
    const p5Tah = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
    let tier = 'tahsildar_status'; // rows 0..10 Tahsildar, rows 12..14 RDO
    for (let r = 0; r < p5Tah.rows.length; r++) {
      const row = (p5Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0];
      const c1 = row[1];
      const mandal = normalizeMandal(row[3]);
      const vName = row[4];
      const code = row[5];

      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/rdo\s*login/i.test(c1) || /rdo\s*login/i.test(c0)) {
        tier = 'rdo_status';
        continue;
      }
      if (isTotalRow) {
        if (tier === 'tahsildar_status') tier = 'rdo_status';
        continue;
      }
      if (!vName && !code) continue;

      const sno = cleanNum(c0);
      const division = c1;
      const totExtent = cleanNum(row[6]);
      const khatas = cleanNum(row[7]);
      const lpms = cleanNum(row[8]);
      const dateStarted = row[9];
      const totEntries = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]);
      const cum = cleanNum(row[13]);
      const balance = cleanNum(row[14]);
      const targetDate = row[15] || '';
      const mutationDate = row[16] || '';
      const remarks = row[17] || '';

      addDlrRecord({
        id: `p5_${tier === 'tahsildar_status' ? 'tah' : 'rdo'}_${code || r}`,
        phase: 'Phase V',
        login_key: tier,
        login_name: STAGE_CONFIG[tier].name,
        login_short: STAGE_CONFIG[tier].shortCode,
        sno,
        division,
        dios: row[2] || '',
        mandal,
        village_name: vName,
        village_code: code,
        total_extent: totExtent,
        khatas,
        lpms,
        date_entry_started: dateStarted,
        total_entries: totEntries,
        till_yesterday: tillYesterday,
        today,
        cumulative: cum,
        balance,
        target_date: targetDate,
        mutation_date: mutationDate,
        remarks
      });
    }
  } catch (e) {
    console.error('Error in Phase 5 Tah-RDO-JC:', e.message);
  }

  // --- 6. Phase-6 VS - VRO Login (gid 941359880) ---
  console.log('Fetching Phase-6 VS - VRO Login (gid 941359880)...');
  try {
    const p6Vs = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
    let tier = 'vs_status'; // rows 0..5 VS, rows 7..8 VRO
    for (let r = 0; r < p6Vs.rows.length; r++) {
      const row = (p6Vs.rows[r].c || []).map(cellVal);
      const c0 = row[0];
      const c1 = row[1];
      const mandal = normalizeMandal(row[3]);
      const vName = row[4];
      const code = row[5];

      const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim());
      if (/vro\s*login/i.test(c1) || /vro\s*login/i.test(c0)) {
        tier = 'vro_status';
        continue;
      }
      if (isTotalRow) {
        if (tier === 'vs_status') tier = 'vro_status';
        continue;
      }
      if (!vName && !code) continue;

      const sno = cleanNum(c0);
      const division = c1;
      const totExtent = cleanNum(row[6]);
      const khatas = cleanNum(row[7]);
      const lpms = cleanNum(row[8]);
      const dateStarted = row[9];
      const totEntries = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]);
      const cum = cleanNum(row[13]);
      const balance = cleanNum(row[14]);
      const targetDate = row[15] || '';
      const mutationDate = row[16] || '';
      const remarks = row[17] || '';

      addDlrRecord({
        id: `p6_${tier === 'vs_status' ? 'vs' : 'vro'}_${code || r}`,
        phase: 'Phase VI',
        login_key: tier,
        login_name: STAGE_CONFIG[tier].name,
        login_short: STAGE_CONFIG[tier].shortCode,
        sno,
        division,
        dios: row[2] || '',
        mandal,
        village_name: vName,
        village_code: code,
        total_extent: totExtent,
        khatas,
        lpms,
        date_entry_started: dateStarted,
        total_entries: totEntries,
        till_yesterday: tillYesterday,
        today,
        cumulative: cum,
        balance,
        target_date: targetDate,
        mutation_date: mutationDate,
        remarks
      });
    }
  } catch (e) {
    console.error('Error in Phase 6 VS-VRO:', e.message);
  }

  // --- 7. Phase-6 TAH - RDO - JC LOGIN (gid 127310674) ---
  console.log('Fetching Phase-6 TAH - RDO - JC LOGIN (gid 127310674)...');
  try {
    const p6Tah = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
    for (let r = 0; r < p6Tah.rows.length; r++) {
      const row = (p6Tah.rows[r].c || []).map(cellVal);
      const c0 = row[0];
      const c1 = row[1];
      const mandal = normalizeMandal(row[3]);
      const vName = row[4] || '52 Kanikapuram';
      const code = row[5];
      if (/total/i.test(row.join(' ')) || (!code && !vName)) continue;
      if (c0 === '' && !code) continue;

      const sno = cleanNum(c0);
      const division = c1;
      const totExtent = cleanNum(row[6]);
      const khatas = cleanNum(row[7]);
      const lpms = cleanNum(row[8]);
      const dateStarted = row[9];
      const totEntries = cleanNum(row[10]);
      const tillYesterday = cleanNum(row[11]);
      const today = cleanNum(row[12]);
      const cum = cleanNum(row[13]);
      const balance = cleanNum(row[14]);
      const targetDate = row[15] || '';
      const mutationDate = row[16] || '';
      const remarks = row[17] || '';

      addDlrRecord({
        id: `p6_tah_${code || r}`,
        phase: 'Phase VI',
        login_key: 'tahsildar_status',
        login_name: STAGE_CONFIG.tahsildar_status.name,
        login_short: STAGE_CONFIG.tahsildar_status.shortCode,
        sno,
        division,
        dios: row[2] || '',
        mandal,
        village_name: vName,
        village_code: code,
        total_extent: totExtent,
        khatas,
        lpms,
        date_entry_started: dateStarted,
        total_entries: totEntries,
        till_yesterday: tillYesterday,
        today,
        cumulative: cum,
        balance,
        target_date: targetDate,
        mutation_date: mutationDate,
        remarks
      });
    }
  } catch (e) {
    console.error('Error in Phase 6 Tah-RDO-JC:', e.message);
  }

  console.log(`\nExtracted ${dlrRecords.length} raw DLR records from Google Spreadsheets.`);

  // Print summary by login_key
  const byLogin = {};
  dlrRecords.forEach(r => {
    byLogin[r.login_key] = byLogin[r.login_key] || { count: 0, tot: 0, cum: 0, today: 0, bal: 0 };
    byLogin[r.login_key].count++;
    byLogin[r.login_key].tot += r.total_entries;
    byLogin[r.login_key].cum += r.cumulative;
    byLogin[r.login_key].today += r.today;
    byLogin[r.login_key].bal += r.balance;
  });
  console.log('\n--- Summary By Login ---');
  Object.keys(byLogin).forEach(k => {
    const s = byLogin[k];
    console.log(`${k} (${s.count} villages): Tot: ${s.tot.toLocaleString()}, Cum: ${s.cum.toLocaleString()}, Today: ${s.today}, Bal: ${s.bal.toLocaleString()}`);
  });

  // Build dlrSummary for dashboard consumption
  const byStage = {};
  ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'].forEach(key => {
    const recs = dlrRecords.filter(r => r.login_key === key);
    const today = recs.reduce((s, r) => s + (Number(r.today) || 0), 0);
    const cumulative = recs.reduce((s, r) => s + (Number(r.cumulative) || 0), 0);
    const balance = recs.reduce((s, r) => s + (Number(r.balance) || 0), 0);
    const total = recs.reduce((s, r) => s + (Number(r.total_entries) || 0), 0);
    const pct = total > 0 ? ((cumulative / total) * 100).toFixed(1) : '0.0';
    const names = { vs_status: 'Village Surveyor Login (VS Login)', vro_status: 'VRO Login (Village Revenue Officer)', tahsildar_status: 'Tahsildar Login (Tah Login)', rdo_status: 'RDO Login (Revenue Divisional Officer)', jc_status: 'JC Login (Joint Collector Approval)' };
    byStage[key] = { name: names[key], today, cumulative, balance, total, pct, villageCount: recs.length };
  });

  const allActive = ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'];
  const todayTotal = allActive.reduce((s, k) => s + byStage[k].today, 0);
  const cumulativeTotal = allActive.reduce((s, k) => s + byStage[k].cumulative, 0);
  const balanceTotal = allActive.reduce((s, k) => s + byStage[k].balance, 0);
  const totalEntries = allActive.reduce((s, k) => s + byStage[k].total, 0);
  const benchmarkDaily = 200;
  const pacePct = benchmarkDaily > 0 ? ((todayTotal / benchmarkDaily) * 100).toFixed(1) : '0.0';
  const pctTotal = totalEntries > 0 ? ((cumulativeTotal / totalEntries) * 100).toFixed(1) : '0.0';

  store.dlrSummary = { todayTotal, cumulativeTotal, balanceTotal, totalEntries, benchmarkDaily, pacePct, pctTotal, byStage, lastSynced: new Date().toISOString() };

  console.log(`\nDLR Summary: Today=${todayTotal}, Cum=${cumulativeTotal}, Bal=${balanceTotal}, Total=${totalEntries}, Pct=${pctTotal}%`);


  // Attach dlr_stages_detail to villages in store
  // Reset existing dlr_stages_detail cleanly
  villages.forEach(v => {
    const isPorted = Boolean(v.ported_to_webland);
    const totKhathas = Number(v.khatas) || 1000;
    v.dlr_stages_detail = {
      vs_status: {
        name: STAGE_CONFIG.vs_status.name,
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      vro_status: {
        name: STAGE_CONFIG.vro_status.name,
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      tahsildar_status: {
        name: STAGE_CONFIG.tahsildar_status.name,
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      rdo_status: {
        name: STAGE_CONFIG.rdo_status.name,
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      jc_status: {
        name: STAGE_CONFIG.jc_status.name,
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      }
    };
  });

  // Apply DLR completed villages first
  dlrRecords.filter(r => r.login_key === 'dlr_completed').forEach(r => {
    const v = findVillage(r.village_code, r.village_name, r.mandal);
    if (v) {
      ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'].forEach(k => {
        v.dlr_stages_detail[k].status = 'Completed';
        v.dlr_stages_detail[k].today = 0;
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
    const v = findVillage(r.village_code, r.village_name, r.mandal);
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

  // Save dlr_records into store
  store.dlr_records = dlrRecords;

  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log(`Saved ${dlrRecords.length} records to data/store.json`);

  const DASH_STORE = path.join(__dirname, '../dashboard/data/store.json');
  if (fs.existsSync(path.dirname(DASH_STORE))) {
    fs.writeFileSync(DASH_STORE, JSON.stringify(store, null, 2), 'utf8');
    console.log('Also synced to dashboard/data/store.json');
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
