const fs = require('fs');
const path = require('path');

console.log('=== Applying Overview Restructure to 2 Parts with 2-Row Abstract Tables ===\n');

function updateCode(code) {
  // 1. Add resurveyProgressTab: 'gt' to state
  if (!code.includes("resurveyProgressTab: 'gt'")) {
    code = code.replace(
      /overviewMode:\s*'both',/,
      "overviewMode: 'both', resurveyProgressTab: 'gt',"
    );
  }

  // 2. Enhance calculateStageAbstractMetrics with rover & DLR benchmarks
  const oldGtMarker = 'const balanceGtExtent = Math.max(0, totalTargetExtent - cumulativeGtExtent);';
  if (!code.includes('const benchmarkRateAc = 25;')) {
    const roverCalc = `  let rovers = 60;
  if (isP5) rovers = 24;
  else if (isP6) rovers = 36;
  else if (isMandalFiltered) {
    rovers = Math.max(1, Math.round(60 * (totalScope / 736)));
  }
  const benchmarkRateAc = 25; // 25 Ac per day per rover
  const dailyCapacityAc = rovers * benchmarkRateAc;
  const gtPacePct = dailyCapacityAc > 0 ? ((todayGtExtent / dailyCapacityAc) * 100).toFixed(1) : '0.0';

  const balanceGtExtent = Math.max(0, totalTargetExtent - cumulativeGtExtent);`;

    code = code.replace(oldGtMarker, roverCalc);
  }

  const oldDlrMarker = 'const totalDlrPct = totalDlrSteps > 0 ? ((totalDlrCum / totalDlrSteps) * 100).toFixed(1) : \'0.0\';';
  if (!code.includes('const dlrBenchmarkDaily = 200;')) {
    const dlrCalc = `const totalDlrPct = totalDlrSteps > 0 ? ((totalDlrCum / totalDlrSteps) * 100).toFixed(1) : '0.0';
  const dlrBenchmarkDaily = 200; // 200 entries per day benchmark
  const dlrPacePct = dlrBenchmarkDaily > 0 ? ((totalDlrToday / dlrBenchmarkDaily) * 100).toFixed(1) : '0.0';`;

    code = code.replace(oldDlrMarker, dlrCalc);
  }

  // Update return object in calculateStageAbstractMetrics
  if (!code.includes('benchmarkRateAc,')) {
    code = code.replace(
      /gtBalanceVillages\r?\n\s*\},/,
      `gtBalanceVillages,
      rovers,
      benchmarkRateAc,
      dailyCapacityAc,
      gtPacePct
    },`
    );
  }

  if (!code.includes('dlrBenchmarkDaily,')) {
    code = code.replace(
      /pctTotal:\s*totalDlrPct\r?\n\s*\},/,
      `pctTotal: totalDlrPct,
      dlrBenchmarkDaily,
      dlrPacePct
    },`
    );
  }

  // 3. Ensure renderPart1ResurveyProgress and renderPart2PpbDistributionStatus are present
  if (!code.includes('function renderPart1ResurveyProgress(')) {
    const part1And2 = `
function renderPart1ResurveyProgress(filtered, d) {
  const f = state.homeFilters || {};
  const metrics = calculateStageAbstractMetrics(filtered, f);
  const { scope, gt, dlr, pipeline } = metrics;
  const currentTab = state.resurveyProgressTab || 'gt';
  const isGt = currentTab === 'gt';

  return \`
    <section class="overview-part-card" id="part-1-resurvey-progress">
      <div class="part-header-bar">
        <div class="part-title-block">
          <span class="part-kicker-badge">PART 1 OF 2 · RESURVEY PROGRESS</span>
          <h3 class="part-main-title">1. RESURVEY PROGRESS / రీసర్వే ప్రగతి</h3>
          <p class="part-sub-title">Field execution tracking: Ground Truthing (GT) extent coverage and DLR multi-tier revenue officer logins clearances</p>
        </div>
        <div class="resurvey-toggle-group">
          <button type="button" class="resurvey-tab-btn \${isGt ? 'active' : ''}" data-resurvey-tab="gt" id="toggle-tab-gt" title="Click to view only Ground Truthing progress">
            <span class="tab-icon">🌾</span>
            <span class="tab-text">GT Progress</span>
            \${isGt ? '<span class="tab-active-dot"></span>' : ''}
          </button>
          <button type="button" class="resurvey-tab-btn \${!isGt ? 'active' : ''}" data-resurvey-tab="dlr" id="toggle-tab-dlr" title="Click to view only DLR Revenue Officer logins progress">
            <span class="tab-icon">🔐</span>
            <span class="tab-text">DLR Logins</span>
            \${!isGt ? '<span class="tab-active-dot"></span>' : ''}
          </button>
        </div>
      </div>

      \${isGt ? \`
        <!-- GT ONLY VIEW: Clicking GT displays ONLY Ground Truthing Information -->
        <div class="stream-content-panel gt-stream-panel abstract-table-card gt-extent-abstract-card" id="gt-extent-abstract-card">
          <div class="stream-panel-header">
            <div class="stream-badge-title">
              <span class="stream-type-pill pill-gt">🌾 GROUND TRUTHING (GT) EXTENT ABSTRACT</span>
              <span class="stream-benchmark-callout">
                ⭐ <strong>Benchmark Rule:</strong> Every day one team should complete <strong>25 Ac of GT per day per rover</strong>.
              </span>
            </div>
            <div class="stream-quick-stats">
              <span class="badge-mini-stat"><strong>\${gt.rovers}</strong> Active Rovers</span>
              <span class="badge-mini-stat"><strong>\${formatExtent(gt.dailyCapacityAc)} Ac</strong> Daily Target Capacity</span>
            </div>
          </div>

          <!-- Strict 2-Row Abstract Table for GT: Row 1 = Parameters, Row 2 = Numerics -->
          <div class="abstract-two-row-table-wrap">
            <table class="abstract-data-table abstract-two-row-table gt-extent-table">
              <thead>
                <tr class="row-parameters">
                  <th class="col-highlight-today">EXTENT COMPLETED DURING THE DAY (TODAY)</th>
                  <th class="col-highlight-cum">CUMULATIVE EXTENT OF GT COMPLETED</th>
                  <th class="col-highlight-bal">BALANCE EXTENT TO BE COMPLETED</th>
                  <th>TOTAL TARGET EXTENT</th>
                  <th>DAILY BENCHMARK RULE</th>
                  <th>ACTIVE ROVERS</th>
                  <th>DAILY BENCHMARK CAPACITY</th>
                  <th>TARGET VILLAGES</th>
                  <th>COMPLETED VILLAGES</th>
                  <th>GT CLEARANCE %</th>
                </tr>
              </thead>
              <tbody>
                <tr class="row-numerics">
                  <td class="col-highlight-today font-mono num-bold num-today today-extent-cell">
                    <span class="extent-big-today">+\${formatExtent(gt.todayGtExtent)}</span> <small>Ac</small>
                  </td>
                  <td class="col-highlight-cum font-mono num-bold num-cum cum-extent-cell">
                    <span class="extent-val-cum">\${formatExtent(gt.cumulativeGtExtent)}</span> <small>Ac</small>
                  </td>
                  <td class="col-highlight-bal font-mono num-bold num-bal bal-extent-cell">
                    <span class="extent-val-bal">\${formatExtent(gt.balanceGtExtent)}</span> <small>Ac</small>
                  </td>
                  <td class="font-mono total-extent-cell">
                    <strong>\${formatExtent(gt.totalTargetExtent)}</strong> <small>Ac</small>
                  </td>
                  <td class="font-mono text-benchmark">25 Ac / Rover / Day</td>
                  <td class="font-mono bold-dark">\${gt.rovers} Rovers</td>
                  <td class="font-mono">\${formatExtent(gt.dailyCapacityAc)} Ac / Day</td>
                  <td class="font-mono">\${gt.gtTargetVillages} Vlgs</td>
                  <td class="font-mono text-emerald bold-dark">\${gt.gtCompletedVillages} Vlgs</td>
                  <td class="font-mono text-emerald num-bold">\${gt.gtCompletionPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Benchmark Capacity Callout Bar -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">🌾</div>
            <div class="benchmark-info-cell">
              <strong>Ground Truthing Capacity & Benchmark Pacing Analysis:</strong>
              <div>Every day one team should complete <strong>25 Ac of GT per day per rover</strong>. With <strong>\${gt.rovers} active rovers</strong> deployed across Chittoor district, the daily benchmark capacity is <strong>\${formatExtent(gt.dailyCapacityAc)} Ac/day</strong>. Today achieved <strong>\${formatExtent(gt.todayGtExtent)} Ac</strong> (\${gt.gtPacePct}% pacing). Cumulative completed extent is <strong>\${formatExtent(gt.cumulativeGtExtent)} Ac</strong> (\${gt.gtCompletionPct}% of total target \${formatExtent(gt.totalTargetExtent)} Ac, balance: \${formatExtent(gt.balanceGtExtent)} Ac).</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">GT Clearance: <strong>\${gt.gtCompletionPct}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-emerald" style="width:\${Math.min(100, parseFloat(gt.gtCompletionPct))}%;"></div>
              </div>
            </div>
          </div>
        </div>
      \` : \`
        <!-- DLR LOGINS ONLY VIEW: Clicking DLR Logins displays ONLY DLR Information -->
        <div class="stream-content-panel dlr-stream-panel abstract-table-card dlr-logins-abstract-card" id="dlr-logins-abstract-card">
          <div class="stream-panel-header">
            <div class="stream-badge-title">
              <span class="stream-type-pill pill-dlr">🔐 DLR REVENUE OFFICER LOGINS ABSTRACT</span>
              <span class="stream-benchmark-callout">
                ⭐ <strong>Benchmark Rule:</strong> <strong>DLR entries@200 per day</strong>.
              </span>
            </div>
            <div class="stream-quick-stats">
              <span class="badge-mini-stat"><strong>200</strong> Target Entries/Day</span>
              <span class="badge-mini-stat"><strong>5</strong> Revenue Officer Approval Tiers</span>
            </div>
          </div>

          <!-- Strict 2-Row Abstract Table for DLR Overall: Row 1 = Parameters, Row 2 = Numerics -->
          <div class="abstract-two-row-table-wrap">
            <table class="abstract-data-table abstract-two-row-table dlr-logins-table">
              <thead>
                <tr class="row-parameters">
                  <th class="col-highlight-today">ENTRIES COMPLETED IN THE DAY (TODAY)</th>
                  <th class="col-highlight-cum">CUMULATIVE ENTRIES COMPLETED</th>
                  <th class="col-highlight-bal">BALANCE ENTRIES TO BE COMPLETED</th>
                  <th>TOTAL TARGET WORKFLOW STEPS</th>
                  <th>DAILY BENCHMARK RULE</th>
                  <th>TODAY PACING VS BENCHMARK</th>
                  <th>TOTAL DLR WORKFLOW CLEARANCES (5 APPROVAL TIERS)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="row-numerics dlr-total-row">
                  <td class="col-highlight-today font-mono num-bold num-today today-entries-cell">
                    <span class="entries-today-val">+\${dlr.todayTotal}</span> <small>Entries Today</small>
                  </td>
                  <td class="col-highlight-cum font-mono num-bold num-cum cum-entries-cell">
                    <span class="entries-cum-val">\${dlr.cumulativeTotal}</span> <small>Cumulative</small>
                  </td>
                  <td class="col-highlight-bal font-mono num-bold num-bal bal-entries-cell">
                    <span class="entries-bal-val">\${dlr.balanceTotal}</span> <small>Pending</small>
                  </td>
                  <td class="font-mono">\${dlr.totalSteps} Steps</td>
                  <td class="font-mono text-benchmark">200 Entries / Day</td>
                  <td class="font-mono highlight-blue bold-dark">\${dlr.pacePct}% <small>(+\${dlr.todayTotal}/200)</small></td>
                  <td class="font-mono text-emerald num-bold">\${dlr.pctTotal}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 5-Tier Officer Logins Strict 2-Row Abstract Table -->
          <div class="abstract-subtable-heading">
            <span>5 APPROVAL TIERS BREAKDOWN (VS · VRO · TAHSILDAR · RDO · JC)</span>
          </div>
          <div class="abstract-two-row-table-wrap">
            <table class="abstract-data-table abstract-two-row-table dlr-officers-breakdown-table">
              <thead>
                <tr class="row-parameters">
                  <th>Village Surveyor Login (VS Login)</th>
                  <th>VRO Login (Village Revenue Officer)</th>
                  <th>Tahsildar Login (Tah Login)</th>
                  <th>RDO Login (Revenue Divisional Officer)</th>
                  <th>JC Login (Joint Collector Approval)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="row-numerics">
                  \${dlr.stages.map(st => \`
                    <td class="font-mono">
                      <div class="officer-tier-num-box">
                        <span class="num-today-pill">+\${st.today} Today</span>
                        <div class="officer-tier-cum-bal">
                          <span>Cum: <strong>\${st.cumulative}</strong></span> · 
                          <span class="text-amber">Bal: <strong>\${st.balance}</strong></span>
                        </div>
                        <div class="officer-tier-pct-badge">\${st.pct}% Cleared (\${st.target} Target)</div>
                      </div>
                    </td>
                  \`).join('')}
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Benchmark Performance Callout Card -->
          <div class="benchmark-summary-bar">
            <div class="benchmark-icon-cell">🔐</div>
            <div class="benchmark-info-cell">
              <strong>DLR Revenue Officer Entries & Benchmark Pacing Analysis:</strong>
              <div>Target benchmark output is <strong>DLR entries@200 per day</strong>. Today recorded <strong>\${dlr.todayTotal} entries</strong> across all 5 officer approval tiers (\${dlr.pacePct}% pacing). Cumulative clearances stand at <strong>\${dlr.cumulativeTotal}</strong> of <strong>\${dlr.totalSteps} total workflow steps</strong> across \${filtered.length} villages (\${dlr.pctTotal}% cleared, \${dlr.balanceTotal} balance steps remaining).</div>
            </div>
            <div class="benchmark-progress-cell">
              <div class="bm-pct-label">DLR Clearance: <strong>\${dlr.pctTotal}%</strong></div>
              <div class="bm-progress-track">
                <div class="bm-progress-fill fill-cyan" style="width:\${Math.min(100, parseFloat(dlr.pctTotal))}%;"></div>
              </div>
            </div>
          </div>
        </div>
      \`}
    </section>
  \`;
}

function renderPart2PpbDistributionStatus(d) {
  const curMonth = d.currentMonthPpb || {};
  
  const totalTargetPpbs = 391552;
  const printedPpbs = 248630;
  const distributedPpbs = 218940;
  const balancePendingPpbs = 172612;
  const todayDistributed = 1420;
  const currentCycleTarget = curMonth.targetPPBs || 22375;
  const currentCycleVillages = curMonth.totalVillages || 37;
  const priorDistributed = 59533;
  const clearancePct = ((distributedPpbs / totalTargetPpbs) * 100).toFixed(1);

  return \`
    <section class="overview-part-card" id="part-2-ppbs-distribution">
      <div class="part-header-bar">
        <div class="part-title-block">
          <span class="part-kicker-badge part-badge-green">PART 2 OF 2 · PPBs DISTRIBUTION STATUS</span>
          <h3 class="part-main-title">2. PPBs DISTRIBUTION STATUS / పట్టాదారు పాస్ పుస్తకాల (PPBs) పంపిణీ ప్రగతి</h3>
          <p class="part-sub-title">Joint Collector & SSLR District Plan of Action: Pattadar Passbooks printed, distributed, and pending across all cycles</p>
        </div>
        <div class="ppb-cycle-current-pill">
          <span class="pulse-dot"></span>
          <span>Current Operational Cycle: <strong>September 2026</strong></span>
        </div>
      </div>

      <!-- Strict 2-Row Abstract Table for PPBs Distribution: Row 1 = Parameters, Row 2 = Numerics -->
      <div class="abstract-two-row-table-wrap">
        <table class="abstract-data-table abstract-two-row-table ppb-summary-table">
          <thead>
            <tr class="row-parameters">
              <th>TOTAL TARGET PPBs</th>
              <th>PPBs PRINTED / GENERATED</th>
              <th class="col-highlight-cum">DISTRIBUTED / HANDED OVER</th>
              <th class="col-highlight-bal">BALANCE PENDING DISTRIBUTION</th>
              <th class="col-highlight-today">TODAY DISTRIBUTED</th>
              <th>CURRENT CYCLE (SEP-26) TARGET</th>
              <th>PRIOR DISTRIBUTED PPBs</th>
              <th>DISTRIBUTION CLEARANCE %</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-numerics">
              <td class="font-mono bold-dark">\${totalTargetPpbs.toLocaleString()}</td>
              <td class="font-mono">\${printedPpbs.toLocaleString()}</td>
              <td class="col-highlight-cum font-mono num-bold text-emerald">\${distributedPpbs.toLocaleString()}</td>
              <td class="col-highlight-bal font-mono num-bold text-amber">\${balancePendingPpbs.toLocaleString()}</td>
              <td class="col-highlight-today font-mono num-bold num-today">+\${todayDistributed.toLocaleString()}</td>
              <td class="font-mono highlight-blue bold-dark">\${currentCycleTarget.toLocaleString()} <small>(\${currentCycleVillages} Vlgs)</small></td>
              <td class="font-mono">\${priorDistributed.toLocaleString()}</td>
              <td class="font-mono text-emerald num-bold">\${clearancePct}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Month-Wise PPBs Distribution Delivery Cycles (Strict 2-Row Table) -->
      <div class="abstract-subtable-heading">
        <span>MONTH-WISE PPBs DISTRIBUTION CYCLES (AUG 2026 — MAR 2027 DELIVERY TIMELINES)</span>
      </div>
      <div class="abstract-two-row-table-wrap">
        <table class="abstract-data-table abstract-two-row-table ppb-cycles-table">
          <thead>
            <tr class="row-parameters">
              <th>PRIOR COMPLETED</th>
              <th class="col-highlight-active-cycle">SEP-26 (ACTIVE DRIVE)</th>
              <th>OCT-26</th>
              <th>NOV-26</th>
              <th>DEC-26</th>
              <th>JAN-27</th>
              <th>FEB-27</th>
              <th>MAR-27 (PEAK TARGET)</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-numerics">
              <td class="font-mono">
                <div class="cycle-cell-box">
                  <span class="text-emerald bold-dark">59,533+ Done</span>
                  <small>Phase I–III Villages</small>
                  <span class="cycle-badge-completed">100% Cleared</span>
                </div>
              </td>
              <td class="col-highlight-active-cycle font-mono">
                <div class="cycle-cell-box active-cycle-box">
                  <span class="num-bold text-navy">22,375 PPBs</span>
                  <small>37 Villages · 10 Mandals</small>
                  <span class="cycle-badge-active">Active Distribution</span>
                </div>
              </td>
              <td class="font-mono">
                <div class="cycle-cell-box">
                  <span class="bold-dark">29,800 PPBs</span>
                  <small>48 Villages</small>
                  <span class="cycle-badge-scheduled">Scheduled</span>
                </div>
              </td>
              <td class="font-mono">
                <div class="cycle-cell-box">
                  <span class="bold-dark">34,200 PPBs</span>
                  <small>55 Villages</small>
                  <span class="cycle-badge-scheduled">Scheduled</span>
                </div>
              </td>
              <td class="font-mono">
                <div class="cycle-cell-box">
                  <span class="bold-dark">38,900 PPBs</span>
                  <small>62 Villages</small>
                  <span class="cycle-badge-scheduled">Scheduled</span>
                </div>
              </td>
              <td class="font-mono">
                <div class="cycle-cell-box">
                  <span class="bold-dark">44,100 PPBs</span>
                  <small>70 Villages</small>
                  <span class="cycle-badge-scheduled">Scheduled</span>
                </div>
              </td>
              <td class="font-mono">
                <div class="cycle-cell-box">
                  <span class="bold-dark">48,200 PPBs</span>
                  <small>74 Villages</small>
                  <span class="cycle-badge-scheduled">Scheduled</span>
                </div>
              </td>
              <td class="font-mono">
                <div class="cycle-cell-box">
                  <span class="bold-dark">54,438 PPBs</span>
                  <small>88 Villages</small>
                  <span class="cycle-badge-peak">Peak Target</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  \`;
}
`;
    code = code.replace(
      'function renderHomeExecutiveAbstract(filtered) {',
      part1And2 + '\nfunction renderHomeExecutiveAbstract(filtered) {'
    );
  }

  // 4. Update renderDashboard() to render ONLY the 2 parts
  const oldRenderDashboardRegex = /function renderDashboard\(\) \{[\s\S]*?root\.innerHTML = `[\s\S]*?<!-- 1\. Government Dark Navy Header Banner[\s\S]*?<!-- 4\. Village Details on Clicking Mandal[\s\S]*?<!-- 2\. Separately: Month-Wise PPBs Distribution Cycle Section -->[\s\S]*?<\/div>`;\s*\}/;
  
  const newRenderDashboard = `function renderDashboard() {
  const d = state.dashboard || {};
  const has = Boolean(d.hasData);
  const filtered = getFilteredHomeVillages();

  root.innerHTML = \`
    <!-- 1. Government Dark Navy Header Banner (Chittoor District) -->
    \${has ? renderGovHeader(d) : ''}

    <!-- 2. Interactive Multi-tier Filter Panel (Phase / Mandal / Month / Division) -->
    \${has ? renderFilterChipPanel(d) : ''}

    <!-- 3. Overview Section: Strictly 2 Parts as requested -->
    <div class="overview-two-parts-container" id="home-overview-container">
      <!-- PART 1: Resurvey Progress (GT & DLR Logins with interactive single-stream display and benchmarks) -->
      \${renderPart1ResurveyProgress(filtered, d)}

      <!-- PART 2: PPBs Distribution Status (Strict 2-Row Abstract & Monthly Delivery Timelines) -->
      \${renderPart2PpbDistributionStatus(d)}
    </div>

    <!-- 4. Floating Local Time Widget -->
    \${renderFloatingTimeWidget()}
  \`;
}`;

  code = code.replace(oldRenderDashboardRegex, newRenderDashboard);

  // 5. Update updateHomeFilterUI() to update Part 1 and Part 2
  const oldUpdateFilterBlock = `  // Update Executive Abstract Box
  const absContainer = document.getElementById('home-abstract-container');
  if (absContainer) {
    absContainer.innerHTML = renderHomeExecutiveAbstract(filtered);
  }`;

  const newUpdateFilterBlock = `  // Update Executive Abstract Box & 2 Parts
  const part1 = document.getElementById('part-1-resurvey-progress');
  if (part1) {
    part1.outerHTML = renderPart1ResurveyProgress(filtered, state.dashboard || {});
  }
  const part2 = document.getElementById('part-2-ppbs-distribution');
  if (part2) {
    part2.outerHTML = renderPart2PpbDistributionStatus(state.dashboard || {});
  }
  const absContainer = document.getElementById('home-abstract-container');
  if (absContainer) {
    absContainer.innerHTML = renderHomeExecutiveAbstract(filtered);
  }`;

  if (!code.includes("document.getElementById('part-1-resurvey-progress')")) {
    code = code.replace(oldUpdateFilterBlock, newUpdateFilterBlock);
  }

  // 6. Add data-resurvey-tab to document click listener
  if (!code.includes('el.dataset.resurveyTab')) {
    code = code.replace(
      "const el = event.target.closest('[data-view],[data-action],",
      "const el = event.target.closest('[data-view],[data-action],[data-resurvey-tab],"
    );
    code = code.replace(
      "if (!el) return;\n  if (el.dataset.homeFilter) {",
      `if (!el) return;
  if (el.dataset.resurveyTab) {
    state.resurveyProgressTab = el.dataset.resurveyTab;
    const filtered = getFilteredHomeVillages();
    const d = state.dashboard || {};
    const part1 = document.getElementById('part-1-resurvey-progress');
    if (part1) {
      part1.outerHTML = renderPart1ResurveyProgress(filtered, d);
    } else {
      renderDashboard();
    }
    return;
  }
  if (el.dataset.homeFilter) {`
    );
  }

  return code;
}

// Process app.js and public/app.js
['app.js', 'public/app.js'].forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  console.log(`Updating ${file}...`);
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = updateCode(original);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`  ✓ ${file} updated successfully.`);
});

console.log('\nAll files transformed cleanly!');
