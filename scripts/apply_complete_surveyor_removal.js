const fs = require('fs');

console.log('Reading files...');
let app = fs.readFileSync('app.js', 'utf8');
const isCrlf = app.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

// Normalize to LF for easy matching, then we can write back with matching eol
let content = app.replace(/\r\n/g, '\n');

// 1. Clear MANDAL_SURVEYOR_DIRECTORY and getMandalSurveyor
content = content.replace(
  /const MANDAL_SURVEYOR_DIRECTORY = \{[\s\S]*?\n\};\n\nfunction getMandalSurveyor\(mandalName\) \{[\s\S]*?\n\}/,
  `const MANDAL_SURVEYOR_DIRECTORY = {};\n\nfunction getMandalSurveyor(mandalName) {\n  return { name: '', role: '', phone: '' };\n}`
);

// 2. Clear renderVillageOfficerLastColumn and getVillageOfficerContact
content = content.replace(
  /function renderVillageOfficerLastColumn\(v\) \{[\s\S]*?\n\}\n\nfunction getVillageOfficerContact\(v\) \{[\s\S]*?\n\}/,
  `function renderVillageOfficerLastColumn(v) {\n  return '';\n}\n\nfunction getVillageOfficerContact(v) {\n  return { nameHtml: '', phoneHtml: '', rawNames: '', rawMobiles: '' };\n}`
);

// 3. Remove officer strip from village details modal
content = content.replace(
  /<div class="iv-officer-strip"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div class="iv-header-actions">/,
  `</div>\n        <div class="iv-header-actions">`
);

// 4. inline-village-wise-section headers & cells
content = content.replace(
  `<th style="width:45px;">SL</th>\n              <th style="width:90px;">CODE</th>\n              <th>VILLAGE NAME</th>\n              <th>MANDAL</th>\n              <th>DIVISION</th>\n              <th>OFFICER / SURVEYOR</th>\n              <th>CONTACT NUMBER</th>`,
  `<th style="width:4%;">SL</th>\n              <th style="width:8%;">CODE</th>\n              <th style="width:20%;">VILLAGE NAME</th>\n              <th style="width:12%;">MANDAL</th>\n              <th style="width:10%;">DIVISION</th>`
);

content = content.replace(
  `<td colspan="\${isGtActive ? 12 : 13}" class="empty-table-row">`,
  `<td colspan="\${isGtActive ? 10 : 11}" class="empty-table-row">`
);

content = content.replace(
  `<td>\${h(v.mandal)}</td>\n                  <td class="text-muted">\${h(v.division)}</td>\n                  <td>\${officerContact.nameHtml}</td>\n                  <td>\${officerContact.phoneHtml}</td>`,
  `<td>\${h(v.mandal)}</td>\n                  <td class="text-muted">\${h(v.division)}</td>`
);

// 5. gt-village-section
content = content.replace(
  `<th style="width: 100px; text-align: center;">Action</th>\n              <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>`,
  `<th style="width: 6%; text-align: center;">Action</th>`
);

content = content.replace(
  `<td colspan="13" class="empty-table-row">No villages match the selected search, mandal, or performance filter.</td>`,
  `<td colspan="12" class="empty-table-row">No villages match the selected search, mandal, or performance filter.</td>`
);

content = content.replace(
  `<td>\${renderVillageOfficerLastColumn(v)}</td>\n                </tr>`,
  `</tr>`
);

// 6. dlr-village-section
content = content.replace(
  `<th>Remarks</th>\n              <th class="col-officers-last">CONCERNED MLSO / MS & CONTACT</th>`,
  `<th>Remarks</th>`
);

content = content.replace(
  `<td colspan="17" class="empty-table-row">No records found matching the prompt selection. Choose another Phase, Mandal, or reset filters.</td>`,
  `<td colspan="16" class="empty-table-row">No records found matching the prompt selection. Choose another Phase, Mandal, or reset filters.</td>`
);

content = content.replace(
  `<td>\n                    <div class="ms-last-col-card">[\s\S]*?<\/div>\n                  <\/td>\n                <\/tr>`,
  `</tr>`
);

// 7. ppb-village-section
content = content.replace(
  `<thead>\n            <tr>\n              <th style="width:45px;">SL.NO.</th>\n              <th style="width:130px;">MANDAL</th>\n              <th style="min-width:180px;">VILLAGE NAME</th>\n              <th style="width:110px;">DIVISION</th>\n              <th style="width:90px;">PHASE</th>\n              <th style="width:130px;">PPB CYCLE</th>\n              <th style="width:120px;text-align:right;">TARGET PPBs</th>\n              <th style="width:110px;text-align:right;">PRINTED</th>\n              <th style="width:120px;text-align:right;" class="col-highlight-cum">DISTRIBUTED</th>\n              <th style="width:120px;text-align:right;" class="col-highlight-bal">BALANCE</th>\n              <th style="width:120px;text-align:center;">STATUS</th>\n              <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>\n            </tr>\n          </thead>`,
  `<thead>\n            <tr>\n              <th style="width:4%;">SL</th>\n              <th style="width:12%;">MANDAL</th>\n              <th style="width:18%;">VILLAGE NAME</th>\n              <th style="width:10%;">DIVISION</th>\n              <th style="width:7%;">PHASE</th>\n              <th style="width:9%;">PPB CYCLE</th>\n              <th style="width:8%;text-align:right;">TARGET</th>\n              <th style="width:8%;text-align:right;">PRINTED</th>\n              <th style="width:8%;text-align:right;" class="col-highlight-cum">DISTRIBUTED</th>\n              <th style="width:8%;text-align:right;" class="col-highlight-bal">BALANCE</th>\n              <th style="width:8%;text-align:center;">STATUS</th>\n            </tr>\n          </thead>`
);

content = content.replace(
  `<tr><td colspan="12" class="text-center empty-table-cell">No PPB villages match the selected filter.</td></tr>`,
  `<tr><td colspan="11" class="text-center empty-table-cell">No PPB villages match the selected filter.</td></tr>`
);

content = content.replace(
  `<td>\${renderVillageOfficerLastColumn(v)}</td>\n                </tr>`,
  `</tr>`
);

// 8. Part 1 DLR mandal summary table
content = content.replace(
  `<th>VECTORIZATION</th>\n              <th class="col-officers-last">CONCERNED MLSO / MS & CONTACT</th>`,
  `<th>VECTORIZATION</th>`
);

content = content.replace(
  `<tr><td colspan="10" class="text-center empty-table-cell">No daily proforma rows yet — hit "Refresh sheets".</td></tr>`,
  `<tr><td colspan="9" class="text-center empty-table-cell">No daily proforma rows yet — hit "Refresh sheets".</td></tr>`
);

content = content.replace(
  `<td>\n                    <div class="ms-last-col-card">[\s\S]*?<\/div>\n                  <\/td>\n                <\/tr>`,
  `</tr>`
);

// 9. Village Monitoring focused-stage table
content = content.replace(
  `<th>ACTION</th>\n            <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>`,
  `<th style="width:5%;text-align:center;">ACTION</th>`
);

content = content.replace(
  `<td>\n                  <button class="inline-link" data-village="\${v.id}" style="font-weight:800;">Track →<\/button>\n                <\/td>\n                <td>\${renderVillageOfficerLastColumn\(v\)}<\/td>`,
  `<td>\n                  <button class="inline-link" data-village="\${v.id}" style="font-weight:800;">Track →</button>\n                </td>`
);

content = content.replace(
  `<td style="text-align:center;">\n              <span class="badge-pill-green">SUM TOTAL</span>\n            <\/td>\n            <td class="text-center font-mono text-muted text-small">—<\/td>`,
  `<td style="text-align:center;">\n              <span class="badge-pill-green">SUM TOTAL</span>\n            </td>`
);

// 10. Village Monitoring default table
content = content.replace(
  `<thead>\n        <tr>\n          <th>CODE</th>\n          <th>VILLAGE NAME</th>\n          <th>MANDAL</th>\n          <th>DIVISION</th>\n          <th>PPBS CYCLE</th>\n          <th>PHASE</th>\n          <th>EXTENT (AC)</th>\n          <th>PPBs TARGET</th>\n          <th>CURRENT RESURVEY STAGE</th>\n          <th>OVERALL STATUS</th>\n          <th>ACTION</th>\n          <th class="col-officers-last">SURVEY OFFICERS (VS · MLSO/MS · TEAM)</th>\n        </tr>\n      </thead>`,
  `<thead>\n        <tr>\n          <th style="width:7%;">CODE</th>\n          <th style="width:18%;">VILLAGE NAME</th>\n          <th style="width:11%;">MANDAL</th>\n          <th style="width:9%;">DIVISION</th>\n          <th style="width:9%;">PPBS CYCLE</th>\n          <th style="width:7%;">PHASE</th>\n          <th style="width:8%;">EXTENT (AC)</th>\n          <th style="width:8%;">PPBs TARGET</th>\n          <th style="width:13%;">CURRENT RESURVEY STAGE</th>\n          <th style="width:6%;">OVERALL STATUS</th>\n          <th style="width:4%;text-align:center;">ACTION</th>\n        </tr>\n      </thead>`
);

content = content.replace(
  `<td>\n              <button class="inline-link" data-village="\${v.id}" style="font-weight:800;">\n                Track →\n              <\/button>\n            <\/td>\n            <td>\${renderVillageOfficerLastColumn\(v\)}<\/td>`,
  `<td>\n              <button class="inline-link" data-village="\${v.id}" style="font-weight:800;">\n                Track →\n              </button>\n            </td>`
);

// 11. Mandal Analysis table
content = content.replace(
  `<th>ACTION</th>\n            <th class="col-officers-last">CONCERNED MLSO / MS & CONTACT</th>`,
  `<th style="width:8%;text-align:center;">ACTION</th>`
);

content = content.replace(
  `<td>\n                  <button class="inline-link" data-drill-type="mandal" data-drill-value="\${h\(m\.name\)}">\n                    Villages →\n                  <\/button>\n                <\/td>\n                <td>\n                  <div class="ms-last-col-card">[\s\S]*?<\/div>\n                <\/td>`,
  `<td>\n                  <button class="inline-link" data-drill-type="mandal" data-drill-value="\${h(m.name)}">\n                    Villages →\n                  </button>\n                </td>`
);

// Convert back to original CRLF if needed
if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('app.js', content, 'utf8');
fs.writeFileSync('public/app.js', content, 'utf8');
console.log('Updated app.js and public/app.js');

// Now let's update server.js
let server = fs.readFileSync('server.js', 'utf8');
server = server.replace(
  /const MANDAL_SURVEYOR_DIRECTORY = \{[\s\S]*?\n\};\n\nfunction getMandalSurveyor\(mandalName\) \{[\s\S]*?\n\}/,
  `const MANDAL_SURVEYOR_DIRECTORY = {};\n\nfunction getMandalSurveyor(mandalName) {\n  return { name: '', role: '', phone: '' };\n}`
);
server = server.replace(`r.ms_phone = ms.phone;`, `r.ms_phone = '';`);
fs.writeFileSync('server.js', server, 'utf8');
console.log('Updated server.js');
