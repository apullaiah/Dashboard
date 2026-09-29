/**
 * scripts/apply_ppb_cycle_stages.js
 * Applies the Resurvey Process Stages breakdown with Big Font Village Numbers
 * for PPB Cycles across app.js, public/app.js, styles.css, and public/styles.css.
 */
const fs = require('fs');
const path = require('path');

const CSS_ENHANCEMENT = `
/* ==========================================================================
   PPB CYCLE RESURVEY PROCESS STAGES BREAKDOWN (BIG FONT METRICS)
   ========================================================================== */
.ppb-stage-breakdown-card {
  margin: 18px 0;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.ppb-stage-section-hdr {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.ppb-stage-super-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.stage-cycle-badge {
  background: #0f172a;
  color: #f8fafc;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.ppb-stage-main-title {
  font-size: 19px;
  font-weight: 800;
  color: #0f172a;
  margin: 4px 0 4px 0;
  letter-spacing: -0.2px;
}

.ppb-stage-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

.ppb-stage-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ppb-stage-reset-btn {
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ppb-stage-reset-btn:hover,
.ppb-stage-reset-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
}

.ppb-active-stage-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #eff6ff;
  border-bottom: 1.5px solid #bfdbfe;
  padding: 10px 20px;
  font-size: 13px;
  color: #1e40af;
}

.active-stage-badge {
  background: #2563eb;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  margin-right: 8px;
  letter-spacing: 0.5px;
}

.clear-stage-pill {
  background: #ffffff;
  border: 1px solid #93c5fd;
  color: #1d4ed8;
  font-size: 11.5px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.clear-stage-pill:hover {
  background: #dbeafe;
}

.ppb-stages-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 16px 20px;
  background: #f8fafc;
}

@media (min-width: 1350px) {
  .ppb-stages-cards-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (max-width: 768px) {
  .ppb-stages-cards-grid {
    grid-template-columns: repeat(2, 1fr);
    padding: 12px;
  }
}

.ppb-stage-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 14px 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.ppb-stage-card:hover {
  transform: translateY(-2px);
  border-color: #94a3b8;
  box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.08);
}

.ppb-stage-card.has-villages {
  border-top-width: 4px;
}

.ppb-stage-card.is-zero {
  opacity: 0.65;
  background: #fbfcfd;
}

.ppb-stage-card.is-zero:hover {
  opacity: 0.9;
}

.ppb-stage-card.is-selected {
  background: #eff6ff;
  border-color: #2563eb !important;
  box-shadow: 0 0 0 2px #93c5fd, 0 8px 20px -4px rgba(37, 99, 235, 0.15);
  transform: translateY(-2px);
}

.ppb-stage-top-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.ppb-stage-step-tag {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.5px;
}

.ppb-stage-icon {
  font-size: 16px;
}

.ppb-stage-name-block {
  min-height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ppb-stage-name {
  font-size: 12.5px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}

.ppb-stage-telugu {
  font-size: 10.5px;
  color: #64748b;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* BIG FONT FOR VILLAGE NUMBER */
.ppb-stage-num-wrap {
  margin: 10px 0 6px 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.ppb-stage-num-big {
  font-size: 38px;
  font-weight: 900;
  font-family: 'DM Mono', 'SF Mono', Consolas, monospace;
  line-height: 1;
  letter-spacing: -1.5px;
}

.ppb-stage-num-big.text-highlight {
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.ppb-stage-num-big.text-zero {
  color: #94a3b8 !important;
  opacity: 0.7;
}

.ppb-stage-num-unit {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.ppb-stage-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
  font-size: 11px;
}

.ppb-stage-pct-pill {
  font-size: 10.5px;
  font-weight: 700;
  font-family: 'DM Mono', monospace;
  color: #64748b;
}

.ppb-stage-pct-pill.pct-active {
  color: #0f172a;
  font-weight: 800;
}

.ppb-stage-drill-arrow {
  font-size: 10.5px;
  font-weight: 800;
  color: #2563eb;
}

.ppb-stage-zero-note {
  font-size: 10.5px;
  color: #94a3b8;
}

.stage-cell-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #334155;
  white-space: nowrap;
}

.stage-cell-pill.stage-pill-green {
  background: #dcfce7;
  color: #15803d;
}
`;

function updateCss() {
  ['styles.css', 'public/styles.css'].forEach(file => {
    let css = fs.readFileSync(file, 'utf8');
    if (!css.includes('PPB CYCLE RESURVEY PROCESS STAGES BREAKDOWN')) {
      css += '\n' + CSS_ENHANCEMENT + '\n';
      fs.writeFileSync(file, css, 'utf8');
      console.log(`Updated CSS in ${file}`);
    } else {
      console.log(`CSS already contains PPB stages in ${file}`);
    }
  });
}

updateCss();
