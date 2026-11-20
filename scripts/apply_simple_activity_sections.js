const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(appPath, 'utf8');
console.log('Original public/app.js size:', code.length);

// 1. In renderPart1ResurveyProgress:
// Update Tab buttons
const oldTabs = `        <div class="resurvey-toggle-group resurvey-stage-switcher-bar">
          <button type="button" class="resurvey-tab-btn \${isGt ? 'active' : ''}" data-overview-stage="gt_status" id="toggle-tab-gt" title="Click to view Ground Truthing (GT) progress">
            <span class="tab-icon">🌾</span>
            <span class="tab-text">1. GT Progress (Acres)</span>
            \${isGt ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isVec ? 'active' : ''}" data-overview-stage="vectorization_status" id="toggle-tab-vectorization" title="Click to view Cadastral Vectorization & Correlation progress">
            <span class="tab-icon">📐</span>
            <span class="tab-text">2. Vectorization</span>
            \${isVec ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'vs_status' ? 'active' : ''}" data-overview-stage="vs_status" id="toggle-tab-vs" title="Click to view Village Surveyor Login (VS) progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">3. VS Login</span>
            \${isDlr && activeDlr === 'vs_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'vro_status' ? 'active' : ''}" data-overview-stage="vro_status" id="toggle-tab-vro" title="Click to view Village Revenue Officer Login (VRO) progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">4. VRO Login</span>
            \${isDlr && activeDlr === 'vro_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'tahsildar_status' ? 'active tab-tahsildar' : ''}" data-overview-stage="tahsildar_status" id="toggle-tab-tah" title="Click to view Tahsildar Login progress">
            <span class="tab-icon">⭐</span>
            <span class="tab-text">5. Tahsildar Login</span>
            \${isDlr && activeDlr === 'tahsildar_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'rdo_status' ? 'active' : ''}" data-overview-stage="rdo_status" id="toggle-tab-rdo" title="Click to view RDO Login progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">6. RDO Login</span>
            \${isDlr && activeDlr === 'rdo_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'jc_status' ? 'active' : ''}" data-overview-stage="jc_status" id="toggle-tab-jc" title="Click to view JC Login progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">7. JC Login</span>
            \${isDlr && activeDlr === 'jc_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
        </div>`;

const newTabs = `        <div class="resurvey-toggle-group resurvey-stage-switcher-bar">
          <button type="button" class="resurvey-tab-btn \${isGt ? 'active' : ''}" data-overview-stage="gt_status" id="toggle-tab-gt" title="Click to view Ground Truthing (GT) progress">
            <span class="tab-icon">🌾</span>
            <span class="tab-text">🌾 Ground Truthing (GT)</span>
            \${isGt ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isVec ? 'active' : ''}" data-overview-stage="vectorization_status" id="toggle-tab-vectorization" title="Click to view Cadastral Vectorization & Correlation progress">
            <span class="tab-icon">📐</span>
            <span class="tab-text">📐 Vectorization</span>
            \${isVec ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'vs_status' ? 'active' : ''}" data-overview-stage="vs_status" id="toggle-tab-vs" title="Click to view Village Surveyor Login (VS) progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">🔐 VS Login</span>
            \${isDlr && activeDlr === 'vs_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'vro_status' ? 'active' : ''}" data-overview-stage="vro_status" id="toggle-tab-vro" title="Click to view Village Revenue Officer Login (VRO) progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">🔐 VRO Login</span>
            \${isDlr && activeDlr === 'vro_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'tahsildar_status' ? 'active tab-tahsildar' : ''}" data-overview-stage="tahsildar_status" id="toggle-tab-tah" title="Click to view Tahsildar Login progress">
            <span class="tab-icon">⭐</span>
            <span class="tab-text">⭐ Tahsildar Login</span>
            \${isDlr && activeDlr === 'tahsildar_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'rdo_status' ? 'active' : ''}" data-overview-stage="rdo_status" id="toggle-tab-rdo" title="Click to view RDO Login progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">🔐 RDO Login</span>
            \${isDlr && activeDlr === 'rdo_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${isDlr && activeDlr === 'jc_status' ? 'active' : ''}" data-overview-stage="jc_status" id="toggle-tab-jc" title="Click to view JC Login progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">🔐 JC Login</span>
            \${isDlr && activeDlr === 'jc_status' ? '<span class="tab-active-dot"></span>' : ''}
          </button>
        </div>`;

if (code.includes(oldTabs)) {
  code = code.replace(oldTabs, newTabs);
  console.log('✓ Updated resurvey-stage-switcher-bar tabs');
} else {
  console.warn('! oldTabs not found directly');
}

// Update GT table headers & callouts
const oldGtHeader = `<span class="stream-type-pill pill-gt">🌾 GROUND TRUTHING (GT) EXTENT ABSTRACT · MEASURED STRICTLY IN ACRES</span>
              <span class="stream-benchmark-callout">
                ⭐ <strong>Benchmark Rule:</strong> Every day one team should complete <strong>25 Ac of GT per day per rover</strong>.
              </span>`;
const newGtHeader = `<span class="stream-type-pill pill-gt">🌾 GROUND TRUTHING (GT) STATUS · EXTENT IN ACRES</span>
              <span class="stream-benchmark-callout">
                ⭐ <strong>Benchmark:</strong> 25 Ac / Rover / Day
              </span>`;
if (code.includes(oldGtHeader)) {
  code = code.replace(oldGtHeader, newGtHeader);
  console.log('✓ Updated GT stream header');
}

// In GT table headers
code = code.replace(
  'GT COMPLETED TODAY (00:00 TO 23:59 HRS · RAILWAY TIMINGS) ↗',
  'GT COMPLETED TODAY (AC) ↗'
);
code = code.replace(
  'CUMULATIVE EXTENT COMPLETED (IN ACRES) ↗',
  'CUMULATIVE GT COMPLETED (AC) ↗'
);
code = code.replace(
  'BALANCE EXTENT TO BE COMPLETED (IN ACRES) ↗',
  'BALANCE GT REMAINING (AC) ↗'
);
code = code.replace(
  'TOTAL TARGET EXTENT (IN ACRES) ↗',
  'TOTAL TARGET EXTENT (AC) ↗'
);
code = code.replace(
  'DAILY BENCHMARK RULE (25 ACRES / ROVER / DAY)',
  'DAILY BENCHMARK'
);
code = code.replace(
  'DAILY BENCHMARK CAPACITY (ACRES / DAY)',
  'DAILY CAPACITY (AC)'
);
code = code.replace(
  'TODAY PACING VS BENCHMARK',
  'PACING %'
);
code = code.replace(
  'GT CLEARANCE % ↗',
  'CLEARANCE % ↗'
);

// Remove twenty-four-hr-badge
code = code.replace(
  '<div class="twenty-four-hr-badge">TODAY\'S WORK (00:00 TO 23:59 HRS)</div>',
  ''
);

// Replace GT narrative benchmark bar
const oldGtBenchBar = `          <!-- Benchmark Capacity Callout Bar -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">🌾</div>
            <div class="benchmark-info-cell">
              <strong>Ground Truthing Capacity & Benchmark Pacing Analysis:</strong>
              <div>Every day one team should complete <strong>25 Acres of GT per day per rover</strong>. For the active scope (\${gt.filteredVillagesCount} villages with <strong>\${gt.rovers} rovers</strong>), the daily capacity is <strong>\${formatExtent(gt.dailyCapacityAc)} Acres/day</strong>. Today achieved <strong>\${formatExtent(gt.todayGtExtent)} Acres</strong> (work done today during 00:00 to 23:59 Hrs Railway timings) (\${gt.gtPacePct}% pacing vs benchmark). Cumulative completed extent is <strong>\${formatExtent(gt.cumulativeGtExtent)} Acres</strong> (\${gt.gtCompletionPct}% of target \${formatExtent(gt.totalTargetExtent)} Acres, balance: \${formatExtent(gt.balanceGtExtent)} Acres).</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">GT Clearance: <strong>\${gt.gtCompletionPct}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-emerald" style="width:\${Math.min(100, parseFloat(gt.gtCompletionPct))}%;"></div>
              </div>
            </div>
          </div>`;

const newGtBenchBar = `          <!-- Benchmark Capacity Callout Bar -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">🌾</div>
            <div class="benchmark-info-cell">
              <strong>GT Benchmark & Daily Capacity:</strong>
              <div>Benchmark: <strong>25 Ac/day/rover</strong> · Scope: <strong>\${gt.filteredVillagesCount} villages</strong> with <strong>\${gt.rovers} rovers</strong> · Daily Target Capacity: <strong>\${formatExtent(gt.dailyCapacityAc)} Ac/day</strong> · Today Achieved: <strong>+\${formatExtent(gt.todayGtExtent)} Ac</strong> (\${gt.gtPacePct}% pacing)</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">GT Clearance: <strong>\${gt.gtCompletionPct}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-emerald" style="width:\${Math.min(100, parseFloat(gt.gtCompletionPct))}%;"></div>
              </div>
            </div>
          </div>`;

if (code.includes(oldGtBenchBar)) {
  code = code.replace(oldGtBenchBar, newGtBenchBar);
  console.log('✓ Simplified GT benchmark summary bar');
}

// Replace Vectorization narrative benchmark bar
const oldVecBenchBar = `          <!-- Benchmark Performance Callout Bar -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">📐</div>
            <div class="benchmark-info-cell">
              <strong>Cadastral Vectorization & Correlation Pacing Analysis:</strong>
              <div>Cadastral map vectorization & correlation across <strong>\${vecRecords.length} villages</strong> with <strong>\${vecTotChalthas.toLocaleString('en-IN')} total chalthas</strong> and <strong>\${vecTotLpms.toLocaleString('en-IN')} total LPMs</strong>. Today achieved <strong>+\${vecTodayLpms.toLocaleString('en-IN')} LPMs</strong>. Cumulative completed is <strong>\${vecCumLpms.toLocaleString('en-IN')} LPMs</strong> (\${vecPct}% cleared, <strong>\${vecBalLpms.toLocaleString('en-IN')}</strong> balance LPMs remaining).</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">Vectorization: <strong>\${vecPct}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-purple" style="width:\${Math.min(100, parseFloat(vecPct))}%;"></div>
              </div>
            </div>
          </div>`;

const newVecBenchBar = `          <!-- Benchmark Performance Callout Bar -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">📐</div>
            <div class="benchmark-info-cell">
              <strong>Vectorization Status & Pacing:</strong>
              <div>Scope: <strong>\${vecRecords.length} villages</strong> · <strong>\${vecTotChalthas.toLocaleString('en-IN')} total chalthas</strong> · Today: <strong>+\${vecTodayLpms.toLocaleString('en-IN')} LPMs</strong> · Cumulative: <strong>\${vecCumLpms.toLocaleString('en-IN')} / \${vecTotLpms.toLocaleString('en-IN')} LPMs</strong> (\${vecPct}% cleared, balance: \${vecBalLpms.toLocaleString('en-IN')})</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">Vectorization: <strong>\${vecPct}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-purple" style="width:\${Math.min(100, parseFloat(vecPct))}%;"></div>
              </div>
            </div>
          </div>`;

if (code.includes(oldVecBenchBar)) {
  code = code.replace(oldVecBenchBar, newVecBenchBar);
  console.log('✓ Simplified Vectorization benchmark summary bar');
}

// Replace DLR narrative benchmark bar
const oldDlrBenchBar = `          <!-- Benchmark Performance Callout Card -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">🔐</div>
            <div class="benchmark-info-cell">
              <strong>DLR Revenue Officer Entries & Benchmark Pacing Analysis:</strong>
              <div>Target benchmark output is <strong>DLR entries@200 per day (Number of Entries)</strong>. Today recorded <strong>\${dlr.todayTotal} entries</strong> across all 5 officer approval tiers (\${dlr.pacePct}% pacing). Cumulative clearances stand at <strong>\${dlr.cumulativeTotal} entries</strong> of <strong>\${dlr.totalSteps} total workflow entries</strong> across \${filtered.length} villages (\${dlr.pctTotal}% cleared, \${dlr.balanceTotal} balance entries remaining).</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">DLR Clearance: <strong>\${dlr.pctTotal}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-cyan" style="width:\${Math.min(100, parseFloat(dlr.pctTotal))}%;"></div>
              </div>
            </div>
          </div>`;

const newDlrBenchBar = `          <!-- Benchmark Performance Callout Card -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">🔐</div>
            <div class="benchmark-info-cell">
              <strong>DLR Officer Entries Status:</strong>
              <div>Target output: <strong>200 entries/day</strong> · Today: <strong>+\${dlr.todayTotal} entries</strong> (\${dlr.pacePct}% pacing) · Cumulative: <strong>\${dlr.cumulativeTotal} / \${dlr.totalSteps} entries</strong> (\${dlr.pctTotal}% cleared across \${filtered.length} villages, \${dlr.balanceTotal} balance)</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">DLR Clearance: <strong>\${dlr.pctTotal}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-cyan" style="width:\${Math.min(100, parseFloat(dlr.pctTotal))}%;"></div>
              </div>
            </div>
          </div>`;

if (code.includes(oldDlrBenchBar)) {
  code = code.replace(oldDlrBenchBar, newDlrBenchBar);
  console.log('✓ Simplified DLR benchmark summary bar');
}

// Remove all fig-click-hint spans
const beforeHints = (code.match(/<span class="fig-click-hint">.*?<\/span>/g) || []).length;
code = code.replace(/\s*<span class="fig-click-hint">.*?<\/span>/g, '');
console.log(`✓ Removed ${beforeHints} fig-click-hint spans`);

// Remove redundant Month-Wise PPBs sub-table in renderPart2PpbDistributionStatus
const oldPpbCyclesSubtablePattern = /<!-- Month-Wise PPBs Distribution Delivery Cycles \(Strict 2-Row Table\) -->[\s\S]*?<!-- PPB Village Breakdown Table with Survey Officers in the Last Column -->/;
if (oldPpbCyclesSubtablePattern.test(code)) {
  code = code.replace(oldPpbCyclesSubtablePattern, '<!-- PPB Village Breakdown Table with Survey Officers in the Last Column -->');
  console.log('✓ Removed redundant month-wise PPBs cycle boxes sub-table from Part 2');
} else {
  console.warn('! oldPpbCyclesSubtablePattern not matched');
}

// Remove Section 3.5 (renderGtNotStartedAndPhase7Section), floating reset btn, and floating time widget from renderDashboard
const oldDashboardFooter = `    <!-- 3.5 Dedicated Section: GT Not Started & All Phase-7 Villages -->
    \${renderGtNotStartedAndPhase7Section(d, state.villages || [])}

    <!-- Persistent Floating Reset Button (Visible at any scroll position) -->
    <button type="button" class="floating-reset-btn" data-action="reset-all-filters" title="Click to reset all section filters across the dashboard">
      ↺ Reset All Filters
    </button>

    <!-- Floating Local Time Widget -->
    \${renderFloatingTimeWidget()}
  \`;

  attachGtUnstartedEvents();`;

const newDashboardFooter = `  \`;

  attachGtUnstartedEvents();`;

if (code.includes(oldDashboardFooter)) {
  code = code.replace(oldDashboardFooter, newDashboardFooter);
  console.log('✓ Cleaned renderDashboard footer (removed Sec 3.5, floating reset, floating time)');
} else {
  console.warn('! oldDashboardFooter not matched directly');
}

// 2. In renderMandalActionPlan:
// Replace 14 KPI cards with 5 Clean Ongoing Activity Cards
const oldMandalKpiPattern = /<!-- 12 EXECUTIVE SUMMARY KPI CARDS -->[\s\S]*?<!-- ⏱️ RESURVEY STAGES STATUTORY TIMELINES & TARGET DATE COMPLIANCE TRACKER \(11 STAGES\) -->[\s\S]*?<\/section>/;

const newFiveKpis = `<!-- 5 EXECUTIVE ONGOING ACTIVITY STATUS CARDS -->
      <section class="action-plan-kpi-grid ap-kpi-grid-five">
        <div class="ap-kpi-card kpi-accent-blue" data-mandal-figure="1" data-mandal="__ALL__" data-metric="villages" title="Click to view all 736 villages">
          <div class="ap-kpi-header"><span class="ap-kpi-label">TOTAL UNIVERSE</span><span class="ap-kpi-click-tag">View All ↗</span></div>
          <div class="ap-kpi-val">\${summary.villages} <small style="font-size:13px;color:var(--muted);font-weight:600;">Vlgs · \${summary.total_mandals} Mandals</small></div>
          <div class="ap-kpi-sub">4 Divisions · \${formatExtent(summary.total_extent)} Ac (Govt: \${formatExtent(summary.govt_land)} Ac · Patta: \${formatExtent(summary.patta_land)} Ac)</div>
        </div>

        <div class="ap-kpi-card kpi-accent-purple" data-mandal-figure="1" data-mandal="__ALL__" data-metric="gt_not_started" title="Click to view Ground Truthing status">
          <div class="ap-kpi-header"><span class="ap-kpi-label">GROUND TRUTHING (GT) ONGOING</span><span class="ap-kpi-click-tag">View ↗</span></div>
          <div class="ap-kpi-val" style="color:#8b5cf6;">\${Math.max(0, summary.balance_villages - (summary.dlr_vs + summary.dlr_vro + summary.dlr_tah + summary.dlr_rdo + summary.dlr_jc) - summary.gt_not_started)} <small style="font-size:13px;color:var(--muted);font-weight:600;">Ongoing · \${summary.gt_not_started} Not Started</small></div>
          <div class="ap-kpi-sub">\${summary.rovers_available} Active Rovers · \${summary.vs_available} VS · Capacity: \${summary.rovers_available * 25} Ac/Day</div>
        </div>

        <div class="ap-kpi-card kpi-accent-blue" data-mandal-figure="1" data-mandal="__ALL__" data-metric="dlr_pending_all" title="Click to view all villages pending in DLR officer logins">
          <div class="ap-kpi-header"><span class="ap-kpi-label">PENDING IN DLR LOGINS</span><span class="ap-kpi-click-tag">View ↗</span></div>
          <div class="ap-kpi-val" style="color:#2563eb;">\${summary.dlr_vs + summary.dlr_vro + summary.dlr_tah + summary.dlr_rdo + summary.dlr_jc} <small style="font-size:13px;color:var(--muted);font-weight:600;">Villages Pending</small></div>
          <div class="ap-kpi-sub">VS: \${summary.dlr_vs} · VRO: \${summary.dlr_vro} · Tah: \${summary.dlr_tah} · RDO: \${summary.dlr_rdo} · JC: \${summary.dlr_jc}</div>
        </div>

        <div class="ap-kpi-card kpi-accent-emerald" data-mandal-figure="1" data-mandal="__ALL__" data-metric="resurvey_completed" title="Click to view completed villages">
          <div class="ap-kpi-header"><span class="ap-kpi-label">RESURVEY COMPLETED</span><span class="ap-kpi-click-tag">View ↗</span></div>
          <div class="ap-kpi-val" style="color:#059669;">\${summary.resurvey_completed} <small style="font-size:13px;color:var(--muted);font-weight:600;">(\${summary.completion_pct}%)</small></div>
          <div class="ap-kpi-sub">Final RoR / Webland-2.0 Ported</div>
        </div>

        <div class="ap-kpi-card kpi-accent-amber" data-mandal-figure="1" data-mandal="__ALL__" data-metric="patta_land" title="Click to view patta land pending GT">
          <div class="ap-kpi-header"><span class="ap-kpi-label">PATTA LAND BALANCE</span><span class="ap-kpi-click-tag">View ↗</span></div>
          <div class="ap-kpi-val" style="color:#d97706;">\${formatExtent(summary.patta_land)} <small style="font-size:13px;color:var(--muted);font-weight:600;">Ac Pending GT</small></div>
          <div class="ap-kpi-sub">Phase-6 Target: 31.12.2026</div>
        </div>
      </section>`;

if (oldMandalKpiPattern.test(code)) {
  code = code.replace(oldMandalKpiPattern, newFiveKpis);
  console.log('✓ Replaced 14 KPI cards & 11-stage timeline with 5 Ongoing Activity Cards');
} else {
  console.warn('! oldMandalKpiPattern not matched');
}

// In the Mandal Action Plan table:
// Remove th-target-date from headers
code = code.replace(/<div class="th-target-date">[\s\S]*?<\/div>/g, '');
console.log('✓ Removed th-target-date from headers');

// Remove badge-trailed-mini from cells and totals
const trailedBadgePattern = /\s*\$\{m\.stage_trailed\.[a-z_]+ > 0 \? `[\s\S]*?` : ''\}/g;
const matchT = code.match(trailedBadgePattern) || [];
code = code.replace(trailedBadgePattern, '');
console.log(`✓ Removed ${matchT.length} trailed badges from tbody`);

const trailedTotalPattern = /\s*\$\{summary\.stage_trailed\.[a-z_]+ > 0 \? `[\s\S]*?` : ''\}/g;
const matchTot = code.match(trailedTotalPattern) || [];
code = code.replace(trailedTotalPattern, '');
console.log(`✓ Removed ${matchTot.length} trailed badges from tfoot`);

// Update 774 occurrences to 736 where referring to district universe
code = code.replace(/all 774 revenue villages/g, 'all 736 revenue villages');
code = code.replace(/all 774 villages/g, 'all 736 villages');
code = code.replace(/All 774 Villages/g, 'All 736 Villages');
code = code.replace(/774 VILLAGE UNIVERSE/g, '736 VILLAGE UNIVERSE');
code = code.replace(/774-village universe/g, '736-village universe');
code = code.replace(/The 774-village dataset/g, 'The 736-village dataset');
code = code.replace(/774 villages/g, '736 villages');

// Write back to public/app.js
fs.writeFileSync(appPath, code, 'utf8');
console.log('Saved updated public/app.js. New size:', code.length);

// Also copy to root app.js
fs.writeFileSync(path.join(__dirname, '..', 'app.js'), code, 'utf8');
console.log('Synchronized to root app.js');
