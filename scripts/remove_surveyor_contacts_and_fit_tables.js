const fs = require('fs');
const path = require('path');

console.log('Starting surveyor removal and table fit optimization...');

// Let's read app.js
let app = fs.readFileSync('app.js', 'utf8');

// 1. In getVillageOfficerContact and renderVillageOfficerLastColumn:
// Replace renderVillageOfficerLastColumn with empty function
app = app.replace(
  /function renderVillageOfficerLastColumn\(v\) \{[\s\S]*?\n\}\n\nfunction getVillageOfficerContact\(v\) \{[\s\S]*?\n\}/,
  `function renderVillageOfficerLastColumn(v) {
  return '';
}

function getVillageOfficerContact(v) {
  return { nameHtml: '', phoneHtml: '', rawNames: '', rawMobiles: '' };
}`
);

// 2. Village Details Modal (around line 1770-1795):
// Remove the surveyor & contact section
app = app.replace(
  /<div style="background:#f1f5f9;padding:12px;border-radius:8px;">\s*<span style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">Surveyor \/ Team:<\/span>[\s\S]*?<a href="tel:\$\{msInfo\.phone\}" class="officer-phone-link is-ms" title="Call Mandal Surveyor">\$\{msInfo\.phone\}<\/a>\s*<\/div>\s*<\/div>/,
  `<!-- Surveyor contact info removed -->`
);

// 3. inline-village-wise-section (lines 2130-2200)
// Remove OFFICER / SURVEYOR and CONTACT NUMBER headers and cells
app = app.replace(
  `<th style="width:45px;">SL</th>
              <th style="width:90px;">CODE</th>
              <th>VILLAGE NAME</th>
              <th>MANDAL</th>
              <th>DIVISION</th>
              <th>OFFICER / SURVEYOR</th>
              <th>CONTACT NUMBER</th>`,
  `<th style="width:4%;">SL</th>
              <th style="width:8%;">CODE</th>
              <th style="width:20%;">VILLAGE NAME</th>
              <th style="width:12%;">MANDAL</th>
              <th style="width:10%;">DIVISION</th>`
);

app = app.replace(
  `<td colspan="\${isGtActive ? 12 : 13}" class="empty-table-row">`,
  `<td colspan="\${isGtActive ? 10 : 11}" class="empty-table-row">`
);

app = app.replace(
  `<td>\${h(v.mandal)}</td>
                  <td class="text-muted">\${h(v.division)}</td>
                  <td>\${officerContact.nameHtml}</td>
                  <td>\${officerContact.phoneHtml}</td>`,
  `<td>\${h(v.mandal)}</td>
                  <td class="text-muted">\${h(v.division)}</td>`
);

// 4. gt-village-section (lines 2450-2525)
// Remove SURVEY OFFICERS column header and cell
app = app.replace(
  `<th style="width: 100px; text-align: center;">Action</th>
              <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>`,
  `<th style="width: 6%; text-align: center;">Action</th>`
);

app = app.replace(
  `<td colspan="13" class="empty-table-row">No villages match the selected search, mandal, or performance filter.</td>`,
  `<td colspan="12" class="empty-table-row">No villages match the selected search, mandal, or performance filter.</td>`
);

app = app.replace(
  `<td>\${renderVillageOfficerLastColumn(v)}</td>
                </tr>`,
  `</tr>`
);

// 5. dlr-village-section (lines 2845-2915)
// Remove CONCERNED MLSO / MS & CONTACT header and cell
app = app.replace(
  `<th>Remarks</th>
              <th class="col-officers-last">CONCERNED MLSO / MS & CONTACT</th>`,
  `<th>Remarks</th>`
);

app = app.replace(
  `<td colspan="17" class="empty-table-row">No records found matching the prompt selection. Choose another Phase, Mandal, or reset filters.</td>`,
  `<td colspan="16" class="empty-table-row">No records found matching the prompt selection. Choose another Phase, Mandal, or reset filters.</td>`
);

app = app.replace(
  `<td>
                    <div class="ms-last-col-card">
                      <div class="ms-name-line">
                        <span class="ms-name-badge">
                          <svg class="officer-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <strong>\${h(r.dios || msInfo.name)}</strong>
                        </span>
                        <span class="ms-role-tag">MLSO / MS</span>
                      </div>
                      <a href="tel:\${msInfo.phone}" class="officer-phone-chip is-ms" title="Call MLSO / MS: \${msInfo.phone}">
                        <svg viewBox="0 0 24 24" class="phone-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        \${msInfo.phone}
                      </a>
                    </div>
                  </td>
                </tr>`,
  `</tr>`
);

// 6. ppb-village-section (lines 3490-3540)
// Replace header with proportional widths without SURVEY OFFICERS
app = app.replace(
  `<thead>
            <tr>
              <th style="width:45px;">SL.NO.</th>
              <th style="width:130px;">MANDAL</th>
              <th style="min-width:180px;">VILLAGE NAME</th>
              <th style="width:110px;">DIVISION</th>
              <th style="width:90px;">PHASE</th>
              <th style="width:130px;">PPB CYCLE</th>
              <th style="width:120px;text-align:right;">TARGET PPBs</th>
              <th style="width:110px;text-align:right;">PRINTED</th>
              <th style="width:120px;text-align:right;" class="col-highlight-cum">DISTRIBUTED</th>
              <th style="width:120px;text-align:right;" class="col-highlight-bal">BALANCE</th>
              <th style="width:120px;text-align:center;">STATUS</th>
              <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>
            </tr>
          </thead>`,
  `<thead>
            <tr>
              <th style="width:4%;">SL</th>
              <th style="width:12%;">MANDAL</th>
              <th style="width:18%;">VILLAGE NAME</th>
              <th style="width:10%;">DIVISION</th>
              <th style="width:7%;">PHASE</th>
              <th style="width:9%;">PPB CYCLE</th>
              <th style="width:8%;text-align:right;">TARGET</th>
              <th style="width:8%;text-align:right;">PRINTED</th>
              <th style="width:8%;text-align:right;" class="col-highlight-cum">DISTRIBUTED</th>
              <th style="width:8%;text-align:right;" class="col-highlight-bal">BALANCE</th>
              <th style="width:8%;text-align:center;">STATUS</th>
            </tr>
          </thead>`
);

app = app.replace(
  `<tr><td colspan="12" class="text-center empty-table-cell">No PPB villages match the selected filter.</td></tr>`,
  `<tr><td colspan="11" class="text-center empty-table-cell">No PPB villages match the selected filter.</td></tr>`
);

app = app.replace(
  `<td>\${renderVillageOfficerLastColumn(v)}</td>
                </tr>`,
  `</tr>`
);

// 7. Part 1 DLR mandal summary table (line 5767)
app = app.replace(
  `<th class="col-officers-last">CONCERNED MLSO / MS & CONTACT</th>`,
  `<!-- officer col removed -->`
);

app = app.replace(
  `<td>
                      <div class="ms-last-col-card">
                        <div class="ms-name-line">
                          <span class="ms-name-badge">
                            <svg class="officer-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <strong>\${h(msInfo.name)}</strong>
                          </span>
                          <span class="ms-role-tag">MLSO / MS</span>
                        </div>
                        <a href="tel:\${msInfo.phone}" class="officer-phone-chip is-ms" title="Call MLSO / MS: \${msInfo.phone}">
                          <svg viewBox="0 0 24 24" class="phone-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          \${msInfo.phone}
                        </a>
                      </div>
                    </td>`,
  `<!-- officer cell removed -->`
);

// 8. Village Monitoring focused-stage table (line 6519)
app = app.replace(
  `<th>ACTION</th>
            <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>`,
  `<th style="width:5%;text-align:center;">ACTION</th>`
);

app = app.replace(
  `<td class="text-center font-mono text-muted text-small">—</td>
          </tr>
        </tfoot>`,
  `</tr>
        </tfoot>`
);

// 9. Village Monitoring default table (line 6639)
app = app.replace(
  `<thead>
        <tr>
          <th>CODE</th>
          <th>VILLAGE NAME</th>
          <th>MANDAL</th>
          <th>DIVISION</th>
          <th>PPBS CYCLE</th>
          <th>PHASE</th>
          <th>EXTENT (AC)</th>
          <th>PPBs TARGET</th>
          <th>CURRENT RESURVEY STAGE</th>
          <th>OVERALL STATUS</th>
          <th>ACTION</th>
          <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>
        </tr>
      </thead>`,
  `<thead>
        <tr>
          <th style="width:7%;">CODE</th>
          <th style="width:18%;">VILLAGE NAME</th>
          <th style="width:11%;">MANDAL</th>
          <th style="width:9%;">DIVISION</th>
          <th style="width:9%;">PPBS CYCLE</th>
          <th style="width:7%;">PHASE</th>
          <th style="width:8%;">EXTENT (AC)</th>
          <th style="width:8%;">PPBs TARGET</th>
          <th style="width:13%;">CURRENT RESURVEY STAGE</th>
          <th style="width:6%;">OVERALL STATUS</th>
          <th style="width:4%;text-align:center;">ACTION</th>
        </tr>
      </thead>`
);

app = app.replace(
  `<td>
              <button class="inline-link" data-village="\${v.id}" style="font-weight:800;">
                Track →
              </button>
            </td>
            <td>\${renderVillageOfficerLastColumn(v)}</td>
          </tr>`,
  `<td>
              <button class="inline-link" data-village="\${v.id}" style="font-weight:800;">
                Track →
              </button>
            </td>
          </tr>`
);

// 10. Mandal Analysis table (line 7019)
app = app.replace(
  `<th class="col-officers-last">CONCERNED MLSO / MS & CONTACT</th>`,
  `<!-- officer col removed -->`
);

app = app.replace(
  `<td>
                    <div class="ms-last-col-card">
                      <div class="ms-name-line">
                        <span class="ms-name-badge">
                          <svg class="officer-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <strong>\${h(msInfo.name)}</strong>
                        </span>
                        <span class="ms-role-tag">MLSO / MS</span>
                      </div>
                      <a href="tel:\${msInfo.phone}" class="officer-phone-chip is-ms" title="Call MLSO / MS: \${msInfo.phone}">
                        <svg viewBox="0 0 24 24" class="phone-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        \${msInfo.phone}
                      </a>
                    </div>
                  </td>`,
  `<!-- officer cell removed -->`
);

// Save updated app.js
fs.writeFileSync('app.js', app, 'utf8');
fs.writeFileSync('public/app.js', app, 'utf8');
console.log('Updated app.js and public/app.js successfully.');

// Now let's update styles.css to ensure all village lists fit within the page without horizontal scroll!
let css = fs.readFileSync('styles.css', 'utf8');

const tableFitStyles = `
/* ==========================================================================
   STRICT FIT-WITHIN-PAGE VILLAGE LIST & TABLE LAYOUT (NO HORIZONTAL SCROLL)
   ========================================================================== */

/* Remove large min-widths and enforce 100% full-width table fit within container */
.data-table,
.ref-dense-data-table,
.ivw-data-table,
.home-village-table,
.gt-exact-table,
.dlr-exact-table,
.focused-stage-table {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  table-layout: fixed !important;
  box-sizing: border-box !important;
  border-collapse: collapse !important;
}

/* Eliminate horizontal scrollbars on all village list containers */
.data-table-card,
.table-wrap,
.ref-table-scroll-wrap,
.ivw-table-scroll-wrap,
.ivw-table-responsive,
.home-table-wrap,
.inline-village-wise-section {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important; /* STRICTLY PREVENTS HORIZONTAL SCROLLING */
  overflow-y: auto !important;   /* Allows smooth vertical reading of rows */
}

/* Compact, graceful text formatting within cells so everything fits cleanly */
.data-table th,
.data-table td,
.ref-dense-data-table th,
.ref-dense-data-table td,
.ivw-data-table th,
.ivw-data-table td {
  padding: 8px 6px !important;
  font-size: 11px !important;
  line-height: 1.35 !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.data-table th,
.ref-dense-data-table th,
.ivw-data-table th {
  font-size: 10.5px !important;
  letter-spacing: 0.3px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
}

/* Allow village names to be readable with ellipsis */
.village-name-cell,
.village-name,
.v-name-main {
  display: block !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/* Compact pills and badges to fit neatly in table cells */
.stage-label,
.stage-cell-pill,
.ppb-cycle-pill,
.status-pill,
.badge-pill-green,
.phase-card-badge {
  font-size: 9.5px !important;
  padding: 2px 5px !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
}

/* Completely hide any lingering officer columns */
.col-officers-last,
.officer-last-col-card,
.ms-last-col-card {
  display: none !important;
}
`;

css += '\n' + tableFitStyles;
fs.writeFileSync('styles.css', css, 'utf8');
fs.writeFileSync('public/styles.css', css, 'utf8');
console.log('Updated styles.css and public/styles.css successfully.');
