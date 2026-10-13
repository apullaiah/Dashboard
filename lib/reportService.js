const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const CHROME_PATH = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MANDAL_ALIASES = {
  gudupalle: 'Gudipalle', gudipalle: 'Gudipalle', palamaneru: 'Palamaner', palamaner: 'Palamaner',
  palmaner: 'Palamaner', bangarupalyam: 'Bangarupalem', bangarupalem: 'Bangarupalem',
  'v讲述kota': 'Venkatagirikota', 'v kota': 'Venkatagirikota', 'v.kota': 'Venkatagirikota', venkatagirikota: 'Venkatagirikota',
  penumur: 'Penumuru', penumuru: 'Penumuru', puthalapatu: 'Puthalapattu', puthalapattu: 'Puthalapattu',
  thavanampalle: 'Thavanampalli', thavanampalli: 'Thavanampalli',
  'g.d.nellore': 'G.D.Nellore', 'g d nellore': 'G.D.Nellore', 'gd nellore': 'G.D.Nellore',
  'g.d nellore': 'G.D.Nellore', 'g.d. nellore': 'G.D.Nellore',
  gangadharanellore: 'G.D.Nellore', 'gangadhara nellore': 'G.D.Nellore', 'gangadhara-nellore': 'G.D.Nellore',
  baireddipalle: 'Baireddipalle', baireddipalli: 'Baireddipalle',
  'baireddi palle': 'Baireddipalle', 'baireddi palli': 'Baireddipalle',
  'baireddy palle': 'Baireddipalle', 'baireddy palli': 'Baireddipalle',
  baireddypalle: 'Baireddipalle', baireddypalli: 'Baireddipalle',
  's.r.puram': 'S.R.Puram', 's r puram': 'S.R.Puram', srpuram: 'S.R.Puram', srirangarajapuram: 'S.R.Puram'
};

function normalKey(value) {
  return String(value ?? '').toLowerCase().trim().replace(/[\s\-_.]+/g, ' ');
}

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeMandal(value, store) {
  const key = normalKey(value);
  return ((store && store.customMandalAliases) || {})[key] || MANDAL_ALIASES[key] || clean(value);
}

function isComplete(value) {
  return /^(completed|complete|done|yes|y|ported|true|1)$/i.test(clean(value));
}

function formatExtent(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function h(str) {
  return String(str ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function getStageBadgeInfo(v) {
  const stage = String(v.current_stage || '').trim();
  const lower = stage.toLowerCase();
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');

  if (isPorted || lower.includes('webland') || lower.includes('ported')) {
    return { name: 'Webland 2.0 Ported', icon: '🌐', color: 'teal', label: 'Webland 2.0 Ported' };
  }
  if (lower.includes('final ror') || isComplete(v.final_ror_status)) {
    return { name: 'Final RoR', icon: '📜', color: 'emerald', label: 'Final RoR Completed' };
  }
  if (lower.includes('draft ror') || lower.includes('13 notification') || lower.includes('13 completed') || isComplete(v.draft_ror_status) || isComplete(v.section13_status)) {
    return { name: 'Draft RoR', icon: '📑', color: 'purple', label: 'Draft RoR & 13 Notice' };
  }
  if (lower.includes('jc login') || isComplete(v.jc_status) || v.jc_status === 'In Progress') {
    return { name: 'DLR @ JC', icon: '⚖️', color: 'amber', label: 'DLR @ JC Login' };
  }
  if (lower.includes('rdo login') || lower.includes('rdo') || isComplete(v.rdo_status) || v.rdo_status === 'In Progress') {
    return { name: 'DLR @ RDO', icon: '🏛️', color: 'amber', label: 'DLR @ RDO Login' };
  }
  if (lower.includes('tah login') || lower.includes('tahsildar') || isComplete(v.tahsildar_status) || v.tahsildar_status === 'In Progress') {
    return { name: 'DLR @ Tahsildar', icon: '⭐', color: 'amber', label: 'DLR @ Tahsildar Login' };
  }
  if (lower.includes('vro login') || lower.includes('vro') || isComplete(v.vro_status) || v.vro_status === 'In Progress') {
    return { name: 'DLR @ VRO', icon: '🔐', color: 'amber', label: 'DLR @ VRO Login' };
  }
  if (lower.includes('vs login') || lower.includes('surveyor') || isComplete(v.vs_status) || v.vs_status === 'In Progress') {
    return { name: 'DLR @ VS', icon: '🔐', color: 'amber', label: 'DLR @ VS Login' };
  }
  if (lower.includes('vectorization') || lower.includes('correlation') || isComplete(v.vectorization_status)) {
    return { name: 'Vectorization', icon: '📐', color: 'indigo', label: 'Cadastral Vectorization' };
  }
  if (lower.includes('gt ongoing') || lower.includes('gt in progress') || v.gt_status === 'In Progress') {
    return { name: 'GT Ongoing', icon: '🌾', color: 'sky', label: 'GT Ongoing' };
  }
  if (lower.includes('gt not started') || lower.includes('not started')) {
    return { name: 'GT Not Started', icon: '⏳', color: 'slate', label: 'GT Not Started' };
  }
  if (isComplete(v.gt_status)) {
    return { name: 'GT Completed', icon: '🌾', color: 'sky', label: 'GT Completed' };
  }
  return { name: stage || 'Under Survey', icon: '📍', color: 'slate', label: stage || 'Under Survey' };
}

function getStatusBadge(v) {
  const s = String(v.status || '').trim();
  const lower = s.toLowerCase();
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');

  if (isPorted || lower === 'completed') {
    return `<span class="badge-status badge-completed"><span class="badge-dot"></span>Completed</span>`;
  }
  if (lower === 'delayed' || (v.days_delayed && Number(v.days_delayed) > 0)) {
    const days = v.days_delayed ? ` (${v.days_delayed}d)` : '';
    return `<span class="badge-status badge-delayed"><span class="badge-dot"></span>Delayed${days}</span>`;
  }
  if (lower.includes('progress') || lower.includes('ongoing')) {
    return `<span class="badge-status badge-progress"><span class="badge-dot"></span>In Progress</span>`;
  }
  return `<span class="badge-status badge-pending"><span class="badge-dot"></span>Pending</span>`;
}

function getVillageResurveyProgress(v, store = {}) {
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
  const stage = String(v.current_stage || '').trim();
  const lower = stage.toLowerCase();
  const totExtent = parseFloat(v.extent) || 0;
  const totKhatas = Number(v.khatas) || Number(v.dlr_total_entries) || (totExtent > 0 ? Math.round(totExtent * 1.1) : 400);

  // Quick lookup in store.dlr_records if available
  let dlrRec = null;
  if (store && store.dlr_records && Array.isArray(store.dlr_records)) {
    const code = v.village_code ? String(v.village_code).trim() : '';
    const name = v.village_name ? String(v.village_name).trim().toLowerCase() : '';
    const mandal = (v.normalizedMandal || v.mandal) ? String(v.normalizedMandal || v.mandal).trim().toLowerCase() : '';
    dlrRec = store.dlr_records.find(r => 
      (code && String(r.village_code).trim() === code) ||
      (name && mandal && String(r.village_name).trim().toLowerCase() === name && String(r.mandal).trim().toLowerCase() === mandal)
    );
  }

  // 1. Webland 2.0 Ported / Completed
  if (isPorted || lower.includes('webland') || lower.includes('blockchain') || (v.status || '').toLowerCase() === 'completed') {
    return {
      stageKey: 'webland',
      stageLabel: 'Webland 2.0 Ported',
      stageIcon: '🌐',
      stageColor: 'teal',
      paramType: 'Webland 2.0',
      unit: 'Records',
      todayVal: 0,
      todayStr: '100% Ported',
      balVal: 0,
      balStr: '0 Pending',
      cumVal: totKhatas,
      totVal: totKhatas,
      pct: 100,
      htmlSummary: `<span class="param-tag tag-ported">🌐 100% Ported to Webland 2.0</span> <span class="param-sub-note">(0 Pending · Mutation Finalized)</span>`,
      pdfSummary: '100% Ported to Webland 2.0 (0 Pending)',
      isComplete: true
    };
  }

  // 2. Final RoR Completed / PPB Distribution
  if (lower.includes('final ror') || isComplete(v.final_ror_status)) {
    const targetPpb = parseInt(v.ppb_target) || parseInt(v.target_ppbs) || totKhatas;
    const distPpb = parseInt(v.ppb_distributed) || parseInt(v.ppbs_distributed) || 0;
    const balPpb = Math.max(0, targetPpb - distPpb);
    const todayPpb = parseInt(v.today_ppb) || 0;
    const pct = targetPpb > 0 ? Math.min(100, Math.round((distPpb / targetPpb) * 100)) : 100;
    return {
      stageKey: 'final_ror',
      stageLabel: 'Final RoR Completed',
      stageIcon: '📜',
      stageColor: 'emerald',
      paramType: 'PPBs Distribution',
      unit: 'PPBs',
      todayVal: todayPpb,
      todayStr: todayPpb > 0 ? `+${todayPpb} PPBs Today` : 'RoR Confirmed',
      balVal: balPpb,
      balStr: balPpb > 0 ? `${balPpb.toLocaleString()} PPBs Pending` : 'All Issued',
      cumVal: distPpb,
      totVal: targetPpb,
      pct,
      htmlSummary: `
        <div class="param-split-row">
          <span class="param-pill pill-today ${todayPpb > 0 ? 'active' : 'zero'}">${todayPpb > 0 ? `+${todayPpb} PPBs Today` : 'RoR Confirmed'}</span>
          <span class="param-pill pill-bal ${balPpb > 0 ? 'pending' : 'done'}">${balPpb > 0 ? `${balPpb.toLocaleString()} PPBs Pending` : '100% Issued'}</span>
        </div>
        <div class="param-sub-meta">Handover: <strong>${distPpb.toLocaleString()}</strong> / ${targetPpb.toLocaleString()} PPBs (${pct}%)</div>
      `,
      pdfSummary: balPpb > 0 ? `PPBs: ${distPpb}/${targetPpb} Handed (${balPpb} Pending)` : `Final RoR Done (${distPpb} PPBs Ready)`,
      isComplete: balPpb === 0
    };
  }

  // 3. Draft RoR & 13 Notice
  if (lower.includes('draft ror') || lower.includes('13 notification') || lower.includes('13 completed') || isComplete(v.draft_ror_status) || isComplete(v.section13_status)) {
    const claimsHeard = parseInt(v.claims_heard) || Math.round(totKhatas * 0.85);
    const balClaims = Math.max(0, totKhatas - claimsHeard);
    const todayClaims = parseInt(v.today_claims) || (lower.includes('draft') ? 5 : 0);
    const pct = totKhatas > 0 ? Math.min(100, Math.round((claimsHeard / totKhatas) * 100)) : 85;
    return {
      stageKey: 'draft_ror',
      stageLabel: 'Draft RoR & 13 Notice',
      stageIcon: '📑',
      stageColor: 'purple',
      paramType: 'Claims & 13 Notice',
      unit: 'Claims',
      todayVal: todayClaims,
      todayStr: todayClaims > 0 ? `+${todayClaims} Claims Today` : '13 Notice Issued',
      balVal: balClaims,
      balStr: `${balClaims} Objections Pending`,
      cumVal: claimsHeard,
      totVal: totKhatas,
      pct,
      htmlSummary: `
        <div class="param-split-row">
          <span class="param-pill pill-today ${todayClaims > 0 ? 'active' : 'zero'}">${todayClaims > 0 ? `+${todayClaims} Claims Today` : '13 Notice Issued'}</span>
          <span class="param-pill pill-bal pending">${balClaims} Objections Pending</span>
        </div>
        <div class="param-sub-meta">Draft 1B Published · Hearing Claims (${pct}%)</div>
      `,
      pdfSummary: `13 Notice Issued | ${balClaims} Objections Pending`,
      isComplete: false
    };
  }

  // Helper for DLR stages
  function makeDlrProgress(key, label, icon, officer) {
    const sd = (v.dlr_stages_detail && v.dlr_stages_detail[key]) || {};
    const today = (sd.today !== undefined && sd.today !== null) 
      ? Number(sd.today) 
      : (dlrRec && dlrRec.login_key === key ? Number(dlrRec.today) : (Number(v.dlr_entries_today) || 0));
    const cum = (sd.cumulative !== undefined && sd.cumulative !== null) 
      ? Number(sd.cumulative) 
      : (dlrRec && dlrRec.login_key === key ? Number(dlrRec.cumulative) : (Number(v.dlr_entries_cumulative) || 0));
    const bal = (sd.balance !== undefined && sd.balance !== null) 
      ? Number(sd.balance) 
      : (dlrRec && dlrRec.login_key === key ? Number(dlrRec.balance) : ((v.dlr_entries_balance !== undefined && v.dlr_entries_balance !== null) ? Number(v.dlr_entries_balance) : Math.max(0, totKhatas - cum)));
    const tot = (sd.total !== undefined && sd.total !== null) ? Number(sd.total) : totKhatas;
    const pct = tot > 0 ? Math.min(100, Math.round((cum / tot) * 100)) : 0;
    const isDone = isComplete(v[key]) || (bal === 0 && cum > 0);

    return {
      stageKey: key,
      stageLabel: label,
      stageIcon: icon,
      stageColor: 'amber',
      paramType: `${officer} Entries`,
      unit: 'Entries',
      todayVal: today,
      todayStr: today > 0 ? `+${today.toLocaleString()} Today` : '0 Today',
      balVal: bal,
      balStr: bal > 0 ? `${bal.toLocaleString()} Pending` : '0 Pending',
      cumVal: cum,
      totVal: tot,
      pct,
      htmlSummary: `
        <div class="param-split-row">
          <span class="param-pill pill-today ${today > 0 ? 'dlr-active' : 'zero'}">
            ${today > 0 ? `+${today.toLocaleString()} Entries Today` : '0 Entries Today'}
          </span>
          <span class="param-pill pill-bal ${bal > 0 ? 'pending' : 'done'}">
            ${bal > 0 ? `${bal.toLocaleString()} Entries Pending` : '0 Pending'}
          </span>
        </div>
        <div class="param-sub-meta">
          ${officer} Entries: <strong>${cum.toLocaleString()}</strong> / ${tot.toLocaleString()} Khatas (${pct}%)
        </div>
      `,
      pdfSummary: `Today: +${today} | Bal: ${bal} Entries (${officer})`,
      isComplete: isDone
    };
  }

  // 4. DLR @ JC Login
  if (lower.includes('jc login') || isComplete(v.jc_status) || v.jc_status === 'In Progress') {
    return makeDlrProgress('jc_status', 'DLR @ JC Login', '⚖️', 'JC Login');
  }

  // 5. DLR @ RDO Login
  if (lower.includes('rdo login') || lower.includes('rdo') || isComplete(v.rdo_status) || v.rdo_status === 'In Progress') {
    return makeDlrProgress('rdo_status', 'DLR @ RDO Login', '🏛️', 'RDO Login');
  }

  // 6. DLR @ Tahsildar Login
  if (lower.includes('tah login') || lower.includes('tahsildar') || isComplete(v.tahsildar_status) || v.tahsildar_status === 'In Progress') {
    return makeDlrProgress('tahsildar_status', 'DLR @ Tahsildar Login', '⭐', 'Tah Login');
  }

  // 7. DLR @ VRO Login
  if (lower.includes('vro login') || lower.includes('vro') || isComplete(v.vro_status) || v.vro_status === 'In Progress') {
    return makeDlrProgress('vro_status', 'DLR @ VRO Login', '🔐', 'VRO Login');
  }

  // 8. DLR @ VS Login (Village Surveyor)
  if (lower.includes('vs login') || lower.includes('surveyor') || isComplete(v.vs_status) || v.vs_status === 'In Progress') {
    return makeDlrProgress('vs_status', 'DLR @ VS Login', '🔐', 'VS Login');
  }

  // 9. Cadastral Vectorization
  if (lower.includes('vectorization') || lower.includes('correlation') || isComplete(v.vectorization_status) || v.vectorization_status === 'In Progress') {
    const isDone = isComplete(v.vectorization_status);
    return {
      stageKey: 'vectorization',
      stageLabel: 'Cadastral Vectorization',
      stageIcon: '📐',
      stageColor: 'indigo',
      paramType: 'Boundary Vectorization',
      unit: 'Boundaries',
      todayVal: isDone ? 1 : 0,
      todayStr: isDone ? 'Vectorized' : 'In Progress',
      balVal: isDone ? 0 : 1,
      balStr: isDone ? '0 Pending' : 'Vetting Pending',
      cumVal: isDone ? totExtent : 0,
      totVal: totExtent,
      pct: isDone ? 100 : 50,
      htmlSummary: `
        <div class="param-split-row">
          <span class="param-pill pill-today ${isDone ? 'done' : 'active'}">${isDone ? 'Vectorized' : 'In Progress'}</span>
          <span class="param-pill pill-bal ${isDone ? 'done' : 'pending'}">${isDone ? '0 Pending' : 'Vetting Pending'}</span>
        </div>
        <div class="param-sub-meta">Cadastral Map Correlation &amp; Boundary Linking</div>
      `,
      pdfSummary: isDone ? 'Vectorization Done (100%)' : 'Vectorization In Progress / Vetting Pending',
      isComplete: isDone
    };
  }

  // 10. Ground Truthing (GT)
  const isGtDone = isComplete(v.gt_status);
  const todayGt = parseFloat(v.today_gt_extent) || 0;
  const cumGt = parseFloat(v.cumulative_gt_extent) || (isGtDone ? totExtent : (v.gt_status === 'In Progress' ? Math.round(totExtent * 0.6 * 100) / 100 : 0));
  const balGt = (v.balance_gt_extent !== undefined && v.balance_gt_extent !== null) 
    ? parseFloat(v.balance_gt_extent) 
    : (isGtDone ? 0 : Math.max(0, Math.round((totExtent - cumGt) * 100) / 100));
  const pct = totExtent > 0 ? Math.min(100, Math.round((cumGt / totExtent) * 100)) : (isGtDone ? 100 : 0);
  const isNotStarted = lower.includes('not started') || (!isGtDone && cumGt === 0 && todayGt === 0);

  return {
    stageKey: 'gt_status',
    stageLabel: isGtDone ? 'GT Completed' : (isNotStarted ? 'GT Not Started' : 'GT Ongoing'),
    stageIcon: '🌾',
    stageColor: isGtDone ? 'emerald' : (isNotStarted ? 'slate' : 'sky'),
    paramType: 'GT Extent',
    unit: 'Acres',
    todayVal: todayGt,
    todayStr: todayGt > 0 ? `+${formatExtent(todayGt)} Ac Today` : '0.00 Ac Today',
    balVal: balGt,
    balStr: balGt > 0 ? `${formatExtent(balGt)} Ac Pending` : '0.00 Ac Pending',
    cumVal: cumGt,
    totVal: totExtent,
    pct,
    htmlSummary: isGtDone ? `
      <span class="param-tag tag-done">🌾 GT 100% Completed</span> <span class="param-sub-note">(${formatExtent(totExtent)} Ac Covered)</span>
    ` : `
      <div class="param-split-row">
        <span class="param-pill pill-today ${todayGt > 0 ? 'gt-active' : 'zero'}">
          ${todayGt > 0 ? `+${formatExtent(todayGt)} Ac Today` : '0.00 Ac Today'}
        </span>
        <span class="param-pill pill-bal ${balGt > 0 ? 'pending' : 'done'}">
          ${balGt > 0 ? `${formatExtent(balGt)} Ac Pending` : '0.00 Ac Pending'}
        </span>
      </div>
      <div class="param-sub-meta">
        GT Extent: <strong>${formatExtent(cumGt)}</strong> / ${formatExtent(totExtent)} Ac (${pct}%)
      </div>
    `,
    pdfSummary: isGtDone ? `GT Done (${formatExtent(totExtent)} Ac)` : `Today: +${formatExtent(todayGt)} Ac | Bal: ${formatExtent(balGt)} Ac (GT)`,
    isComplete: isGtDone
  };
}

function generateMandalReportHtml(store, options = {}) {
  const selectedMandal = (options.mandal && options.mandal !== 'All' && options.mandal !== '__ALL__') ? options.mandal : null;
  const selectedDivision = (options.division && options.division !== 'All') ? options.division : null;
  const selectedStage = (options.stage && options.stage !== 'All') ? options.stage : null;

  // Process all villages
  const allVillages = (store.villages || []).map(v => ({
    ...v,
    normalizedMandal: normalizeMandal(v.mandal, store)
  }));

  // Filter villages
  let filtered = allVillages;
  if (selectedMandal) {
    filtered = filtered.filter(v => v.normalizedMandal.toLowerCase() === selectedMandal.toLowerCase());
  }
  if (selectedDivision) {
    filtered = filtered.filter(v => (v.division || '').toLowerCase() === selectedDivision.toLowerCase());
  }
  if (selectedStage) {
    filtered = filtered.filter(v => {
      const b = getStageBadgeInfo(v);
      return b.name.toLowerCase().includes(selectedStage.toLowerCase());
    });
  }

  // Group by Mandal
  const mandalGroups = {};
  filtered.forEach(v => {
    const m = v.normalizedMandal || 'Unknown';
    if (!mandalGroups[m]) {
      mandalGroups[m] = {
        name: m,
        division: v.division || '—',
        villages: []
      };
    }
    mandalGroups[m].villages.push(v);
  });

  // Sort mandals alphabetically
  const mandalNames = Object.keys(mandalGroups).sort();

  // District/Filter aggregates
  const totalVillagesCount = filtered.length;
  let totalExtent = 0;
  let totalCompleted = 0;
  let totalInProgress = 0;
  let totalDelayed = 0;
  let totalPending = 0;
  let totalDlr = 0;
  let totalDraftRor = 0;
  let totalFinalRor = 0;
  let totalWebland = 0;
  let totalPpbTarget = 0;
  let totalPpbDistributed = 0;
  let totalTodayGt = 0;
  let totalTodayDlr = 0;

  mandalNames.forEach(name => {
    const mg = mandalGroups[name];
    // sort villages alphabetically within mandal
    mg.villages.sort((a, b) => (a.village_name || '').localeCompare(b.village_name || ''));

    mg.stats = {
      total: mg.villages.length,
      extent: 0,
      completed: 0,
      inProgress: 0,
      delayed: 0,
      pending: 0,
      dlr: 0,
      draftRor: 0,
      finalRor: 0,
      webland: 0,
      ppbTarget: 0,
      ppbDistributed: 0,
      todayGt: 0,
      todayDlr: 0,
      pendingGt: 0,
      pendingDlr: 0
    };

    mg.villages.forEach(v => {
      const ext = parseFloat(v.extent) || 0;
      mg.stats.extent += ext;
      totalExtent += ext;

      const prog = getVillageResurveyProgress(v, store);
      if (prog.stageKey === 'gt_status') {
        mg.stats.todayGt += prog.todayVal;
        totalTodayGt += prog.todayVal;
        mg.stats.pendingGt += prog.balVal;
      } else if (prog.stageKey.includes('status') || prog.stageKey.startsWith('dlr')) {
        mg.stats.todayDlr += prog.todayVal;
        totalTodayDlr += prog.todayVal;
        mg.stats.pendingDlr += prog.balVal;
      }

      const st = getStageBadgeInfo(v);
      const isPort = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
      const isComp = isPort || isComplete(v.status) || isComplete(v.final_ror_status);
      const isDel = !isComp && (v.status === 'Delayed' || Number(v.days_delayed) > 0);
      const isInProg = !isComp && !isDel && (String(v.status).toLowerCase().includes('progress') || v.dlr_active_stage || v.gt_status === 'In Progress');

      if (isComp) { mg.stats.completed++; totalCompleted++; }
      else if (isDel) { mg.stats.delayed++; totalDelayed++; }
      else if (isInProg) { mg.stats.inProgress++; totalInProgress++; }
      else { mg.stats.pending++; totalPending++; }

      if (st.name.startsWith('DLR')) { mg.stats.dlr++; totalDlr++; }
      if (st.name === 'Draft RoR') { mg.stats.draftRor++; totalDraftRor++; }
      if (st.name === 'Final RoR') { mg.stats.finalRor++; totalFinalRor++; }
      if (st.name === 'Webland 2.0 Ported' || isPort) { mg.stats.webland++; totalWebland++; }

      const targetPpb = parseInt(v.ppb_target) || parseInt(v.target_ppbs) || 0;
      const distPpb = parseInt(v.ppb_distributed) || parseInt(v.ppbs_distributed) || (isPort ? targetPpb : 0);
      mg.stats.ppbTarget += targetPpb;
      mg.stats.ppbDistributed += distPpb;
      totalPpbTarget += targetPpb;
      totalPpbDistributed += distPpb;
    });
  });

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Division color map
  function getDivisionTheme(div) {
    const d = String(div || '').toLowerCase();
    if (d.includes('chittoor')) return { bg: 'linear-gradient(135deg, #1e3a8a, #2563eb)', light: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' };
    if (d.includes('palamaner')) return { bg: 'linear-gradient(135deg, #065f46, #059669)', light: '#ecfdf5', border: '#a7f3d0', text: '#065f46' };
    if (d.includes('kuppam')) return { bg: 'linear-gradient(135deg, #4c1d95, #7c3aed)', light: '#f5f3ff', border: '#ddd6fe', text: '#4c1d95' };
    if (d.includes('nagari')) return { bg: 'linear-gradient(135deg, #78350f, #d97706)', light: '#fffbeb', border: '#fde68a', text: '#78350f' };
    return { bg: 'linear-gradient(135deg, #0f172a, #334155)', light: '#f8fafc', border: '#cbd5e1', text: '#0f172a' };
  }

  // Build HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chittoor District · Mandal-Wise Village Status Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e3a8a;
      --navy: #0b1329;
      --slate-dark: #1e293b;
      --emerald: #059669;
      --amber: #d97706;
      --purple: #7c3aed;
      --rose: #e11d48;
      --sky: #0284c7;
      --teal: #0d9488;
      --border: #e2e8f0;
      --bg: #f8fafc;
      --card-bg: #ffffff;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: #1e293b;
      line-height: 1.45;
      font-size: 11.5px;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .report-page-container {
      max-width: 1320px;
      margin: 0 auto;
      padding: 24px 20px 48px;
    }

    /* Interactive Floating Action Bar (hidden on print) */
    .report-floating-bar {
      position: sticky;
      top: 12px;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      padding: 10px 18px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      color: #fff;
    }

    .rfb-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .rfb-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rfb-title .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      display: inline-block;
    }

    .rfb-filters {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rfb-select {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      color: #fff;
      font-size: 11.5px;
      padding: 6px 10px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
    }
    .rfb-select option {
      background: #0f172a;
      color: #fff;
    }

    .rfb-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-pdf-download {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-pdf-download:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      transform: translateY(-1px);
    }

    .btn-print {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-print:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .btn-back {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-back:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }

    /* Executive Official Header */
    .report-executive-header {
      background: linear-gradient(135deg, #0b1329 0%, #1e293b 50%, #0f172a 100%);
      border-radius: 18px;
      padding: 26px 32px 22px;
      color: #ffffff;
      margin-bottom: 22px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
      position: relative;
      overflow: hidden;
    }

    .report-executive-header::after {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .header-top-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      padding-bottom: 18px;
      margin-bottom: 18px;
    }

    .gov-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .gov-emblem-badge {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
      flex-shrink: 0;
    }

    .gov-title-block h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.2px;
      color: #ffffff;
      margin-bottom: 3px;
    }

    .gov-title-block p.telugu-title {
      font-size: 13px;
      font-weight: 600;
      color: #fcd34d;
      margin-bottom: 2px;
    }

    .gov-title-block p.sub-dept {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-meta-box {
      text-align: right;
      flex-shrink: 0;
    }

    .report-tag-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fde68a;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .header-meta-time {
      font-size: 10px;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Executive KPI Grid */
    .executive-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
    }

    .exec-kpi-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .exec-kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .exec-kpi-card.kpi-blue::before { background: #38bdf8; }
    .exec-kpi-card.kpi-green::before { background: #34d399; }
    .exec-kpi-card.kpi-amber::before { background: #fbbf24; }
    .exec-kpi-card.kpi-purple::before { background: #a78bfa; }
    .exec-kpi-card.kpi-rose::before { background: #fb7185; }
    .exec-kpi-card.kpi-teal::before { background: #2dd4bf; }

    .exec-kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .exec-kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -0.5px;
    }

    .exec-kpi-sub {
      font-size: 9.5px;
      color: #cbd5e1;
      margin-top: 2px;
      font-weight: 500;
    }

    /* Stage Color Legend Banner */
    .stage-legend-strip {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 10px 16px;
      margin-bottom: 22px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .legend-title {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--slate-dark);
      margin-right: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-items {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      flex: 1;
    }

    .legend-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      border: 1px solid transparent;
    }

    /* Mandal Section Cards */
    .mandal-report-block {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
      overflow: hidden;
      page-break-inside: avoid;
    }

    .mandal-banner-head {
      padding: 14px 20px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .mandal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .mandal-idx-badge {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.22);
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'JetBrains Mono', monospace;
    }

    .mandal-name-heading {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.2px;
      color: #ffffff;
    }

    .mandal-div-pill {
      font-size: 10px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 9999px;
      padding: 2px 10px;
      letter-spacing: 0.3px;
    }

    .mandal-stat-pills {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .msp-item {
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 10.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .msp-item strong {
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
    }

    .msp-item.comp { background: rgba(16, 185, 129, 0.25); border-color: rgba(16, 185, 129, 0.45); color: #a7f3d0; }
    .msp-item.del { background: rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.45); color: #fecaca; }

    /* Village Table */
    .village-table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .village-data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      text-align: left;
    }

    .village-data-table thead th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 12px;
      border-bottom: 2px solid var(--border);
      white-space: nowrap;
    }

    .village-data-table tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background-color 0.1s ease;
    }

    .village-data-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .village-data-table tbody tr:hover {
      background-color: #f1f5f9;
    }

    .village-data-table td {
      padding: 8px 12px;
      vertical-align: middle;
      color: #1e293b;
    }

    .td-num {
      font-family: 'JetBrains Mono', monospace;
      color: #64748b;
      font-size: 10px;
      width: 32px;
    }

    .td-code {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #475569;
      font-size: 10px;
    }

    .td-vname {
      font-weight: 700;
      color: #0f172a;
      font-size: 11.5px;
    }

    .td-extent {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      text-align: right;
      color: #0f172a;
    }

    .td-right { text-align: right; }

    /* Phase Badges */
    .phase-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      background: #e2e8f0;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-badge.p1 { background: #dbeafe; color: #1e40af; }
    .phase-badge.p2 { background: #ede9fe; color: #5b21b6; }
    .phase-badge.p3 { background: #e0e7ff; color: #3730a3; }
    .phase-badge.p4 { background: #fef3c7; color: #92400e; }
    .phase-badge.p5 { background: #fae8ff; color: #86198f; }

    /* Stage Badges */
    .stage-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 700;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .stage-badge-pill.teal { background: #ccfbf1; color: #0f766e; border-color: #99f6e4; }
    .stage-badge-pill.emerald { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
    .stage-badge-pill.purple { background: #ede9fe; color: #5b21b6; border-color: #ddd6fe; }
    .stage-badge-pill.amber { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .stage-badge-pill.indigo { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
    .stage-badge-pill.sky { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .stage-badge-pill.slate { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }

    /* Status Badges */
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .badge-completed { background: #dcfce7; color: #15803d; }
    .badge-completed .badge-dot { background: #16a34a; }

    .badge-progress { background: #fef3c7; color: #b45309; }
    .badge-progress .badge-dot { background: #f59e0b; }

    .badge-delayed { background: #fee2e2; color: #b91c1c; }
    .badge-delayed .badge-dot { background: #ef4444; }

    .badge-pending { background: #f1f5f9; color: #64748b; }
    .badge-pending .badge-dot { background: #94a3b8; }

    /* Parameter Progress Badges & Layout */
    .param-progress-col {
      min-width: 250px;
    }
    .param-split-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .param-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2.5px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -0.2px;
      white-space: nowrap;
    }
    .param-pill.gt-active {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .param-pill.dlr-active {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    .param-pill.zero {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }
    .param-pill.pending {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .param-pill.done {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .param-sub-meta {
      font-size: 9px;
      color: #64748b;
      margin-top: 3px;
      font-family: 'Inter', sans-serif;
    }
    .param-sub-meta strong {
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
    }
    .param-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .param-tag.tag-ported {
      background: #ccfbf1;
      color: #0f766e;
      border: 1px solid #99f6e4;
    }
    .param-tag.tag-done {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .param-sub-note {
      font-size: 9.5px;
      color: #64748b;
      margin-left: 4px;
    }

    /* Subtotal Footer Row */
    .village-data-table tfoot tr {
      background: #f8fafc;
      border-top: 2px solid var(--border);
      font-weight: 800;
      color: #0f172a;
    }

    .village-data-table tfoot td {
      padding: 10px 12px;
      font-size: 11px;
    }

    /* Print Specific Rules */
    @media print {
      body {
        background-color: #ffffff;
        font-size: 9.5px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print, .report-floating-bar {
        display: none !important;
      }
      .report-page-container {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .report-executive-header {
        border-radius: 6px;
        padding: 14px 18px;
        margin-bottom: 12px;
        box-shadow: none;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .mandal-report-block {
        border-radius: 6px;
        margin-bottom: 14px;
        box-shadow: none;
        break-inside: auto;
      }
      .mandal-banner-head {
        padding: 6px 12px;
        break-after: avoid;
        page-break-after: avoid;
      }
      .village-data-table {
        page-break-inside: auto;
      }
      .village-data-table thead {
        display: table-header-group !important;
      }
      .village-data-table tfoot {
        display: table-footer-group !important;
      }
      .village-data-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .village-data-table td, .village-data-table thead th {
        padding: 4px 6px;
        font-size: 9px;
      }
      @page {
        size: A4 landscape;
        margin: 8mm 6mm;
      }
    }
  </style>
</head>
<body>

<div class="report-page-container">

  <!-- Interactive Floating Bar for in-browser viewer -->
  <div class="report-floating-bar no-print">
    <div class="rfb-left">
      <a href="/#mandal_plan" class="btn-back">← Dashboard</a>
      <span class="rfb-title">
        <span class="live-dot"></span>
        Mandal-Wise Village Status Report
      </span>
      <div class="rfb-filters">
        <select class="rfb-select" id="mandalSelect" onchange="window.location.search = '?mandal=' + encodeURIComponent(this.value)">
          <option value="All" ${!selectedMandal ? 'selected' : ''}>All Mandals (${mandalNames.length} Mandals · ${totalVillagesCount} Villages)</option>
          ${[...new Set(allVillages.map(v => v.normalizedMandal))].sort().map(m => `
            <option value="${h(m)}" ${selectedMandal === m ? 'selected' : ''}>${h(m)}</option>
          `).join('')}
        </select>
      </div>
    </div>
    <div class="rfb-actions">
      <a href="/api/reports/mandal-villages-pdf${selectedMandal ? `?mandal=${encodeURIComponent(selectedMandal)}` : ''}" class="btn-pdf-download" download>
        ⬇️ Download PDF
      </a>
      <button class="btn-print" onclick="window.print()">
        🖨️ Print / Save PDF
      </button>
    </div>
  </div>

  <!-- Executive Official Header -->
  <header class="report-executive-header">
    <div class="header-top-row">
      <div class="gov-brand">
        <div class="gov-emblem-badge">🏛️</div>
        <div class="gov-title-block">
          <p class="telugu-title">ఆంధ్రప్రదేశ్ ప్రభుత్వం · రెవెన్యూ సర్వే &amp; ల్యాండ్ రికార్డ్స్ విభాగం</p>
          <h1>GOVERNMENT OF ANDHRA PRADESH</h1>
          <p class="sub-dept">District Survey and Land Records Office · Chittoor District</p>
        </div>
      </div>
      <div class="header-meta-box">
        <span class="report-tag-pill">📄 A.P. Resurvey Project 2.0</span>
        <div class="header-meta-time">Generated: ${h(generatedDate)}</div>
        <div class="header-meta-time" style="margin-top:2px;color:#cbd5e1;">Universe: <strong>${totalVillagesCount} Villages</strong> across <strong>${mandalNames.length} Mandals</strong></div>
      </div>
    </div>

    <!-- Executive KPI Grid -->
    <div class="executive-kpi-grid">
      <div class="exec-kpi-card kpi-blue">
        <span class="exec-kpi-label">Total Mandals</span>
        <span class="exec-kpi-val">${mandalNames.length}</span>
        <span class="exec-kpi-sub">Standardized Universe</span>
      </div>
      <div class="exec-kpi-card kpi-blue">
        <span class="exec-kpi-label">Total Villages</span>
        <span class="exec-kpi-val">${totalVillagesCount}</span>
        <span class="exec-kpi-sub">Revenue Villages</span>
      </div>
      <div class="exec-kpi-card kpi-green">
        <span class="exec-kpi-label">Completed / Ported</span>
        <span class="exec-kpi-val">${totalCompleted}</span>
        <span class="exec-kpi-sub">${totalVillagesCount > 0 ? Math.round((totalCompleted / totalVillagesCount) * 100) : 0}% district completion</span>
      </div>
      <div class="exec-kpi-card kpi-amber">
        <span class="exec-kpi-label">In Progress (DLR/GT)</span>
        <span class="exec-kpi-val">${totalInProgress}</span>
        <span class="exec-kpi-sub">Active fieldwork &amp; logins</span>
      </div>
      <div class="exec-kpi-card kpi-purple">
        <span class="exec-kpi-label">DLR Active Logins</span>
        <span class="exec-kpi-val">${totalDlr}</span>
        <span class="exec-kpi-sub">VS / VRO / Tah / RDO / JC</span>
      </div>
      <div class="exec-kpi-card kpi-rose">
        <span class="exec-kpi-label">Delayed Villages</span>
        <span class="exec-kpi-val">${totalDelayed}</span>
        <span class="exec-kpi-sub">Target review priority</span>
      </div>
      <div class="exec-kpi-card kpi-teal">
        <span class="exec-kpi-label">Total Extent</span>
        <span class="exec-kpi-val">${formatExtent(totalExtent)}</span>
        <span class="exec-kpi-sub">Acres Surveyed/Target</span>
      </div>
      <div class="exec-kpi-card kpi-green">
        <span class="exec-kpi-label">Today's GT Out-turn</span>
        <span class="exec-kpi-val">+${formatExtent(totalTodayGt)}</span>
        <span class="exec-kpi-sub">Acres completed today</span>
      </div>
      <div class="exec-kpi-card kpi-blue">
        <span class="exec-kpi-label">Today's DLR Logins</span>
        <span class="exec-kpi-val">+${totalTodayDlr.toLocaleString('en-IN')}</span>
        <span class="exec-kpi-sub">Entries cleared today</span>
      </div>
    </div>
  </header>

  <!-- Stage Color Legend -->
  <div class="stage-legend-strip">
    <span class="legend-title">🔘 Stage Legend:</span>
    <div class="legend-items">
      <span class="legend-pill" style="background:#ccfbf1;color:#0f766e;border-color:#99f6e4;">🌐 Webland 2.0 Ported</span>
      <span class="legend-pill" style="background:#d1fae5;color:#065f46;border-color:#a7f3d0;">📜 Final RoR Completed</span>
      <span class="legend-pill" style="background:#ede9fe;color:#5b21b6;border-color:#ddd6fe;">📑 Draft RoR &amp; 13 Notice</span>
      <span class="legend-pill" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">🔐 DLR Login Tiers (VS/VRO/Tah/RDO/JC)</span>
      <span class="legend-pill" style="background:#e0e7ff;color:#3730a3;border-color:#c7d2fe;">📐 Vectorization</span>
      <span class="legend-pill" style="background:#e0f2fe;color:#0369a1;border-color:#bae6fd;">🌾 Ground Truthing (GT)</span>
      <span class="legend-pill" style="background:#f1f5f9;color:#475569;border-color:#e2e8f0;">⏳ GT Not Started / Under Survey</span>
    </div>
  </div>

  <!-- Mandal Wise Sections -->
  ${mandalNames.map((mName, mIdx) => {
    const mg = mandalGroups[mName];
    const theme = getDivisionTheme(mg.division);
    const compPct = mg.stats.total > 0 ? Math.round((mg.stats.completed / mg.stats.total) * 100) : 0;

    return `
      <section class="mandal-report-block" id="mandal-${h(mName.toLowerCase().replace(/\\s+/g, '-'))}">
        <!-- Mandal Header Band -->
        <div class="mandal-banner-head" style="background:${theme.bg};">
          <div class="mandal-title-group">
            <span class="mandal-idx-badge">${mIdx + 1}</span>
            <h2 class="mandal-name-heading">${h(mName)} Mandal</h2>
            <span class="mandal-div-pill">${h(mg.division)} Division</span>
          </div>

          <div class="mandal-stat-pills">
            <span class="msp-item">Villages: <strong>${mg.stats.total}</strong></span>
            <span class="msp-item comp">Completed: <strong>${mg.stats.completed} (${compPct}%)</strong></span>
            ${mg.stats.inProgress > 0 ? `<span class="msp-item">In Progress: <strong>${mg.stats.inProgress}</strong></span>` : ''}
            ${mg.stats.dlr > 0 ? `<span class="msp-item">DLR: <strong>${mg.stats.dlr}</strong></span>` : ''}
            ${mg.stats.delayed > 0 ? `<span class="msp-item del">Delayed: <strong>${mg.stats.delayed}</strong></span>` : ''}
            <span class="msp-item">Extent: <strong>${formatExtent(mg.stats.extent)} Ac</strong></span>
          </div>
        </div>

        <!-- Village Table for this Mandal -->
        <div class="village-table-wrap">
          <table class="village-data-table">
            <thead>
              <tr>
                <th class="td-num">#</th>
                <th>Village Code</th>
                <th>Village Name</th>
                <th>Phase</th>
                <th class="td-right">Extent (Ac)</th>
                <th>Resurvey Status</th>
                <th class="param-progress-col">Parameter Progress (Today Completed / Extent or Entries Pending)</th>
                <th>PPB Target / Handover</th>
                <th>Target Date</th>
              </tr>
            </thead>
            <tbody>
              ${mg.villages.map((v, vIdx) => {
                const stageInfo = getStageBadgeInfo(v);
                const statusHtml = getStatusBadge(v);
                const progress = getVillageResurveyProgress(v, store);
                const phaseClass = v.phase ? `p${v.phase.replace(/[^0-9]/g, '') || '1'}` : '';
                const targetPpb = parseInt(v.ppb_target) || parseInt(v.target_ppbs) || 0;
                const isPort = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
                const distPpb = parseInt(v.ppb_distributed) || parseInt(v.ppbs_distributed) || (isPort ? targetPpb : 0);
                const ppbText = targetPpb > 0 ? `${distPpb.toLocaleString()} / ${targetPpb.toLocaleString()}` : (isPort ? 'Ported' : '—');

                return `
                  <tr>
                    <td class="td-num">${vIdx + 1}</td>
                    <td class="td-code">${h(v.village_code || '—')}</td>
                    <td class="td-vname">${h(v.village_name || '—')}</td>
                    <td><span class="phase-badge ${phaseClass}">${h(v.phase || '—')}</span></td>
                    <td class="td-extent">${formatExtent(v.extent)}</td>
                    <td>
                      <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
                        <span class="stage-badge-pill ${progress.stageColor}">
                          ${progress.stageIcon} ${h(progress.stageLabel)}
                        </span>
                        ${statusHtml}
                      </div>
                    </td>
                    <td class="param-progress-col">
                      ${progress.htmlSummary}
                    </td>
                    <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${ppbText}</td>
                    <td style="color:#64748b;font-size:10px;">${h(v.target_date || '—')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right;">Subtotal for ${h(mName)} Mandal (${mg.stats.total} Villages):</td>
                <td class="td-extent">${formatExtent(mg.stats.extent)} Ac</td>
                <td colspan="4" style="color:#64748b;font-weight:600;">
                  ${mg.stats.completed} Completed · ${mg.stats.inProgress} In Progress · ${mg.stats.delayed} Delayed · ${mg.stats.pending} Pending
                  ${mg.stats.todayGt > 0 ? ` · <strong style="color:#059669;">+${formatExtent(mg.stats.todayGt)} Ac GT Today</strong>` : ''}
                  ${mg.stats.todayDlr > 0 ? ` · <strong style="color:#2563eb;">+${mg.stats.todayDlr.toLocaleString('en-IN')} DLR Today</strong>` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;
  }).join('')}

  <!-- Official Footer -->
  <footer style="margin-top:30px;padding-top:16px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:center;color:#64748b;font-size:10.5px;">
    <div>
      <strong>District Survey and Land Records Office</strong> · Collectorate Complex, Chittoor District, Andhra Pradesh
    </div>
    <div style="font-family:'JetBrains Mono',monospace;">
      Official Status Report · Generated on ${h(generatedDate)}
    </div>
  </footer>

</div>

</body>
</html>`;
}

function escapePdfText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Standard printable ASCII
}

function getCleanStageName(v) {
  const stage = String(v.current_stage || '').trim();
  const lower = stage.toLowerCase();
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');

  if (isPorted || lower.includes('webland') || lower.includes('ported')) return 'Webland 2.0 Ported';
  if (lower.includes('final ror') || isComplete(v.final_ror_status)) return 'Final RoR Completed';
  if (lower.includes('draft ror') || lower.includes('13 notification') || isComplete(v.draft_ror_status)) return 'Draft RoR & 13 Notice';
  if (lower.includes('jc login') || isComplete(v.jc_status) || v.jc_status === 'In Progress') return 'DLR @ JC Login';
  if (lower.includes('rdo login') || lower.includes('rdo') || isComplete(v.rdo_status) || v.rdo_status === 'In Progress') return 'DLR @ RDO Login';
  if (lower.includes('tah login') || lower.includes('tahsildar') || isComplete(v.tahsildar_status) || v.tahsildar_status === 'In Progress') return 'DLR @ Tahsildar Login';
  if (lower.includes('vro login') || lower.includes('vro') || isComplete(v.vro_status) || v.vro_status === 'In Progress') return 'DLR @ VRO Login';
  if (lower.includes('vs login') || lower.includes('surveyor') || isComplete(v.vs_status) || v.vs_status === 'In Progress') return 'DLR @ VS Login';
  if (lower.includes('vectorization') || lower.includes('correlation') || isComplete(v.vectorization_status)) return 'Cadastral Vectorization';
  if (lower.includes('gt ongoing') || lower.includes('gt in progress') || v.gt_status === 'In Progress') return 'Ground Truthing Ongoing';
  if (lower.includes('gt not started') || lower.includes('not started')) return 'GT Not Started';
  if (isComplete(v.gt_status)) return 'GT Completed';
  return stage || 'Under Survey';
}

function generatePureMandalPdf(store, options = {}) {
  const selectedMandal = (options.mandal && options.mandal !== 'All' && options.mandal !== '__ALL__') ? options.mandal.trim() : null;
  const selectedDivision = (options.division && options.division !== 'All') ? options.division.trim() : null;
  const selectedStage = (options.stage && options.stage !== 'All') ? options.stage.trim() : null;

  // Filter villages
  let villages = (store && store.villages) || [];
  if (selectedMandal) {
    villages = villages.filter(v => (v.mandal || '').toLowerCase() === selectedMandal.toLowerCase());
  }
  if (selectedDivision) {
    villages = villages.filter(v => (v.division || '').toLowerCase() === selectedDivision.toLowerCase());
  }
  if (selectedStage) {
    villages = villages.filter(v => (v.current_stage || '').toLowerCase().includes(selectedStage.toLowerCase()));
  }

  // Group by mandal
  const mandalGroups = {};
  villages.forEach(v => {
    const m = (v.mandal || 'Chittoor').trim();
    if (!mandalGroups[m]) {
      mandalGroups[m] = {
        name: m,
        division: v.division || 'Chittoor',
        villages: []
      };
    }
    mandalGroups[m].villages.push(v);
  });

  const mandalNames = Object.keys(mandalGroups).sort((a, b) => a.localeCompare(b));

  // Columns definition (Total = 778 pt)
  const cols = [
    { label: '#', width: 22, align: 'center' },
    { label: 'Village Code', width: 56, align: 'center' },
    { label: 'Village Name', width: 124, align: 'left' },
    { label: 'Phase', width: 42, align: 'center' },
    { label: 'Extent (Ac)', width: 58, align: 'right' },
    { label: 'Resurvey Status', width: 112, align: 'left' },
    { label: 'Parameter Progress (Today / Pending)', width: 224, align: 'left' },
    { label: 'PPB / LPMs', width: 72, align: 'center' },
    { label: 'Target Date', width: 68, align: 'center' }
  ];

  // Aggregates
  const totalVillages = villages.length;
  const totalExtent = villages.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
  const totalCompleted = villages.filter(v => (v.status || '').toLowerCase() === 'completed' || v.ported_to_webland).length;
  const totalDelayed = villages.filter(v => (v.status || '').toLowerCase() === 'delayed' || Number(v.days_delayed) > 0).length;
  const totalInProgress = villages.filter(v => (v.status || '').toLowerCase().includes('progress') || v.gt_status === 'In Progress').length;
  const totalDlr = villages.filter(v => (v.current_stage || '').toLowerCase().includes('dlr') || (v.dlr_entries_balance || 0) > 0).length;

  const pages = [];
  let currentPageOps = [];
  let curY = pageHeight - marginTop;

  function startNewPage() {
    if (currentPageOps.length > 0) {
      pages.push(currentPageOps.join('\n'));
    }
    currentPageOps = [];
    curY = pageHeight - marginTop;
  }

  function drawRect(x, y, w, h, r, g, b, strokeR, strokeG, strokeB) {
    let s = `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`;
    if (strokeR !== undefined) {
      s += ` ${strokeR.toFixed(3)} ${strokeG.toFixed(3)} ${strokeB.toFixed(3)} RG 0.5 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`;
    }
    currentPageOps.push(s);
  }

  function drawLine(x1, y1, x2, y2, r, g, b, w = 0.5) {
    currentPageOps.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${w.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  function drawText(text, x, y, font = '/F1', size = 8, r = 0, g = 0, b = 0) {
    const esc = escapePdfText(text);
    currentPageOps.push(`BT ${font} ${size.toFixed(1)} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc}) Tj ET`);
  }

  function drawHeaderBanner(pageNum, isFirstPage) {
    const nowStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (isFirstPage) {
      // Full executive top banner
      const bannerH = 36;
      drawRect(marginLeft, curY - bannerH, contentWidth, bannerH, 0.059, 0.090, 0.161); // #0f1729
      drawText('GOVERNMENT OF ANDHRA PRADESH', marginLeft + 12, curY - 14, '/F2', 11, 1, 1, 1);
      drawText('District Survey and Land Records Office · Chittoor District', marginLeft + 12, curY - 26, '/F1', 7.5, 0.70, 0.75, 0.85);

      const titleText = selectedMandal
        ? `MANDAL RESURVEY STATUS REPORT: ${selectedMandal.toUpperCase()} MANDAL`
        : 'DISTRICT MANDAL-WISE VILLAGE RESURVEY STATUS REPORT';
      drawText(titleText, marginLeft + 245, curY - 14, '/F2', 9.5, 0.984, 0.796, 0.196); // Gold #facc15
      drawText(`A.P. Resurvey Project 2.0 · Generated: ${nowStr} · Universe: ${totalVillages} Villages across ${mandalNames.length} Mandals`, marginLeft + 245, curY - 26, '/F1', 7.5, 0.8, 0.85, 0.92);

      curY -= (bannerH + 8);

      // 6 KPI Summary Cards on Page 1
      const kpiCount = 6;
      const kpiGap = 6;
      const kpiW = (contentWidth - ((kpiCount - 1) * kpiGap)) / kpiCount;
      const kpiH = 34;
      const kpiY = curY - kpiH;

      const kpiData = [
        { label: 'TOTAL MANDALS', val: String(mandalNames.length), sub: 'Chittoor District', r: 0.15, g: 0.39, b: 0.92 },
        { label: 'TOTAL VILLAGES', val: String(totalVillages), sub: 'Revenue Villages', r: 0.15, g: 0.39, b: 0.92 },
        { label: 'TOTAL EXTENT', val: `${formatExtent(totalExtent)} Ac`, sub: 'Target Acreage', r: 0.02, g: 0.58, b: 0.41 },
        { label: 'COMPLETED / PORTED', val: String(totalCompleted), sub: `${Math.round(totalCompleted / (totalVillages || 1) * 100)}% Milestone`, r: 0.02, g: 0.58, b: 0.41 },
        { label: 'DLR ENTRIES STAGE', val: String(totalDlr), sub: 'Khatas Verification', r: 0.85, g: 0.47, b: 0.02 },
        { label: 'DELAYED / LAGGING', val: String(totalDelayed), sub: 'Priority Attention', r: 0.88, g: 0.11, b: 0.28 }
      ];

      kpiData.forEach((k, idx) => {
        const kX = marginLeft + idx * (kpiW + kpiGap);
        drawRect(kX, kpiY, kpiW, kpiH, 0.975, 0.982, 0.992, 0.85, 0.88, 0.92);
        drawRect(kX, kpiY + kpiH - 2.5, kpiW, 2.5, k.r, k.g, k.b); // Color stripe
        drawText(k.label, kX + 6, kpiY + kpiH - 10, '/F2', 6.5, 0.40, 0.45, 0.55);
        drawText(k.val, kX + 6, kpiY + kpiH - 22, '/F2', 9.5, 0.06, 0.09, 0.16);
        drawText(k.sub, kX + 6, kpiY + 4, '/F1', 6.5, 0.50, 0.55, 0.65);
      });

      curY = kpiY - 12;
    } else {
      // Subsequent pages: compact header banner
      const bannerH = 22;
      drawRect(marginLeft, curY - bannerH, contentWidth, bannerH, 0.059, 0.090, 0.161);
      drawText('GOVERNMENT OF ANDHRA PRADESH · District Survey and Land Records Office · Chittoor', marginLeft + 10, curY - 14, '/F2', 8.5, 1, 1, 1);
      const subTitle = selectedMandal ? `${selectedMandal.toUpperCase()} MANDAL REPORT` : 'DISTRICT MANDAL-WISE VILLAGE STATUS REPORT';
      drawText(`${subTitle} (Contd.)`, marginLeft + contentWidth - 280, curY - 14, '/F2', 8, 0.984, 0.796, 0.196);
      curY -= (bannerH + 6);
    }
  }

  function drawTableHeader() {
    const thH = 16;
    const thY = curY - thH;
    drawRect(marginLeft, thY, contentWidth, thH, 0.118, 0.161, 0.235); // #1e293b

    let curX = marginLeft;
    cols.forEach(c => {
      let tX = curX + 4;
      if (c.align === 'center') {
        tX = curX + (c.width / 2) - (c.label.length * 2.1);
      } else if (c.align === 'right') {
        tX = curX + c.width - (c.label.length * 4.4) - 4;
      }
      drawText(c.label, tX, thY + 4.5, '/F2', 7.5, 1, 1, 1);
      curX += c.width;
    });

    curY = thY;
  }

  // Initialize Page 1
  startNewPage();
  drawHeaderBanner(1, true);
  drawTableHeader();

  let globalVIdx = 0;

  if (villages.length === 0) {
    const emptyH = 80;
    const emptyY = curY - emptyH - 20;
    drawRect(marginLeft, emptyY, contentWidth, emptyH, 0.98, 0.98, 0.99, 0.85, 0.88, 0.92);
    drawText('NO VILLAGE RECORDS FOUND MATCHING CURRENT FILTER CRITERIA', marginLeft + 180, emptyY + 46, '/F2', 10, 0.2, 0.25, 0.35);
    drawText('Please reset filter selections to view district villages.', marginLeft + 230, emptyY + 28, '/F1', 8.5, 0.5, 0.55, 0.65);
    curY = emptyY;
  } else {
    mandalNames.forEach((mName, mIdx) => {
      const mg = mandalGroups[mName];
      const mVillages = mg.villages;
      const mExtent = mVillages.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
      const mComp = mVillages.filter(v => (v.status || '').toLowerCase() === 'completed' || v.ported_to_webland).length;
      const mDel = mVillages.filter(v => (v.status || '').toLowerCase() === 'delayed' || Number(v.days_delayed) > 0).length;

      // Check if room for Mandal Banner + at least 2 village rows (18 + 30 = 48 pt)
      if (curY < marginBottom + 60) {
        startNewPage();
        drawHeaderBanner(pages.length + 1, false);
        drawTableHeader();
      }

      // Mandal Section Banner Bar
      const mBannerH = 17;
      const mBannerY = curY - mBannerH;
      drawRect(marginLeft, mBannerY, contentWidth, mBannerH, 0.933, 0.949, 0.976, 0.78, 0.84, 0.92);
      drawRect(marginLeft, mBannerY, 3.5, mBannerH, 0.086, 0.231, 0.541); // Deep navy accent left stripe

      drawText(`MANDAL ${mIdx + 1}: ${mName.toUpperCase()} (${mg.division} Division)`, marginLeft + 9, mBannerY + 5, '/F2', 8.5, 0.06, 0.16, 0.38);
      const mStatsStr = `Villages: ${mVillages.length}  |  Completed: ${mComp}  |  Delayed: ${mDel}  |  Extent: ${formatExtent(mExtent)} Ac`;
      drawText(mStatsStr, marginLeft + contentWidth - 280, mBannerY + 5, '/F2', 7.5, 0.15, 0.25, 0.35);

      curY = mBannerY;

      // Village Rows
      mVillages.forEach((v, vIdx) => {
        const rowH = 15;
        if (curY - rowH < marginBottom + 16) {
          startNewPage();
          drawHeaderBanner(pages.length + 1, false);
          drawTableHeader();
        }

        const rowY = curY - rowH;
        const isAlt = (vIdx % 2 === 1);
        if (isAlt) {
          drawRect(marginLeft, rowY, contentWidth, rowH, 0.976, 0.984, 0.992); // Clean zebra
        }
        drawLine(marginLeft, rowY, marginLeft + contentWidth, rowY, 0.902, 0.922, 0.941);

        globalVIdx++;
        let curX = marginLeft;
        const progress = getVillageResurveyProgress(v, store);

        // 1. #
        drawText(String(globalVIdx), curX + 6, rowY + 4, '/F1', 7.5, 0.40, 0.45, 0.52);
        curX += cols[0].width;

        // 2. Village Code
        drawText(String(v.village_code || '—'), curX + 8, rowY + 4, '/F3', 7.5, 0.10, 0.20, 0.40);
        curX += cols[1].width;

        // 3. Village Name
        const vName = (v.village_name || '—').slice(0, 24);
        drawText(vName, curX + 4, rowY + 4, '/F2', 8, 0.06, 0.09, 0.16);
        curX += cols[2].width;

        // 4. Phase
        const phase = String(v.phase || '—').replace('Phase ', 'P-');
        drawText(phase, curX + 6, rowY + 4, '/F1', 7.5, 0.30, 0.35, 0.42);
        curX += cols[3].width;

        // 5. Extent (Ac)
        const extStr = formatExtent(v.extent);
        drawText(extStr, curX + cols[4].width - (extStr.length * 4.4) - 4, rowY + 4, '/F3', 7.5, 0.05, 0.12, 0.28);
        curX += cols[4].width;

        // 6. Resurvey Status
        const stage = progress.stageLabel.slice(0, 21);
        drawText(stage, curX + 4, rowY + 4, '/F2', 7.2, 0.12, 0.25, 0.55);
        curX += cols[5].width;

        // 7. Parameter Progress (Today Completed / Pending Balance)
        const progText = progress.pdfSummary.slice(0, 52);
        let pR = 0.10, pG = 0.15, pB = 0.25;
        if (progress.todayVal > 0) {
          pR = 0.05; pG = 0.45; pB = 0.20; // Green for positive outturn today
        } else if (progress.isComplete) {
          pR = 0.05; pG = 0.40; pB = 0.50; // Teal for complete
        }
        drawText(progText, curX + 4, rowY + 4, '/F2', 7.0, pR, pG, pB);
        curX += cols[6].width;

        // 8. PPB / LPMs
        const ppbTarget = parseInt(v.ppb_target) || parseInt(v.target_ppbs) || 0;
        const isPort = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
        const lpms = parseInt(v.lpms) || parseInt(v.lpms_arrived) || 0;
        let ppbStr = '—';
        if (isPort) ppbStr = 'Ported';
        else if (ppbTarget > 0) ppbStr = `${ppbTarget} PPBs`;
        else if (lpms > 0) ppbStr = `${lpms} LPMs`;
        drawText(ppbStr, curX + (cols[7].width / 2) - (ppbStr.length * 2.1), rowY + 4, '/F3', 7.2, 0.25, 0.30, 0.38);
        curX += cols[7].width;

        // 9. Target Date
        const tDate = String(v.target_date || '—').slice(0, 10);
        drawText(tDate, curX + 8, rowY + 4, '/F1', 7.2, 0.40, 0.45, 0.52);

        curY = rowY;
      });

      // Mandal Subtotal Row
      const subH = 15;
      if (curY - subH < marginBottom + 16) {
        startNewPage();
        drawHeaderBanner(pages.length + 1, false);
        drawTableHeader();
      }
      const subY = curY - subH;
      drawRect(marginLeft, subY, contentWidth, subH, 0.945, 0.957, 0.973);
      drawLine(marginLeft, subY, marginLeft + contentWidth, subY, 0.75, 0.80, 0.88);
      drawText(`Subtotal ${mName} Mandal (${mVillages.length} Villages):`, marginLeft + 70, subY + 4, '/F2', 7.5, 0.08, 0.12, 0.22);

      const subExt = `${formatExtent(mExtent)} Ac`;
      drawText(subExt, marginLeft + 242 + 52 + cols[4].width - (subExt.length * 4.6) - 4, subY + 4, '/F4', 7.5, 0.05, 0.12, 0.28);
      drawText(`Completed: ${mComp}  |  In Progress: ${mVillages.length - mComp - mDel}  |  Delayed: ${mDel}`, marginLeft + 420, subY + 4, '/F2', 7.5, 0.18, 0.25, 0.35);

      curY = subY - 6;
    });

    // Grand Total Bar at end of report
    const gtH = 18;
    if (curY - gtH < marginBottom + 16) {
      startNewPage();
      drawHeaderBanner(pages.length + 1, false);
      drawTableHeader();
    }
    const gtY = curY - gtH;
    drawRect(marginLeft, gtY, contentWidth, gtH, 0.059, 0.090, 0.161); // Deep navy
    drawText(`CHITTOOR DISTRICT GRAND TOTAL (${totalVillages} Villages across ${mandalNames.length} Mandals):`, marginLeft + 12, gtY + 5.5, '/F2', 8.5, 1, 1, 1);
    const grandExt = `${formatExtent(totalExtent)} Ac`;
    drawText(`Extent: ${grandExt}`, marginLeft + contentWidth - 360, gtY + 5.5, '/F4', 8, 0.984, 0.796, 0.196);
    drawText(`Completed: ${totalCompleted}  |  Delayed: ${totalDelayed}`, marginLeft + contentWidth - 190, gtY + 5.5, '/F2', 8, 1, 1, 1);
    curY = gtY - 8;
  }

  // Push last page ops
  if (currentPageOps.length > 0) {
    pages.push(currentPageOps.join('\n'));
  }

  // BUILD PDF 1.4 OBJECT STRUCTURE
  const totalPages = pages.length;
  const pdfObjects = [];
  function addObj(str) {
    pdfObjects.push(str);
    return pdfObjects.length;
  }

  // Object 1: Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  // Object 2: Pages tree placeholder
  addObj('');

  // Fonts: F1 = Helvetica, F2 = Helvetica-Bold, F3 = Courier, F4 = Courier-Bold
  const fontF1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontF2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const fontF3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const fontF4 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>');

  const pageObjIds = [];

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    let streamContent = pages[pIdx];

    // Page Footer (Rendered on every single page with dynamic total count)
    const footY = 14;
    const footLine = `${marginLeft.toFixed(2)} ${(footY + 12).toFixed(2)} m ${(marginLeft + contentWidth).toFixed(2)} ${(footY + 12).toFixed(2)} l 0.780 0.820 0.880 RG 0.50 w S`;
    const footText1 = `BT /F1 7.0 Tf 0.380 0.440 0.520 rg ${marginLeft.toFixed(2)} ${(footY + 2).toFixed(2)} Td (${escapePdfText('District Survey and Land Records Office · Collectorate Complex, Chittoor District, Government of Andhra Pradesh')}) Tj ET`;
    const footText2 = `BT /F2 7.5 Tf 0.150 0.220 0.350 rg ${(marginLeft + contentWidth - 62).toFixed(2)} ${(footY + 2).toFixed(2)} Td (${escapePdfText(`Page ${pIdx + 1} of ${totalPages}`)}) Tj ET`;
    streamContent += `\n${footLine}\n${footText1}\n${footText2}`;

    const streamObj = addObj(`<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream`);
    const pageObj = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents ${streamObj} 0 R /Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R /F3 ${fontF3} 0 R /F4 ${fontF4} 0 R >> >> >>`);
    pageObjIds.push(pageObj);
  }

  // Update Object 2: Pages tree
  pdfObjects[1] = `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>`;

  // Assemble PDF bytes with exact xref table
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < pdfObjects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${pdfObjects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${pdfObjects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= pdfObjects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}

async function generateMandalReportPdf(store, options = {}) {
  // If Chrome is explicitly requested and installed, try it first
  if (options.engine === 'chrome' && fs.existsSync(CHROME_PATH)) {
    try {
      const htmlContent = generateMandalReportHtml(store, options);
      const tempId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const tempDir = path.resolve(__dirname, '../data');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempHtmlPath = path.join(tempDir, `report_temp_${tempId}.html`);
      const tempPdfPath = path.join(tempDir, `report_temp_${tempId}.pdf`);

      fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

      const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `--print-to-pdf=${tempPdfPath}`,
        '--print-to-pdf-no-header',
        tempHtmlPath
      ];

      await new Promise((resolve, reject) => {
        execFile(CHROME_PATH, args, (err) => {
          try { if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath); } catch (e) {}
          if (err) return reject(err);
          resolve();
        });
      });

      if (fs.existsSync(tempPdfPath)) {
        const pdfBuffer = fs.readFileSync(tempPdfPath);
        try { fs.unlinkSync(tempPdfPath); } catch (e) {}
        return pdfBuffer;
      }
    } catch (chromeErr) {
      console.warn('Chrome PDF generation failed, falling back to pure vector PDF generator:', chromeErr.message);
    }
  }

  // Pure Vector Node.js PDF generator (Fast, zero-dependency, works everywhere including Vercel Serverless)
  return generatePureMandalPdf(store, options);
}

module.exports = {
  generateMandalReportHtml,
  generateMandalReportPdf,
  generatePureMandalPdf
};

