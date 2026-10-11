const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE CSS
console.log('1. Adding styles for Cadres & Daily 6:00 AM Schedule...');
const cssAdditions = `
/* ==========================================================================
   SURVEY & REVENUE CADRES AND DAILY 6:00 AM SCHEDULE STYLES
   ========================================================================== */

.wa-schedule-banner-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1.5px solid #86efac;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.06);
  flex-wrap: wrap;
  gap: 16px;
}

.wa-sched-left {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 320px;
}

.wa-sched-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.wa-sched-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 15px;
  color: #064e3b;
}

.wa-sched-live-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 20px;
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
  letter-spacing: 0.02em;
}

.wa-sched-subtitle {
  font-size: 12px;
  color: #047857;
  margin-top: 3px;
  line-height: 1.4;
}

.wa-sched-routing-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.wa-route-chip {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 6px;
  font-weight: 700;
  border: 1px solid transparent;
}

.wa-route-chip.survey {
  background: #eff6ff;
  color: #1e40af;
  border-color: #bfdbfe;
}

.wa-route-chip.revenue {
  background: #fff7ed;
  color: #c2410c;
  border-color: #fed7aa;
}

.wa-sched-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.wa-trigger-sched-btn {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #ffffff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.wa-trigger-sched-btn:hover {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  transform: translateY(-1px);
}

.wa-sched-last-run {
  font-size: 11px;
  color: #065f46;
  font-weight: 600;
}

/* CADRE SELECTION TABS */
.wa-cadre-nav-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.wa-cadre-nav-btn {
  flex: 1;
  min-width: 260px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.wa-cadre-nav-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.wa-cadre-nav-btn.active.survey-tab {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1e3a8a;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
}

.wa-cadre-nav-btn.active.revenue-tab {
  background: #fff7ed;
  border-color: #ea580c;
  color: #9a3412;
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.12);
}

.wa-cadre-badge-count {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1e40af;
}

.wa-cadre-badge-count.revenue {
  background: #ffedd5;
  color: #9a3412;
}

.wa-tier-radio-card.revenue-card.active {
  border-color: #ea580c;
  background: #fff7ed;
}

.wa-tier-radio-card.revenue-card.active .wa-radio-indicator {
  border-color: #ea580c;
  background: #ea580c;
}
`;

['styles.css', 'public/styles.css'].forEach(f => {
  const filePath = path.join(rootDir, f);
  let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  if (!content.includes('.wa-schedule-banner-card')) {
    content += '\n' + cssAdditions;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Added Cadre and Schedule styles to ${f}`);
  }
});

console.log('Done updating CSS.');
