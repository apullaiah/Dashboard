const fs = require('fs');

console.log('Starting mandal plan integration...');

let appCode = fs.readFileSync('app.js', 'utf8');

// Normalize line endings for replacement operations if needed, but we can do safe string replaces:
function safeReplace(str, target, replacement) {
  if (!str.includes(target)) {
    // Try matching with normalized line endings
    const targetNorm = target.replace(/\r\n/g, '\n');
    const strNorm = str.replace(/\r\n/g, '\n');
    if (strNorm.includes(targetNorm)) {
      // Reconstruct
      return strNorm.replace(targetNorm, replacement.replace(/\r\n/g, '\n'));
    }
    console.error('Target not found:', target.slice(0, 60));
    return str;
  }
  return str.replace(target, replacement);
}

// 1. Add state fields
const stateTarget = `  mandalDrilldownSortCol: 'mandal',
  mandalDrilldownSortDir: 'asc',
};`;

const stateReplacement = `  mandalDrilldownSortCol: 'mandal',
  mandalDrilldownSortDir: 'asc',
  mandalPlanDivisionFilter: 'All',
  mandalPlanSearch: '',
  mandalPlanSortCol: 'mandal',
  mandalPlanSortDir: 'asc',
  mandalPlanStatusFilter: 'All',
  modalActiveMandal: null,
  modalActiveMetric: null,
  modalSearchQuery: '',
  modalFilterPhase: 'All',
};`;

if (!appCode.includes('mandalPlanDivisionFilter')) {
  appCode = safeReplace(appCode, stateTarget, stateReplacement);
  console.log('1. Updated state object.');
}

// 2. Update updateNav()
const navTarget = `  const names = {
    dashboard: ['MONITORING CENTRE', 'DISTRICT SURVEY AND LAND RECORDS OFFICE, CHITTOOR DISTRICT'],
    villages: ['MONITORING', 'Village Monitoring & Statutory Stages'],`;

const navReplacement = `  const names = {
    dashboard: ['MONITORING CENTRE', 'DISTRICT SURVEY AND LAND RECORDS OFFICE, CHITTOOR DISTRICT'],
    mandal_plan: ['MANDAL ACTION PLAN', 'Mandal-Wise Action Plan & Statutory Resurvey Status'],
    villages: ['MONITORING', 'Village Monitoring & Statutory Stages'],`;

if (!appCode.includes("mandal_plan: ['MANDAL ACTION PLAN'")) {
  appCode = safeReplace(appCode, navTarget, navReplacement);
  console.log('2. Updated updateNav().');
}

// 3. Update render() dispatch
const renderTarget = `function render() {
  if (state.view === 'dashboard') renderDashboard();
  else if (state.view === 'villages') renderVillageMonitoring();`;

const renderReplacement = `function render() {
  if (state.view === 'dashboard') renderDashboard();
  else if (state.view === 'mandal_plan') renderMandalActionPlan();
  else if (state.view === 'villages') renderVillageMonitoring();`;

if (!appCode.includes("else if (state.view === 'mandal_plan') renderMandalActionPlan();")) {
  appCode = safeReplace(appCode, renderTarget, renderReplacement);
  console.log('3. Updated render() dispatch.');
}

// 4. Update renderMandalDrilldownSection header to include button to Mandal Action Plan
const drillHeaderTarget = `<div class="ref-section-header">
        <h3 class="ref-section-title">MANDAL DRILLDOWN</h3>
        <span class="ref-section-meta font-mono">\${mandalRows.length} mandals</span>
      </div>`;

const drillHeaderReplacement = `<div class="ref-section-header">
        <h3 class="ref-section-title">MANDAL DRILLDOWN</h3>
        <span class="ref-section-meta font-mono">\${mandalRows.length} mandals</span>
        <button class="outline-button" data-view="mandal_plan" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:4px 10px;font-weight:700;color:#1e3a8a;border-color:#93c5fd;">
          \${icon('workflow')} <span>Open Mandal Action Plan (Full 19 Columns) ↗</span>
        </button>
      </div>`;

if (!appCode.includes('Open Mandal Action Plan (Full 19 Columns)')) {
  appCode = safeReplace(appCode, drillHeaderTarget, drillHeaderReplacement);
  console.log('4. Added Action Plan button to Overview Mandal Drilldown header.');
}

// 5. Add click event handlers
const clickTarget = `  if (el.dataset.action === 'filter-ported-villages') {
    return navigate('villages', { filters: { ported: 'true' } });
  }
  if (el.dataset.view) return navigate(el.dataset.view);`;

const clickReplacement = `  if (el.dataset.action === 'filter-ported-villages') {
    return navigate('villages', { filters: { ported: 'true' } });
  }
  const figBtn = el.closest('[data-mandal-figure]');
  if (figBtn) {
    openMandalFigureModal(figBtn.dataset.mandal, figBtn.dataset.metric);
    return;
  }
  if (el.dataset.action === 'export-mandal-plan-csv' || el.closest('[data-action="export-mandal-plan-csv"]')) {
    exportMandalPlanCsv();
    return;
  }
  if (el.dataset.action === 'export-modal-villages-csv' || el.closest('[data-action="export-modal-villages-csv"]')) {
    exportModalVillagesCsv();
    return;
  }
  if (el.dataset.action === 'export-modal-sec-csv' || el.closest('[data-action="export-modal-sec-csv"]')) {
    exportModalSecCsv();
    return;
  }
  if (el.dataset.action === 'export-modal-rovers-csv' || el.closest('[data-action="export-modal-rovers-csv"]')) {
    exportModalRoversCsv();
    return;
  }
  if (el.dataset.action === 'print-action-plan' || el.closest('[data-action="print-action-plan"]')) {
    window.print();
    return;
  }
  const sortMandalTh = el.closest('[data-action="sort-mandal-plan"]');
  if (sortMandalTh) {
    const col = sortMandalTh.dataset.col;
    if (state.mandalPlanSortCol === col) {
      state.mandalPlanSortDir = state.mandalPlanSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.mandalPlanSortCol = col;
      state.mandalPlanSortDir = 'asc';
    }
    renderMandalActionPlan();
    return;
  }
  if (el.dataset.action === 'reset-mandal-plan-filters' || el.closest('[data-action="reset-mandal-plan-filters"]')) {
    state.mandalPlanSearch = '';
    state.mandalPlanDivisionFilter = 'All';
    state.mandalPlanStatusFilter = 'All';
    renderMandalActionPlan();
    return;
  }
  const inspectBtn = el.closest('[data-inspect-village]');
  if (inspectBtn) {
    openVillage(inspectBtn.dataset.inspectVillage);
    return;
  }
  if (el.dataset.view) return navigate(el.dataset.view);`;

if (!appCode.includes('figBtn = el.closest')) {
  appCode = safeReplace(appCode, clickTarget, clickReplacement);
  console.log('5. Added click event handlers.');
}

// 6. Add change event handlers
const changeTarget = `  if (event.target.id === 'ppb-mandal-filter') {`;

const changeReplacement = `  if (event.target.id === 'ap-division-select') {
    state.mandalPlanDivisionFilter = event.target.value;
    renderMandalActionPlan();
  } else if (event.target.id === 'ap-status-select') {
    state.mandalPlanStatusFilter = event.target.value;
    renderMandalActionPlan();
  } else if (event.target.id === 'modal-phase-filter') {
    state.modalFilterPhase = event.target.value;
    const vList = getVillagesForMetric(state.villages || [], state.modalActiveMandal, state.modalActiveMetric);
    const mTitle = state.modalActiveMandal === '__ALL__' ? 'Chittoor District (All 27 Mandals)' : \`\${h(state.modalActiveMandal)} Mandal\`;
    const mLabel = getMetricLabel(state.modalActiveMetric);
    renderVillageDetailsModalContent(state.modalActiveMandal, state.modalActiveMetric, vList, mLabel, mTitle);
  } else if (event.target.id === 'ppb-mandal-filter') {`;

if (!appCode.includes("event.target.id === 'ap-division-select'")) {
  appCode = safeReplace(appCode, changeTarget, changeReplacement);
  console.log('6. Added change event handlers.');
}

// 7. Add input event handlers
const inputTarget = `  if (event.target.id === 'ppb-table-search') {`;

const inputReplacement = `  if (event.target.id === 'ap-mandal-search') {
    state.mandalPlanSearch = event.target.value;
    clearTimeout(event.target._debounce);
    event.target._debounce = setTimeout(() => {
      renderMandalActionPlan();
      const inp = document.getElementById('ap-mandal-search');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    }, 180);
  } else if (event.target.id === 'modal-village-search') {
    state.modalSearchQuery = event.target.value;
    clearTimeout(event.target._debounce);
    event.target._debounce = setTimeout(() => {
      const vList = getVillagesForMetric(state.villages || [], state.modalActiveMandal, state.modalActiveMetric);
      const mTitle = state.modalActiveMandal === '__ALL__' ? 'Chittoor District (All 27 Mandals)' : \`\${h(state.modalActiveMandal)} Mandal\`;
      const mLabel = getMetricLabel(state.modalActiveMetric);
      renderVillageDetailsModalContent(state.modalActiveMandal, state.modalActiveMetric, vList, mLabel, mTitle);
      const inp = document.getElementById('modal-village-search');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    }, 180);
  } else if (event.target.id === 'modal-sec-search') {
    const q = event.target.value.toLowerCase();
    document.querySelectorAll('#modal-sec-table tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  } else if (event.target.id === 'modal-rover-search') {
    const q = event.target.value.toLowerCase();
    document.querySelectorAll('#modal-rover-table tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  } else if (event.target.id === 'ppb-table-search') {`;

if (!appCode.includes("event.target.id === 'ap-mandal-search'")) {
  appCode = safeReplace(appCode, inputTarget, inputReplacement);
  console.log('7. Added input event handlers.');
}

// 8. Read module files and append logic
const moduleCode = fs.readFileSync('scratch/mandal_plan_module.js', 'utf8');
const uiCode = fs.readFileSync('scratch/mandal_plan_ui.js', 'utf8');
const modalCode = fs.readFileSync('scratch/mandal_plan_modal.js', 'utf8');

const extraExportCode = `
function getMetricLabel(metricKey) {
  const metricLabels = {
    villages: 'All Survey Villages',
    extent: 'Total Extent Breakdown',
    govt_land: 'Government Land Details',
    patta_land: 'Patta Land Details',
    resurvey_completed: 'Resurvey Completed Villages',
    balance_villages: 'Balance Villages for Resurvey',
    dlr_vs: 'Villages in DLR Village Surveyor (VS) Login',
    dlr_vro: 'Villages in DLR VRO Login',
    dlr_tah: 'Villages in DLR Tahsildar Login',
    dlr_rdo: 'Villages in DLR RDO Login',
    dlr_jc: 'Villages in DLR JC Login',
    sec13_notified: 'Section 13 Notified Villages',
    ported_webland2: 'Ported Villages to Webland-2.0'
  };
  return metricLabels[metricKey] || 'Village Details';
}

function exportModalSecCsv() {
  const mandalName = state.modalActiveMandal || '__ALL__';
  const list = getSecretariatsForMandal(mandalName);
  const headers = ['SL', 'MANDAL', 'DIVISION', 'SECRETARIAT_NAME', 'SECRETARIAT_CODE', 'DESIGNATION', 'STAFF_TEAM', 'JURISDICTION', 'STATUS'];
  const rows = list.map(s => [
    s.sno,
    \`"\${s.mandal}"\`,
    \`"\${s.division}"\`,
    \`"\${s.secretariat_name}"\`,
    \`"\${s.secretariat_code}"\`,
    \`"\${s.vs_designation}"\`,
    \`"\${s.staff_team}"\`,
    \`"\${s.jurisdiction}"\`,
    \`"\${s.status}"\`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = \`chittoor-\${mandalName}-village-surveyors-\${new Date().toISOString().slice(0, 10)}.csv\`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportModalRoversCsv() {
  const mandalName = state.modalActiveMandal || '__ALL__';
  const list = getRoversForMandal(mandalName);
  const headers = ['SL', 'MANDAL', 'DIVISION', 'ROVER_ID', 'EQUIPMENT_TYPE', 'OPERATING_TEAM', 'DAILY_CAPACITY_AC', 'DEPLOYED_VILLAGE', 'TEAM_LEAD', 'MOBILE', 'STATUS'];
  const rows = list.map(r => [
    r.sno,
    \`"\${r.mandal}"\`,
    \`"\${r.division}"\`,
    \`"\${r.rover_id}"\`,
    \`"\${r.equipment_type}"\`,
    \`"\${r.operating_team}"\`,
    \`"\${r.daily_capacity_ac}"\`,
    \`"\${r.deployed_village}"\`,
    \`"\${r.team_lead}"\`,
    \`"\${r.mobile}"\`,
    \`"\${r.status}"\`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = \`chittoor-\${mandalName}-rovers-allotment-\${new Date().toISOString().slice(0, 10)}.csv\`;
  a.click();
  URL.revokeObjectURL(a.href);
}
`;

const combinedAdditions = `
/* ==========================================================================
   MANDAL WISE ACTION PLAN LOGIC, UI & DRILLDOWN MODAL
   ========================================================================== */
` + moduleCode + '\n\n' + uiCode + '\n\n' + modalCode + '\n\n' + extraExportCode;

if (!appCode.includes('calculateMandalActionPlan')) {
  appCode = appCode + '\n\n' + combinedAdditions;
  console.log('8. Appended mandal plan module, UI, modal, and export functions.');
}

fs.writeFileSync('app.js', appCode, 'utf8');
fs.writeFileSync('public/app.js', appCode, 'utf8');
console.log('Successfully updated app.js and public/app.js!');
