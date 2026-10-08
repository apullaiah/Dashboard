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
      ppbDistributed: 0
    };

    mg.villages.forEach(v => {
      const ext = parseFloat(v.extent) || 0;
      mg.stats.extent += ext;
      totalExtent += ext;

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
        font-size: 10px;
      }
      .no-print, .report-floating-bar {
        display: none !important;
      }
      .report-page-container {
        max-width: 100%;
        padding: 0;
      }
      .report-executive-header {
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 14px;
        box-shadow: none;
      }
      .mandal-report-block {
        border-radius: 8px;
        margin-bottom: 18px;
        box-shadow: none;
        page-break-inside: avoid;
      }
      .mandal-banner-head {
        padding: 8px 14px;
      }
      .village-data-table td, .village-data-table thead th {
        padding: 5px 8px;
      }
      @page {
        size: A4 landscape;
        margin: 10mm 8mm;
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
        <span class="report-tag-pill">📄 YSR Jagananna Bhoo Hakku Monitoring</span>
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
                <th>Resurvey Stage</th>
                <th>Status</th>
                <th>PPB Target / Handover</th>
                <th>Target Date</th>
              </tr>
            </thead>
            <tbody>
              ${mg.villages.map((v, vIdx) => {
                const stageInfo = getStageBadgeInfo(v);
                const statusHtml = getStatusBadge(v);
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
                      <span class="stage-badge-pill ${stageInfo.color}">
                        ${stageInfo.icon} ${h(stageInfo.label)}
                      </span>
                    </td>
                    <td>${statusHtml}</td>
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

function generateMandalReportPdf(store, options = {}) {
  return new Promise((resolve, reject) => {
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

      execFile(CHROME_PATH, args, (err, stdout, stderr) => {
        // Clean up temp html file
        try { if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath); } catch (e) {}

        if (err) {
          try { if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath); } catch (e) {}
          return reject(new Error(`Failed to generate PDF via Chrome: ${err.message}`));
        }

        if (!fs.existsSync(tempPdfPath)) {
          return reject(new Error('PDF file was not created by Chrome headless.'));
        }

        try {
          const pdfBuffer = fs.readFileSync(tempPdfPath);
          fs.unlinkSync(tempPdfPath);
          resolve(pdfBuffer);
        } catch (readErr) {
          reject(readErr);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateMandalReportHtml,
  generateMandalReportPdf
};
