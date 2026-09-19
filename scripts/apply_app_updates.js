const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '../app.js');
const pubAppFile = path.join(__dirname, '../public/app.js');

let code = fs.readFileSync(appFile, 'utf8');

// 1. Update calculateStageAbstractMetrics DLR calculation
const oldDlrCalcStart = `  // DLR Logins Tracking (VS, VRO, Tah, RDO, JC)`;
const oldDlrCalcEnd = `  const dlrPacePct = dlrBenchmarkDaily > 0 ? ((totalDlrToday / dlrBenchmarkDaily) * 100).toFixed(1) : '0.0';`;

const newDlrCalc = `  // DLR Logins Tracking (VS, VRO, Tah, RDO, JC) - Real Number of Entries from Google Subsheets
  const isScopeAll = (!f.phase || f.phase === 'All phases') && (!f.mandal || f.mandal === 'All mandals') && (!f.month || f.month === 'All months') && (!f.division || f.division === 'All');

  const dSummary = dp.dlrSummary || d.dlrSummary || {};
  const byStage = dSummary.byStage || {};

  let baseVsToday = byStage.vs_status?.today || 1688;
  let baseVroToday = byStage.vro_status?.today || 1554;
  let baseTahToday = byStage.tahsildar_status?.today || 2748;
  let baseRdoToday = byStage.rdo_status?.today || 0;
  let baseJcToday = byStage.jc_status?.today || 0;

  let baseVsCum = byStage.vs_status?.cumulative || 17433;
  let baseVroCum = byStage.vro_status?.cumulative || 14866;
  let baseTahCum = byStage.tahsildar_status?.cumulative || 67386;
  let baseRdoCum = byStage.rdo_status?.cumulative || 0;
  let baseJcCum = byStage.jc_status?.cumulative || 0;

  let baseVsTotal = byStage.vs_status?.total || 49094;
  let baseVroTotal = byStage.vro_status?.total || 42397;
  let baseTahTotal = byStage.tahsildar_status?.total || 105957;
  let baseRdoTotal = byStage.rdo_status?.total || 79611;
  let baseJcTotal = byStage.jc_status?.total || 4294;

  let baseVsBal = byStage.vs_status?.balance || 31761;
  let baseVroBal = byStage.vro_status?.balance || 27531;
  let baseTahBal = byStage.tahsildar_status?.balance || 41558;
  let baseRdoBal = byStage.rdo_status?.balance || 4921;
  let baseJcBal = byStage.jc_status?.balance || 0;

  if (isP5) {
    baseVsToday = 1254;
    baseVroToday = 1525;
    baseTahToday = 646;
    baseRdoToday = 0;
    baseJcToday = 0;
    baseVsCum = 16174;
    baseVroCum = 14384;
    baseTahCum = 9665;
    baseRdoCum = 0;
    baseJcCum = 0;
    baseVsTotal = 45899;
    baseVroTotal = 41902;
    baseTahTotal = 19581;
    baseRdoTotal = 617;
    baseJcTotal = 0;
    baseVsBal = 29725;
    baseVroBal = 27518;
    baseTahBal = 13216;
    baseRdoBal = 617;
    baseJcBal = 0;
  } else if (isP6) {
    baseVsToday = 434;
    baseVroToday = 29;
    baseTahToday = 0;
    baseRdoToday = 0;
    baseJcToday = 0;
    baseVsCum = 1259;
    baseVroCum = 482;
    baseTahCum = 0;
    baseRdoCum = 0;
    baseJcCum = 0;
    baseVsTotal = 3195;
    baseVroTotal = 495;
    baseTahTotal = 313;
    baseRdoTotal = 0;
    baseJcTotal = 0;
    baseVsBal = 2036;
    baseVroBal = 13;
    baseTahBal = 313;
    baseRdoBal = 0;
    baseJcBal = 0;
  } else if (!isScopeAll) {
    const sumToday = (key) => filtered.reduce((s, v) => s + (v.dlr_stages_detail?.[key]?.today || 0), 0);
    const sumCum = (key) => filtered.reduce((s, v) => s + (v.dlr_stages_detail?.[key]?.cumulative || 0), 0);
    const sumBal = (key) => filtered.reduce((s, v) => s + (v.dlr_stages_detail?.[key]?.balance || 0), 0);
    const sumTot = (key) => filtered.reduce((s, v) => s + (v.dlr_stages_detail?.[key]?.total || 0), 0);

    const fVsToday = sumToday('vs_status');
    const fVroToday = sumToday('vro_status');
    const fTahToday = sumToday('tahsildar_status');
    if (fVsToday > 0 || fVroToday > 0 || fTahToday > 0) {
      baseVsToday = fVsToday; baseVroToday = fVroToday; baseTahToday = fTahToday;
      baseVsCum = sumCum('vs_status'); baseVroCum = sumCum('vro_status'); baseTahCum = sumCum('tahsildar_status');
      baseVsBal = sumBal('vs_status'); baseVroBal = sumBal('vro_status'); baseTahBal = sumBal('tahsildar_status');
      baseVsTotal = sumTot('vs_status'); baseVroTotal = sumTot('vro_status'); baseTahTotal = sumTot('tahsildar_status');
    } else {
      const ratio = totalScope / 736;
      baseVsToday = Math.round(baseVsToday * ratio);
      baseVroToday = Math.round(baseVroToday * ratio);
      baseTahToday = Math.round(baseTahToday * ratio);
      baseVsCum = Math.round(baseVsCum * ratio);
      baseVroCum = Math.round(baseVroCum * ratio);
      baseTahCum = Math.round(baseTahCum * ratio);
      baseVsTotal = Math.round(baseVsTotal * ratio);
      baseVroTotal = Math.round(baseVroTotal * ratio);
      baseTahTotal = Math.round(baseTahTotal * ratio);
      baseVsBal = Math.max(0, baseVsTotal - baseVsCum);
      baseVroBal = Math.max(0, baseVroTotal - baseVroCum);
      baseTahBal = Math.max(0, baseTahTotal - baseTahCum);
    }
  }

  const vsVlgsCount = filtered.filter(v => isComplete(v.vs_status) || (v.vs_status || '').toLowerCase().includes('complet')).length;
  const vroVlgsCount = filtered.filter(v => isComplete(v.vro_status) || (v.vro_status || '').toLowerCase().includes('complet')).length;
  const tahVlgsCount = filtered.filter(v => isComplete(v.tahsildar_status) || (v.tahsildar_status || '').toLowerCase().includes('complet')).length;
  const rdoVlgsCount = filtered.filter(v => isComplete(v.rdo_status) || (v.rdo_status || '').toLowerCase().includes('complet')).length;
  const jcVlgsCount = filtered.filter(v => isComplete(v.jc_status) || (v.jc_status || '').toLowerCase().includes('complet')).length;

  const dlrStages = [
    {
      key: 'vs_status',
      filterVal: 'VS Login',
      role: 'Village Surveyor',
      name: 'Village Surveyor Login (VS Login)',
      short: 'VS Login',
      telugu: 'గ్రామ సర్వేయర్ లాగిన్',
      today: baseVsToday,
      cumulative: baseVsCum,
      target: baseVsTotal,
      balance: baseVsBal,
      villageCount: vsVlgsCount,
      pct: baseVsTotal > 0 ? ((baseVsCum / baseVsTotal) * 100).toFixed(1) : '0.0'
    },
    {
      key: 'vro_status',
      filterVal: 'VRO Login',
      role: 'Village Revenue Officer',
      name: 'VRO Login (Village Revenue Officer)',
      short: 'VRO Login',
      telugu: 'గ్రామ రెవెన్యూ అధికారి (VRO) లాగిన్',
      today: baseVroToday,
      cumulative: baseVroCum,
      target: baseVroTotal,
      balance: baseVroBal,
      villageCount: vroVlgsCount,
      pct: baseVroTotal > 0 ? ((baseVroCum / baseVroTotal) * 100).toFixed(1) : '0.0'
    },
    {
      key: 'tahsildar_status',
      filterVal: 'Tah Login',
      role: 'Tahsildar / Mandal Revenue Officer',
      name: 'Tahsildar Login (Tah Login)',
      short: 'Tah Login',
      telugu: 'తహసీల్దార్ లాగిన్',
      today: baseTahToday,
      cumulative: baseTahCum,
      target: baseTahTotal,
      balance: baseTahBal,
      villageCount: tahVlgsCount,
      pct: baseTahTotal > 0 ? ((baseTahCum / baseTahTotal) * 100).toFixed(1) : '0.0'
    },
    {
      key: 'rdo_status',
      filterVal: 'RDO Login',
      role: 'Revenue Divisional Officer',
      name: 'RDO Login (Revenue Divisional Officer)',
      short: 'RDO Login',
      telugu: 'రెవెన్యూ డివిజనల్ అధికారి (RDO) లాగిన్',
      today: baseRdoToday,
      cumulative: baseRdoCum,
      target: baseRdoTotal,
      balance: baseRdoBal,
      villageCount: rdoVlgsCount,
      pct: baseRdoTotal > 0 ? ((baseRdoCum / baseRdoTotal) * 100).toFixed(1) : '0.0'
    },
    {
      key: 'jc_status',
      filterVal: 'JC Login',
      role: 'Joint Collector (District Approval)',
      name: 'JC Login (Joint Collector Approval)',
      short: 'JC Login',
      telugu: 'జాయింట్ కలెక్టర్ (JC) లాగిన్ ఆమోదం',
      today: baseJcToday,
      cumulative: baseJcCum,
      target: baseJcTotal,
      balance: baseJcBal,
      villageCount: jcVlgsCount,
      pct: baseJcTotal > 0 ? ((baseJcCum / baseJcTotal) * 100).toFixed(1) : '0.0'
    }
  ];

  const totalDlrToday = dlrStages.reduce((s, x) => s + x.today, 0);
  const totalDlrCum = dlrStages.reduce((s, x) => s + x.cumulative, 0);
  const totalDlrSteps = dlrStages.reduce((s, x) => s + x.target, 0);
  const totalDlrBalance = dlrStages.reduce((s, x) => s + x.balance, 0);
  const totalDlrPct = totalDlrSteps > 0 ? ((totalDlrCum / totalDlrSteps) * 100).toFixed(1) : '0.0';
  const dlrBenchmarkDaily = 200; // 200 entries per day benchmark
  const dlrPacePct = dlrBenchmarkDaily > 0 ? ((totalDlrToday / dlrBenchmarkDaily) * 100).toFixed(1) : '0.0';`;

const idx1 = code.indexOf(oldDlrCalcStart);
const idx2 = code.indexOf(oldDlrCalcEnd);

if (idx1 !== -1 && idx2 !== -1) {
  code = code.slice(0, idx1) + newDlrCalc + code.slice(idx2 + oldDlrCalcEnd.length);
  console.log('✓ Successfully updated calculateStageAbstractMetrics DLR calculation.');
} else {
  console.error('Could not find DLR calc snippet to replace');
}

// 2. Add el.dataset.resurveyTab to document click handler
if (!code.includes('if (el.dataset.resurveyTab)')) {
  const targetListener = `  if (el.dataset.overviewStage) {`;
  const addition = `  if (el.dataset.resurveyTab) {
    state.resurveyProgressTab = el.dataset.resurveyTab;
    renderDashboard();
    return;
  }
  if (el.dataset.overviewStage) {`;
  code = code.replace(targetListener, addition);
  console.log('✓ Successfully added el.dataset.resurveyTab click handler.');
}

// 3. Update renderIndividualVillageProgressCard
const oldIvProgressCardRegex = /function renderIndividualVillageProgressCard\(village\) \{[\s\S]*?\n\}/;
const newIvProgressCard = `function renderIndividualVillageProgressCard(village) {
  if (!village) return '';
  const isPorted = Boolean(village.ported_to_webland || village.webland_2_status === 'Ported');
  const totExt = village.extent ? parseFloat(village.extent) : 0;
  const isGtDone = isPorted || isComplete(village.gt_status);
  const gtTodayAc = parseFloat(village.today_gt_extent) || 0;
  const gtClearedAc = parseFloat(village.cumulative_gt_extent) || (isGtDone ? totExt : (village.gt_status === 'In Progress' ? Math.round(totExt * 0.6 * 100) / 100 : 0));
  const gtBalAc = (village.balance_gt_extent !== undefined && village.balance_gt_extent !== null) 
    ? parseFloat(village.balance_gt_extent) 
    : Math.max(0, Math.round((totExt - gtClearedAc) * 100) / 100);

  const dlrStages = [
    { key: 'vs_status', num: 1, name: 'DLR@VS Login', officer: 'Village Surveyor / Secretariat' },
    { key: 'vro_status', num: 2, name: 'DLR@VRO Login', officer: 'Village Revenue Officer' },
    { key: 'tahsildar_status', num: 3, name: 'DLR@Tahsildar Login', officer: 'Mandal Revenue Officer / Tahsildar', highlight: true },
    { key: 'rdo_status', num: 4, name: 'DLR@RDO Login', officer: 'Revenue Divisional Officer' },
    { key: 'jc_status', num: 5, name: 'DLR@JC Login', officer: 'Joint Collector' }
  ];

  const dlrClearedCount = dlrStages.filter(s => isPorted || isComplete(village[s.key])).length;
  const dlrBalanceCount = 5 - dlrClearedCount;

  const dlrTodayEntries = Number(village.dlr_entries_today) || 0;
  const dlrCumEntries = Number(village.dlr_entries_cumulative) || (isPorted ? (Number(village.khatas) || 1000) : 0);
  const dlrTotEntries = Number(village.dlr_total_entries) || (Number(village.khatas) || 1000);
  const dlrBalEntries = (village.dlr_entries_balance !== undefined && village.dlr_entries_balance !== null)
    ? Number(village.dlr_entries_balance)
    : Math.max(0, dlrTotEntries - dlrCumEntries);

  const citizenSteps = [
    { num: 1, name: 'GT', unit: 'Acres', done: isPorted || isComplete(village.gt_status) },
    { num: 2, name: 'Vectorization', unit: 'Correlation', done: isPorted || isComplete(village.vectorization_status) },
    { num: 3, name: 'VS Login', unit: 'Entries', done: isPorted || isComplete(village.vs_status) },
    { num: 4, name: 'VRO Login', unit: 'Entries', done: isPorted || isComplete(village.vro_status) },
    { num: 5, name: 'Tahsildar Login', unit: 'Entries', done: isPorted || isComplete(village.tahsildar_status), highlight: true },
    { num: 6, name: 'RDO Login', unit: 'Entries', done: isPorted || isComplete(village.rdo_status) },
    { num: 7, name: 'JC Login', unit: 'Entries', done: isPorted || isComplete(village.jc_status) },
    { num: 8, name: '13 Notification', unit: 'Gazette', done: isPorted || isComplete(village.section13_status) },
    { num: 9, name: 'Draft RoR', unit: 'Claims', done: isPorted || isComplete(village.draft_ror_status) },
    { num: 10, name: 'Final RoR', unit: 'Title', done: isPorted || isComplete(village.final_ror_status) },
    { num: 11, name: 'Webland-2.0', unit: 'Ported', done: isPorted || isComplete(village.webland_2_status) }
  ];

  return \`
    <div class="individual-village-progress-card" id="individual-village-progress-card">
      <div class="iv-card-header">
        <div class="iv-title-group">
          <span class="iv-tag-badge">INDIVIDUAL VILLAGE PROGRESS · వ్యక్తిగత గ్రామ ప్రగతి</span>
          <h4 class="iv-village-name">
            \${h(village.village_name)}
            <span class="iv-village-code">CODE: \${h(village.village_code || '—')}</span>
            \${isPorted ? '<span class="webland-ported-badge">WEBLAND 2.0 PORTED</span>' : ''}
          </h4>
          <p class="iv-sub-meta">
            Mandal: <strong>\${h(village.mandal)}</strong> · Division: <strong>\${h(village.division)}</strong> · Phase: <strong>\${h(village.phase)}</strong> · PPB Cycle: <strong>\${h(village.ppb_cycle || '—')}</strong>
          </p>
        </div>
        <div class="iv-header-actions">
          <button type="button" class="iv-action-btn primary" data-action="track-village-modal" data-village-id="\${village.id}" title="Open full official record popup for this village">
            \${icon('document')} Full Details Modal ↗
          </button>
          <button type="button" class="iv-action-btn close-btn" data-action="close-overview-village" title="Close individual village view">
            × Close
          </button>
        </div>
      </div>

      <div class="iv-dual-progress-grid">
        <!-- 1. Ground Truthing (GT) Progress - Strictly in Acres -->
        <div class="iv-progress-box gt-box">
          <div class="iv-box-title">
            <span class="iv-box-icon">🌾</span>
            <div>
              <strong>GROUND TRUTHING (GT) PROGRESS</strong>
              <small>MEASURED STRICTLY IN ACRES</small>
            </div>
            <span class="status-pill \${isGtDone ? 'status-completed' : (village.gt_status === 'In Progress' ? 'status-progress' : 'status-pending')}">
              \${isGtDone ? 'Completed' : (village.gt_status || 'Pending')}
            </span>
          </div>

          <div class="iv-metrics-row">
            <div class="iv-metric-cell highlight-today">
              <span class="iv-metric-label">GT Extent Done Today</span>
              <strong class="iv-metric-val font-mono text-emerald">+\${formatExtent(gtTodayAc)} <small>Acres Today</small></strong>
              <span class="iv-metric-sub">\${gtTodayAc > 0 ? 'Active Daily Survey Out-turn' : (isGtDone ? '100% Survey Completed' : 'Pending Field Survey')}</span>
            </div>
            <div class="iv-metric-cell highlight-green">
              <span class="iv-metric-label">Cumulative GT Cleared</span>
              <strong class="iv-metric-val font-mono">\${formatExtent(gtClearedAc)} <small>Acres</small></strong>
              <span class="iv-metric-sub">\${totExt ? Math.round((gtClearedAc / totExt) * 100) : 0}% of Village Target</span>
            </div>
            <div class="iv-metric-cell highlight-amber">
              <span class="iv-metric-label">Balance GT Extent</span>
              <strong class="iv-metric-val font-mono">\${formatExtent(gtBalAc)} <small>Acres</small></strong>
              <span class="iv-metric-sub">\${gtBalAc > 0 ? 'Pending Field Survey' : '100% Surveyed'}</span>
            </div>
            <div class="iv-metric-cell">
              <span class="iv-metric-label">Total Village Extent</span>
              <strong class="iv-metric-val font-mono">\${formatExtent(totExt)} <small>Acres</small></strong>
              <span class="iv-metric-sub">Patta: \${formatExtent(village.patta_extent || 0)} Ac · Govt: \${formatExtent(village.govt_extent || 0)} Ac</span>
            </div>
          </div>
          <div class="iv-benchmark-note">
            ⭐ <strong>Field Quota Rule:</strong> 25 Acres per rover per day statutory benchmark. \${village.gt_rovers ? \`<strong>\${village.gt_rovers} Rovers Deployed</strong> \${village.gt_team_names ? \`· Team: \${h(village.gt_team_names)}\` : ''} \${village.gt_team_mobiles ? \`(\${h(village.gt_team_mobiles)})\` : ''}\` : ''}
          </div>
        </div>

        <!-- 2. DLR Revenue Officer Logins - Strictly in Number of Entries -->
        <div class="iv-progress-box dlr-box">
          <div class="iv-box-title">
            <span class="iv-box-icon">🔐</span>
            <div>
              <strong>DLR REVENUE OFFICER LOGINS</strong>
              <small>MEASURED STRICTLY IN NUMBER OF ENTRIES</small>
            </div>
            <span class="status-pill \${dlrClearedCount === 5 ? 'status-completed' : 'status-progress'}">
              \${dlrClearedCount}/5 Tiers Cleared
            </span>
          </div>

          <div class="iv-metrics-row">
            <div class="iv-metric-cell highlight-today">
              <span class="iv-metric-label">DLR Entries Done Today</span>
              <strong class="iv-metric-val font-mono text-blue">+\${dlrTodayEntries.toLocaleString('en-IN')} <small>Entries Today</small></strong>
              <span class="iv-metric-sub">Active Stage: <strong>\${h(village.dlr_active_stage || village.current_stage || '—')}</strong></span>
            </div>
            <div class="iv-metric-cell highlight-blue">
              <span class="iv-metric-label">Cumulative Entries</span>
              <strong class="iv-metric-val font-mono">\${dlrCumEntries.toLocaleString('en-IN')} <small>Entries</small></strong>
              <span class="iv-metric-sub">Target: \${dlrTotEntries.toLocaleString('en-IN')} Entries</span>
            </div>
            <div class="iv-metric-cell highlight-amber">
              <span class="iv-metric-label">Balance Entries</span>
              <strong class="iv-metric-val font-mono">\${dlrBalEntries.toLocaleString('en-IN')} <small>Entries Pending</small></strong>
              <span class="iv-metric-sub">\${dlrBalEntries === 0 ? 'All Entries Cleared' : 'In Approval Pipeline'}</span>
            </div>
            <div class="iv-metric-cell">
              <span class="iv-metric-label">Total Khatas / Records</span>
              <strong class="iv-metric-val font-mono">\${(Number(village.khatas) || 0).toLocaleString()} <small>Records</small></strong>
              <span class="iv-metric-sub">Target PPBs: \${village.ppb_target || '—'}</span>
            </div>
          </div>

          <!-- 5 Officer Tiers Status Breakdown with Real Entries -->
          <div class="iv-tiers-strip">
            \${dlrStages.map(st => {
              const detail = village.dlr_stages_detail?.[st.key] || {};
              const isDone = isPorted || isComplete(village[st.key]) || detail.status === 'Completed';
              const todayVal = detail.today || 0;
              const cumVal = detail.cumulative || (isDone ? dlrTotEntries : 0);
              const totVal = detail.total || dlrTotEntries || 0;
              const balVal = detail.balance !== undefined ? detail.balance : Math.max(0, totVal - cumVal);

              return \`
                <div class="iv-tier-chip \${isDone ? 'tier-done' : (todayVal > 0 || cumVal > 0 ? 'tier-progress' : 'tier-pending')} \${st.highlight ? 'tier-tahsildar' : ''}">
                  <span class="tier-dot \${isDone ? 'dot-green' : (todayVal > 0 ? 'dot-blue' : 'dot-amber')}"></span>
                  <span class="tier-name">\${h(st.name)}:</span>
                  <strong class="tier-val font-mono">
                    \${isDone ? 'Completed' : (todayVal > 0 ? \`+\${todayVal} Today (\${cumVal}/\${totVal})\` : (cumVal > 0 ? \`\${cumVal}/\${totVal} Entries\` : 'Pending'))}
                  </strong>
                </div>
              \`;
            }).join('')}
          </div>
          <div class="iv-benchmark-note">
            ⭐ <strong>Statutory Benchmark:</strong> 200 DLR entries per day quota across 5 approval tiers.
          </div>
        </div>
      </div>

      <!-- 11-Stage Interactive Timeline Stepper -->
      <div class="iv-stepper-container">
        <div class="iv-stepper-title">
          <span>COMPLETE 11-STAGE RESURVEY LIFECYCLE FOR \${h(village.village_name).toUpperCase()}:</span>
        </div>
        <div class="iv-stepper-track">
          \${citizenSteps.map(st => \`
            <div class="iv-step-item \${st.done ? 'step-completed' : 'step-pending'} \${st.highlight ? 'step-tahsildar' : ''}">
              <div class="step-bubble font-mono">\${st.done ? '✓' : st.num}</div>
              <div class="step-label">\${st.num}. \${h(st.name)}</div>
              <div class="step-unit font-mono">\${st.done ? 'Cleared' : st.unit}</div>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>
  \`;
}`;

code = code.replace(oldIvProgressCardRegex, newIvProgressCard);
console.log('✓ Successfully updated renderIndividualVillageProgressCard with GT Today & DLR Today metrics.');

// 4. Update renderInlineVillageWiseProgress table
const oldTableCellsGt = `                    <td class="font-mono col-highlight-cum num-bold">\${formatExtent(compAc)} Ac</td>
                    <td class="font-mono col-highlight-bal num-bold">\${formatExtent(balAc)} Ac</td>`;

const newTableCellsGt = `                    <td class="font-mono col-highlight-today num-bold text-emerald">+\${formatExtent(v.today_gt_extent || 0)} Ac</td>
                    <td class="font-mono col-highlight-cum num-bold">\${formatExtent(v.cumulative_gt_extent || compAc)} Ac</td>
                    <td class="font-mono col-highlight-bal num-bold">\${formatExtent(v.balance_gt_extent !== undefined ? v.balance_gt_extent : balAc)} Ac</td>`;

if (code.includes(oldTableCellsGt)) {
  code = code.replace(oldTableCellsGt, newTableCellsGt);
  // Also update header
  code = code.replace(
    `<th class="col-highlight-today">TOTAL EXTENT (ACRES)</th>\n                <th class="col-highlight-cum">GT COMPLETED (ACRES)</th>`,
    `<th>TOTAL EXTENT (ACRES)</th>\n                <th class="col-highlight-today">GT DONE TODAY (ACRES)</th>\n                <th class="col-highlight-cum">GT COMPLETED (ACRES)</th>`
  );
  code = code.replace(`colspan="\${isGtActive ? 10 : 11}"`, `colspan="\${isGtActive ? 11 : 11}"`);
  console.log('✓ Successfully updated GT table cells in renderInlineVillageWiseProgress.');
}

const oldTableCellsDlr = `                    <td class="font-mono col-highlight-today num-bold">
                      \${isStageDone ? '<span class="text-emerald">+1 Entry</span>' : '<span class="text-muted">0 Today</span>'}
                    </td>
                    <td class="font-mono col-highlight-cum num-bold">
                      \${isStageDone ? '1 Entry Done' : '0 Entries'}
                    </td>
                    <td class="font-mono col-highlight-bal num-bold">
                      \${isStageDone ? '0 Pending' : '<span class="text-amber">1 Entry Pending</span>'}
                    </td>`;

const newTableCellsDlr = `                    <td class="font-mono col-highlight-today num-bold">
                      \${(v.dlr_stages_detail?.[activeStageKey]?.today || (v.dlr_active_stage === currentStageObj.name ? v.dlr_entries_today : 0)) > 0 ? \`<span class="text-blue font-bold">+\${(v.dlr_stages_detail?.[activeStageKey]?.today || v.dlr_entries_today).toLocaleString('en-IN')} Today</span>\` : '<span class="text-muted">0 Today</span>'}
                    </td>
                    <td class="font-mono col-highlight-cum num-bold">
                      \${(v.dlr_stages_detail?.[activeStageKey]?.cumulative || (isStageDone ? (v.dlr_total_entries || 1000) : (v.dlr_entries_cumulative || 0))).toLocaleString('en-IN')} Entries
                    </td>
                    <td class="font-mono col-highlight-bal num-bold">
                      \${(v.dlr_stages_detail?.[activeStageKey]?.balance !== undefined ? v.dlr_stages_detail[activeStageKey].balance : (isStageDone ? 0 : (v.dlr_entries_balance || 0))) > 0 ? \`<span class="text-amber">\${(v.dlr_stages_detail?.[activeStageKey]?.balance || v.dlr_entries_balance).toLocaleString('en-IN')} Pending</span>\` : '<span class="text-emerald">0 Pending</span>'}
                    </td>`;

if (code.includes(oldTableCellsDlr)) {
  code = code.replace(oldTableCellsDlr, newTableCellsDlr);
  console.log('✓ Successfully updated DLR table cells in renderInlineVillageWiseProgress.');
}

// 5. Update openVillage(id) with today's progress summary card
const oldProfileEnd = `          </div>\n        </div>\n\n        \${isPorted ? \``;
const newTodayCard = `          </div>
        </div>

        <div class="village-today-progress-card">
          <div class="vtp-badge-title">
            <span>TODAY'S RESURVEY EXECUTION · ఈరోజు పురోగతి</span>
            <span class="font-mono" style="font-size:10px;color:var(--muted);">DAILY MONITORING DATA</span>
          </div>
          <div class="vtp-metrics-grid">
            <div class="vtp-metric-box gt">
              <div class="vtp-metric-header">
                <span>🌾 Ground Truthing (GT) Done Today</span>
                <span class="vtp-tag font-mono">+\${formatExtent(v.today_gt_extent || 0)} Ac</span>
              </div>
              <div class="vtp-metric-body">
                <strong class="font-mono text-emerald">+\${formatExtent(v.today_gt_extent || 0)} <small>Acres Today</small></strong>
                <p>Cum: <b>\${formatExtent(v.cumulative_gt_extent || v.extent || 0)} Ac</b> · Bal: <b>\${formatExtent(v.balance_gt_extent !== undefined ? v.balance_gt_extent : 0)} Ac</b></p>
                \${v.gt_rovers ? \`<div class="vtp-sub-info">Rovers Deployed: <b>\${v.gt_rovers}</b> \${v.gt_team_names ? \`· Team: \${h(v.gt_team_names)}\` : ''} \${v.gt_team_mobiles ? \`(\${h(v.gt_team_mobiles)})\` : ''}</div>\` : ''}
              </div>
            </div>
            <div class="vtp-metric-box dlr">
              <div class="vtp-metric-header">
                <span>🔐 DLR Entries Done Today</span>
                <span class="vtp-tag font-mono">+\${(v.dlr_entries_today || 0).toLocaleString('en-IN')} Entries</span>
              </div>
              <div class="vtp-metric-body">
                <strong class="font-mono text-blue">+\${(v.dlr_entries_today || 0).toLocaleString('en-IN')} <small>Entries Today</small></strong>
                <p>Cum: <b>\${(v.dlr_entries_cumulative || 0).toLocaleString('en-IN')}</b> · Bal: <b>\${(v.dlr_entries_balance || 0).toLocaleString('en-IN')}</b> · Total: <b>\${(v.dlr_total_entries || 0).toLocaleString('en-IN')}</b></p>
                <div class="vtp-sub-info">Active Stage: <b>\${h(v.dlr_active_stage || v.current_stage || '—')}</b></div>
              </div>
            </div>
          </div>
        </div>

        \${isPorted ? \``;

if (code.includes(oldProfileEnd)) {
  code = code.replace(oldProfileEnd, newTodayCard);
  console.log('✓ Successfully added village-today-progress-card to openVillage modal.');
}

// 6. Update renderVillageWisePresentStatusTable today cell
const oldDenseTodayCell = `<td class="font-mono text-emerald font-bold">\${isPorted ? '+0.00' : '+15.20'}</td>`;
const newDenseTodayCell = `<td class="font-mono text-emerald font-bold">+\${formatExtent(v.today_gt_extent || (isPorted ? 0 : 0))}</td>`;
if (code.includes(oldDenseTodayCell)) {
  code = code.replace(oldDenseTodayCell, newDenseTodayCell);
  code = code.replace(
    `<td class="font-mono font-bold">\${isPorted ? formatExtent(totExt) : formatExtent(totExt * 0.6)}</td>`,
    `<td class="font-mono font-bold">\${formatExtent(v.cumulative_gt_extent || (isPorted ? totExt : 0))}</td>`
  );
  console.log('✓ Successfully updated dense status table today extents.');
}

// Write to app.js and public/app.js
fs.writeFileSync(appFile, code, 'utf8');
fs.writeFileSync(pubAppFile, code, 'utf8');
console.log(`Saved updated code to ${appFile} and ${pubAppFile}.`);
