const fs = require('fs');

const cssRules = `
/* ==========================================================================
   ACTIVE GT FILTER BANNER, GRAND TOTAL FOOTER & GLOBAL RESET BUTTONS
   ========================================================================== */

/* Active GT Filter Banner */
.active-gt-filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, #065f46 0%, #047857 100%);
  color: #ffffff;
  padding: 14px 20px;
  border-radius: 10px;
  margin-bottom: 18px;
  box-shadow: 0 4px 14px rgba(6, 95, 70, 0.25);
  border: 1px solid #059669;
  animation: fadeIn 0.25s ease-in-out;
}

.active-gt-banner-content {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.active-gt-banner-icon {
  font-size: 28px;
  line-height: 1;
}

.active-gt-banner-content strong {
  display: block;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.2px;
  margin-bottom: 3px;
}

.active-gt-banner-content p {
  margin: 0;
  font-size: 13.5px;
  opacity: 0.95;
  line-height: 1.4;
}

.btn-clear-active-gt {
  background: #ffffff;
  color: #065f46;
  border: none;
  font-weight: 800;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.btn-clear-active-gt:hover {
  background: #f0fdf4;
  color: #047857;
  transform: translateY(-1px);
}

/* Grand Total Table Footer */
.ivw-table-footer-grand-total {
  background: #0f172a;
  color: #ffffff;
  font-weight: 800;
  border-top: 3px solid #3b82f6;
}

.ivw-table-footer-grand-total td {
  padding: 14px 14px !important;
  color: #ffffff !important;
  font-size: 14px !important;
  border-top: 2px solid #334155 !important;
  border-bottom: none !important;
  background: #0f172a !important;
}

.ivw-grand-total-label {
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-size: 13px !important;
}

.ivw-table-footer-grand-total .col-highlight-today {
  color: #34d399 !important;
  font-size: 15.5px !important;
  font-weight: 900 !important;
}

.ivw-table-footer-grand-total .col-highlight-cum {
  color: #60a5fa !important;
  font-size: 15px !important;
}

.ivw-table-footer-grand-total .col-highlight-bal {
  color: #fbbf24 !important;
  font-size: 15px !important;
}

.clickable-th {
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease;
}

.clickable-th:hover {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
}

/* Global Reset All Filters Buttons */
.topbar-reset-btn {
  background: #dc2626;
  border: 1px solid #b91c1c;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px rgba(220, 38, 38, 0.35);
}

.topbar-reset-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.btn-reset-filters-pill {
  background: #fee2e2;
  border: 1.5px solid #fca5a5;
  color: #991b1b;
  padding: 6px 14px;
  border-radius: 18px;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-reset-filters-pill:hover {
  background: #fecaca;
  color: #7f1d1d;
  border-color: #f87171;
  transform: translateY(-1px);
}

.btn-reset-filters-ivw {
  background: #fee2e2;
  border: 1.5px solid #fca5a5;
  color: #991b1b;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-reset-filters-ivw:hover {
  background: #fecaca;
  color: #7f1d1d;
  border-color: #f87171;
}

/* Persistent Floating Reset Button */
.floating-reset-btn {
  position: fixed;
  bottom: 24px;
  right: 28px;
  z-index: 9999;
  background: #0f172a;
  color: #ffffff;
  border: 2px solid #3b82f6;
  border-radius: 30px;
  padding: 10px 18px;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.35);
  transition: all 0.2s ease;
  user-select: none;
}

.floating-reset-btn:hover {
  background: #1e293b;
  border-color: #60a5fa;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.45);
}

/* ==========================================================================
   OVERVIEW SECTION FONT SIZE SCALING (LARGE LEGIBILITY)
   ========================================================================== */

/* Main Header & Telemetry */
.ref-main-title {
  font-size: 22px !important;
  letter-spacing: -0.2px;
}

.ref-telemetry-pill {
  font-size: 12.5px !important;
}

.ref-sync-pill {
  font-size: 13px !important;
}

/* Top Navigation & Sub-navigation */
.ref-tab-btn {
  font-size: 14px !important;
  padding: 11px 20px !important;
}

.ref-tab-badge {
  font-size: 12px !important;
}

/* Filter Panel Labels and Controls */
.ref-row-label {
  font-size: 13px !important;
  letter-spacing: 0.5px !important;
}

.ref-pill-btn {
  font-size: 13.5px !important;
  padding: 6px 14px !important;
}

.ref-mandal-dropdown,
.ref-search-field,
.ref-control-label {
  font-size: 14px !important;
}

.ref-reset-all-btn {
  font-size: 13px !important;
  padding: 9px 16px !important;
}

/* 4 Executive KPI Cards */
.ref-kpi-lbl {
  font-size: 12.5px !important;
  font-weight: 800 !important;
}

.ref-kpi-num {
  font-size: 36px !important;
}

.ref-kpi-meta {
  font-size: 13px !important;
}

/* Resurvey Pipeline */
.ref-section-title {
  font-size: 15px !important;
}

.ref-section-meta {
  font-size: 13px !important;
}

.ref-pipe-step-num {
  font-size: 11.5px !important;
}

.ref-pipe-name {
  font-size: 12.5px !important;
}

.ref-pipe-count {
  font-size: 19px !important;
}

.ref-pipe-unit {
  font-size: 11px !important;
}

/* Dense 18-Column Village Status Table */
.ref-table-toolbar .ref-section-title {
  font-size: 16px !important;
}

.ref-dense-data-table th {
  font-size: 12px !important;
  padding: 11px 9px !important;
}

.ref-dense-data-table td {
  font-size: 13px !important;
  padding: 9px 9px !important;
}

.ref-table-pagination-footer {
  font-size: 13.5px !important;
}

.ref-page-btn {
  font-size: 13px !important;
  padding: 6px 12px !important;
}

/* Inline Village-Wise Stage Section & Table */
.ivw-main-title {
  font-size: 22px !important;
}

.ivw-sub-title {
  font-size: 14.5px !important;
}

.ivw-unit-badge {
  font-size: 13px !important;
}

.ivw-tab-btn {
  font-size: 14px !important;
  padding: 9px 16px !important;
}

.ivw-kpi-item .kpi-label {
  font-size: 12px !important;
}

.ivw-kpi-item .kpi-val {
  font-size: 24px !important;
}

.ivw-kpi-item small {
  font-size: 12.5px !important;
}

.ivw-search-input,
.ivw-select {
  font-size: 14px !important;
}

.ivw-count-badge {
  font-size: 13px !important;
}

.ivw-data-table th {
  font-size: 13px !important;
  padding: 12px 14px !important;
}

.ivw-data-table td {
  font-size: 14px !important;
  padding: 12px 14px !important;
}

.village-title {
  font-size: 14.5px !important;
}

.bold-code {
  font-size: 13.5px !important;
}

.num-bold {
  font-size: 14.5px !important;
}

.ivw-inspect-btn {
  font-size: 13px !important;
  padding: 6px 14px !important;
}

/* Individual Village Progress Card */
.iv-village-name {
  font-size: 26px !important;
}

.iv-village-code {
  font-size: 14px !important;
}

.iv-sub-meta {
  font-size: 14.5px !important;
}

.iv-box-title strong {
  font-size: 15.5px !important;
}

.iv-metric-label {
  font-size: 12px !important;
}

.iv-metric-val {
  font-size: 20px !important;
}

.iv-benchmark-note {
  font-size: 13px !important;
}

.iv-stepper-title {
  font-size: 13px !important;
}

.step-label {
  font-size: 11.5px !important;
}

.step-unit {
  font-size: 10.5px !important;
}
`;

['styles.css', 'public/styles.css'].forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('ACTIVE GT FILTER BANNER, GRAND TOTAL FOOTER')) {
    content += '\n' + cssRules;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[${filePath}] Successfully appended CSS enhancements.`);
  } else {
    console.log(`[${filePath}] CSS enhancements already present.`);
  }
});
