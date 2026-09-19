const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '../app.js');
const pubAppFile = path.join(__dirname, '../public/app.js');

let code = fs.readFileSync(appFile, 'utf8');

// 1. Update renderInlineVillageWiseProgress table
const oldIvwTableStart = `              \${isGtActive ? \`
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

const newIvwTableStart = `              \${isGtActive ? \`
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

if (code.includes(oldIvwTableStart)) {
  code = code.replace(oldIvwTableStart, newIvwTableStart);
  console.log('✓ Replaced IVW Table Headers');
} else {
  console.log('IVW Table Headers not found or already replaced');
}

const oldIvwRowCells = `                  \${isGtActive ? \`
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

const newIvwRowCells = `                  \${(() => {
                    const tierDetail = v.dlr_stages_detail?.[activeStageKey] || {};
                    const todayEnt = tierDetail.today || (v.dlr_active_stage === currentStageObj.name ? (v.dlr_entries_today || 0) : 0);
                    const cumEnt = tierDetail.cumulative || (isStageDone ? (v.dlr_total_entries || 1000) : (v.dlr_entries_cumulative || 0));
                    const balEnt = tierDetail.balance !== undefined ? tierDetail.balance : (isStageDone ? 0 : (v.dlr_entries_balance || 0));
                    const totEnt = tierDetail.total || v.dlr_total_entries || (Number(v.khatas) || 1000);

                    return isGtActive ? \`
                      <td class="font-mono col-highlight-today num-bold text-emerald">+\${formatExtent(v.today_gt_extent || 0)} Ac</td>
                      <td class="font-mono col-highlight-cum num-bold">\${formatExtent(v.cumulative_gt_extent || compAc)} Ac</td>
                      <td class="font-mono col-highlight-bal num-bold">\${formatExtent(v.balance_gt_extent !== undefined ? v.balance_gt_extent : balAc)} Ac</td>
                      <td class="font-mono"><strong>\${formatExtent(totAc)}</strong> Ac</td>
                      <td>
                        <span class="status-pill \${isStageDone ? 'status-completed' : (v.gt_status === 'In Progress' ? 'status-progress' : 'status-pending')}">
                          \${isStageDone ? 'Completed' : (v.gt_status || 'Pending')}
                        </span>
                      </td>
                    \` : \`
                      <td class="font-mono col-highlight-today num-bold">
                        \${todayEnt > 0 ? \`<span class="text-blue font-bold">+\${todayEnt.toLocaleString('en-IN')} Today</span>\` : '<span class="text-muted">0 Today</span>'}
                      </td>
                      <td class="font-mono col-highlight-cum num-bold">
                        \${cumEnt.toLocaleString('en-IN')} Entries
                      </td>
                      <td class="font-mono col-highlight-bal num-bold">
                        \${balEnt > 0 ? \`<span class="text-amber">\${balEnt.toLocaleString('en-IN')} Pending</span>\` : '<span class="text-emerald">0 Pending</span>'}
                      </td>
                      <td class="font-mono">\${totEnt.toLocaleString('en-IN')} Entries</td>
                      <td>
                        <span class="status-pill \${isStageDone ? 'status-completed' : (todayEnt > 0 ? 'status-progress' : 'status-pending')}">
                          \${isStageDone ? 'Completed' : (todayEnt > 0 ? 'In Progress' : 'Pending')}
                        </span>
                      </td>
                    \`;
                  })()}`;

if (code.includes(oldIvwRowCells)) {
  code = code.replace(oldIvwRowCells, newIvwRowCells);
  console.log('✓ Replaced IVW Row Cells with true GT Today & DLR Today metrics');
} else {
  console.log('IVW Row Cells not found or already replaced');
}

// 2. Update openVillage(id)
const targetProfileData = `            <span>EXTENT<b>\${v.extent ? \`\${h(v.extent)} Ac\` : '—'}</b></span>
            <span>STATUS<b><span class="status-pill \${statusClass(isPorted ? 'Completed' : v.status)}">\${h(isPorted ? 'Completed' : v.status)}</span></b></span>
          </div>
        </div>`;

const additionProfileData = `            <span>EXTENT<b>\${v.extent ? \`\${h(v.extent)} Ac\` : '—'}</b></span>
            <span>STATUS<b><span class="status-pill \${statusClass(isPorted ? 'Completed' : v.status)}">\${h(isPorted ? 'Completed' : v.status)}</span></b></span>
          </div>
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
        </div>`;

if (!code.includes('village-today-progress-card') && code.includes(targetProfileData)) {
  code = code.replace(targetProfileData, additionProfileData);
  console.log('✓ Added village-today-progress-card to openVillage modal.');
}

// 3. Update Citizen Stepper in openVillage with Step 1 GT and Steps 3-7 DLR entries
const oldStepMeta = `                  <div class="citizen-step-meta">
                    <span>Accountable Tier: <b>\${h(step.tier)}</b></span>
                    \${v.target_date ? \`<span>Target: <b>\${h(v.target_date)}</b></span>\` : ''}
                    \${isDel && v.days_delayed ? \`<span style="color:var(--red);font-weight:700;">\${icon('warning')} \${v.days_delayed} days overdue</span>\` : ''}
                  </div>`;

const newStepMeta = `                  <div class="citizen-step-meta">
                    <span>Accountable Tier: <b>\${h(step.tier)}</b></span>
                    \${step.num === 1 ? \`<span>GT Done Today: <b class="text-emerald">+\${formatExtent(v.today_gt_extent || 0)} Ac</b> (Cum: \${formatExtent(v.cumulative_gt_extent || v.extent || 0)} Ac)</span>\` : ''}
                    \${(step.num >= 3 && step.num <= 7) ? (() => {
                      const sd = v.dlr_stages_detail?.[step.key];
                      if (sd) {
                        return \`<span>DLR Entries: <b class="text-blue">+\${sd.today} Today</b> (Cum: \${sd.cumulative}/\${sd.total} Entries · Bal: \${sd.balance})</span>\`;
                      }
                      return '';
                    })() : ''}
                    \${v.target_date ? \`<span>Target: <b>\${h(v.target_date)}</b></span>\` : ''}
                    \${isDel && v.days_delayed ? \`<span style="color:var(--red);font-weight:700;">\${icon('warning')} \${v.days_delayed} days overdue</span>\` : ''}
                  </div>`;

if (code.includes(oldStepMeta)) {
  code = code.replace(oldStepMeta, newStepMeta);
  console.log('✓ Added step-level GT and DLR entries to citizen stepper in openVillage.');
}

// Write back
fs.writeFileSync(appFile, code, 'utf8');
fs.writeFileSync(pubAppFile, code, 'utf8');
console.log('Successfully saved updates to app.js and public/app.js.');
