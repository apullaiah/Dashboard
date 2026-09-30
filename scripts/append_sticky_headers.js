const fs = require('fs');

let css = fs.readFileSync('styles.css', 'utf8');

const stickyRule = `
/* Sticky Table Headers for Smooth Row Reading */
.data-table th,
.ref-dense-data-table th,
.ivw-data-table th {
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
  background: #f8fafc !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
}

/* Compact Badges & Pills */
.stage-label,
.stage-cell-pill,
.ppb-cycle-pill,
.status-pill,
.badge-pill-green,
.phase-card-badge {
  font-size: 9px !important;
  padding: 2px 4px !important;
  display: inline-block !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
  vertical-align: middle !important;
}
`;

css += '\n' + stickyRule;
fs.writeFileSync('styles.css', css, 'utf8');
fs.writeFileSync('public/styles.css', css, 'utf8');
console.log('Appended sticky table headers and compact badge styles.');
