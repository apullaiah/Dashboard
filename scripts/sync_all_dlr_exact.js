const fs = require('fs');
const path = require('path');
const https = require('https');

const STORE_PATH = path.join(__dirname, '../data/store.json');
const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
const villages = store.villages;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: async () => data }));
    }).on('error', reject);
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
  if (c.f) return String(c.f).trim();
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

async function syncAllDlrExact() {
  console.log('=== SYNCING EXACT DLR ENTRIES (VS, VRO, TAH/TAHSILDAR, RDO, JC) ===');

  // Initialize DLR fields cleanly across all 736 villages
  villages.forEach(v => {
    const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported' || v.phase === 'Before 2024' || v.status === 'Completed');
    const totExt = parseFloat(v.extent) || 0;
    const totKhathas = Number(v.khatas) || Number(v.ppb_target) || Math.round(totExt * 1.5) || 500;

    v.dlr_entries_today = 0;
    v.dlr_entries_till_yesterday = isPorted ? totKhathas : 0;
    v.dlr_entries_cumulative = isPorted ? totKhathas : 0;
    v.dlr_entries_balance = isPorted ? 0 : totKhathas;
    v.dlr_total_entries = totKhathas;
    v.dlr_active_stage = isPorted ? 'Completed' : (v.current_stage || 'Not Started');
    v.dlr_stages_detail = {
      vs_status: {
        name: 'Village Surveyor Login (VS)',
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      vro_status: {
        name: 'Village Revenue Officer Login (VRO)',
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      tahsildar_status: {
        name: 'Tahsildar Login (Tah)',
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      rdo_status: {
        name: 'Revenue Divisional Officer Login (RDO)',
        today: 0,
        tillYesterday: isPorted ? totKhathas : 0,
        cumulative: isPorted ? totKhathas : 0,
        balance: isPorted ? 0 : totKhathas,
        total: totKhathas,
        status: isPorted ? 'Completed' : 'Pending',
        targetDate: ''
      },
      jc_status: {
        name: 'Joint Collector Approval Login (JC)',
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

  function applyStageEntry(v, stageKey, stageDisplayName, tot, tillYest, today, cum, bal, targetDate) {
    if (!v) return;
    if (!v.dlr_stages_detail) v.dlr_stages_detail = {};
    const isStageDone = (bal === 0 && cum > 0) || (tot > 0 && cum >= tot);
    const isStageActive = today > 0 || cum > 0;
    const stageStatus = isStageDone ? 'Completed' : (isStageActive ? 'In Progress' : 'Pending');

    v.dlr_stages_detail[stageKey] = {
      name: stageDisplayName,
      today,
      tillYesterday: tillYest,
      cumulative: cum,
      balance: bal !== undefined ? bal : Math.max(0, tot - cum),
      total: tot,
      status: stageStatus,
      targetDate: targetDate || ''
    };

    // Update village milestone status flags
    v[stageKey] = stageStatus;
    if (stageStatus === 'In Progress' && v.current_stage !== 'Final RoR Completed' && !v.ported_to_webland) {
      v.current_stage = stageDisplayName;
    }
  }

  // --- 1. Phase-4 DLR Completed (gid 218111872) ---
  console.log('\nProcessing 1. Phase-4 DLR Completed...');
  try {
    const p4Comp = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '218111872');
    let count = 0;
    for (let r = 0; r < p4Comp.rows.length; r++) {
      const row = (p4Comp.rows[r].c || []).map(cellVal);
      const code = row[5];
      const vName = row[4];
      const mandal = row[3];
      if (/total/i.test(row.join(' ')) || !vName) continue;
      const v = findVillage(code, vName, mandal);
      if (v) {
        count++;
        const totKhatas = Number(row[6]) || Number(v.khatas) || 1000;
        ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'].forEach(stg => {
          applyStageEntry(v, stg, stg === 'tahsildar_status' ? 'Tahsildar Login (Tah)' : v.dlr_stages_detail[stg].name, totKhatas, totKhatas, 0, totKhatas, 0, row[11] || row[12] || '');
        });
        v.dlr_entries_cumulative = totKhatas;
        v.dlr_entries_balance = 0;
        v.dlr_active_stage = 'Completed';
      }
    }
    console.log(`  Phase 4 DLR Completed: updated ${count} villages.`);
  } catch (e) {
    console.error('Error Phase 4 DLR Completed:', e.message);
  }

  // --- 2. Phase-4 VS & VRO (gid 1111910402) ---
  console.log('\nProcessing 2. Phase-4 VS & VRO...');
  try {
    const p4Vs = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '1111910402');
    for (let r = 0; r < p4Vs.rows.length; r++) {
      const row = (p4Vs.rows[r].c || []).map(cellVal);
      const code = row[5];
      const vName = row[4];
      const mandal = row[3];
      if (/total/i.test(row.join(' ')) || !vName) continue;
      const v = findVillage(code, vName, mandal);
      if (v) {
        const tot = cleanNum(row[10]);
        const tillYest = cleanNum(row[11]);
        const today = cleanNum(row[12]);
        const cum = cleanNum(row[13]);
        const bal = cleanNum(row[14]);
        const targetDate = row[9];
        applyStageEntry(v, 'vs_status', 'Village Surveyor Login (VS)', tot, tillYest, today, cum, bal, targetDate);
      }
    }
  } catch (e) {
    console.error('Error Phase 4 VS:', e.message);
  }

  // --- 3. Phase-4 Tah, RDO & JC Login (gid 182095482) ---
  console.log('\nProcessing 3. Phase-4 Tah, RDO & JC Login...');
  try {
    const p4Tah = await fetchGviz('1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', '182095482');
    let tier = 'tahsildar'; // 0..20 Tahsildar, 21..51 RDO, 52..68 JC
    for (let r = 0; r < p4Tah.rows.length; r++) {
      const row = (p4Tah.rows[r].c || []).map(cellVal);
      const c1 = row[1];
      const code = row[5];
      const vName = row[4];
      const mandal = row[3];
      if (/jc\s*login/i.test(c1) || /jc\s*login/i.test(row.join(' '))) { tier = 'jc'; continue; }
      if (/total/i.test(row.join(' '))) {
        if (r <= 20) tier = 'rdo';
        continue;
      }
      if (!vName && !code) continue;
      const v = findVillage(code, vName, mandal);
      if (v) {
        const tot = cleanNum(row[10]);
        const tillYest = cleanNum(row[11]);
        const today = cleanNum(row[12]);
        const cum = cleanNum(row[13]);
        const bal = cleanNum(row[14]);
        const targetDate = row[9];
        if (tier === 'tahsildar') {
          applyStageEntry(v, 'tahsildar_status', 'Tahsildar Login (Tah)', tot, tillYest, today, cum, bal, targetDate);
        } else if (tier === 'rdo') {
          applyStageEntry(v, 'rdo_status', 'Revenue Divisional Officer Login (RDO)', tot, tillYest, today, cum, bal, targetDate);
        } else if (tier === 'jc') {
          applyStageEntry(v, 'jc_status', 'Joint Collector Approval Login (JC)', tot, tillYest, today, cum, bal, targetDate);
        }
      }
    }
  } catch (e) {
    console.error('Error Phase 4 Tah-RDO-JC:', e.message);
  }

  // --- 4. Phase-5 VS - VRO Login (gid 1329023156) ---
  console.log('\nProcessing 4. Phase-5 VS - VRO Login...');
  try {
    const p5Vs = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
    let tier = 'vs';
    for (let r = 0; r < p5Vs.rows.length; r++) {
      const row = (p5Vs.rows[r].c || []).map(cellVal);
      const code = row[5];
      const vName = row[4];
      const mandal = row[3];
      if (/total/i.test(row.join(' '))) {
        if (r >= 15) tier = 'vro';
        continue;
      }
      if (!vName && !code) continue;
      const v = findVillage(code, vName, mandal);
      if (v) {
        const tot = cleanNum(row[10]);
        const tillYest = cleanNum(row[11]);
        const today = cleanNum(row[12]);
        const cum = cleanNum(row[13]);
        const bal = cleanNum(row[14]);
        const targetDate = row[9];
        if (tier === 'vs') {
          applyStageEntry(v, 'vs_status', 'Village Surveyor Login (VS)', tot, tillYest, today, cum, bal, targetDate);
        } else {
          applyStageEntry(v, 'vro_status', 'Village Revenue Officer Login (VRO)', tot, tillYest, today, cum, bal, targetDate);
        }
      }
    }
  } catch (e) {
    console.error('Error Phase 5 VS-VRO:', e.message);
  }

  // --- 5. Phase-5 Tah-RDO-JC Login (gid 1758823146) ---
  console.log('\nProcessing 5. Phase-5 Tah-RDO-JC Login...');
  try {
    const p5Tah = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
    let tier = 'tahsildar';
    for (let r = 0; r < p5Tah.rows.length; r++) {
      const row = (p5Tah.rows[r].c || []).map(cellVal);
      const code = row[5];
      const vName = row[4];
      const mandal = row[3];
      if (/total/i.test(row.join(' '))) {
        if (r <= 11) tier = 'rdo';
        continue;
      }
      if (!vName && !code) continue;
      const v = findVillage(code, vName, mandal);
      if (v) {
        const tot = cleanNum(row[10]);
        const tillYest = cleanNum(row[11]);
        const today = cleanNum(row[12]);
        const cum = cleanNum(row[13]);
        const bal = cleanNum(row[14]);
        const targetDate = row[9];
        if (tier === 'tahsildar') {
          applyStageEntry(v, 'tahsildar_status', 'Tahsildar Login (Tah)', tot, tillYest, today, cum, bal, targetDate);
        } else if (tier === 'rdo') {
          applyStageEntry(v, 'rdo_status', 'Revenue Divisional Officer Login (RDO)', tot, tillYest, today, cum, bal, targetDate);
        }
      }
    }
  } catch (e) {
    console.error('Error Phase 5 Tah-RDO:', e.message);
  }

  // --- 6. Phase-6 VS - VRO Login (gid 941359880) ---
  console.log('\nProcessing 6. Phase-6 VS - VRO Login...');
  try {
    const p6Vs = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
    let tier = 'vs';
    for (let r = 0; r < p6Vs.rows.length; r++) {
      const row = (p6Vs.rows[r].c || []).map(cellVal);
      const code = row[5];
      const vName = row[4];
      const mandal = row[3];
      if (/total/i.test(row.join(' ')) || /division\s*name/i.test(row[1])) {
        if (r >= 6) tier = 'vro';
        continue;
      }
      if (!vName && !code) continue;
      const v = findVillage(code, vName, mandal);
      if (v) {
        const tot = cleanNum(row[10]);
        const tillYest = cleanNum(row[11]);
        const today = cleanNum(row[12]);
        const cum = cleanNum(row[13]);
        const bal = cleanNum(row[14]);
        const targetDate = row[9];
        if (tier === 'vs') {
          applyStageEntry(v, 'vs_status', 'Village Surveyor Login (VS)', tot, tillYest, today, cum, bal, targetDate);
        } else {
          applyStageEntry(v, 'vro_status', 'Village Revenue Officer Login (VRO)', tot, tillYest, today, cum, bal, targetDate);
        }
      }
    }
  } catch (e) {
    console.error('Error Phase 6 VS-VRO:', e.message);
  }

  // --- 7. Phase-6 TAH - RDO - JC LOGIN (gid 127310674) ---
  console.log('\nProcessing 7. Phase-6 TAH - RDO - JC LOGIN...');
  try {
    const p6Tah = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
    for (let r = 0; r < p6Tah.rows.length; r++) {
      const row = (p6Tah.rows[r].c || []).map(cellVal);
      const code = row[5];
      const vName = row[4];
      const mandal = row[3];
      if (/total/i.test(row.join(' ')) || (!vName && !code)) continue;
      const v = findVillage(code, vName, mandal);
      if (v) {
        const tot = cleanNum(row[10]);
        const tillYest = cleanNum(row[11]);
        const today = cleanNum(row[12]);
        const cum = cleanNum(row[13]);
        const bal = cleanNum(row[14]);
        const targetDate = row[9];
        applyStageEntry(v, 'tahsildar_status', 'Tahsildar Login (Tah)', tot, tillYest, today, cum, bal, targetDate);
      }
    }
  } catch (e) {
    console.error('Error Phase 6 Tah-RDO-JC:', e.message);
  }

  // Now, calculate roll-up village DLR fields
  villages.forEach(v => {
    const details = v.dlr_stages_detail || {};
    const stagesList = ['vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status'];
    
    // Overall today DLR entries for this village: sum of today across all 5 stages
    v.dlr_entries_today = stagesList.reduce((sum, k) => sum + (Number(details[k]?.today) || 0), 0);
    
    // Find active stage (the highest incomplete stage or last completed)
    let activeKey = 'vs_status';
    for (const k of stagesList) {
      if (details[k]?.status === 'In Progress' || (Number(details[k]?.today) || 0) > 0) {
        activeKey = k;
        break;
      }
      if (details[k]?.status === 'Completed') {
        activeKey = k;
      }
    }
    v.dlr_active_stage = details[activeKey]?.name || 'VS Login';
    v.dlr_total_entries = Number(details[activeKey]?.total) || Number(v.khatas) || 1000;
    v.dlr_entries_cumulative = Number(details[activeKey]?.cumulative) || 0;
    v.dlr_entries_balance = Number(details[activeKey]?.balance) || Math.max(0, v.dlr_total_entries - v.dlr_entries_cumulative);
  });

  // Print Summary per stage
  console.log('\n=================== VERIFIED DLR STAGES SUMMARY ===================');
  const stageKeys = [
    { key: 'vs_status', name: '1. Village Surveyor Login (VS)' },
    { key: 'vro_status', name: '2. Village Revenue Officer Login (VRO)' },
    { key: 'tahsildar_status', name: '⭐ 3. Tahsildar Login (Tah)' },
    { key: 'rdo_status', name: '4. Revenue Divisional Officer Login (RDO)' },
    { key: 'jc_status', name: '5. Joint Collector Approval Login (JC)' }
  ];

  stageKeys.forEach(st => {
    const activeVlgs = villages.filter(v => (v.dlr_stages_detail?.[st.key]?.total || 0) > 0);
    const totToday = villages.reduce((s, v) => s + (Number(v.dlr_stages_detail?.[st.key]?.today) || 0), 0);
    const totCum = villages.reduce((s, v) => s + (Number(v.dlr_stages_detail?.[st.key]?.cumulative) || 0), 0);
    const totBal = villages.reduce((s, v) => s + (Number(v.dlr_stages_detail?.[st.key]?.balance) || 0), 0);
    const totTarget = villages.reduce((s, v) => s + (Number(v.dlr_stages_detail?.[st.key]?.total) || 0), 0);
    const compVlgs = villages.filter(v => v.dlr_stages_detail?.[st.key]?.status === 'Completed').length;
    const inProgVlgs = villages.filter(v => v.dlr_stages_detail?.[st.key]?.status === 'In Progress').length;
    console.log(`\n${st.name}:`);
    console.log(`  Today Entries      : ${totToday.toLocaleString('en-IN')}`);
    console.log(`  Cumulative Entries : ${totCum.toLocaleString('en-IN')}`);
    console.log(`  Balance Entries    : ${totBal.toLocaleString('en-IN')}`);
    console.log(`  Total Target       : ${totTarget.toLocaleString('en-IN')}`);
    console.log(`  Completed Villages : ${compVlgs}, In Progress: ${inProgVlgs}`);
  });

  // Save to store.json
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log('\nSaved updated DLR data to data/store.json.');

  const altStore = path.join(__dirname, '../dashboard/data/store.json');
  if (fs.existsSync(altStore)) {
    fs.writeFileSync(altStore, JSON.stringify(store, null, 2), 'utf8');
    console.log('Also updated dashboard/data/store.json.');
  }
}

syncAllDlrExact().catch(e => {
  console.error('Sync Error:', e);
  process.exit(1);
});
