const fs = require('fs');
const path = require('path');

const cssToAdd = `
/* ==========================================================================
   Reference Dashboard & Navigation Styles (Emergent Layout Alignment)
   ========================================================================== */

/* Top Navigation Tabs */
.ref-tab-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 12px;
  flex-wrap: wrap;
}

.ref-tab-btn {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
  user-select: none;
}

.ref-tab-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

.ref-tab-btn.active {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.2);
}

.ref-tab-badge {
  background: #f1f5f9;
  color: #0f172a;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 12px;
  font-family: 'DM Mono', monospace;
}

.ref-tab-btn.active .ref-tab-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* Top Dark Header */
.ref-top-header {
  background: #0b132b;
  border-radius: 10px;
  padding: 16px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  box-shadow: 0 4px 18px rgba(11, 19, 43, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
  gap: 16px;
}

.ref-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ref-header-icon {
  width: 44px;
  height: 44px;
  background: #1c2541;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60a5fa;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.ref-header-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ref-main-title {
  font-size: 19px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.3px;
  margin: 0;
  line-height: 1.2;
}

.ref-telemetry-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #34d399;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.ref-live-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35);
}

.ref-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ref-sync-pill {
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  color: #94a3b8;
  background: #1c2541;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ref-action-btn {
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  user-select: none;
}

.ref-action-btn.data-sources-btn {
  background: #1c2541;
  border: 1px solid #334155;
  color: #e2e8f0;
}

.ref-action-btn.data-sources-btn:hover {
  background: #27355a;
  color: #ffffff;
}

.ref-action-btn.refresh-btn {
  background: #2563eb;
  border: 1px solid #1d4ed8;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
}

.ref-action-btn.refresh-btn:hover {
  background: #1d4ed8;
}

/* 4-Row Filter Panel */
.ref-filter-panel-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px 14px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.ref-filter-row {
  margin-bottom: 12px;
}

.ref-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.ref-row-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.ref-row-count {
  font-size: 11.5px;
  font-weight: 700;
  color: #059669;
}

.ref-pills-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.ref-pill-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 18px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.ref-pill-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

.ref-pill-btn.active {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
  font-weight: 700 !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

.ref-filter-split-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
}

@media (max-width: 900px) {
  .ref-filter-split-row {
    grid-template-columns: 1fr;
  }
}

.ref-split-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ref-pills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ref-filter-controls-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.ref-mandal-select-wrap {
  flex: 0 0 240px;
}

.ref-mandal-dropdown {
  width: 100%;
  height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  color: #0f172a;
  background: #ffffff;
  outline: none;
}

.ref-mandal-dropdown:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.ref-search-input-wrap {
  flex: 1;
  min-width: 220px;
  height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  background: #ffffff;
}

.ref-search-input-wrap:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.ref-search-field {
  width: 100%;
  border: none;
  outline: none;
  font-size: 13px;
  color: #0f172a;
  background: transparent;
}

.ref-reset-all-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.ref-reset-all-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* 4 Executive KPI Cards */
.ref-kpi-quad-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}

@media (max-width: 900px) {
  .ref-kpi-quad-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 550px) {
  .ref-kpi-quad-grid {
    grid-template-columns: 1fr;
  }
}

.ref-kpi-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 18px;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.ref-kpi-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.ref-kpi-box.border-blue { border-top: 4px solid #3b82f6; }
.ref-kpi-box.border-purple { border-top: 4px solid #8b5cf6; }
.ref-kpi-box.border-green { border-top: 4px solid #10b981; }
.ref-kpi-box.border-orange { border-top: 4px solid #f97316; }

.ref-kpi-lbl {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.ref-kpi-num {
  font-size: 32px;
  font-weight: 800;
  font-family: 'DM Mono', monospace;
  color: #0f172a;
  line-height: 1.1;
  margin-bottom: 4px;
}

.ref-kpi-meta {
  font-size: 11.5px;
  color: #64748b;
}

.ref-kpi-progress {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin: 8px 0 4px;
}

.ref-kpi-bar {
  height: 100%;
  border-radius: 3px;
}

.ref-kpi-bar.bar-green { background: #10b981; }
.ref-kpi-bar.bar-orange { background: #f97316; }

/* Resurvey Stage Pipeline */
.ref-pipeline-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 22px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
}

.ref-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.ref-section-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #0f172a;
  text-transform: uppercase;
  margin: 0;
}

.ref-section-meta {
  font-size: 12px;
  color: #64748b;
  font-weight: 700;
}

.ref-pipeline-track {
  display: grid;
  grid-template-columns: repeat(11, 1fr);
  gap: 8px;
}

@media (max-width: 1200px) {
  .ref-pipeline-track {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (max-width: 700px) {
  .ref-pipeline-track {
    grid-template-columns: repeat(3, 1fr);
  }
}

.ref-pipeline-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.ref-pipeline-card:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
  transform: translateY(-2px);
}

.ref-pipeline-card.pipeline-tahsildar {
  border-left: 3px solid #f59e0b;
}

.ref-pipe-step-num {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 3px;
}

.ref-pipe-name {
  font-size: 11px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ref-pipe-count {
  font-size: 17px;
  font-weight: 800;
  font-family: 'DM Mono', monospace;
  color: #1e3a8a;
  margin: 5px 0 2px;
}

.ref-pipe-unit {
  font-size: 9.5px;
  font-weight: 700;
  color: #64748b;
}

.ref-pipe-bar {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 6px;
}

.ref-pipe-bar-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
}

/* Dense 18-Column Village-Wise Status Table */
.ref-table-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.ref-table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.ref-table-meta-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.ref-table-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ref-page-size-select {
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  background: #ffffff;
  color: #0f172a;
}

.ref-tool-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.ref-tool-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.ref-tool-btn.btn-excel {
  color: #15803d;
  border-color: #86efac;
}

.ref-tool-btn.btn-excel:hover {
  background: #f0fdf4;
}

.ref-tool-btn.btn-csv {
  color: #0369a1;
  border-color: #7dd3fc;
}

.ref-tool-btn.btn-csv:hover {
  background: #f0f9ff;
}

.ref-table-responsive-wrapper {
  overflow-x: auto;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.ref-dense-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}

.ref-dense-data-table th {
  background: #f8fafc;
  color: #1e293b;
  font-weight: 800;
  padding: 9px 8px;
  border-bottom: 2px solid #cbd5e1;
  text-align: left;
  white-space: nowrap;
  font-size: 10.5px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.ref-dense-data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.ref-dense-data-table th.sortable:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.ref-dense-data-table td {
  padding: 7px 8px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
  color: #334155;
}

.ref-dense-data-table tr:hover {
  background: #f8faff;
}

.ref-stage-cell {
  text-align: center;
}

.ref-badge-yes {
  background: #dcfce7;
  color: #15803d;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  display: inline-block;
}

.ref-badge-no {
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  display: inline-block;
}

.ref-badge-pend {
  background: #fef3c7;
  color: #b45309;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  display: inline-block;
}

.ref-badge-na {
  color: #94a3b8;
  font-size: 10px;
}

.ref-village-link {
  color: #1d4ed8;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
}

.ref-village-link:hover {
  text-decoration: underline;
  color: #1e40af;
}

.ref-table-pagination-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
  color: #64748b;
  flex-wrap: wrap;
  gap: 10px;
}

.ref-pagination-controls {
  display: flex;
  gap: 4px;
}

.ref-page-btn {
  padding: 4px 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ref-page-btn:hover {
  background: #f1f5f9;
}

.ref-page-btn.active {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
}

/* Mandal Drilldown Section */
.ref-mandal-drilldown-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
}

.ref-mandal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.ref-mandal-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ref-mandal-card:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
}

.ref-mandal-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.ref-mandal-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.ref-mandal-div {
  font-size: 10.5px;
  font-weight: 700;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.ref-mandal-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: #475569;
  margin-bottom: 6px;
}

.ref-mandal-bar-track {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.ref-mandal-bar-fill {
  height: 100%;
  background: #10b981;
  border-radius: 3px;
}

/* Mandal-Wise Daily Proforma Section */
.ref-proforma-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
}

.ref-proforma-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.ref-proforma-table th {
  background: #f1f5f9;
  padding: 9px 12px;
  border-bottom: 2px solid #cbd5e1;
  font-weight: 800;
  text-align: left;
  color: #1e293b;
  font-size: 11px;
  letter-spacing: 0.3px;
}

.ref-proforma-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.ref-proforma-table tr:hover {
  background: #f8fafc;
}

.ref-proforma-table tfoot td {
  background: #f8fafc;
  font-weight: 800;
  border-top: 2px solid #cbd5e1;
  color: #0f172a;
}
`;

function appendStyles(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('ref-top-header')) {
    fs.writeFileSync(filePath, content + '\n' + cssToAdd, 'utf8');
    console.log(`✓ Appended reference styles to ${filePath}`);
  } else {
    console.log(`ℹ Styles already present in ${filePath}`);
  }
}

appendStyles(path.resolve(__dirname, '../styles.css'));
appendStyles(path.resolve(__dirname, '../public/styles.css'));
