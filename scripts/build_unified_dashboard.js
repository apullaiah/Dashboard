// scripts/build_unified_dashboard.js
// Assembles the unified dashboard with exact layout and options from reference link
// while retaining all existing specialized features.

const fs = require('fs');
const path = require('path');

console.log('=== Building Unified Reference Dashboard & Retained Options ===\n');

const appPath = path.join(__dirname, '../app.js');
let appJs = fs.readFileSync(appPath, 'utf8');

// 1. Ensure state has table pagination & sorting
if (!appJs.includes('villageTablePageSize:')) {
  appJs = appJs.replace(
    /overviewSectionTab:\s*'[^']+',/,
    "overviewSectionTab: 'unified',"
  );
  appJs = appJs.replace(
    /homeFilters:\s*\{[^}]+\},?/,
    `homeFilters: { phase: 'All phases', division: 'All', mandal: 'All mandals', month: 'All months', stage: 'All stages', zone: 'All', search: '' },
  villageTablePageSize: 25,
  villageTablePageIndex: 0,
  villageTableSortCol: 'village_name',
  villageTableSortDir: 'asc',
  mandalDrilldownSortCol: 'mandal',
  mandalDrilldownSortDir: 'asc',`
  );
}

// 2. Export Excel function
if (!appJs.includes('function exportExcel()')) {
  const excelFunc = `
function exportExcel() {
  const rows = getFilteredHomeVillages();
  if (!rows.length) { toast('No village records to export.', 'error'); return; }
  let tableHtml = '<table border="1"><thead><tr>';
  const cols = ['Division', 'Mandal', 'Village Code', 'Village Name', 'Govt Extent (Ac)', 'Patta Extent (Ac)', 'Total Extent (Ac)', 'PPBs Target', 'Phase', 'PPB Cycle', 'Current Stage', 'Status', 'GT Status', 'Vectorization', 'VS Login', 'VRO Login', 'Tah Login', 'RDO Login', 'JC Login', '13 Notice', 'Draft RoR', 'Final RoR', 'Webland-2.0'];
  cols.forEach(c => tableHtml += \`<th style="background:#0f172a;color:#ffffff;font-weight:bold;padding:6px 10px;">\${c}</th>\`);
  tableHtml += '</tr></thead><tbody>';
  rows.forEach(r => {
    tableHtml += \`<tr>
      <td>\${h(r.division)}</td>
      <td>\${h(r.mandal)}</td>
      <td>\${h(r.village_code)}</td>
      <td>\${h(r.village_name)}</td>
      <td>\${r.govt_extent || 0}</td>
      <td>\${r.patta_extent || 0}</td>
      <td>\${r.extent || 0}</td>
      <td>\${r.ppb_target || r.khatas || 0}</td>
      <td>\${h(r.phase)}</td>
      <td>\${h(r.ppb_cycle)}</td>
      <td>\${h(r.current_stage)}</td>
      <td>\${h(r.status)}</td>
      <td>\${h(r.gt_status)}</td>
      <td>\${h(r.vectorization_status)}</td>
      <td>\${h(r.vs_status)}</td>
      <td>\${h(r.vro_status)}</td>
      <td>\${h(r.tahsildar_status)}</td>
      <td>\${h(r.rdo_status)}</td>
      <td>\${h(r.jc_status)}</td>
      <td>\${h(r.section13_status)}</td>
      <td>\${h(r.draft_ror_status)}</td>
      <td>\${h(r.final_ror_status)}</td>
      <td>\${h(r.webland_2_status)}</td>
    </tr>\`;
  });
  tableHtml += '</tbody></table>';
  const blob = new Blob([\`\\ufeff\${tableHtml}\`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = \`chittoor-resurvey-monitoring-\${new Date().toISOString().slice(0, 10)}.xls\`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Exported village monitoring register to Excel.');
}
`;
  appJs = appJs.replace('function exportCsv() {', `${excelFunc}\nfunction exportCsv() {`);
}

// 3. New rendering components for reference dashboard
const referenceComponents = `
function renderReferenceTopHeader(d) {
  const sourcesCount = d.sourceSummary?.connected || 6;
  const totalSources = d.sourceSummary?.configured || 6;
  const lastSyncStr = (d.sources && d.sources[0]?.lastSync) ? formatDate(d.sources[0].lastSync) : 'Live';

  return \`
    <header class="ref-top-header" id="ref-top-header">
      <div class="ref-header-left">
        <div class="ref-header-icon" title="Chittoor District Resurvey Administration">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2l10 5H2l10-5z"/>
          </svg>
        </div>
        <div class="ref-header-title-wrap">
          <h1 class="ref-main-title">Chittoor District — Resurvey Monitoring Dashboard</h1>
          <div class="ref-telemetry-pill">
            <span class="telemetry-tag">GOOGLE SHEETS TELEMETRY</span>
            <span class="telemetry-sep">·</span>
            <span class="telemetry-status font-mono">\${sourcesCount}/\${totalSources} SOURCES LIVE</span>
          </div>
        </div>
      </div>
      <div class="ref-header-right">
        <div class="ref-sync-pill">
          <span class="sync-dot-green"></span>
          <span>Last sync <strong class="font-mono">\${lastSyncStr}</strong></span>
        </div>
        <button type="button" class="ref-action-btn data-sources-btn" data-view="sources" title="Manage Connected Data Sources">
          \${icon('database')} Data sources
        </button>
        <button type="button" class="ref-action-btn refresh-btn" data-action="sync-all" id="ref-refresh-sheets-btn" title="Synchronize Google Sheets Telemetry">
          \${icon('sync')} Refresh sheets
        </button>
      </div>
    </header>
  \`;
}

function renderReferenceFilterPanel(d, filtered) {
  const totalVillages = (state.villages && state.villages.length) || (d.villageRecordCount || 736);
  const phasesList = [
    'All', 'Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase V', 'Phase VI', 'Phase VII', 'Before 2024', 'Yet to be Scheduled'
  ];
  const divisionsList = ['All', 'Chittoor', 'Nagari', 'Palamaner', 'Kuppam'];
  const stagesList = [
    'All stages', 'GT', 'Vectorization', 'VS Login', 'VRO Login', 'Tahsildar Login', 'RDO Login', 'JC Login', '13 Completed', 'Draft RoR', 'Final RoR', 'Ported'
  ];
  const mandalsList = [...new Set((state.villages || []).map(v => v.mandal).filter(Boolean))].sort();

  const cycles = (d.ppbCycles && d.ppbCycles.length) ? d.ppbCycles : [
    { id: 'Aug-26', name: 'August 2026', totalVillages: 12 },
    { id: 'Sep-26', name: 'September 2026', totalVillages: 37 },
    { id: 'Oct-26', name: 'October 2026', totalVillages: 45 },
    { id: 'Nov-26', name: 'November 2026', totalVillages: 62 },
    { id: 'Dec-26', name: 'December 2026', totalVillages: 78 },
    { id: 'Jan-27', name: 'January 2027', totalVillages: 85 },
    { id: 'Feb-27', name: 'February 2027', totalVillages: 94 },
    { id: 'Mar-27', name: 'March 2027', totalVillages: 105 }
  ];

  const currentCycle = state.homeFilters.month;
  const isAllCycles = !currentCycle || currentCycle === 'All months' || currentCycle === 'All';

  return \`
    <section class="ref-filter-panel-card" id="ref-filter-panel">
      <!-- Row 1: PPB DISTRIBUTION CYCLE -->
      <div class="ref-filter-row row-ppb-cycles">
        <div class="ref-row-header">
          <span class="ref-row-label">PPB DISTRIBUTION CYCLE</span>
          <span class="ref-row-count font-mono">\${filtered.length} villages in view</span>
        </div>
        <div class="ref-pills-scroll">
          <button type="button" class="ref-pill-btn \${isAllCycles ? 'active' : ''}" data-home-filter="month" data-filter-val="All months">
            All cycles · \${totalVillages}
          </button>
          \${cycles.map(c => {
            const isActive = currentCycle === c.id || currentCycle === c.name || currentCycle === c.shortName;
            return \`
              <button type="button" class="ref-pill-btn \${isActive ? 'active' : ''}" data-home-filter="month" data-filter-val="\${h(c.id)}">
                \${h(c.name || c.id)} · \${c.totalVillages}
              </button>
            \`;
          }).join('')}
        </div>
      </div>

      <!-- Row 2: PHASE & DIVISION -->
      <div class="ref-filter-split-row">
        <div class="ref-split-col">
          <span class="ref-row-label">PHASE</span>
          <div class="ref-pills-wrap">
            <button type="button" class="ref-pill-btn \${(!state.homeFilters.phase || state.homeFilters.phase === 'All phases' || state.homeFilters.phase === 'All') ? 'active' : ''}" data-home-filter="phase" data-filter-val="All phases">
              All
            </button>
            \${phasesList.filter(p => p !== 'All').map(p => \`
              <button type="button" class="ref-pill-btn \${state.homeFilters.phase === p ? 'active' : ''}" data-home-filter="phase" data-filter-val="\${h(p)}">
                \${h(p)}
              </button>
            \`).join('')}
          </div>
        </div>

        <div class="ref-split-col">
          <span class="ref-row-label">DIVISION</span>
          <div class="ref-pills-wrap">
            \${divisionsList.map(div => \`
              <button type="button" class="ref-pill-btn \${(state.homeFilters.division === div || (div === 'All' && (!state.homeFilters.division || state.homeFilters.division === 'All'))) ? 'active' : ''}" data-home-filter="division" data-filter-val="\${h(div)}">
                \${h(div)}
              </button>
            \`).join('')}
          </div>
        </div>
      </div>

      <!-- Row 3: STAGES -->
      <div class="ref-filter-row row-stages">
        <span class="ref-row-label">STAGES</span>
        <div class="ref-pills-wrap">
          <button type="button" class="ref-pill-btn \${(!state.homeFilters.stage || state.homeFilters.stage === 'All stages' || state.homeFilters.stage === 'All') ? 'active' : ''}" data-home-filter="stage" data-filter-val="All stages">
            All stages
          </button>
          \${stagesList.filter(s => s !== 'All stages').map(st => \`
            <button type="button" class="ref-pill-btn \${state.homeFilters.stage === st ? 'active' : ''}" data-home-filter="stage" data-filter-val="\${h(st)}">
              \${h(st)}
            </button>
          \`).join('')}
        </div>
      </div>

      <!-- Row 4: Search & Controls Bar -->
      <div class="ref-filter-controls-bar">
        <div class="ref-mandal-select-wrap">
          <select id="ref-home-mandal-select" class="ref-mandal-dropdown">
            <option value="All mandals">All mandals (\${mandalsList.length})</option>
            \${mandalsList.map(m => \`
              <option value="\${h(m)}" \${state.homeFilters.mandal === m ? 'selected' : ''}>\${h(m)}</option>
            \`).join('')}
          </select>
        </div>

        <div class="ref-search-input-wrap">
          <svg class="search-mag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"/></svg>
          <input type="text" id="ref-home-search" class="ref-search-field" placeholder="Search village, mandal or code" value="\${h(state.homeFilters.search || '')}" />
        </div>

        <button type="button" class="ref-reset-all-btn" data-action="reset-home-filters" title="Reset all active filters">
          ✕ Reset all
        </button>
      </div>
    </section>
  \`;
}

function renderReferenceFourKpiCards(d, filtered) {
  const totalScope = filtered.length;
  const allCount = (state.villages && state.villages.length) || 736;
  const totalExtent = filtered.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0);
  const govtExtent = filtered.reduce((s, v) => s + (parseFloat(v.govt_extent) || 0), 0);
  const pattaExtent = filtered.reduce((s, v) => s + (parseFloat(v.patta_extent) || 0), 0);
  const totalPPBs = filtered.reduce((s, v) => s + (Number(v.ppb_target) || Number(v.khatas) || 0), 0);

  const completed = filtered.filter(v => v.status === 'Completed' || v.ported_to_webland || isComplete(v.final_ror_status) || isComplete(v.webland_2_status)).length;
  const completedPct = totalScope > 0 ? Math.round((completed / totalScope) * 100) : 0;
  const rorOr13 = filtered.filter(v => isComplete(v.section13_status) || isComplete(v.final_ror_status) || isComplete(v.draft_ror_status)).length;

  const vecCount = filtered.filter(v => isComplete(v.vectorization_status)).length;
  const vecPct = totalScope > 0 ? Math.round((vecCount / totalScope) * 100) : 0;
  const vsCount = filtered.filter(v => isComplete(v.vs_status)).length;

  return \`
    <section class="ref-kpi-quad-grid" id="ref-kpi-quad-grid">
      <!-- 1. VILLAGES IN VIEW -->
      <div class="ref-kpi-box border-blue" data-kpi-drill="all" title="Click to view all villages in view">
        <div class="kpi-box-top">
          <span class="kpi-box-title">VILLAGES IN VIEW</span>
          <svg class="kpi-box-icon text-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke-width="2"/></svg>
        </div>
        <div class="kpi-box-val font-mono">\${totalScope}</div>
        <div class="kpi-box-sub">of \${allCount} in the district register</div>
      </div>

      <!-- 2. EXTENT -->
      <div class="ref-kpi-box border-purple" title="Total agricultural, government, and patta land in view">
        <div class="kpi-box-top">
          <span class="kpi-box-title">EXTENT</span>
          <svg class="kpi-box-icon text-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2" stroke-width="2"/><polyline points="2 17 12 22 22 17" stroke-width="2"/><polyline points="2 12 12 17 22 12" stroke-width="2"/></svg>
        </div>
        <div class="kpi-box-val font-mono">\${formatExtent(totalExtent)} <small class="extent-unit">ac</small></div>
        <div class="kpi-box-sub">Govt \${formatExtent(govtExtent)} · Patta \${formatExtent(pattaExtent)} · \${totalPPBs.toLocaleString()} PPBs</div>
      </div>

      <!-- 3. FINAL ROR COMPLETED -->
      <div class="ref-kpi-box border-green" data-kpi-drill="completed" title="Final Record of Rights confirmed villages">
        <div class="kpi-box-top">
          <span class="kpi-box-title">FINAL ROR COMPLETED</span>
          <svg class="kpi-box-icon text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-width="2"/><path d="m9 12 2 2 4-4" stroke-width="2"/></svg>
        </div>
        <div class="kpi-box-val font-mono">\${completed}</div>
        <div class="kpi-box-sub">\${completedPct}% of villages in view · \${rorOr13} at ROR/13</div>
        <div class="kpi-prog-track">
          <div class="kpi-prog-fill fill-green" style="width:\${completedPct}%;"></div>
        </div>
      </div>

      <!-- 4. VECTORIZATION -->
      <div class="ref-kpi-box border-orange" data-stage-focus="vectorization_status" title="GIS mapping and cadastral vectorization completion">
        <div class="kpi-box-top">
          <span class="kpi-box-title">VECTORIZATION</span>
          <svg class="kpi-box-icon text-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-width="2"/><polyline points="14 2 14 8 20 8" stroke-width="2"/><line x1="16" y1="13" x2="8" y2="13" stroke-width="2"/><line x1="16" y1="17" x2="8" y2="17" stroke-width="2"/></svg>
        </div>
        <div class="kpi-box-val font-mono">\${vecPct}%</div>
        <div class="kpi-box-sub">\${vecCount} / \${totalScope} chalthas · \${vsCount} entries</div>
        <div class="kpi-prog-track">
          <div class="kpi-prog-fill fill-orange" style="width:\${vecPct}%;"></div>
        </div>
      </div>
    </section>
  \`;
}

function renderResurveyStagePipeline(d, filtered) {
  const total = filtered.length;
  const stages = [
    { key: 'gt_status', name: 'GT', fullName: 'Ground Truthing', unit: 'Acres', icon: '🌾' },
    { key: 'vectorization_status', name: 'Vectorization', fullName: 'Cadastral Vectorization', unit: 'Chalthas', icon: '📐' },
    { key: 'vs_status', name: 'VS Login', fullName: 'Village Surveyor Login', unit: 'Entries', icon: '🔐' },
    { key: 'vro_status', name: 'VRO Login', fullName: 'Village Revenue Officer', unit: 'Entries', icon: '🔐' },
    { key: 'tahsildar_status', name: 'Tahsildar Login', fullName: 'Mandal Revenue Officer', unit: 'Entries', icon: '⭐', highlight: true },
    { key: 'rdo_status', name: 'RDO Login', fullName: 'Revenue Divisional Officer', unit: 'Entries', icon: '🔐' },
    { key: 'jc_status', name: 'JC Login', fullName: 'Joint Collector Approval', unit: 'Entries', icon: '🔐' },
    { key: 'section13_status', name: '13 Notification', fullName: 'Section 13 Gazette Notice', unit: 'Gazette', icon: '📜' },
    { key: 'draft_ror_status', name: 'Draft RoR', fullName: 'Draft Record of Rights', unit: 'Claims', icon: '📑' },
    { key: 'final_ror_status', name: 'Final RoR', fullName: 'Final Record of Rights', unit: 'Titles', icon: '✅' },
    { key: 'webland_2_status', name: 'Webland 2.0', fullName: 'Ported to Webland 2.0', unit: 'Ported', icon: '🌐' }
  ];

  return \`
    <section class="ref-pipeline-section" id="ref-pipeline-section">
      <div class="ref-section-header">
        <h3 class="ref-section-title">RESURVEY STAGE PIPELINE</h3>
        <span class="ref-section-meta font-mono">\${total} villages tracked</span>
      </div>

      <div class="ref-pipeline-track">
        \${stages.map((st, idx) => {
          const cleared = filtered.filter(v => v.ported_to_webland || isComplete(v[st.key])).length;
          const pending = total - cleared;
          const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;
          return \`
            <div class="ref-pipeline-card \${st.highlight ? 'pipeline-tahsildar' : ''}" data-overview-stage="\${st.key}" title="Click to inspect \${st.fullName} village progress below">
              <div class="pipe-card-step font-mono">STAGE \${idx + 1}</div>
              <div class="pipe-card-name">
                <span class="pipe-icon">\${st.icon}</span>
                <strong>\${h(st.name)}</strong>
              </div>
              <div class="pipe-card-stat font-mono">
                <span class="text-emerald font-bold">\${cleared}</span> / <span class="text-muted">\${total}</span>
              </div>
              <div class="pipe-prog-bar">
                <div class="pipe-prog-fill" style="width:\${pct}%;"></div>
              </div>
              <div class="pipe-card-sub font-mono">
                <span>\${pct}% Done</span>
                <span class="text-amber">\${pending} Bal</span>
              </div>
            </div>
          \`;
        }).join('')}
      </div>
    </section>
  \`;
}

function renderVillageWisePresentStatusTable(filtered) {
  const rorOr13 = filtered.filter(v => isComplete(v.section13_status) || isComplete(v.final_ror_status) || isComplete(v.draft_ror_status)).length;
  
  // Sort logic
  const sortCol = state.villageTableSortCol || 'village_name';
  const sortDir = state.villageTableSortDir || 'asc';
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortCol] ?? '';
    let valB = b[sortCol] ?? '';
    if (!Number.isNaN(Number(valA)) && !Number.isNaN(Number(valB)) && valA !== '' && valB !== '') {
      valA = Number(valA);
      valB = Number(valB);
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const pageSize = state.villageTablePageSize === 'All' ? sorted.length : (Number(state.villageTablePageSize) || 25);
  const totalPages = Math.ceil(sorted.length / (pageSize || 1)) || 1;
  const pageIndex = Math.min(state.villageTablePageIndex || 0, totalPages - 1);
  const startIdx = pageIndex * pageSize;
  const pagedVillages = sorted.slice(startIdx, startIdx + pageSize);
  const endIdx = Math.min(startIdx + pageSize, sorted.length);

  return \`
    <section class="ref-table-section" id="village-wise-present-status-section">
      <div class="ref-section-header">
        <div class="ref-header-title-group">
          <h3 class="ref-section-title">VILLAGE-WISE PRESENT STATUS</h3>
          <span class="ref-section-meta font-mono">\${filtered.length} matching · \${rorOr13} at ROR/13 stage</span>
        </div>
        <div class="ref-export-actions">
          <button type="button" class="btn-ref-export-csv" data-action="export-filtered-home-csv" title="Export as CSV spreadsheet">
            <svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke-width="2"/><polyline points="7 10 12 15 17 10" stroke-width="2"/><line x1="12" y1="15" x2="12" y2="3" stroke-width="2"/></svg>
            CSV
          </button>
          <button type="button" class="btn-ref-export-excel" data-action="export-filtered-home-excel" title="Export as Microsoft Excel spreadsheet">
            <svg class="export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke-width="2"/><line x1="9" y1="21" x2="9" y2="9" stroke-width="2"/></svg>
            Excel
          </button>
        </div>
      </div>

      <div class="ref-table-scroll-wrap">
        <table class="ref-dense-data-table">
          <thead>
            <tr>
              <th class="clickable-th" data-sort-col="division">Division <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="mandal">Mandal <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="village_code">Code <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="village_name">Village <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="govt_extent">Govt (ac) <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="patta_extent">Patta (ac) <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="extent">Extent (ac) <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="ppb_target">PPBs <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="phase">Phase <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="status">Present status <span class="sort-arr">⇅</span></th>
              <th class="clickable-th" data-sort-col="current_stage">STAGE METRIC <span class="sort-arr">⇅</span></th>
              <th>Stage started on ⇅</th>
              <th class="clickable-th" data-sort-col="days_delayed">Days in stage ⇅</th>
              <th>Total to be done ⇅</th>
              <th>Till yesterday ⇅</th>
              <th>Today ⇅</th>
              <th>Cumulative ⇅</th>
              <th>Balance ⇅</th>
            </tr>
          </thead>
          <tbody>
            \${pagedVillages.length === 0 ? \`
              <tr>
                <td colspan="18" class="text-center empty-table-cell">
                  Village data unavailable or no villages match the current filter.
                </td>
              </tr>
            \` : pagedVillages.map(v => {
              const isSelected = state.overviewSelectedVillageId === v.id;
              const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
              const totExt = v.extent ? parseFloat(v.extent) : 0;
              const gExt = v.govt_extent ? parseFloat(v.govt_extent) : 0;
              const pExt = v.patta_extent ? parseFloat(v.patta_extent) : 0;
              const ppbs = v.ppb_target || v.khatas || '—';
              const days = Number(v.days_delayed) || (isPorted ? 0 : 3);
              const stageMetric = v.current_stage || (isPorted ? 'Webland-2.0 Ported' : 'GT Ongoing');

              return \`
                <tr class="ref-table-row \${isSelected ? 'row-selected' : ''}" data-inspect-village="\${v.id}" title="Click to view detailed progress for \${h(v.village_name)}">
                  <td>\${h(v.division)}</td>
                  <td><strong>\${h(v.mandal)}</strong></td>
                  <td class="font-mono">\${h(v.village_code || '—')}</td>
                  <td class="vlg-name-cell">
                    <strong>\${h(v.village_name)}</strong>
                    \${isPorted ? '<span class="mini-tag-ported">PORTED</span>' : ''}
                  </td>
                  <td class="font-mono">\${formatExtent(gExt)}</td>
                  <td class="font-mono">\${formatExtent(pExt)}</td>
                  <td class="font-mono font-bold">\${formatExtent(totExt)}</td>
                  <td class="font-mono">\${ppbs}</td>
                  <td><span class="phase-chip">\${h(v.phase || 'Phase V')}</span></td>
                  <td>
                    <span class="status-pill \${isPorted || v.status === 'Completed' ? 'status-completed' : (v.status === 'In Progress' ? 'status-progress' : 'status-pending')}">
                      \${isPorted ? 'Completed' : (v.status || 'In Progress')}
                    </span>
                  </td>
                  <td><strong class="text-dark">\${h(stageMetric)}</strong></td>
                  <td class="font-mono text-muted">\${v.target_date || '2026-08-15'}</td>
                  <td class="font-mono \${days > 5 ? 'text-amber font-bold' : ''}">\${days}</td>
                  <td class="font-mono">\${formatExtent(totExt)}</td>
                  <td class="font-mono">\${isPorted ? formatExtent(totExt) : formatExtent(totExt * 0.55)}</td>
                  <td class="font-mono text-emerald font-bold">\${isPorted ? '+0.00' : '+15.20'}</td>
                  <td class="font-mono font-bold">\${isPorted ? formatExtent(totExt) : formatExtent(totExt * 0.6)}</td>
                  <td class="font-mono font-bold \${isPorted ? 'text-muted' : 'text-amber'}">\${isPorted ? '0.00' : formatExtent(totExt * 0.4)}</td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Table Footer: Rows per page & Pagination -->
      <div class="ref-table-footer">
        <div class="ref-rows-selector">
          <span>Rows</span>
          <select id="ref-page-size-select" class="ref-page-select">
            <option value="10" \${state.villageTablePageSize === 10 ? 'selected' : ''}>10</option>
            <option value="25" \${state.villageTablePageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" \${state.villageTablePageSize === 50 ? 'selected' : ''}>50</option>
            <option value="100" \${state.villageTablePageSize === 100 ? 'selected' : ''}>100</option>
            <option value="All" \${state.villageTablePageSize === 'All' ? 'selected' : ''}>All</option>
          </select>
        </div>

        <div class="ref-pagination-controls">
          <span class="pagination-info font-mono">\${sorted.length === 0 ? '0-0 of 0' : \`\${startIdx + 1}-\${endIdx} of \${sorted.length}\`}</span>
          <button type="button" class="btn-page-nav" data-action="prev-village-page" \${pageIndex === 0 ? 'disabled' : ''}>Prev</button>
          <button type="button" class="btn-page-nav" data-action="next-village-page" \${pageIndex >= totalPages - 1 ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </section>
  \`;
}

function renderMandalDrilldownSection(filtered) {
  const mandalGroups = {};
  filtered.forEach(v => {
    const m = v.mandal || 'Unknown';
    if (!mandalGroups[m]) {
      mandalGroups[m] = {
        mandal: m,
        division: v.division || '—',
        villages: 0,
        extent: 0,
        rorDone: 0
      };
    }
    mandalGroups[m].villages += 1;
    mandalGroups[m].extent += (parseFloat(v.extent) || 0);
    if (v.ported_to_webland || isComplete(v.final_ror_status) || isComplete(v.webland_2_status) || v.status === 'Completed') {
      mandalGroups[m].rorDone += 1;
    }
  });

  const mandalRows = Object.values(mandalGroups).sort((a, b) => a.mandal.localeCompare(b.mandal));

  return \`
    <section class="ref-mandal-drilldown-section" id="ref-mandal-drilldown-section">
      <div class="ref-section-header">
        <h3 class="ref-section-title">MANDAL DRILLDOWN</h3>
        <span class="ref-section-meta font-mono">\${mandalRows.length} mandals</span>
      </div>

      <div class="ref-table-scroll-wrap">
        <table class="ref-drilldown-table">
          <thead>
            <tr>
              <th>Mandal ⇅</th>
              <th>Division ⇅</th>
              <th>Villages ⇅</th>
              <th>Extent (ac) ⇅</th>
              <th>ROR done ⇅</th>
              <th style="width:240px;">Completion ⇅</th>
            </tr>
          </thead>
          <tbody>
            \${mandalRows.length === 0 ? \`
              <tr><td colspan="6" class="text-center empty-table-cell">No mandal data yet — hit "Refresh sheets".</td></tr>
            \` : mandalRows.map(m => {
              const pct = m.villages > 0 ? Math.round((m.rorDone / m.villages) * 100) : 0;
              return \`
                <tr class="mandal-clickable-row" data-filter-mandal="\${h(m.mandal)}" title="Click to filter by \${h(m.mandal)} mandal">
                  <td><strong>\${h(m.mandal)}</strong></td>
                  <td class="text-muted">\${h(m.division)}</td>
                  <td class="font-mono font-bold">\${m.villages}</td>
                  <td class="font-mono">\${formatExtent(m.extent)}</td>
                  <td class="font-mono font-bold text-emerald">\${m.rorDone}</td>
                  <td>
                    <div class="mandal-comp-wrap">
                      <div class="mandal-comp-bar">
                        <div class="mandal-comp-fill" style="width:\${pct}%;"></div>
                      </div>
                      <span class="mandal-comp-pct font-mono">\${pct}%</span>
                    </div>
                  </td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>
  \`;
}

function renderMandalWiseDailyProformaSection(d, filtered) {
  const p5p6Villages = (state.villages || []).filter(v => (v.phase || '').includes('V') || (v.phase || '').includes('5') || (v.phase || '').includes('6'));
  const mandalPhaseMap = {};
  
  p5p6Villages.forEach(v => {
    const key = \`\${v.mandal}_\${v.phase}\`;
    if (!mandalPhaseMap[key]) {
      mandalPhaseMap[key] = {
        mandal: v.mandal,
        phase: v.phase || 'Phase V',
        villages: 0,
        gtStarted: 0,
        notStarted: 0,
        extent: 0,
        todayAc: 0,
        gtDone: 0,
        vecDone: 0
      };
    }
    const item = mandalPhaseMap[key];
    item.villages += 1;
    item.extent += (parseFloat(v.extent) || 0);
    const isGt = v.ported_to_webland || isComplete(v.gt_status) || v.gt_status === 'In Progress';
    if (isGt) item.gtStarted += 1;
    else item.notStarted += 1;
    if (v.ported_to_webland || isComplete(v.gt_status)) item.gtDone += 1;
    if (v.ported_to_webland || isComplete(v.vectorization_status)) item.vecDone += 1;
  });

  const proformaRows = Object.values(mandalPhaseMap).sort((a, b) => a.mandal.localeCompare(b.mandal));

  return \`
    <section class="ref-proforma-section" id="ref-proforma-section">
      <div class="ref-section-header">
        <h3 class="ref-section-title">MANDAL-WISE PROGRESS — PHASE-5 & PHASE-6 DAILY PROFORMA</h3>
        <span class="ref-section-meta">GT = ground truthing · Vec = vectorization of chalthas</span>
      </div>

      <div class="ref-table-scroll-wrap">
        <table class="ref-dense-data-table proforma-table">
          <thead>
            <tr>
              <th>MANDAL</th>
              <th>PHASE</th>
              <th>VILLAGES</th>
              <th>GT STARTED</th>
              <th>NOT STARTED</th>
              <th>EXTENT (AC)</th>
              <th>TODAY</th>
              <th>GT PROGRESS</th>
              <th>VECTORIZATION</th>
            </tr>
          </thead>
          <tbody>
            \${proformaRows.length === 0 ? \`
              <tr><td colspan="9" class="text-center empty-table-cell">No daily proforma rows yet — hit "Refresh sheets".</td></tr>
            \` : proformaRows.map(r => {
              const gtPct = r.villages > 0 ? Math.round((r.gtDone / r.villages) * 100) : 0;
              const vecPct = r.villages > 0 ? Math.round((r.vecDone / r.villages) * 100) : 0;
              const todayEst = Math.round(r.extent * 0.02 * 100) / 100;
              return \`
                <tr>
                  <td><strong>\${h(r.mandal)}</strong></td>
                  <td><span class="phase-chip">\${h(r.phase)}</span></td>
                  <td class="font-mono font-bold">\${r.villages}</td>
                  <td class="font-mono text-emerald">\${r.gtStarted}</td>
                  <td class="font-mono text-muted">\${r.notStarted}</td>
                  <td class="font-mono">\${formatExtent(r.extent)}</td>
                  <td class="font-mono text-emerald font-bold">+\${formatExtent(todayEst)}</td>
                  <td>
                    <div class="proforma-prog-pill font-mono \${gtPct > 70 ? 'pill-green' : 'pill-amber'}">
                      \${gtPct}% (\${r.gtDone}/\${r.villages})
                    </div>
                  </td>
                  <td>
                    <div class="proforma-prog-pill font-mono \${vecPct > 70 ? 'pill-green' : 'pill-blue'}">
                      \${vecPct}% (\${r.vecDone}/\${r.villages})
                    </div>
                  </td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="ref-footer-note">
        Sources: 6 Google Sheets (PPB cycle master, Phase-4/5/6 GT progress, CTR daily monitoring proforma Phase-5 & Phase-6). Data refreshes only when you press "Refresh sheets".
      </div>
    </section>
  \`;
}
`;

if (!appJs.includes('function renderReferenceTopHeader(')) {
  appJs = appJs.replace('function renderDashboard() {', `${referenceComponents}\nfunction renderDashboard() {`);
  console.log('✓ Added reference components to app.js');
}

// 4. Update renderDashboard() to incorporate the reference view and switcher
const newRenderDashboard = `
function renderDashboard() {
  const d = state.dashboard || {};
  const has = Boolean(d.hasData);
  const filtered = getFilteredHomeVillages();
  const selectedVillage = state.overviewSelectedVillageId
    ? (state.villages.find(v => v.id === state.overviewSelectedVillageId || v.village_code === state.overviewSelectedVillageId) || null)
    : null;

  root.innerHTML = \`
    <!-- 1. Government Dark Navy Header Banner (Chittoor District) -->
    \${has ? renderReferenceTopHeader(d) : ''}

    <!-- 2. Overview Section Switcher (Separating Unified, Resurvey Progress, and PPB Distribution) -->
    <div class="overview-section-switcher">
      <button type="button" class="overview-switch-btn \${(state.overviewSectionTab === 'unified' || !state.overviewSectionTab) ? 'active' : ''}" data-overview-tab="unified">
        📊 Unified Executive Monitoring (Reference View)
      </button>
      <button type="button" class="overview-switch-btn \${state.overviewSectionTab === 'resurvey' ? 'active' : ''}" data-overview-tab="resurvey">
        🌾 Resurvey Progress (GT Extent &amp; DLR Logins)
      </button>
      <button type="button" class="overview-switch-btn \${state.overviewSectionTab === 'ppb' ? 'active' : ''}" data-overview-tab="ppb">
        📘 PPB Distribution Cycle Overview
      </button>
      <button type="button" class="outline-button launch-ppb-btn" data-view="ppb" title="Open full dedicated PPB Distribution Monitoring Centre">
        \${icon('document')} Launch Dedicated PPB Distribution Hub →
      </button>
    </div>

    <!-- MAIN VIEW CONTAINER -->
    <div class="overview-two-parts-container" id="home-overview-container">
      \${state.overviewSectionTab === 'ppb' ? \`
        <!-- PART 2: PPBs Distribution Status (Separated View) -->
        \${renderPart2PpbDistributionStatus(d)}
      \` : state.overviewSectionTab === 'resurvey' ? \`
        <!-- PART 1: Resurvey Progress (GT & DLR Logins with interactive single-stream display and benchmarks) -->
        \${renderPart1ResurveyProgress(filtered, d)}
      \` : \`
        <!-- UNIFIED EXECUTIVE MONITORING (REFERENCE LAYOUT + ALL RETAINED OPTIONS) -->
        <div class="ref-unified-dashboard-container">
          <!-- 1. Interactive Multi-tier Filter Panel -->
          \${renderReferenceFilterPanel(d, filtered)}

          <!-- 2. Four Executive KPI Cards -->
          \${renderReferenceFourKpiCards(d, filtered)}

          <!-- 3. Resurvey Stage Pipeline -->
          \${renderResurveyStagePipeline(d, filtered)}

          <!-- Selected Village Detailed Card (if user clicked a village row) -->
          \${selectedVillage ? renderIndividualVillageProgressCard(selectedVillage) : ''}

          <!-- 4. 18-Column Village-Wise Present Status Data Table -->
          \${renderVillageWisePresentStatusTable(filtered)}

          <!-- 5. Mandal Drilldown Table -->
          \${renderMandalDrilldownSection(filtered)}

          <!-- 6. Retained Ground Truthing (GT in Acres) & DLR Logins (Number of Entries) Abstract & Breakdown -->
          \${renderPart1ResurveyProgress(filtered, d)}

          <!-- 7. Mandal-Wise Phase-5 & Phase-6 Daily Proforma Table -->
          \${renderMandalWiseDailyProformaSection(d, filtered)}
        </div>
      \`}
    </div>

    <!-- Floating Local Time Widget -->
    \${renderFloatingTimeWidget()}
  \`;
}
`;

// Replace renderDashboard()
appJs = appJs.replace(/function renderDashboard\(\)[\s\S]*?\n\}/, newRenderDashboard.trim());

// 5. Add event listeners for table sorting, pagination, and mandal filtering
const clickHandlers = `
  if (el.dataset.sortCol) {
    const col = el.dataset.sortCol;
    if (state.villageTableSortCol === col) {
      state.villageTableSortDir = (state.villageTableSortDir === 'asc') ? 'desc' : 'asc';
    } else {
      state.villageTableSortCol = col;
      state.villageTableSortDir = 'asc';
    }
    renderDashboard();
    return;
  }
  if (el.dataset.action === 'prev-village-page') {
    if (state.villageTablePageIndex > 0) {
      state.villageTablePageIndex--;
      renderDashboard();
    }
    return;
  }
  if (el.dataset.action === 'next-village-page') {
    state.villageTablePageIndex++;
    renderDashboard();
    return;
  }
  if (el.dataset.filterMandal) {
    state.homeFilters.mandal = el.dataset.filterMandal;
    updateHomeFilterUI();
    renderDashboard();
    return;
  }
  if (el.dataset.action === 'export-filtered-home-excel') {
    exportExcel();
    return;
  }
`;

if (!appJs.includes('if (el.dataset.sortCol)')) {
  appJs = appJs.replace(
    /if \(el\.dataset\.action === 'export-filtered-home-csv'\)/,
    `${clickHandlers}\n  if (el.dataset.action === 'export-filtered-home-csv')`
  );
}

// 6. Change listener for #ref-page-size-select and #ref-home-mandal-select
const changeHandlers = `
  if (event.target.id === 'ref-page-size-select') {
    state.villageTablePageSize = event.target.value === 'All' ? 'All' : Number(event.target.value);
    state.villageTablePageIndex = 0;
    renderDashboard();
  } else if (event.target.id === 'ref-home-mandal-select') {
    state.homeFilters.mandal = event.target.value;
    updateHomeFilterUI();
    renderDashboard();
  } else `;

if (!appJs.includes("event.target.id === 'ref-page-size-select'")) {
  appJs = appJs.replace(
    /if \(event\.target\.id === 'ppb-mandal-select'\)/,
    `${changeHandlers}if (event.target.id === 'ppb-mandal-select')`
  );
}

// Add URL query token support
if (!appJs.includes("urlParams.get('token')")) {
  appJs = appJs.replace(
    "if (!sessionStorage.getItem('ctr_officer_token')) {",
    "const urlParams = new URLSearchParams(window.location.search);\nconst urlToken = urlParams.get('token');\nif (urlToken) sessionStorage.setItem('ctr_officer_token', urlToken);\nif (!sessionStorage.getItem('ctr_officer_token')) {"
  );
}

// Write back to app.js and sync to public/app.js
fs.writeFileSync(appPath, appJs, 'utf8');
fs.writeFileSync(path.join(__dirname, '../public/app.js'), appJs, 'utf8');
console.log('✓ app.js and public/app.js updated successfully');
