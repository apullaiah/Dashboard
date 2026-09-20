const fs = require('fs');

const css = `
/* ==========================================================================
   SIMPLIFIED OVERVIEW SELECTION FILTER BAR
   ========================================================================== */

.simple-overview-filter-bar {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 22px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.simple-filter-controls-row {
  display: grid;
  grid-template-columns: repeat(4, 1.1fr) 1.8fr auto;
  gap: 12px;
  align-items: flex-end;
}

@media (max-width: 1200px) {
  .simple-filter-controls-row {
    grid-template-columns: repeat(2, 1fr) 1.5fr auto;
  }
}

@media (max-width: 768px) {
  .simple-filter-controls-row {
    grid-template-columns: 1fr;
  }
}

.simple-select-wrap,
.simple-search-wrap,
.simple-reset-wrap {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.simple-filter-label {
  font-size: 11px;
  font-weight: 800;
  color: #475569;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.simple-filter-select {
  height: 40px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  cursor: pointer;
  transition: all 0.18s ease;
  width: 100%;
}

.simple-filter-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.simple-search-inner {
  position: relative;
  display: flex;
  align-items: center;
}

.simple-search-inner .search-mag-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  stroke: #64748b;
  pointer-events: none;
}

.simple-search-input {
  width: 100%;
  height: 40px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 12px 0 36px;
  font-size: 13.5px;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  transition: all 0.18s ease;
}

.simple-search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.simple-reset-btn {
  height: 40px;
  background: #fee2e2;
  border: 1.5px solid #fca5a5;
  color: #991b1b;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.simple-reset-btn:hover {
  background: #fecaca;
  border-color: #f87171;
  color: #7f1d1d;
  transform: translateY(-1px);
}

.simple-stage-ribbon-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
}

.simple-stage-ribbon-label {
  font-size: 11.5px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.simple-stage-pills-wrap {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  flex: 1;
}

.simple-stage-pill {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.simple-stage-pill:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.simple-stage-pill.active {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
}

.simple-count-badge {
  font-size: 12.5px;
  color: #475569;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

/* Focused Stage Table Styling */
.focused-stage-table th.col-highlight-today {
  background: #ecfdf5 !important;
  color: #065f46 !important;
  border-bottom: 2px solid #10b981 !important;
}

.focused-stage-table th.col-highlight-cum {
  background: #eff6ff !important;
  color: #1e40af !important;
  border-bottom: 2px solid #3b82f6 !important;
}

.focused-stage-table th.col-highlight-bal {
  background: #fffbeb !important;
  color: #92400e !important;
  border-bottom: 2px solid #f59e0b !important;
}
`;

['styles.css', 'public/styles.css'].forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('SIMPLIFIED OVERVIEW SELECTION FILTER BAR')) {
    content += '\n' + css;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[${filePath}] Successfully added simple filter CSS.`);
  } else {
    console.log(`[${filePath}] Simple filter CSS already present.`);
  }
});
