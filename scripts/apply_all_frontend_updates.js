const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Detect if file uses CRLF
  const isCrlf = content.includes('\r\n');
  // Normalize to LF for easy matching
  let normalized = content.replace(/\r\n/g, '\n');

  let modified = false;

  // 1. IVW table headers
  const headerSearch = `              \${isGtActive ? \`
                <th class="col-highlight-today">TOTAL EXTENT (ACRES)</th>
                <th class="col-highlight-cum">GT COMPLETED (ACRES)</th>
                <th class="col-highlight-bal">BALANCE GT (ACRES)</th>
                <th>GT STATUS</th>
              \` : \`
                <th>TOTAL KHATAS / ENTRIES</th>
                <th class="col-highlight-today">ENTRIES COMPLETED TODAY</th>
                <th class="col-highlight-cum">CUMULATIVE ENTRIES</th>
                <th class="col-highlight-bal">BALANCE ENTRIES</th>
                <th>STAGE STATUS</th>
              \`}`;

  const headerReplace = `              \${isGtActive ? \`
                <th class="col-highlight-today">GT EXTENT TODAY (AC)</th>
                <th class="col-highlight-cum">GT COMPLETED (ACRES)</th>
                <th class="col-highlight-bal">BALANCE GT (ACRES)</th>
                <th>TOTAL EXTENT</th>
                <th>GT STATUS</th>
              \` : \`
                <th class="col-highlight-today">ENTRIES COMPLETED TODAY</th>
                <th class="col-highlight-cum">CUMULATIVE ENTRIES</th>
                <th class="col-highlight-bal">BALANCE ENTRIES</th>
                <th>TOTAL ENTRIES</th>
                <th>STAGE STATUS</th>
              \`}`;

  if (normalized.includes(headerSearch)) {
    normalized = normalized.replace(headerSearch, headerReplace);
    console.log(`[${filePath}] Replaced IVW table headers.`);
    modified = true;
  } else {
    console.log(`[${filePath}] Header search not matched, checking if already updated...`);
    if (normalized.includes('GT EXTENT TODAY (AC)')) {
      console.log(`[${filePath}] Headers already up to date.`);
    } else {
      console.error(`[${filePath}] ERROR: Could not find header snippet.`);
    }
  }

  // 2. IVW table rows
  const cellSearch = `              const isSelected = state.overviewSelectedVillageId === v.id;
              const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
              const isStageDone = isPorted || isComplete(v[activeStageKey]);
              const totAc = v.extent ? parseFloat(v.extent) : 0;
              const compAc = isStageDone ? totAc : (v.gt_status === 'In Progress' ? Math.round(totAc * 0.6 * 100) / 100 : 0);
              const balAc = Math.max(0, Math.round((totAc - compAc) * 100) / 100);

              return \`
                <tr class="ivw-village-row \${isSelected ? 'selected-row' : ''} \${isStageDone ? 'row-done' : ''}" data-inspect-village="\${v.id}" title="Click to view full progress for \${h(v.village_name)}">
                  <td class="font-mono muted-cell">\${idx + 1}</td>
                  <td class="font-mono bold-code">\${h(v.village_code || '—')}</td>
                  <td class="village-name-cell">
                    <strong class="village-title">\${h(v.village_name)}</strong>
                    \${isPorted ? '<span class="mini-webland-badge">WEBLAND 2.0</span>' : ''}
                  </td>
                  <td><strong>\${h(v.mandal)}</strong></td>
                  <td class="text-muted">\${h(v.division)}</td>
                  \${isGtActive ? \`
                    <td class="font-mono"><strong>\${formatExtent(totAc)}</strong> Ac</td>
                    <td class="font-mono col-highlight-cum num-bold">\${formatExtent(compAc)} Ac</td>
                    <td class="font-mono col-highlight-bal num-bold">\${formatExtent(balAc)} Ac</td>
                    <td>
                      <span class="status-pill \${isStageDone ? 'status-completed' : (v.gt_status === 'In Progress' ? 'status-progress' : 'status-pending')}">
                        \${isStageDone ? 'Completed' : (v.gt_status || 'Pending')}
                      </span>
                    </td>
                  \` : \`
                    <td class="font-mono">\${(Number(v.khatas) || 0).toLocaleString()} Khatas</td>
                    <td class="font-mono col-highlight-today num-bold">
                      \${isStageDone ? '<span class="text-emerald">+1 Entry</span>' : '<span class="text-muted">0 Today</span>'}
                    </td>
                    <td class="font-mono col-highlight-cum num-bold">
                      \${isStageDone ? '1 Entry Done' : '0 Entries'}
                    </td>
                    <td class="font-mono col-highlight-bal num-bold">
                      \${isStageDone ? '0 Pending' : '<span class="text-amber">1 Entry Pending</span>'}
                    </td>
                    <td>
                      <span class="status-pill \${isStageDone ? 'status-completed' : 'status-pending'}">
                        \${isStageDone ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                  \`}`;

  const cellReplace = `              const isSelected = state.overviewSelectedVillageId === v.id;
              const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
              const isStageDone = isPorted || isComplete(v[activeStageKey]);
              const totAc = v.extent ? parseFloat(v.extent) : 0;
              const todayGt = parseFloat(v.today_gt_extent) || 0;
              const compAc = parseFloat(v.cumulative_gt_extent) || (isStageDone ? totAc : (v.gt_status === 'In Progress' ? Math.round(totAc * 0.6 * 100) / 100 : 0));
              const balAc = (v.balance_gt_extent !== undefined && v.balance_gt_extent !== null) ? parseFloat(v.balance_gt_extent) : Math.max(0, Math.round((totAc - compAc) * 100) / 100);

              const todayDlr = Number(v.dlr_entries_today) || 0;
              const cumDlr = Number(v.dlr_entries_cumulative) || (isStageDone ? (Number(v.khatas) || 1000) : 0);
              const totDlr = Number(v.dlr_total_entries) || (Number(v.khatas) || 1000);
              const balDlr = (v.dlr_entries_balance !== undefined && v.dlr_entries_balance !== null) ? Number(v.dlr_entries_balance) : Math.max(0, totDlr - cumDlr);

              return \`
                <tr class="ivw-village-row \${isSelected ? 'selected-row' : ''} \${isStageDone ? 'row-done' : ''}" data-inspect-village="\${v.id}" title="Click to view full progress for \${h(v.village_name)}">
                  <td class="font-mono muted-cell">\${idx + 1}</td>
                  <td class="font-mono bold-code">\${h(v.village_code || '—')}</td>
                  <td class="village-name-cell">
                    <strong class="village-title">\${h(v.village_name)}</strong>
                    \${isPorted ? '<span class="mini-webland-badge">WEBLAND 2.0</span>' : ''}
                  </td>
                  <td><strong>\${h(v.mandal)}</strong></td>
                  <td class="text-muted">\${h(v.division)}</td>
                  \${isGtActive ? \`
                    <td class="font-mono col-highlight-today num-bold">
                      \${todayGt > 0 ? \`<span class="text-emerald">+\${formatExtent(todayGt)} Ac</span>\` : '<span class="text-muted">0.00 Ac</span>'}
                    </td>
                    <td class="font-mono col-highlight-cum num-bold">\${formatExtent(compAc)} Ac</td>
                    <td class="font-mono col-highlight-bal num-bold">\${formatExtent(balAc)} Ac</td>
                    <td class="font-mono">\${formatExtent(totAc)} Ac</td>
                    <td>
                      <span class="status-pill \${isStageDone ? 'status-completed' : (v.gt_status === 'In Progress' ? 'status-progress' : 'status-pending')}">
                        \${isStageDone ? 'Completed' : (v.gt_status || 'Pending')}
                      </span>
                    </td>
                  \` : \`
                    <td class="font-mono col-highlight-today num-bold">
                      \${todayDlr > 0 ? \`<span class="text-blue">+\${todayDlr.toLocaleString('en-IN')} Today</span>\` : (isStageDone ? '<span class="text-emerald">Completed</span>' : '<span class="text-muted">0 Today</span>')}
                    </td>
                    <td class="font-mono col-highlight-cum num-bold">
                      \${cumDlr.toLocaleString('en-IN')} Entries
                    </td>
                    <td class="font-mono col-highlight-bal num-bold">
                      \${balDlr > 0 ? \`<span class="text-amber">\${balDlr.toLocaleString('en-IN')} Pending</span>\` : '<span class="text-emerald">0 Pending</span>'}
                    </td>
                    <td class="font-mono">\${totDlr.toLocaleString('en-IN')} Khatas</td>
                    <td>
                      <span class="status-pill \${isStageDone ? 'status-completed' : (todayDlr > 0 ? 'status-progress' : 'status-pending')}">
                        \${isStageDone ? 'Completed' : (todayDlr > 0 ? 'In Progress' : 'Pending')}
                      </span>
                    </td>
                  \`}`;

  if (normalized.includes(cellSearch)) {
    normalized = normalized.replace(cellSearch, cellReplace);
    console.log(`[${filePath}] Replaced IVW table rows.`);
    modified = true;
  } else {
    console.log(`[${filePath}] Row search not matched, checking if already updated...`);
    if (normalized.includes('today_gt_extent')) {
      console.log(`[${filePath}] Rows already reference today_gt_extent.`);
    } else {
      console.error(`[${filePath}] ERROR: Could not find cell snippet.`);
    }
  }

  // 3. openVillage today activity card
  const bannerTarget = `        <div class="citizen-stage-banner" style="\${isPorted ? 'border-color:#bbf7d0;background:#f0fdf4;' : ''}">`;

  const todayCardSnippet = `        <div class="village-today-progress-card">
          <div class="vtp-header">
            <span class="vtp-icon">⚡</span>
            <strong>TODAY'S RESURVEY & DLR RECORD OUT-TURN</strong>
          </div>
          <div class="vtp-grid">
            <div class="vtp-col gt">
              <span class="vtp-label">GT Extent Done Today</span>
              <strong class="vtp-val text-emerald font-mono">
                \${(parseFloat(v.today_gt_extent) || 0) > 0 ? \`+\${formatExtent(parseFloat(v.today_gt_extent))} Acres\` : (isPorted || isComplete(v.gt_status) ? 'Completed (100%)' : '0.00 Acres Today')}
              </strong>
              <small>Cumulative: \${formatExtent(parseFloat(v.cumulative_gt_extent) || 0)} Ac · Balance: \${formatExtent(parseFloat(v.balance_gt_extent) || 0)} Ac</small>
            </div>
            <div class="vtp-col dlr">
              <span class="vtp-label">DLR Entries Done Today</span>
              <strong class="vtp-val text-blue font-mono">
                \${(Number(v.dlr_entries_today) || 0) > 0 ? \`+\${Number(v.dlr_entries_today).toLocaleString('en-IN')} Entries\` : (isPorted ? 'Completed' : '0 Entries Today')}
              </strong>
              <small>Cumulative: \${(Number(v.dlr_entries_cumulative) || 0).toLocaleString('en-IN')} · Active: \${h(v.dlr_active_stage || v.current_stage || '—')}</small>
            </div>
          </div>
          \${(v.dlr_stages_detail && Object.keys(v.dlr_stages_detail).length > 0) ? \`
            <div class="vtp-tiers">
              <span class="vtp-tier-title">Today's Entries by Officer Login:</span>
              <div class="vtp-tier-chips">
                <span class="vtp-chip">VS: <b>+\${v.dlr_stages_detail.vs_status?.today || 0}</b></span>
                <span class="vtp-chip">VRO: <b>+\${v.dlr_stages_detail.vro_status?.today || 0}</b></span>
                <span class="vtp-chip highlight">Tahsildar: <b>+\${v.dlr_stages_detail.tahsildar_status?.today || 0}</b></span>
                <span class="vtp-chip">RDO: <b>+\${v.dlr_stages_detail.rdo_status?.today || 0}</b></span>
                <span class="vtp-chip">JC: <b>+\${v.dlr_stages_detail.jc_status?.today || 0}</b></span>
              </div>
            </div>
          \` : ''}
        </div>\n\n`;

  if (!normalized.includes('village-today-progress-card')) {
    if (normalized.includes(bannerTarget)) {
      normalized = normalized.replace(bannerTarget, todayCardSnippet + bannerTarget);
      console.log(`[${filePath}] Added village-today-progress-card to openVillage.`);
      modified = true;
    } else {
      console.error(`[${filePath}] ERROR: Could not find citizen-stage-banner in openVillage.`);
    }
  } else {
    console.log(`[${filePath}] village-today-progress-card already exists.`);
  }

  // 4. renderVillageWisePresentStatusTable balance and till yesterday
  const statusTableOld = `                  <td class="font-mono">\${isPorted ? formatExtent(totExt) : formatExtent(totExt * 0.55)}</td>
                  <td class="font-mono text-emerald font-bold">+\${formatExtent(v.today_gt_extent || (isPorted ? 0 : 0))}</td>
                  <td class="font-mono font-bold">\${formatExtent(v.cumulative_gt_extent || (isPorted ? totExt : 0))}</td>
                  <td class="font-mono font-bold \${isPorted ? 'text-muted' : 'text-amber'}">\${isPorted ? '0.00' : formatExtent(totExt * 0.4)}</td>`;

  const statusTableNew = `                  <td class="font-mono">\${formatExtent(Math.max(0, (parseFloat(v.cumulative_gt_extent) || (isPorted ? totExt : 0)) - (parseFloat(v.today_gt_extent) || 0)))}</td>
                  <td class="font-mono text-emerald font-bold">+\${formatExtent(v.today_gt_extent || 0)}</td>
                  <td class="font-mono font-bold">\${formatExtent(v.cumulative_gt_extent || (isPorted ? totExt : 0))}</td>
                  <td class="font-mono font-bold \${(parseFloat(v.balance_gt_extent) === 0 || isPorted) ? 'text-muted' : 'text-amber'}">\${v.balance_gt_extent !== undefined && v.balance_gt_extent !== null ? formatExtent(v.balance_gt_extent) : (isPorted ? '0.00' : formatExtent(Math.max(0, totExt - (parseFloat(v.cumulative_gt_extent) || 0))))}</td>`;

  if (normalized.includes(statusTableOld)) {
    normalized = normalized.replace(statusTableOld, statusTableNew);
    console.log(`[${filePath}] Updated renderVillageWisePresentStatusTable metrics.`);
    modified = true;
  }

  if (modified) {
    // Restore CRLF if file was CRLF
    const output = isCrlf ? normalized.replace(/\n/g, '\r\n') : normalized;
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`[${filePath}] Successfully saved changes.`);
  }
}

['app.js', 'public/app.js'].forEach(updateFile);
