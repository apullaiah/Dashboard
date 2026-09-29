const fs = require('fs');
const path = require('path');

function updateAppCode(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const isCrlf = code.includes('\r\n');
  code = code.replace(/\r\n/g, '\n');

  // 1. Add selectedPpbStage to state if not present
  if (!code.includes("selectedPpbStage:")) {
    code = code.replace(
      "selectedPpbCycle: 'Sep-26',",
      "selectedPpbCycle: 'Sep-26',\n  selectedPpbStage: null,"
    );
    console.log(`[${filePath}] Added selectedPpbStage to state.`);
  }

  // 2. Add RESURVEY_STAGES_CONFIG and renderPpbCycleStageBreakdown before renderPpbDistribution
  const stagesConfigCode = `const RESURVEY_STAGES_CONFIG = [
  {
    key: 'gt_not_started',
    filterVal: 'GT Not Started',
    step: 1,
    name: 'GT Not Started',
    short: 'GT Not Started',
    telugu: 'భూ సరిచూపు ప్రారంభం కానివి',
    authority: 'Survey Field Team',
    icon: '⏳',
    color: '#64748b',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('not started') || s.includes('not yet') || v.gt_status === 'Not Started';
    }
  },
  {
    key: 'gt_ongoing',
    filterVal: 'GT Ongoing',
    step: 2,
    name: 'GT Ongoing',
    short: 'GT Ongoing',
    telugu: 'భూ సరిచూపు జరుగుతున్నవి',
    authority: 'Survey Field Team',
    icon: '🌾',
    color: '#f59e0b',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return (s.includes('ongoing') || s.includes('gt')) && !s.includes('not');
    }
  },
  {
    key: 'vectorization',
    filterVal: 'Vectorization',
    step: 3,
    name: 'Cadastral Vectorization',
    short: 'Vectorization',
    telugu: 'కడస్ట్రల్ వెక్టరైజేషన్ & కోరిలేషన్',
    authority: 'GIS Vectorization Team',
    icon: '📐',
    color: '#8b5cf6',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('vector') || s.includes('area') || s.includes('corr');
    }
  },
  {
    key: 'vs_login',
    filterVal: 'VS Login',
    step: 4,
    name: 'Village Surveyor Login',
    short: 'VS Login',
    telugu: 'గ్రామ సర్వేయర్ లాగిన్',
    authority: 'Village Surveyor',
    icon: '🔐',
    color: '#3b82f6',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('surveyor') || s.includes('vs login') || s === 'vs login';
    }
  },
  {
    key: 'vro_login',
    filterVal: 'VRO Login',
    step: 5,
    name: 'VRO Login',
    short: 'VRO Login',
    telugu: 'గ్రామ రెవెన్యూ అధికారి లాగిన్',
    authority: 'Village Revenue Officer',
    icon: '🔐',
    color: '#2563eb',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('vro');
    }
  },
  {
    key: 'tah_login',
    filterVal: 'Tah Login',
    step: 6,
    name: 'Tahsildar Login',
    short: 'Tahsildar Login',
    telugu: 'తహసీల్దార్ లాగిన్ ఆమోదం',
    authority: 'Tahsildar / MRO',
    icon: '⭐',
    color: '#d97706',
    highlight: true,
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('tah');
    }
  },
  {
    key: 'rdo_login',
    filterVal: 'RDO Login',
    step: 7,
    name: 'RDO Login',
    short: 'RDO Login',
    telugu: 'డివిజనల్ అధికారి (RDO) లాగిన్',
    authority: 'Revenue Divisional Officer',
    icon: '🔐',
    color: '#1d4ed8',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('rdo');
    }
  },
  {
    key: 'jc_login',
    filterVal: 'JC Login',
    step: 8,
    name: 'Joint Collector Login',
    short: 'JC Login',
    telugu: 'జాయింట్ కలెక్టర్ (JC) లాగిన్',
    authority: 'Joint Collector',
    icon: '🔐',
    color: '#4338ca',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('jc');
    }
  },
  {
    key: 'section13',
    filterVal: '13 Completed',
    step: 9,
    name: 'Section 13 Notification',
    short: '13 Notification',
    telugu: 'సెక్షన్ 13 గెజిట్ నోటిఫికేషన్',
    authority: 'District Administration',
    icon: '📜',
    color: '#7c3aed',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('13');
    }
  },
  {
    key: 'draft_ror',
    filterVal: 'Draft RoR',
    step: 10,
    name: 'Draft RoR / E-KYC',
    short: 'Draft RoR',
    telugu: 'ముసాయిదా రికార్డ్ ఆఫ్ రైట్స్',
    authority: 'Revenue Department',
    icon: '📑',
    color: '#0284c7',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return s.includes('draft');
    }
  },
  {
    key: 'final_ror',
    filterVal: 'Final ROR Completed',
    step: 11,
    name: 'Final RoR Completed',
    short: 'Final RoR',
    telugu: 'తుది రికార్డ్ ఆఫ్ రైట్స్',
    authority: 'CCLA / Joint Collector',
    icon: '✅',
    color: '#059669',
    match: v => {
      const s = (v.current_stage || '').toLowerCase();
      return (s.includes('final ror') || v.status === 'Completed') && !v.ported_to_webland && v.webland_2_status !== 'Ported';
    }
  },
  {
    key: 'webland_2',
    filterVal: 'Ported',
    step: 12,
    name: 'Webland 2.0 Ported',
    short: 'Webland 2.0',
    telugu: 'వెబ్‌ల్యాండ్ 2.0 పోర్టింగ్ పూర్తి',
    authority: 'Webland State Center',
    icon: '🌐',
    color: '#047857',
    match: v => v.ported_to_webland || v.webland_2_status === 'Ported'
  }
];

function renderPpbCycleStageBreakdown(villages, activeCycle, selectedStageKey, context = 'ppb') {
  const totalInCycle = villages.length;
  
  const stageStats = RESURVEY_STAGES_CONFIG.map(st => {
    const matching = villages.filter(v => st.match(v));
    const count = matching.length;
    const pct = totalInCycle > 0 ? ((count / totalInCycle) * 100).toFixed(1) : '0.0';
    return {
      ...st,
      count,
      pct,
      isSelected: selectedStageKey === st.key
    };
  });

  const selectedStageObj = stageStats.find(s => s.key === selectedStageKey);
  const activeCycleTitle = activeCycle === 'all' ? 'All PPB Cycles' : (activeCycle || 'Sep-26');

  return \`
    <section class="section-card ppb-stage-breakdown-card" id="ppb-stage-breakdown-section" data-context="\${context}">
      <div class="ppb-stage-section-hdr">
        <div>
          <div class="ppb-stage-super-title">
            <span class="live-pulse-badge"><span class="pulse-ring"></span> RESURVEY PROCESS STAGES</span>
            <span class="stage-cycle-badge font-mono">\${h(activeCycleTitle)}</span>
          </div>
          <h3 class="ppb-stage-main-title">
            Number of Villages in Various Stages of Resurvey Process (\${totalInCycle} Villages)
          </h3>
          <p class="ppb-stage-subtitle">
            Current operational status and workflow bottleneck tracking for <strong>\${h(activeCycleTitle)}</strong> cycle. Click any stage card below to filter the village records.
          </p>
        </div>
        <div class="ppb-stage-header-actions">
          <button type="button" class="ppb-stage-reset-btn \${!selectedStageKey ? 'active' : ''}" data-action="reset-ppb-stage" title="View all villages across all stages">
            Show All Stages (\${totalInCycle} Villages)
          </button>
        </div>
      </div>

      \${selectedStageObj ? \`
        <div class="ppb-active-stage-banner">
          <div class="active-stage-banner-left">
            <span class="active-stage-badge">STAGE FILTER ACTIVE</span>
            <span>Showing <strong>\${selectedStageObj.count}</strong> villages in <strong>\${h(selectedStageObj.name)}</strong> (\${h(selectedStageObj.telugu)})</span>
          </div>
          <button type="button" class="clear-stage-pill" data-action="reset-ppb-stage" title="Clear stage filter">
            ✕ Clear Stage Filter
          </button>
        </div>
      \` : ''}

      <div class="ppb-stages-cards-grid">
        \${stageStats.map(st => \`
          <button type="button" 
                  class="ppb-stage-card \${st.isSelected ? 'is-selected' : ''} \${st.count > 0 ? 'has-villages' : 'is-zero'}" 
                  data-ppb-stage="\${st.key}"
                  title="Click to view & filter \${st.count} villages in \${st.name}">
            <div class="ppb-stage-top-strip">
              <span class="ppb-stage-step-tag font-mono">STAGE \${st.step}</span>
              <span class="ppb-stage-icon">\${st.icon}</span>
            </div>
            <div class="ppb-stage-name-block">
              <span class="ppb-stage-name">\${h(st.short)}</span>
              <small class="ppb-stage-telugu">\${st.telugu}</small>
            </div>
            <div class="ppb-stage-num-wrap">
              <strong class="ppb-stage-num-big \${st.count > 0 ? 'text-highlight' : 'text-zero'}" style="color:\${st.count > 0 ? st.color : '#94a3b8'};">
                \${st.count}
              </strong>
              <span class="ppb-stage-num-unit">VILLAGES</span>
            </div>
            <div class="ppb-stage-card-footer">
              <span class="ppb-stage-pct-pill \${st.count > 0 ? 'pct-active' : ''}">
                \${st.pct}% of cycle
              </span>
              \${st.count > 0 ? \`<span class="ppb-stage-drill-arrow">Filter →</span>\` : \`<span class="ppb-stage-zero-note">None</span>\`}
            </div>
          </button>
        \`).join('')}
      </div>
    </section>
  \`;
}
`;

  if (!code.includes("const RESURVEY_STAGES_CONFIG")) {
    code = code.replace(
      "function renderPpbDistribution() {",
      stagesConfigCode + "\nfunction renderPpbDistribution() {"
    );
    console.log(`[${filePath}] Added RESURVEY_STAGES_CONFIG and renderPpbCycleStageBreakdown.`);
  }

  // 3. Update renderPpbDistribution to compute cycleAllVillages and filter by selectedPpbStage
  const oldCycleVillagesInit = `  let cycleVillages = state.villages.filter(v => {
    if (activeCycle === 'all') return true;
    if (activeCycle === 'Prior Completed (Jan–Jul 2026)') {
      return (v.ppb_cycle && v.ppb_cycle.includes('Prior')) || (v.target_month && v.target_month.includes('Prior'));
    }
    return (v.ppb_cycle === activeCycle || v.target_month === activeCycle);
  });`;

  const newCycleVillagesInit = `  let cycleVillages = state.villages.filter(v => {
    if (activeCycle === 'all') return true;
    if (activeCycle === 'Prior Completed (Jan–Jul 2026)') {
      return (v.ppb_cycle && v.ppb_cycle.includes('Prior')) || (v.target_month && v.target_month.includes('Prior'));
    }
    return (v.ppb_cycle === activeCycle || v.target_month === activeCycle);
  });

  const cycleAllVillages = [...cycleVillages];

  if (state.selectedPpbStage) {
    const targetStageDef = RESURVEY_STAGES_CONFIG.find(s => s.key === state.selectedPpbStage);
    if (targetStageDef) {
      cycleVillages = cycleVillages.filter(v => targetStageDef.match(v));
    }
  }`;

  if (code.includes(oldCycleVillagesInit) && !code.includes("const cycleAllVillages = [...cycleVillages];")) {
    code = code.replace(oldCycleVillagesInit, newCycleVillagesInit);
    console.log(`[${filePath}] Updated cycleVillages filtering with selectedPpbStage.`);
  }

  // 4. Insert stage breakdown card in renderPpbDistribution right after ppb-cycles-hub-card
  const oldAnalysisEnd = `        <p class="cycle-analysis-narrative">\${cycleAnalysisText}</p>
      </div>
    </section>`;

  const newAnalysisEnd = `        <p class="cycle-analysis-narrative">\${cycleAnalysisText}</p>
      </div>
    </section>

    <!-- Resurvey Process Stages Breakdown for Selected PPB Cycle (Big Font Village Numbers) -->
    \${renderPpbCycleStageBreakdown(cycleAllVillages, activeCycle, state.selectedPpbStage, 'ppb')}`;

  if (code.includes(oldAnalysisEnd) && !code.includes("Resurvey Process Stages Breakdown for Selected PPB Cycle")) {
    code = code.replace(oldAnalysisEnd, newAnalysisEnd);
    console.log(`[${filePath}] Inserted renderPpbCycleStageBreakdown in renderPpbDistribution.`);
  }

  // 5. Add RESURVEY STAGE column to the village table in renderPpbDistribution
  const oldTableHdr = `            <tr>
              <th>CODE</th>
              <th>VILLAGE NAME</th>
              <th>MANDAL</th>
              <th>DIVISION</th>
              <th>PHASE</th>
              <th>PPB TARGET</th>
              <th>PRINTED</th>
              <th>DISTRIBUTED</th>
              <th>BALANCE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>`;

  const newTableHdr = `            <tr>
              <th>CODE</th>
              <th>VILLAGE NAME</th>
              <th>MANDAL</th>
              <th>DIVISION</th>
              <th>PHASE</th>
              <th>RESURVEY STAGE</th>
              <th>PPB TARGET</th>
              <th>PRINTED</th>
              <th>DISTRIBUTED</th>
              <th>BALANCE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>`;

  if (code.includes(oldTableHdr)) {
    code = code.replace(oldTableHdr, newTableHdr);
    console.log(`[${filePath}] Added RESURVEY STAGE th to table.`);
  }

  const oldRowPhase = `                  <td><span class="phase-card-badge">\${h(v.phase || '—')}</span></td>\n                  <td class="mono"><strong>\${target ? target.toLocaleString() : '—'}</strong></td>`;
  const newRowPhase = `                  <td><span class="phase-card-badge">\${h(v.phase || '—')}</span></td>\n                  <td><span class="stage-cell-pill font-mono \${(v.ported_to_webland || v.webland_2_status === 'Ported') ? 'stage-pill-green' : ''}">\${h(v.current_stage || (v.ported_to_webland ? 'Webland 2.0 Ported' : '—'))}</span></td>\n                  <td class="mono"><strong>\${target ? target.toLocaleString() : '—'}</strong></td>`;

  if (code.includes(oldRowPhase)) {
    code = code.replace(oldRowPhase, newRowPhase);
    console.log(`[${filePath}] Added stage cell td to table row.`);
  }

  // Update colspan in footer if present
  code = code.replace('colspan="11"', 'colspan="12"');

  // 6. Integrate stage breakdown into renderDashboard
  const oldDashboardBody = `function renderDashboard() {
  const d = state.dashboard || {};
  const has = Boolean(d.hasData);
  const filtered = getFilteredHomeVillages();

  root.innerHTML = \`
    <!-- 1. Government Dark Navy Header Banner (Chittoor District) -->
    \${has ? renderReferenceTopHeader(d) : ''}

    <!-- 2. Multi-tier Filter Panel (Phase / Mandal / Division / PPB Cycle) -->
    \${has ? renderReferenceFilterPanel(d, filtered) : ''}

    <!-- 3. Overview Section: Strictly Abstract of Resurvey and PPB Distribution Cycle -->`;

  const newDashboardBody = `function renderDashboard() {
  const d = state.dashboard || {};
  const has = Boolean(d.hasData);
  const filtered = getFilteredHomeVillages();

  const currentHomeCycle = state.homeFilters?.month || 'All months';
  const homeCycleVillages = state.villages.filter(v => {
    if (!currentHomeCycle || currentHomeCycle === 'All months' || currentHomeCycle === 'All') return true;
    const cyc = (v.ppb_cycle || v.target_month || '').toLowerCase();
    return cyc.includes(currentHomeCycle.toLowerCase());
  });
  const currentStageObj = RESURVEY_STAGES_CONFIG.find(s => s.filterVal === state.homeFilters?.stage);

  root.innerHTML = \`
    <!-- 1. Government Dark Navy Header Banner (Chittoor District) -->
    \${has ? renderReferenceTopHeader(d) : ''}

    <!-- 2. Multi-tier Filter Panel (Phase / Mandal / Division / PPB Cycle) -->
    \${has ? renderReferenceFilterPanel(d, filtered) : ''}

    <!-- 2.5 Resurvey Stages Breakdown (Big Font Numbers for Filtered / Selected PPB Cycle) -->
    \${renderPpbCycleStageBreakdown(homeCycleVillages, currentHomeCycle, currentStageObj?.key, 'dashboard')}

    <!-- 3. Overview Section: Strictly Abstract of Resurvey and PPB Distribution Cycle -->`;

  if (code.includes(oldDashboardBody)) {
    code = code.replace(oldDashboardBody, newDashboardBody);
    console.log(`[${filePath}] Integrated renderPpbCycleStageBreakdown into renderDashboard.`);
  }

  // 7. Integrate stage breakdown into renderVillageMonitoring
  const oldVmQuickBar = `    <div class="quick-pills-bar">
      <div class="view-mode-toggle" style="margin-right:8px;">
        <button class="view-mode-btn \${state.villageFilterMode !== 'phase' ? 'active' : ''}" data-toggle-village-mode="cycle">
          PPBs Cycle
        </button>
        <button class="view-mode-btn \${state.villageFilterMode === 'phase' ? 'active' : ''}" data-toggle-village-mode="phase">
          Phases
        </button>
      </div>
      <span style="font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;margin-right:2px;">Quick View:</span>
      \${pillsToShow.map(p => \`
        <button class="quick-pill \${isPillActive(p.id) ? 'active' : ''} \${p.alert ? 'alert' : ''} \${p.isCurrent ? 'active-cycle' : ''} \${p.isPorted ? 'ported-pill' : ''}" data-quick-filter="\${p.id}">
          \${p.isPorted ? icon('shield') : ''} \${h(p.label)} <span class="pill-count">\${p.count}</span>
        </button>
      \`).join('')}
    </div>`;

  const newVmQuickBar = `    <div class="quick-pills-bar">
      <div class="view-mode-toggle" style="margin-right:8px;">
        <button class="view-mode-btn \${state.villageFilterMode !== 'phase' ? 'active' : ''}" data-toggle-village-mode="cycle">
          PPBs Cycle
        </button>
        <button class="view-mode-btn \${state.villageFilterMode === 'phase' ? 'active' : ''}" data-toggle-village-mode="phase">
          Phases
        </button>
      </div>
      <span style="font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;margin-right:2px;">Quick View:</span>
      \${pillsToShow.map(p => \`
        <button class="quick-pill \${isPillActive(p.id) ? 'active' : ''} \${p.alert ? 'alert' : ''} \${p.isCurrent ? 'active-cycle' : ''} \${p.isPorted ? 'ported-pill' : ''}" data-quick-filter="\${p.id}">
          \${p.isPorted ? icon('shield') : ''} \${h(p.label)} <span class="pill-count">\${p.count}</span>
        </button>
      \`).join('')}
    </div>

    <!-- PPB Cycle Resurvey Stages Breakdown (Big Font Numbers) when in Cycle Mode -->
    \${(state.villageFilterMode === 'cycle' || active.ppb_cycle) ? (() => {
      const activeCyc = active.ppb_cycle || 'all';
      const cycVillages = state.villages.filter(v => {
        if (!active.ppb_cycle || active.ppb_cycle === 'all') return true;
        return (v.ppb_cycle === active.ppb_cycle || v.target_month === active.ppb_cycle);
      });
      const stObj = RESURVEY_STAGES_CONFIG.find(s => s.filterVal === active.current_stage);
      return renderPpbCycleStageBreakdown(cycVillages, activeCyc, stObj?.key, 'villages');
    })() : ''}`;

  if (code.includes(oldVmQuickBar)) {
    code = code.replace(oldVmQuickBar, newVmQuickBar);
    console.log(`[${filePath}] Integrated renderPpbCycleStageBreakdown into renderVillageMonitoring.`);
  }

  // 8. Event handlers for ppbStage and reset-ppb-stage
  const oldPpbCycleClick = `  if (el.dataset.ppbCycle) {
    state.selectedPpbCycle = el.dataset.ppbCycle;
    renderPpbDistribution();
    return;
  }`;

  const newPpbCycleClick = `  if (el.dataset.ppbStage) {
    const st = el.dataset.ppbStage;
    if (state.view === 'ppb') {
      state.selectedPpbStage = (state.selectedPpbStage === st) ? null : st;
      renderPpbDistribution();
    } else if (state.view === 'villages') {
      const conf = RESURVEY_STAGES_CONFIG.find(s => s.key === st);
      if (conf) {
        state.villageFilters.current_stage = (state.villageFilters.current_stage === conf.filterVal) ? '' : conf.filterVal;
        loadVillages().then(renderVillageMonitoring);
      }
    } else if (state.view === 'dashboard') {
      const conf = RESURVEY_STAGES_CONFIG.find(s => s.key === st);
      if (conf) {
        state.homeFilters.stage = (state.homeFilters.stage === conf.filterVal) ? 'All stages' : conf.filterVal;
        renderDashboard();
      }
    }
    return;
  }

  if (el.dataset.action === 'reset-ppb-stage') {
    if (state.view === 'ppb') {
      state.selectedPpbStage = null;
      renderPpbDistribution();
    } else if (state.view === 'villages') {
      delete state.villageFilters.current_stage;
      loadVillages().then(renderVillageMonitoring);
    } else if (state.view === 'dashboard') {
      state.homeFilters.stage = 'All stages';
      renderDashboard();
    }
    return;
  }

  if (el.dataset.ppbCycle) {
    state.selectedPpbCycle = el.dataset.ppbCycle;
    state.selectedPpbStage = null;
    renderPpbDistribution();
    return;
  }`;

  if (code.includes(oldPpbCycleClick)) {
    code = code.replace(oldPpbCycleClick, newPpbCycleClick);
    console.log(`[${filePath}] Added data-ppb-stage and reset-ppb-stage click listeners.`);
  }

  // When clicking ppb_cycle figure in Overview, also update homeFilters.month
  const oldFigPpb = `    } else if (fig.startsWith('ppb_')) {
      state.ppbFigureFilter = fig.replace('ppb_', '');
      renderDashboard();
      const sec = document.getElementById('ppb-village-section');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }`;

  const newFigPpb = `    } else if (fig.startsWith('ppb_')) {
      state.ppbFigureFilter = fig.replace('ppb_', '');
      if (fig.startsWith('ppb_cycle_')) {
        const cName = fig.replace('ppb_cycle_', '');
        state.homeFilters.month = cName;
        state.selectedPpbCycle = cName;
      }
      renderDashboard();
      const sec = document.getElementById('ppb-village-section');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }`;

  if (code.includes(oldFigPpb)) {
    code = code.replace(oldFigPpb, newFigPpb);
    console.log(`[${filePath}] Updated ppb_cycle figure handler.`);
  }

  const result = isCrlf ? code.replace(/\n/g, '\r\n') : code;
  fs.writeFileSync(filePath, result, 'utf8');
}

['app.js', 'public/app.js'].forEach(updateAppCode);
console.log('App code updates complete.');
