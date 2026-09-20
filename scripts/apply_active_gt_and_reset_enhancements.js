const fs = require('fs');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  let normalized = content.replace(/\r\n/g, '\n');

  let modified = false;

  // 1. Add activeGtTodayOnly to state
  if (!normalized.includes('activeGtTodayOnly:')) {
    normalized = normalized.replace(
      'overviewSelectedVillageId: null,',
      'overviewSelectedVillageId: null,\n  activeGtTodayOnly: false,'
    );
    console.log(`[${filePath}] Added activeGtTodayOnly to state.`);
    modified = true;
  }

  // 2. Add resetAllOverviewFilters function if not present
  if (!normalized.includes('function resetAllOverviewFilters(')) {
    const resetFn = `function resetAllOverviewFilters() {
  state.homeFilters = { phase: 'All phases', division: 'All', mandal: 'All mandals', month: 'All months', stage: 'All stages', zone: 'All', search: '' };
  state.overviewVillageSearch = '';
  state.overviewMandalFilter = 'All';
  state.overviewStatusFilter = 'All';
  state.overviewSelectedVillageId = null;
  state.activeGtTodayOnly = false;
  state.inspectedParam = null;
  state.villageTablePageIndex = 0;
  state.villageTableSortCol = 'village_name';
  state.villageTableSortDir = 'asc';
  renderDashboard();
  toast('All filters have been reset across all sections.', 'info');
}\n\n`;
    normalized = normalized.replace(
      'function renderDashboard() {',
      resetFn + 'function renderDashboard() {'
    );
    console.log(`[${filePath}] Added resetAllOverviewFilters function.`);
    modified = true;
  }

  // 3. Strict unit discipline in GT abstract table: eliminate village counts (TARGET VILLAGES, COMPLETED VILLAGES)
  const oldGtTableHeader = `                  <th class="col-highlight-today">EXTENT COMPLETED TODAY (IN ACRES)</th>
                  <th class="col-highlight-cum">CUMULATIVE EXTENT COMPLETED (IN ACRES)</th>
                  <th class="col-highlight-bal">BALANCE EXTENT TO BE COMPLETED (IN ACRES)</th>
                  <th>TOTAL TARGET EXTENT (IN ACRES)</th>
                  <th>DAILY BENCHMARK RULE (25 ACRES / ROVER / DAY)</th>
                  <th>ACTIVE ROVERS</th>
                  <th>DAILY BENCHMARK CAPACITY (IN ACRES / DAY)</th>
                  <th>TARGET VILLAGES</th>
                  <th>COMPLETED VILLAGES</th>
                  <th>GT CLEARANCE %</th>`;

  const newGtTableHeader = `                  <th class="col-highlight-today clickable-th" data-action="filter-active-gt-today" title="Click to view Active Villages with GT extent completed today and Grand Total">EXTENT COMPLETED TODAY (IN ACRES) ↗</th>
                  <th class="col-highlight-cum">CUMULATIVE EXTENT COMPLETED (IN ACRES)</th>
                  <th class="col-highlight-bal">BALANCE EXTENT TO BE COMPLETED (IN ACRES)</th>
                  <th>TOTAL TARGET EXTENT (IN ACRES)</th>
                  <th>DAILY BENCHMARK RULE (25 ACRES / ROVER / DAY)</th>
                  <th>ACTIVE ROVERS</th>
                  <th>DAILY BENCHMARK CAPACITY (IN ACRES / DAY)</th>
                  <th>TODAY PACING VS BENCHMARK</th>
                  <th>DAILY CAPACITY TARGET (ACRES)</th>
                  <th>GT CLEARANCE %</th>`;

  if (normalized.includes(oldGtTableHeader)) {
    normalized = normalized.replace(oldGtTableHeader, newGtTableHeader);
    console.log(`[${filePath}] Replaced GT table headers with pure extent metrics.`);
    modified = true;
  }

  const oldGtTableNumerics = `                  <td class="font-mono text-benchmark">25 Acres / Rover / Day</td>
                  <td class="font-mono bold-dark clickable-param" data-inspect-param="gt_rovers" title="Click to inspect Rovers capacity details">\${gt.rovers} Rovers</td>
                  <td class="font-mono">\${formatExtent(gt.dailyCapacityAc)} Acres / Day</td>
                  <td class="font-mono">\${gt.gtTargetVillages} Vlgs</td>
                  <td class="font-mono text-emerald bold-dark clickable-param" data-inspect-param="gt_completed_villages" title="Click to inspect GT Completed Villages">\${gt.gtCompletedVillages} Vlgs</td>
                  <td class="font-mono text-emerald num-bold clickable-param" data-inspect-param="gt_pct" title="Click to inspect GT Clearance %">\${gt.gtCompletionPct}%</td>`;

  const newGtTableNumerics = `                  <td class="font-mono text-benchmark">25 Acres / Rover / Day</td>
                  <td class="font-mono bold-dark clickable-param" data-inspect-param="gt_rovers" title="Click to inspect Rovers capacity details">\${gt.rovers} Rovers</td>
                  <td class="font-mono">\${formatExtent(gt.dailyCapacityAc)} Acres / Day</td>
                  <td class="font-mono text-emerald bold-dark">\${gt.gtPacePct}% Pacing</td>
                  <td class="font-mono">\${formatExtent(gt.dailyCapacityAc)} Ac / Day</td>
                  <td class="font-mono text-emerald num-bold clickable-param" data-inspect-param="gt_pct" title="Click to inspect GT Clearance %">\${gt.gtCompletionPct}%</td>`;

  if (normalized.includes(oldGtTableNumerics)) {
    normalized = normalized.replace(oldGtTableNumerics, newGtTableNumerics);
    console.log(`[${filePath}] Replaced GT table numerics with pure extent metrics.`);
    modified = true;
  }

  // Update today-extent-cell with data-action="filter-active-gt-today"
  const oldTodayCell = `<td class="col-highlight-today font-mono num-bold num-today today-extent-cell clickable-param" data-inspect-param="gt_today" title="Click to view Ground Truthing village-wise extent in Acres">
                    <span class="extent-big-today">+\${formatExtent(gt.todayGtExtent)}</span> <small>Acres Today</small>
                  </td>`;

  const newTodayCell = `<td class="col-highlight-today font-mono num-bold num-today today-extent-cell clickable-param" data-action="filter-active-gt-today" data-inspect-param="gt_today" title="Click to view Active Villages with GT extent completed today and Grand Total">
                    <span class="extent-big-today">+\${formatExtent(gt.todayGtExtent)}</span> <small>Acres Today ↗</small>
                  </td>`;

  if (normalized.includes(oldTodayCell)) {
    normalized = normalized.replace(oldTodayCell, newTodayCell);
    console.log(`[${filePath}] Updated today extent cell with filter-active-gt-today action.`);
    modified = true;
  }

  // 4. Update ivw-stage-kpi-strip to enforce pure units (Acres for GT, Entries for DLR)
  const oldIvwStrip = `        <div class="ivw-kpi-item kpi-green">
          <span class="kpi-label">Cleared Villages</span>
          <strong class="kpi-val font-mono">\${completedCount} <small>Villages</small></strong>
          <small>\${filtered.length ? Math.round((completedCount / filtered.length) * 100) : 0}% Cleared</small>
        </div>
        <div class="ivw-kpi-item kpi-amber">
          <span class="kpi-label">Pending Villages</span>
          <strong class="kpi-val font-mono">\${pendingCount} <small>Villages</small></strong>
          <small>Balance to be Cleared</small>
        </div>`;

  const newIvwStrip = `        <div class="ivw-kpi-item kpi-green">
          <span class="kpi-label">\${isGtActive ? 'Cumulative GT Cleared' : 'Cumulative Cleared Entries'}</span>
          <strong class="kpi-val font-mono">\${isGtActive ? \`\${formatExtent(totCompExtent)} <small>Acres</small>\` : \`\${totCumEntries.toLocaleString('en-IN')} <small>Entries</small>\`}</strong>
          <small>\${isGtActive ? \`\${totScopeExtent ? Math.round((totCompExtent / totScopeExtent) * 100) : 0}% Cleared\` : \`\${totScopeEntries ? Math.round((totCumEntries / totScopeEntries) * 100) : 0}% Cleared\`}</small>
        </div>
        <div class="ivw-kpi-item kpi-amber">
          <span class="kpi-label">\${isGtActive ? 'Balance GT Extent' : 'Balance Pending Entries'}</span>
          <strong class="kpi-val font-mono">\${isGtActive ? \`\${formatExtent(totBalExtent)} <small>Acres</small>\` : \`\${totBalEntries.toLocaleString('en-IN')} <small>Entries</small>\`}</strong>
          <small>\${isGtActive ? 'Pending Field Survey' : 'In Approval Pipeline'}</small>
        </div>`;

  if (normalized.includes(oldIvwStrip)) {
    // Also inject extent/entries computation right before return in renderInlineVillageWiseProgress
    const compInjectionOld = `  // Compute stage stats for header
  const completedCount = (filtered || []).filter(v => v.ported_to_webland || isComplete(v[activeStageKey])).length;
  const pendingCount = (filtered || []).length - completedCount;`;

    const compInjectionNew = `  // Compute stage stats for header strictly in Acres for GT and Number of Entries for DLR
  const completedCount = (filtered || []).filter(v => v.ported_to_webland || isComplete(v[activeStageKey])).length;
  const pendingCount = (filtered || []).length - completedCount;

  const totCompExtent = (filtered || []).reduce((s, v) => s + (parseFloat(v.cumulative_gt_extent) || (isComplete(v.gt_status) ? (parseFloat(v.extent) || 0) : 0)), 0);
  const totBalExtent = (filtered || []).reduce((s, v) => s + ((v.balance_gt_extent !== undefined && v.balance_gt_extent !== null) ? parseFloat(v.balance_gt_extent) : Math.max(0, (parseFloat(v.extent) || 0) - (parseFloat(v.cumulative_gt_extent) || 0))), 0);
  const totScopeExtent = (filtered || []).reduce((s, v) => s + (parseFloat(v.extent) || 0), 0);

  const totCumEntries = (filtered || []).reduce((s, v) => s + (Number(v.dlr_entries_cumulative) || 0), 0);
  const totBalEntries = (filtered || []).reduce((s, v) => s + ((v.dlr_entries_balance !== undefined && v.dlr_entries_balance !== null) ? Number(v.dlr_entries_balance) : 0), 0);
  const totScopeEntries = (filtered || []).reduce((s, v) => s + (Number(v.dlr_total_entries) || (Number(v.khatas) || 0)), 0);

  // If activeGtTodayOnly is active, filter list strictly to villages where GT extent was completed today
  if (state.activeGtTodayOnly && isGtActive) {
    list = list.filter(v => (parseFloat(v.today_gt_extent) || 0) > 0);
    list.sort((a, b) => (parseFloat(b.today_gt_extent) || 0) - (parseFloat(a.today_gt_extent) || 0));
  }

  // Compute Grand Totals across the active list
  const grandTodayGt = list.reduce((s, v) => s + (parseFloat(v.today_gt_extent) || 0), 0);
  const grandCompGt = list.reduce((s, v) => s + (parseFloat(v.cumulative_gt_extent) || (isComplete(v.gt_status) ? (parseFloat(v.extent) || 0) : 0)), 0);
  const grandBalGt = list.reduce((s, v) => s + ((v.balance_gt_extent !== undefined && v.balance_gt_extent !== null) ? parseFloat(v.balance_gt_extent) : Math.max(0, (parseFloat(v.extent) || 0) - (parseFloat(v.cumulative_gt_extent) || 0))), 0);
  const grandTotExtent = list.reduce((s, v) => s + (parseFloat(v.extent) || 0), 0);

  const grandTodayDlr = list.reduce((s, v) => s + (Number(v.dlr_entries_today) || 0), 0);
  const grandCumDlr = list.reduce((s, v) => s + (Number(v.dlr_entries_cumulative) || 0), 0);
  const grandBalDlr = list.reduce((s, v) => s + ((v.dlr_entries_balance !== undefined && v.dlr_entries_balance !== null) ? Number(v.dlr_entries_balance) : 0), 0);
  const grandTotDlr = list.reduce((s, v) => s + (Number(v.dlr_total_entries) || (Number(v.khatas) || 0)), 0);`;

    if (normalized.includes(compInjectionOld)) {
      normalized = normalized.replace(compInjectionOld, compInjectionNew);
    }
    normalized = normalized.replace(oldIvwStrip, newIvwStrip);
    console.log(`[${filePath}] Updated IVW strip with strict unit metrics and list filtering.`);
    modified = true;
  }

  // 5. Add active GT filter banner and reset button to ivw-filter-bar
  const oldIvwFilterControls = `        <div class="ivw-count-badge font-mono">
          Showing <strong>\${list.length}</strong> of \${filtered.length} Villages
        </div>`;

  const newIvwFilterControls = `        <div class="ivw-count-badge font-mono">
          Showing <strong>\${list.length}</strong> of \${filtered.length} Villages
        </div>
        <button type="button" class="btn-reset-filters-ivw" data-action="reset-all-filters" title="Reset all section filters">
          ✕ Reset All Filters
        </button>`;

  if (normalized.includes(oldIvwFilterControls)) {
    normalized = normalized.replace(oldIvwFilterControls, newIvwFilterControls);
    console.log(`[${filePath}] Added Reset All button to ivw-filter-bar.`);
    modified = true;
  }

  // Add Active GT banner right before table
  const oldTableResponsive = `      <!-- Village-Wise Table -->
      <div class="ivw-table-responsive">`;

  const newTableResponsive = `      <!-- Active GT Today Filter Banner -->
      \${(state.activeGtTodayOnly && isGtActive) ? \`
        <div class="active-gt-filter-banner">
          <div class="agf-left">
            <span class="agf-icon">🌾</span>
            <div>
              <strong>ACTIVE VILLAGES WITH GT EXTENT COMPLETED TODAY (\${list.length} Active Villages)</strong>
              <p>Showing villages actively surveyed today. Full telemetry &amp; Grand Total summarized at bottom of table.</p>
            </div>
          </div>
          <div class="agf-actions">
            <button type="button" class="btn-clear-active-gt" data-action="clear-active-gt">Show All Villages ✕</button>
            <button type="button" class="btn-reset-all" data-action="reset-all-filters">Reset All Filters ✕</button>
          </div>
        </div>
      \` : ''}

      <!-- Village-Wise Table -->
      <div class="ivw-table-responsive">`;

  if (!normalized.includes('active-gt-filter-banner') && normalized.includes(oldTableResponsive)) {
    normalized = normalized.replace(oldTableResponsive, newTableResponsive);
    console.log(`[${filePath}] Added active GT filter banner.`);
    modified = true;
  }

  // 6. Add Grand Total Footer to IVW Table
  const oldTableClose = `          </tbody>
        </table>
      </div>`;

  const newTableClose = `          </tbody>
          <tfoot class="ivw-table-footer-grand-total">
            <tr class="grand-total-row">
              <td colspan="5" class="gt-label-cell">
                <strong>GRAND TOTAL (\${list.length} \${state.activeGtTodayOnly ? 'ACTIVE VILLAGES' : 'VILLAGES'})</strong>
              </td>
              \${isGtActive ? \`
                <td class="font-mono col-highlight-today num-bold text-emerald gt-val">
                  <strong>+\${formatExtent(grandTodayGt)} Ac</strong>
                </td>
                <td class="font-mono col-highlight-cum num-bold text-blue gt-val">
                  <strong>\${formatExtent(grandCompGt)} Ac</strong>
                </td>
                <td class="font-mono col-highlight-bal num-bold text-amber gt-val">
                  <strong>\${formatExtent(grandBalGt)} Ac</strong>
                </td>
                <td class="font-mono font-bold gt-val">
                  <strong>\${formatExtent(grandTotExtent)} Ac</strong>
                </td>
                <td class="gt-status-cell">
                  <span class="status-pill status-completed">Active Field Progress</span>
                </td>
              \` : \`
                <td class="font-mono col-highlight-today num-bold text-blue gt-val">
                  <strong>+\${grandTodayDlr.toLocaleString('en-IN')} Today</strong>
                </td>
                <td class="font-mono col-highlight-cum num-bold text-blue gt-val">
                  <strong>\${grandCumDlr.toLocaleString('en-IN')} Entries</strong>
                </td>
                <td class="font-mono col-highlight-bal num-bold text-amber gt-val">
                  <strong>\${grandBalDlr.toLocaleString('en-IN')} Pending</strong>
                </td>
                <td class="font-mono font-bold gt-val">
                  <strong>\${grandTotDlr.toLocaleString('en-IN')} Khatas</strong>
                </td>
                <td class="gt-status-cell">
                  <span class="status-pill status-completed">Multi-Tier Clearances</span>
                </td>
              \`}
              <td style="text-align:center;">
                <span class="badge-pill-green">SUM TOTAL</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>`;

  if (!normalized.includes('ivw-table-footer-grand-total') && normalized.includes(oldTableClose)) {
    normalized = normalized.replace(oldTableClose, newTableClose);
    console.log(`[${filePath}] Added Grand Total tfoot to IVW table.`);
    modified = true;
  }

  // 7. Add Reset All Filters to Top Header and Overview Section Switcher
  const oldTopHeaderRight = `        <button type="button" class="ref-action-btn refresh-btn" data-action="sync-all" id="ref-refresh-sheets-btn" title="Synchronize Google Sheets Telemetry">
          \${icon('sync')} Refresh sheets
        </button>
      </div>`;

  const newTopHeaderRight = `        <button type="button" class="ref-action-btn refresh-btn" data-action="sync-all" id="ref-refresh-sheets-btn" title="Synchronize Google Sheets Telemetry">
          \${icon('sync')} Refresh sheets
        </button>
        <button type="button" class="ref-action-btn topbar-reset-btn" data-action="reset-all-filters" title="Reset all applied filters across all sections">
          ✕ Reset All Filters
        </button>
      </div>`;

  if (!normalized.includes('topbar-reset-btn') && normalized.includes(oldTopHeaderRight)) {
    normalized = normalized.replace(oldTopHeaderRight, newTopHeaderRight);
    console.log(`[${filePath}] Added Reset All button to top header.`);
    modified = true;
  }

  const oldSwitcherClose = `      <button type="button" class="outline-button launch-ppb-btn" data-view="ppb" title="Open full dedicated PPB Distribution Monitoring Centre">
        \${icon('document')} Launch Dedicated PPB Distribution Hub →
      </button>
    </div>`;

  const newSwitcherClose = `      <button type="button" class="outline-button launch-ppb-btn" data-view="ppb" title="Open full dedicated PPB Distribution Monitoring Centre">
        \${icon('document')} Launch Dedicated PPB Distribution Hub →
      </button>
      <button type="button" class="btn-reset-filters-pill" data-action="reset-all-filters" title="Reset all applied filters">
        ✕ Reset All Filters
      </button>
    </div>`;

  if (!normalized.includes('btn-reset-filters-pill') && normalized.includes(oldSwitcherClose)) {
    normalized = normalized.replace(oldSwitcherClose, newSwitcherClose);
    console.log(`[${filePath}] Added Reset button to section switcher.`);
    modified = true;
  }

  // 8. Add Floating Reset Button to renderDashboard
  const oldFloatingTime = `    <!-- Floating Local Time Widget -->
    \${renderFloatingTimeWidget()}`;

  const newFloatingTime = `    <!-- Persistent Floating Reset Button (Visible at any scroll position) -->
    <button type="button" class="floating-reset-btn" data-action="reset-all-filters" title="Click to reset all section filters across the dashboard">
      ↺ Reset All Filters
    </button>

    <!-- Floating Local Time Widget -->
    \${renderFloatingTimeWidget()}`;

  if (!normalized.includes('floating-reset-btn') && normalized.includes(oldFloatingTime)) {
    normalized = normalized.replace(oldFloatingTime, newFloatingTime);
    console.log(`[${filePath}] Added floating reset button to renderDashboard.`);
    modified = true;
  }

  // 9. Update Click Handler in document.addEventListener('click', ...)
  const oldClickLead = `  if (el.dataset.resurveyTab) {
    state.resurveyProgressTab = el.dataset.resurveyTab;
    renderDashboard();
    return;
  }`;

  const newClickLead = `  if (el.dataset.action === 'reset-all-filters' || el.dataset.action === 'reset-home-filters') {
    resetAllOverviewFilters();
    return;
  }
  if (el.dataset.action === 'clear-active-gt') {
    state.activeGtTodayOnly = false;
    renderDashboard();
    return;
  }
  if (el.dataset.action === 'filter-active-gt-today' || el.dataset.inspectParam === 'gt_today') {
    state.activeGtTodayOnly = true;
    state.overviewActiveStage = 'gt_status';
    state.resurveyProgressTab = 'gt';
    renderDashboard();
    const sec = document.getElementById('inline-village-wise-section');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (el.dataset.resurveyTab) {
    state.resurveyProgressTab = el.dataset.resurveyTab;
    renderDashboard();
    return;
  }`;

  if (!normalized.includes("el.dataset.action === 'reset-all-filters'") && normalized.includes(oldClickLead)) {
    normalized = normalized.replace(oldClickLead, newClickLead);
    console.log(`[${filePath}] Updated click listener with reset and active GT actions.`);
    modified = true;
  }

  if (modified) {
    const output = isCrlf ? normalized.replace(/\n/g, '\r\n') : normalized;
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`[${filePath}] Successfully saved.`);
  } else {
    console.log(`[${filePath}] No changes needed.`);
  }
}

['app.js', 'public/app.js'].forEach(updateFile);
