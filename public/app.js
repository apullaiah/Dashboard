const STAGES = [
  ['gt_status', 'GT'], ['vectorization_status', 'Vectorization'], ['vs_status', 'VS Login'],
  ['vro_status', 'VRO Login'], ['tahsildar_status', 'Tahsildar Login'], ['rdo_status', 'RDO Login'],
  ['jc_status', 'JC Login'], ['section13_status', 'Section 13'], ['draft_ror_status', 'Draft RoR'], ['final_ror_status', 'Final RoR']
];

const state = { view: 'dashboard', dashboard: null, villages: [], villageFilters: {}, filterOptions: {}, sources: [], advancedFilterOpen: false, analysisTab: 'phases', mandalSearch: '' };
const STAGE_KEYS = [
  'gt_status', 'vectorization_status', 'vs_status', 'vro_status',
  'tahsildar_status', 'rdo_status', 'jc_status', 'section13_status',
  'draft_ror_status', 'final_ror_status', 'ppb_status'
];
const root = document.getElementById('view-root');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');

const $ = (selector, scope = document) => scope.querySelector(selector);
const h = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const icon = name => `<svg aria-hidden="true"><use href="#icon-${name}" /></svg>`;
const noValue = (value, hasData = true) => hasData && value !== null && value !== undefined ? value : '—';
const formatPct = value => value !== null && value !== undefined && !Number.isNaN(Number(value)) ? `${value}%` : '—';
const formatDate = value => { if (!value) return 'Not synchronized'; const d = new Date(value); return Number.isNaN(+d) ? h(value) : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(d); };
const statusClass = value => String(value || 'not-updated').toLowerCase().replace(/\s+/g, '-');
const stageStatus = value => value || 'Not Updated';
const api = async (endpoint, options = {}) => {
  const token = sessionStorage.getItem('ctr_officer_token');
  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'ADMIN',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      ...options
    });
  } catch (netErr) {
    throw new Error(`Connection failed (${netErr.message || 'Network unavailable'}). Please verify your internet connection, office DNS/VPN, and ensure the domain URL is reachable.`);
  }
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    sessionStorage.removeItem('ctr_officer_token');
    renderAuthGate();
    throw new Error('Authorized officer credentials required.');
  }
  if (!response.ok) throw new Error(body.error || `Server returned error (${response.status}).`);
  return body;
};

function toast(message, kind = '') { const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = message; toastRoot.append(el); setTimeout(() => el.remove(), 4500); }
function setTopbar(data) {
  const has = data?.hasData;
  $('#last-updated').textContent = data?.lastSync?.dateTime ? formatDate(data.lastSync.dateTime) : 'Not synchronized';
  const label = $('#source-status-label'); const dot = $('#source-status .status-dot');
  if (!data?.sourceSummary?.configured) { label.textContent = 'Sources not connected'; dot.className = 'status-dot neutral'; }
  else if (data.sourceSummary.failed) { label.textContent = `${data.sourceSummary.failed} source issue${data.sourceSummary.failed > 1 ? 's' : ''}`; dot.className = 'status-dot error'; }
  else if (data.sourceSummary.connected) { label.textContent = `${data.sourceSummary.connected} source${data.sourceSummary.connected > 1 ? 's' : ''} connected`; dot.className = 'status-dot'; }
  else { label.textContent = 'Awaiting first sync'; dot.className = 'status-dot neutral'; }
  document.title = has ? 'Chittoor District | Live Monitoring' : 'Chittoor District | AP Resurvey Monitoring';
}
function updateNav() { document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === state.view)); const names = { dashboard: ['MONITORING CENTRE', 'District overview'], villages: ['MONITORING', 'Village monitoring'], performance: ['ANALYTICS', 'Performance monitoring'], quality: ['DATA ASSURANCE', 'Data quality'], reports: ['REPORTING', 'Reports'], sources: ['ADMINISTRATION', 'Data sources'], audit: ['GOVERNANCE', 'Audit history'] }; $('#breadcrumb').textContent = names[state.view][0]; $('#page-title').textContent = names[state.view][1]; }
async function reloadDashboard() { state.dashboard = await api('/api/dashboard'); setTopbar(state.dashboard); }
function renderAuthGate(errorMsg = '') {
  document.body.classList.add('auth-locked');
  $('#page-title').textContent = 'Officer Authentication';
  $('#breadcrumb').textContent = 'RESTRICTED GOVERNMENT PORTAL';
  root.innerHTML = `
    <div class="auth-gate-wrapper">
      <div class="auth-gate-card">
        <div class="auth-emblem">
          <svg class="auth-logo-svg"><use href="#icon-resurvey-logo" /></svg>
        </div>
        <span class="auth-badge">OFFICIAL GOVERNMENT SYSTEM</span>
        <h2>Chittoor District Resurvey Portal</h2>
        <p class="auth-sub">Restricted decision-support and continuous monitoring platform for the Andhra Pradesh Resurvey Programme (774 Villages).</p>
        <div class="auth-notice">
          ${icon('shield')}
          <div>
            <strong>Confidential Revenue Data Protection</strong>
            <p>Access is restricted exclusively to authorized officials (District Collectorate, SSLR, RSDTs, MLSOs, Tahsildars, VROs). All access events are timestamped and recorded.</p>
          </div>
        </div>
        ${errorMsg ? `<div class="auth-error">${icon('warning')}<span>${h(errorMsg)}</span></div>` : ''}
        <form id="officer-login-form" class="auth-form">
          <label for="officer-pin-input">OFFICER ACCESS PIN</label>
          <div class="pin-input-wrap">
            <input type="password" id="officer-pin-input" name="pin" required autocomplete="current-password" placeholder="Enter Access PIN" autofocus />
            <button type="button" id="toggle-pin-vis" title="Toggle PIN visibility">👁</button>
          </div>
          <button type="submit" class="auth-submit-btn">
            ${icon('shield')} Verify Officer Identity
          </button>
        </form>
        <div class="auth-footer-note">
          <span>GOVERNMENT OF ANDHRA PRADESH · REVENUE (SSLR) DEPARTMENT</span>
        </div>
      </div>
    </div>
  `;
  const form = $('#officer-login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = $('#officer-pin-input').value.trim();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Verifying credentials...';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          sessionStorage.setItem('ctr_officer_token', data.token);
          document.body.classList.remove('auth-locked');
          toast('Officer identity verified. Access granted.');
          await reloadDashboard();
          navigate('dashboard');
        } else {
          renderAuthGate(data.error || 'Authentication failed.');
        }
      } catch (err) {
        renderAuthGate(err.message || 'Unable to connect to verification service.');
      }
    });
    const toggleBtn = $('#toggle-pin-vis');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const inp = $('#officer-pin-input');
        inp.type = inp.type === 'password' ? 'text' : 'password';
      });
    }
  }
}
async function navigate(view, options = {}) {
  const token = sessionStorage.getItem('ctr_officer_token');
  if (!token) {
    renderAuthGate();
    return;
  }
  document.body.classList.remove('auth-locked');
  state.view = view; state.villageFilters = options.filters || state.villageFilters; updateNav(); document.querySelector('.sidebar').classList.remove('open'); root.innerHTML = `<div class="empty-block"><div><svg>${'<use href="#icon-refresh" />'}</svg><strong>Loading monitoring data</strong></div></div>`; try { if (!state.dashboard || options.fresh) await reloadDashboard(); if (view === 'villages') await loadVillages(); if (view === 'sources') await loadSources(); render(); } catch (error) { if (error.message.includes('officer credentials')) return; root.innerHTML = `<div class="section-card"><div class="empty-block"><div>${icon('warning')}<strong>Unable to load the monitoring centre</strong><p>${h(error.message)}</p></div></div></div>`; }
}
function kpiCard(label, value, description, variant, filter = null, hasData, filterKey = 'status') {
  const enabled = filter && hasData && value !== null && value !== undefined;
  const action = enabled ? `data-kpi-filter="${filter}" data-kpi-key="${filterKey}"` : 'disabled';
  return `<button class="kpi-card ${variant || ''}" ${action}><span class="kpi-label"><i></i>${h(label)}</span><b class="kpi-value">${noValue(value, hasData)}</b><span class="kpi-description">${h(description)}</span>${enabled ? `<span class="drill-arrow">${icon('arrow')}</span>` : ''}</button>`;
}
function emptyBlock(title, note, iconName = 'database') { return `<div class="empty-block"><div>${icon(iconName)}<strong>${h(title)}</strong><p>${h(note)}</p></div></div>`; }
function renderDashboard() {
  const d = state.dashboard; const has = d.hasData; const sourceReady = d.sourceSummary.configured > 0;
  const progressCount = d.villageRecordCount || d.kpis?.total || (state.villages && state.villages.length) || 774;
  root.innerHTML = `
    <div class="dashboard-intro"><div><h3>District monitoring at a glance</h3><p>Village-wise status of the AP Resurvey workflow, PPBs and related activities across all 774 villages.</p></div><span class="timezone">IST · ${d.generatedAt ? formatDate(d.generatedAt) : 'Not available'}</span></div>
    ${!sourceReady ? `<section class="setup-banner">${icon('link')}<div><strong>Connect the district data sources to begin monitoring.</strong><p>No operational values are shown until data sources are synchronized.</p></div><button data-action="open-source-modal">Connect source</button></section>` : !d.hasMasterData ? `<section class="setup-banner">${icon('warning')}<div><strong>Partial source coverage: ${progressCount} real village-progress records are synchronized.</strong><p>The complete Village Master source is not connected.</p></div><button data-view-link="sources">Add Village Master</button></section>` : ''}
    <section class="kpi-grid" aria-label="Primary monitoring indicators">
      ${kpiCard('Total villages', d.kpis.totalVillages || d.kpis.total, 'Master universe (27 Mandals)', 'primary', 'all', has)}
      ${kpiCard('GT completed', d.kpis.gtCompleted, 'Ground Truthing verified', 'completed', 'gt_status', has, 'stageField')}
      ${kpiCard('In progress', d.kpis.inProgress, 'Active resurvey workflow', 'pending', 'In Progress', has)}
      ${kpiCard('Final RoR completed', d.kpis.finalRorCompleted || d.kpis.completed, 'RoR 1(B) records finalized', 'completed', 'final_ror_status', has, 'stageField')}
      ${kpiCard('Delayed villages', d.kpis.delayed, 'Milestone target delayed', 'delayed', 'Delayed', has)}
      ${kpiCard('PPBs completed', d.kpis.ppbCompleted, 'Pattadar passbooks issued', 'completed', 'ppb_status', has, 'stageField')}
    </section>

    <section class="section-card khata-directive-card">
      <div class="section-header">
        <div>
          <h3>Joint Collector Directive · Khata Reconciliation</h3>
          <p>Continuous monitoring of Patta, Government, and Notional Khatas across Resurvey villages (RSDT, MLSO & VRO submissions).</p>
        </div>
        <span class="section-meta">LIVE PROFORMA</span>
      </div>
      <div class="khata-metrics-grid">
        <div class="khata-metric-box">
          <span class="khata-metric-label">Patta Land Khatas</span>
          <b class="khata-metric-val">${Number(d.kpis.pattaKhatas || 0).toLocaleString()}</b>
          <small>Private holdings reported</small>
        </div>
        <div class="khata-metric-box">
          <span class="khata-metric-label">Government Khatas</span>
          <b class="khata-metric-val">${Number(d.kpis.govtKhatas || 0).toLocaleString()}</b>
          <small>Poramboke / Govt lands</small>
        </div>
        <div class="khata-metric-box">
          <span class="khata-metric-label">Both Patta & Dkt</span>
          <b class="khata-metric-val">${Number(d.kpis.bothKhatas || 0).toLocaleString()}</b>
          <small>Joint / Notional Khatas</small>
        </div>
        <div class="khata-metric-box">
          <span class="khata-metric-label">Proposed Deletions</span>
          <b class="khata-metric-val">${Number(d.kpis.deletions || 0).toLocaleString()}</b>
          <small>Flagged for removal</small>
        </div>
        <div class="khata-metric-box">
          <span class="khata-metric-label">Reconciled Khatas</span>
          <b class="khata-metric-val">${Number(d.kpis.totalKhatas || 0).toLocaleString()}</b>
          <small>Total Proforma Khatas</small>
        </div>
        <div class="khata-metric-box">
          <span class="khata-metric-label">Khatas as per Online</span>
          <b class="khata-metric-val">${Number(d.kpis.onlineKhatas || 0).toLocaleString()}</b>
          <small>Webland portal records</small>
        </div>
      </div>
    </section>

    <section class="section-card workflow-card"><div class="section-header"><div><h3>Sequential Workflow Progress</h3><p>Completion is calculated from actual stage statuses across all 10 stages.</p></div><span class="section-meta">774 VILLAGES</span></div>
      <div class="workflow-steps">${d.stageProgress.map(s => { const isAvail = s.available !== undefined ? s.available : (s.completed !== null && s.completed !== undefined); return `<div class="step ${has && isAvail ? (s.completed ? 'completed' : s.reported ? 'pending' : '') : 'no-data'}"><span class="step-dot"></span><div class="step-name" title="${h(s.label)}">${h(s.label)}</div><div class="step-count">${has && s.completed !== null && s.completed !== undefined ? `${s.completed} complete` : 'Not available'}</div><div class="step-percent">${has && s.percent !== null && s.percent !== undefined ? `${s.percent}%` : '—'}</div></div>`; }).join('')}</div>
    </section>
    <div class="body-grid">
      <section class="section-card"><div class="section-header"><div><h3>Today’s officer review</h3><p>Observations are generated directly from district-wide records.</p></div></div><div class="review-list">${d.observations.map((item, index) => `<div class="review-item ${!has ? 'empty' : ''}"><span class="review-bullet ${index === 0 && has ? 'alert' : ''}"></span><p>${h(item)}</p></div>`).join('')}</div></section>
      <section class="section-card"><div class="section-header"><div><h3>Villages requiring attention</h3><p>Overdue villages, highest delay first.</p>${has ? '' : ''}</div>${has ? `<button class="inline-link" data-view-link="villages" data-filter-status="Delayed">View all</button>` : ''}</div>
        ${has && d.attention.length ? `<div class="attention-list">${d.attention.map((v, i) => `<div class="attention-row clickable" data-village="${v.id}"><span class="attention-number">${String(i + 1).padStart(2, '0')}</span><div class="attention-name">${h(v.village_name || 'Village name unavailable')}<small>${h(v.mandal || 'Mandal unavailable')} · ${h(v.phase || 'Phase unavailable')}</small></div><span class="stage-label">${h(v.current_stage)}</span><span class="priority ${v.days_delayed > 14 ? 'high' : ''}">${v.days_delayed > 14 ? 'HIGH' : 'MEDIUM'}</span><span class="days-late">${v.days_delayed}d</span><button class="inline-link" data-village="${v.id}">${icon('arrow')}</button></div>`).join('')}</div>` : emptyBlock('No village attention records', has ? 'No delayed villages currently exceed the alert threshold.' : 'Connect and synchronize progress data to identify villages requiring review.', has ? 'shield' : 'database')}</section>
    </div>
    <div class="performance-grid">
      ${performanceCard('Mandals requiring attention', 'Lowest Final RoR completion, based on all villages in each Mandal.', d.mandals, has, 'mandal')}
      ${performanceCard('Division performance', 'Ranked by Final RoR completion. Click a division for its villages.', d.divisions, has, 'division')}
    </div>
    <section class="section-card"><div class="section-header"><div><h3>Phase progress</h3><p>Phase-wise village completion and pending workload.</p></div>${has ? `<button class="inline-link" data-view-link="performance">View performance</button>` : ''}</div>${phaseCells(d.phases, has)}</section>
    <div class="performance-grid" style="margin-top:20px">
      <section class="section-card"><div class="section-header"><div><h3>Current bottleneck</h3><p>Stage with the largest pending workload.</p></div></div>${d.bottleneck && has ? `<div class="bottleneck-body"><div class="bottleneck-header-row"><div class="bottleneck-stage-name">${h(d.bottleneck.label)}</div><span class="bottleneck-pending-badge">${d.bottleneck.pending} pending villages</span></div><div class="bottleneck-bar" title="${100 - (d.bottleneck.percent || 0)}% pendency"><i style="width:${Math.max(4, 100 - (d.bottleneck.percent || 0))}%"></i></div><div class="bottleneck-footer-row"><span>Stage completion rate</span><strong>${d.bottleneck.percent ?? 0}% completed</strong></div></div>` : emptyBlock('Workflow data not available', 'The bottleneck will appear after stage progress is synchronized.', 'chart')}</section>
      <section class="section-card"><div class="section-header"><div><h3>Data quality</h3><p>Records requiring verification.</p></div>${has ? `<button class="inline-link" data-view-link="quality">Review issues</button>` : ''}</div><div class="data-grid">${qualityCells(d.quality, has)}</div></section>
    </div>`;
}
function performanceCard(title, note, rows, has, type) { return `<section class="section-card"><div class="section-header"><div><h3>${title}</h3><p>${note}</p></div>${has ? `<button class="inline-link" data-view-link="performance">View all</button>` : ''}</div>${has && rows.length ? `<table class="performance-table"><thead><tr><th>${type === 'mandal' ? 'MANDAL' : 'DIVISION'}</th><th>VILLAGES</th><th>FINAL ROR</th><th>PENDING</th><th>DELAYED</th></tr></thead><tbody>${rows.slice(0, 5).map(r => `<tr data-drill-type="${type}" data-drill-value="${h(r.name)}"><td>${h(r.name)}</td><td class="mono">${r.total}</td><td><div class="progress-cell"><span class="progress-bar"><i style="width:${r.final_ror_status || 0}%"></i></span><b>${formatPct(r.final_ror_status)}</b></div></td><td class="mono">${r.pending}</td><td class="mono">${r.delayed}</td></tr>`).join('')}</tbody></table><div class="section-footer"><button class="inline-link" data-view-link="villages">Open village records ${icon('arrow')}</button></div>` : emptyBlock('Performance data not available', 'Rollups are calculated after the village master and progress data are connected.', 'chart')}</section>`; }
function phaseCells(rows, has) { if (!has || !rows.length) return `<div class="phase-strip"><div class="phase-cell empty"><div class="phase-name">PHASE DATA</div><div class="phase-values"><span>Total<b>—</b></span><span>Completed<b>—</b></span><span>Pending<b>—</b></span></div></div></div>`; return `<div class="phase-strip">${rows.map(r => `<button class="phase-cell" data-phase="${h(r.name)}"><div class="phase-name">${h(r.name)}</div><div class="phase-values"><span>Total<b>${r.total}</b></span><span>Completed<b>${r.completed}</b></span><span>Pending<b>${r.pending}</b></span></div></button>`).join('')}</div>`; }
function qualityCells(q, has) { const cells = [['Duplicate codes', q.duplicateVillageCodes], ['Missing village codes', q.missingVillageCodes], ['Missing target dates', q.missingTargetDates], ['Workflow conflicts', q.workflowConflicts], ['Missing Mandal', q.missingMandal], ['Missing Division', q.missingDivision]]; return cells.map(([label, value]) => `<button class="quality-item ${has && value ? 'alert' : ''}" ${has ? 'data-view-link="quality"' : 'disabled'}><span>${label}</span><b>${noValue(value, has)}</b></button>`).join(''); }
function renderVillageMonitoring() {
  const has = state.dashboard && state.dashboard.hasData;
  const f = state.filterOptions || {};
  const active = state.villageFilters || {};

  const activeStageCount = ['current_stage', ...STAGE_KEYS].filter(k => Boolean(active[k])).length;

  const quickPills = [
    { id: 'all', label: 'All Villages', count: 774 },
    { id: 'phase:Phase 1', label: 'Phase 1', count: 27 },
    { id: 'phase:Phase 2', label: 'Phase 2', count: 36 },
    { id: 'phase:Phase 3', label: 'Phase 3', count: 14 },
    { id: 'phase:Phase 4', label: 'Phase 4', count: 101 },
    { id: 'phase:Phase 5', label: 'Phase 5', count: 60 },
    { id: 'phase:Phase 6', label: 'Phase 6', count: 92 },
    { id: 'phase:Phase 7', label: 'Phase 7', count: 91 },
    { id: 'delayed:true', label: '⚠️ Overdue Villages', count: state.dashboard?.kpis?.delayed ?? 16, alert: true },
    { id: 'stage:Final RoR', label: '✅ Final RoR Ready', count: state.dashboard?.kpis?.completed ?? 33, success: true }
  ];

  function isPillActive(pId) {
    if (pId === 'all') {
      return !active.phase && !active.delayed && !active.status && !active.stage && !active.current_stage;
    }
    const [k, v] = pId.split(':');
    if (k === 'phase') return active.phase === v;
    if (k === 'delayed') return active.delayed === 'true' || active.status === 'Delayed';
    if (k === 'stage') return active.stage === v || active.current_stage === v;
    return false;
  }

  root.innerHTML = `
    <div class="content-heading">
      <div>
        <h3>Village Monitoring & Land Records</h3>
        <p>Citizen-friendly tracker across all 774 revenue villages in Chittoor district.</p>
      </div>
      <div class="content-actions">
        <button class="outline-button" data-action="export-csv">${icon('download')} Export CSV</button>
      </div>
    </div>

    <div class="quick-pills-bar">
      <span style="font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;margin-right:2px;">Quick View:</span>
      ${quickPills.map(p => `
        <button class="quick-pill ${isPillActive(p.id) ? 'active' : ''} ${p.alert ? 'alert' : ''} ${p.success ? 'success' : ''}" data-quick-filter="${p.id}">
          ${h(p.label)} <span class="pill-count">${p.count}</span>
        </button>
      `).join('')}
    </div>

    <div class="filters">
      <div class="search-box">
        ${icon('search')}
        <input id="village-search" value="${h(active.search || '')}" placeholder="Search Village Name, Code, or Mandal..." />
      </div>
      ${selectFilter('phase', 'All Phases', f.phases, active.phase)}
      ${selectFilter('division', 'All Divisions', f.divisions, active.division)}
      ${selectFilter('mandal', 'All Mandals', f.mandals, active.mandal)}
      ${selectFilter('status', 'All Statuses', ['Completed', 'Pending', 'Delayed', 'In Progress', 'Not Started'], active.status)}
      <button class="adv-filter-toggle ${state.advancedFilterOpen ? 'active' : ''}" data-action="toggle-adv-filter">
        ${icon('filter')} ⚡ Workflow Stage Filters ${activeStageCount > 0 ? `<span class="pill-count" style="background:#fff;color:var(--blue);padding:1px 6px;border-radius:10px;margin-left:4px;">${activeStageCount}</span>` : ''}
      </button>
      <span class="filter-count">${has ? `${state.villages.length} village record${state.villages.length === 1 ? '' : 's'}` : 'No records available'}</span>
    </div>

    ${state.advancedFilterOpen ? `
      <div class="adv-filter-drawer">
        <div class="adv-filter-header">
          <h4>${icon('filter')} Stage & Bottleneck Analysis Filters</h4>
          <button class="outline-button" style="padding:4px 8px;font-size:10px;" data-action="toggle-adv-filter">✕ Close Drawer</button>
        </div>
        <div class="adv-filter-grid">
          <div class="filter-field-box">
            <label>Current Resurvey Stage</label>
            ${selectFilter('current_stage', 'All Current Stages', (f.stages || ['GT', 'Vectorization', 'VS Login', 'VRO Login', 'Tahsildar Login', 'RDO Login', 'JC Login', 'Section 13', 'Draft RoR', 'Final RoR', 'Completed']), active.current_stage)}
          </div>
          <div class="filter-field-box">
            <label>1. Ground Truthing (GT)</label>
            ${selectFilter('gt_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.gt_status)}
          </div>
          <div class="filter-field-box">
            <label>2. Digital Vectorization</label>
            ${selectFilter('vectorization_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.vectorization_status)}
          </div>
          <div class="filter-field-box">
            <label>3. Secretariat (VS)</label>
            ${selectFilter('vs_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.vs_status)}
          </div>
          <div class="filter-field-box">
            <label>4. VRO Verification</label>
            ${selectFilter('vro_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.vro_status)}
          </div>
          <div class="filter-field-box">
            <label>5. Tahsildar Approval</label>
            ${selectFilter('tahsildar_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.tahsildar_status)}
          </div>
          <div class="filter-field-box">
            <label>6. RDO Review</label>
            ${selectFilter('rdo_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.rdo_status)}
          </div>
          <div class="filter-field-box">
            <label>7. Final RoR 1(B)</label>
            ${selectFilter('final_ror_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.final_ror_status)}
          </div>
          <div class="filter-field-box">
            <label>8. Passbooks (PPB)</label>
            ${selectFilter('ppb_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.ppb_status)}
          </div>
        </div>
        <div class="adv-filter-foot">
          <button class="clear-all-link" data-action="clear-stage-filters">Reset Stage Filters</button>
          <button class="primary-button" data-action="toggle-adv-filter">Done</button>
        </div>
      </div>
    ` : ''}

    ${renderActiveChips(active)}

    <section class="section-card data-table-card">
      ${has ? villageTable(state.villages) : emptyBlock('Village master data is not available', 'The 774-village monitoring universe will appear here after the master source is synchronized.', 'map')}
    </section>
  `;
}

function renderActiveChips(active) {
  const chips = [];
  if (active.search) chips.push({ key: 'search', label: `Search: "${active.search}"` });
  if (active.phase) chips.push({ key: 'phase', label: `Phase: ${active.phase}` });
  if (active.division) chips.push({ key: 'division', label: `Division: ${active.division}` });
  if (active.mandal) chips.push({ key: 'mandal', label: `Mandal: ${active.mandal}` });
  if (active.status) chips.push({ key: 'status', label: `Status: ${active.status}` });
  if (active.current_stage) chips.push({ key: 'current_stage', label: `Stage: ${active.current_stage}` });
  if (active.delayed === 'true') chips.push({ key: 'delayed', label: `Overdue / Delayed` });

  STAGE_KEYS.forEach(k => {
    if (active[k]) chips.push({ key: k, label: `${k.replace('_status', '').toUpperCase()}: ${active[k]}` });
  });

  if (!chips.length) return '';
  return `
    <div class="active-chips-strip">
      <span style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;">Active Filters:</span>
      ${chips.map(c => `<span class="active-chip">${h(c.label)} <button data-clear-chip="${c.key}" title="Remove filter">✕</button></span>`).join('')}
      <button class="clear-all-link" data-action="clear-all-filters">Clear all filters</button>
    </div>
  `;
}

function selectFilter(key, label, options = [], selected = '') {
  return `<select class="filter-select" data-filter="${key}"><option value="">${label}</option>${options.map(v => `<option ${v === selected ? 'selected' : ''} value="${h(v)}">${h(v)}</option>`).join('')}</select>`;
}

function villageTable(rows) {
  if (!rows.length) return `<div class="table-empty">${emptyBlock('No villages match these filters', 'Clear or change filters to view village records.', 'search')}</div>`;
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>CODE</th>
          <th>VILLAGE NAME</th>
          <th>MANDAL</th>
          <th>DIVISION</th>
          <th>PHASE</th>
          <th>EXTENT (AC)</th>
          <th>KHATAS</th>
          <th>CURRENT RESURVEY STAGE</th>
          <th>OVERALL STATUS</th>
          <th>ACTION</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(v => `
          <tr class="clickable" data-village="${v.id}">
            <td class="mono">${h(v.village_code || '—')}</td>
            <td class="village-name" style="font-weight:800;color:var(--navy);">${h(v.village_name || 'Village name unavailable')}</td>
            <td>${h(v.mandal || '—')}</td>
            <td>${h(v.division || '—')}</td>
            <td><span class="phase-card-badge" style="font-size:9px;padding:2px 7px;">${h(v.phase || '—')}</span></td>
            <td class="mono">${v.extent ? `${h(v.extent)}` : '—'}</td>
            <td class="mono">${v.total_khatas ?? v.khatas ?? '—'}</td>
            <td>
              <span class="stage-label" style="font-weight:700;color:var(--ink);background:#f1f5f9;padding:3px 8px;border-radius:4px;border:1px solid #e2e8f0;display:inline-block;">
                ${h(v.current_stage || 'Not Started')}
              </span>
            </td>
            <td><span class="status-pill ${statusClass(v.status)}">${h(v.status)}</span></td>
            <td>
              <button class="inline-link" data-village="${v.id}" style="font-weight:800;">
                Track →
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderPerformance() {
  const d = state.dashboard;
  const has = d && d.hasData;

  root.innerHTML = `
    <div class="content-heading">
      <div>
        <h3>Multi-Page District Analytics Hub</h3>
        <p>Comprehensive, citizen-convenient analysis of Chittoor District resurvey across Phases, Divisions, and Workflow Stages.</p>
      </div>
    </div>

    <div class="analysis-tabs-nav">
      <button class="analysis-tab-btn ${state.analysisTab === 'phases' ? 'active' : ''}" data-analysis-tab="phases">
        ${icon('map')} 📍 Phase-Wise Progress
      </button>
      <button class="analysis-tab-btn ${state.analysisTab === 'divisions' ? 'active' : ''}" data-analysis-tab="divisions">
        ${icon('chart')} 🏛️ Division & Mandal Hub
      </button>
      <button class="analysis-tab-btn ${state.analysisTab === 'stages' ? 'active' : ''}" data-analysis-tab="stages">
        ${icon('shield')} ⚡ 10-Stage Workflow Journey
      </button>
      <button class="analysis-tab-btn ${state.analysisTab === 'matrix' ? 'active' : ''}" data-analysis-tab="matrix">
        ${icon('document')} 📋 Executive Summary Matrix
      </button>
    </div>

    ${!has ? emptyBlock('Performance data not available', 'Connect and synchronize village master records first.', 'chart') :
      state.analysisTab === 'phases' ? renderPhaseAnalysis(d) :
      state.analysisTab === 'divisions' ? renderDivisionAnalysis(d) :
      state.analysisTab === 'stages' ? renderStageAnalysis(d) :
      renderMatrixAnalysis(d)
    }
  `;
}

function renderPhaseAnalysis(d) {
  const phases = d.phases || [];
  return `
    <div class="analysis-intro-box">
      <div>
        <h3>📍 Government Phase-Wise Resurvey Tracking</h3>
        <p>The resurvey across Chittoor district is scheduled across 7 government phases, plus remaining unscheduled villages. Click any phase to inspect its villages.</p>
      </div>
      <button class="outline-button" data-view-link="villages">${icon('arrow')} View All 774 Villages</button>
    </div>

    <div class="phase-deep-grid">
      ${phases.map(p => `
        <div class="phase-deep-card">
          <div>
            <div class="phase-card-top">
              <span class="phase-card-badge ${p.pending === 0 ? 'completed' : 'pending'}">${h(p.name)}</span>
              <span style="font-size:10.5px;color:var(--muted);font-weight:700;">${p.mandals_count || (p.mandals && p.mandals.length) || 0} Mandals</span>
            </div>
            <div class="phase-card-vcount">
              ${p.total} <small>villages</small>
            </div>
            <div class="phase-card-stats">
              <div>
                <span>FINAL ROR READY</span>
                <b style="color:var(--teal);">${p.completed}</b>
              </div>
              <div>
                <span>PENDING WORKFLOW</span>
                <b style="color:var(--orange);">${p.pending}</b>
              </div>
              <div>
                <span>TOTAL EXTENT</span>
                <b>${p.extent ? `${p.extent} Ac` : '—'}</b>
              </div>
              <div>
                <span>OVERDUE / DELAYED</span>
                <b style="${p.delayed > 0 ? 'color:var(--red);' : ''}">${p.delayed}</b>
              </div>
            </div>
            <div class="phase-card-bar-label">
              <span>Final RoR Completion</span>
              <b>${formatPct(p.final_ror_status)}</b>
            </div>
            <div class="progress-bar" style="height:6px;">
              <i style="width:${p.final_ror_status || 0}%;"></i>
            </div>
          </div>
          <button class="phase-card-action-btn" data-filter-phase="${h(p.name)}">
            ${icon('search')} View ${h(p.name)} Villages (${p.total}) →
          </button>
        </div>
      `).join('')}
    </div>

    <section class="section-card">
      <div class="section-header">
        <div>
          <h3>Consolidated Phase Comparison Table</h3>
          <p>Key milestone percentages across all 7 phases and unscheduled villages.</p>
        </div>
      </div>
      <table class="performance-table">
        <thead>
          <tr>
            <th>PHASE</th>
            <th>VILLAGES</th>
            <th>EXTENT (AC)</th>
            <th>KHATAS</th>
            <th>GT %</th>
            <th>VECTORIZATION %</th>
            <th>VRO %</th>
            <th>RDO %</th>
            <th>FINAL ROR %</th>
            <th>PPB %</th>
            <th>DELAYED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${phases.map(p => `
            <tr>
              <td style="font-weight:800;color:var(--navy);">${h(p.name)}</td>
              <td class="mono"><b>${p.total}</b></td>
              <td class="mono">${p.extent ? `${p.extent}` : '—'}</td>
              <td class="mono">${p.khatas ?? '—'}</td>
              <td class="mono">${formatPct(p.gt_status)}</td>
              <td class="mono">${formatPct(p.vectorization_status)}</td>
              <td class="mono">${formatPct(p.vro_status)}</td>
              <td class="mono">${formatPct(p.rdo_status)}</td>
              <td class="mono"><b style="color:var(--teal);">${formatPct(p.final_ror_status)}</b></td>
              <td class="mono">${formatPct(p.ppb)}</td>
              <td class="mono" style="${p.delayed > 0 ? 'color:var(--red);font-weight:800;' : ''}">${p.delayed}</td>
              <td>
                <button class="inline-link" data-filter-phase="${h(p.name)}">
                  View Villages →
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderDivisionAnalysis(d) {
  const divisions = d.divisions || [];
  const query = (state.mandalSearch || '').trim().toLowerCase();
  const mandals = (d.mandals || []).filter(m => !query || m.name.toLowerCase().includes(query) || (m.division && m.division.toLowerCase().includes(query)));

  return `
    <div class="analysis-intro-box">
      <div>
        <h3>🏛️ Revenue Division & Mandal Resurvey Performance</h3>
        <p>Comparative progress across Chittoor, Kuppam, Nagari, and Palamaner revenue divisions and their 27 composite mandals.</p>
      </div>
    </div>

    <div class="div-summary-grid">
      ${divisions.map(div => `
        <div class="div-summary-card">
          <h4 class="div-summary-title">${h(div.name)} Division</h4>
          <p class="div-summary-sub">${div.mandals_count || 0} Mandals Covered</p>
          <span class="div-summary-num">${div.total} <small style="font-size:12px;color:var(--muted);font-weight:600;">villages</small></span>
          <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px;">
            <span>Final RoR: <b>${formatPct(div.final_ror_status)}</b></span>
            <span>Pending: <b>${div.pending}</b></span>
          </div>
          <div class="progress-bar" style="height:5px;margin-bottom:12px;">
            <i style="width:${div.final_ror_status || 0}%;"></i>
          </div>
          <button class="phase-card-action-btn" data-drill-type="division" data-drill-value="${h(div.name)}">
            View ${h(div.name)} Villages →
          </button>
        </div>
      `).join('')}
    </div>

    <section class="section-card">
      <div class="section-header">
        <div>
          <h3>27-Mandal Comprehensive Ranking Table</h3>
          <p>Sorted by Final RoR progress. Use search to find your specific Mandal instantly.</p>
        </div>
        <div class="mandal-search-bar">
          ${icon('search')}
          <input id="mandal-search-input" value="${h(state.mandalSearch || '')}" placeholder="Search Mandal name..." />
        </div>
      </div>
      <table class="performance-table">
        <thead>
          <tr>
            <th>RANK</th>
            <th>MANDAL NAME</th>
            <th>DIVISION</th>
            <th>VILLAGES</th>
            <th>FINAL ROR PROGRESS</th>
            <th>GT %</th>
            <th>VECTORIZATION %</th>
            <th>PENDING</th>
            <th>DELAYED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${mandals.map((m, idx) => {
            const rankBadge = (m.final_ror_status >= 10) ? 'good' : (m.final_ror_status > 0) ? 'warn' : 'alert';
            return `
              <tr data-drill-type="mandal" data-drill-value="${h(m.name)}">
                <td class="mono"><span class="mandal-rank-badge ${rankBadge}">#${idx + 1}</span></td>
                <td style="font-weight:800;color:var(--navy);">${h(m.name)}</td>
                <td>${h(m.division || '—')}</td>
                <td class="mono"><b>${m.total}</b></td>
                <td>
                  <div class="progress-cell">
                    <span class="progress-bar"><i style="width:${m.final_ror_status || 0}%"></i></span>
                    <b>${formatPct(m.final_ror_status)}</b>
                  </div>
                </td>
                <td class="mono">${formatPct(m.gt_status)}</td>
                <td class="mono">${formatPct(m.vectorization_status)}</td>
                <td class="mono">${m.pending}</td>
                <td class="mono" style="${m.delayed > 0 ? 'color:var(--red);font-weight:800;' : ''}">${m.delayed}</td>
                <td>
                  <button class="inline-link" data-drill-type="mandal" data-drill-value="${h(m.name)}">
                    Villages →
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderStageAnalysis(d) {
  const stages = d.stageDetails || [];
  return `
    <div class="analysis-intro-box">
      <div>
        <h3>⚡ 10-Step Sequential Resurvey Workflow Journey</h3>
        <p>Clear, citizen-friendly walkthrough of each statutory step in the Andhra Pradesh Resurvey Programme, with accountable revenue tiers and active backlogs.</p>
      </div>
    </div>

    <div class="stage-pipeline-grid">
      ${stages.map(s => `
        <div class="stage-step-card">
          <div>
            <div class="stage-step-top">
              <span class="stage-num-badge">STEP ${s.stageNumber} OF 10</span>
              <span class="tier-tag">${icon('shield')} ${h(s.responsibleTier)}</span>
            </div>
            <h4 class="stage-step-title">${h(s.label)}</h4>
            <p class="stage-step-desc">${h(s.description)}</p>

            <div class="stage-step-counts">
              <div>
                <span>CLEARED</span>
                <b class="cleared">${s.cleared}</b>
                <small style="font-size:9px;color:var(--muted);">${s.clearedPercent}%</small>
              </div>
              <div>
                <span>WAITING HERE</span>
                <b class="active">${s.activeAtStage}</b>
              </div>
              <div>
                <span>OVERDUE</span>
                <b class="delayed">${s.delayedAtStage}</b>
              </div>
            </div>

            <div class="div-backlog-strip">
              <span>Backlog by Revenue Division:</span>
              <div class="div-backlog-pills">
                ${Object.entries(s.divisionBacklog || {}).map(([dName, cnt]) => `
                  <span>${h(dName)}: <b>${cnt}</b></span>
                `).join('')}
              </div>
            </div>
          </div>

          <button class="phase-card-action-btn" data-filter-stage="${h(s.label)}">
            ${icon('filter')} Filter Villages at this Stage (${s.activeAtStage}) →
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderMatrixAnalysis(d) {
  const divisions = d.divisions || [];
  const phases = d.phases || [];
  const km = d.khataMetrics || {};

  return `
    <div class="analysis-intro-box">
      <div>
        <h3>📋 Executive Summary & Cross-Tabulation Matrix</h3>
        <p>Distribution of all 774 villages across Revenue Divisions and Government Phases, alongside district-wide Khata proforma totals.</p>
      </div>
    </div>

    <div class="khata-metrics-grid" style="margin-bottom:20px;">
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">TOTAL RESURVEY EXTENT</span>
        <span class="khata-metric-val">${km.extent ? `${km.extent} Ac` : '—'}</span>
        <small>Total geographical area</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">PATTA KHATAS</span>
        <span class="khata-metric-val">${km.patta_khatas ?? '—'}</span>
        <small>Private agricultural landholders</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">GOVERNMENT KHATAS</span>
        <span class="khata-metric-val">${km.govt_khatas ?? '—'}</span>
        <small>Govt / Poramboke parcels</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">BOTH PATTA & DKT</span>
        <span class="khata-metric-val">${km.both_khatas ?? '—'}</span>
        <small>Mixed titlehold parcels</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">ONLINE KHATAS</span>
        <span class="khata-metric-val">${km.online_khatas ?? '—'}</span>
        <small>Digitized Webland records</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">TOTAL KHATAS</span>
        <span class="khata-metric-val">${km.total_khatas ?? '—'}</span>
        <small>District monitoring total</small>
      </div>
    </div>

    <section class="section-card">
      <div class="section-header">
        <div>
          <h3>Division × Phase Cross-Tabulation Matrix (Villages)</h3>
          <p>Distribution of the 774-village universe across the 4 Divisions and 7 Phases + Unscheduled.</p>
        </div>
      </div>
      <div class="matrix-table-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th>DIVISION</th>
              ${phases.map(p => `<th>${h(p.name)}</th>`).join('')}
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${divisions.map(div => {
              let divTotal = 0;
              return `
                <tr>
                  <td>${h(div.name)} Division</td>
                  ${phases.map(p => {
                    const cnt = (state.villages || []).filter(v => v.division === div.name && v.phase === p.name).length;
                    divTotal += cnt;
                    return `<td class="${cnt > 0 ? 'matrix-highlight' : ''}">${cnt}</td>`;
                  }).join('')}
                  <td><b>${divTotal}</b></td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td><b>DISTRICT TOTAL</b></td>
              ${phases.map(p => `<td><b>${p.total}</b></td>`).join('')}
              <td><b>${d.villageRecordCount || 774}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function renderQuality() {
  const d = state.dashboard; const has = d.hasData;
  root.innerHTML = `<div class="content-heading"><div><h3>Data quality & reconciliation</h3><p>Source-record checks are performed automatically after every synchronization.</p></div>${has ? `<button class="outline-button" data-action="view-conflicts">${icon('warning')} Review conflicts</button>` : ''}</div>
  <div class="split-grid"><section class="section-card"><div class="section-header"><div><h3>Data quality checks</h3><p>Each issue count is derived from the monitoring universe.</p></div></div><div class="quality-big">${qualityCells(d.quality, has)}</div></section>
  <section class="section-card"><div class="section-header"><div><h3>Data reconciliation required</h3><p>Website and source-sheet values are never silently overwritten.</p></div></div>${d.conflicts.length ? `<div class="attention-list">${d.conflicts.map(c => `<div class="review-item"><span class="review-bullet alert"></span><p><b>${h(c.village)}</b> — ${h(c.field)} differs between Website and ${h(c.source)}.<br><small>Website: ${h(c.websiteValue)} · Sheet: ${h(c.sheetValue)}</small></p><button class="inline-link" data-conflict="${c.id}">Review</button></div>`).join('')}</div>` : emptyBlock('No open reconciliation items', has ? 'No source conflicts were identified in the synchronized data.' : 'Conflicts can be assessed after data is synchronized.', 'shield')}</section></div>
  <section class="section-card" style="margin-top:20px"><div class="section-header"><div><h3>Field-source traceability</h3><p>Each imported field retains its source sheet, tab, row and synchronization timestamp.</p></div></div><div class="empty-compact">${has ? 'Open a village record to inspect its source traceability and workflow data.' : 'No source metadata is available until real sheets are connected.'}</div></section>`;
}
function renderReports() { const has = state.dashboard.hasData; const reports = [['District summary', 'A consolidated district snapshot of workflow progress and review priorities.'], ['Division-wise report', 'Completion, pending and delayed villages by division.'], ['Mandal-wise report', 'Standardized Mandal-level performance and bottleneck detail.'], ['Village-wise report', 'Traceable village records with current workflow stage and target status.'], ['Delayed villages', 'Prioritized overdue villages for officer review.'], ['Data quality report', 'Duplicate, missing and workflow integrity checks.']]; root.innerHTML = `<div class="content-heading"><div><h3>Reports</h3><p>Exports use only the latest synchronized data and standardized Mandal names.</p></div></div><div class="report-grid">${reports.map(([name, note]) => `<section class="report-card"><div class="report-icon">${icon('document')}</div><h4>${name}</h4><p>${note}</p><button class="outline-button" data-action="export-csv" ${has ? '' : 'disabled'}>${icon('download')} CSV export</button></section>`).join('')}</div><section class="section-card" style="margin-top:20px"><div class="section-header"><div><h3>Export controls</h3><p>Excel and PDF layouts can be connected to the district reporting service.</p></div></div><div class="empty-compact">${has ? 'CSV export is available. Configure the reporting service for signed Excel and PDF generation in production.' : 'Report exports will become available after the data sources are synchronized.'}</div></section>`; }
async function loadSources() { const data = await api('/api/sources'); state.sources = data.sources; state.defaultMappings = data.defaultMappings; }
function renderSources() {
  const sources = state.sources; root.innerHTML = `<div class="content-heading"><div><h3>Data sources</h3><p>Configure Google Sheets connections, mappings and synchronization frequency.</p></div><div class="content-actions"><button class="outline-button" data-action="sync-all">${icon('refresh')} Refresh all</button><button class="primary-button" data-action="open-source-modal">${icon('plus')} Add data source</button></div></div>
 <section class="section-card sources-card">${sources.length ? `<table class="source-table"><thead><tr><th>SOURCE</th><th>GOOGLE SHEET</th><th>TAB / PURPOSE</th><th>DIRECTION</th><th>LAST / NEXT SYNC</th><th>STATUS</th><th></th></tr></thead><tbody>${sources.map(s => `<tr><td><span class="source-name">${h(s.name)}</span></td><td><div class="source-url">${h(s.spreadsheetId)}</div></td><td>${h(s.tab)}<div class="source-purpose">${h(s.purpose || 'Purpose not specified')}</div></td><td><span class="mono">${h(s.direction)}</span></td><td class="mono">${s.lastSync ? h(formatDate(s.lastSync)) : 'Not synchronized'}<div class="source-purpose">Next: ${s.nextSync ? h(formatDate(s.nextSync)) : 'after first sync'}</div></td><td><span class="tiny-status ${statusClass(s.status)}">● ${h(s.status)}</span>${s.lastError ? `<div class="source-purpose" title="${h(s.lastError)}">Last synchronized data retained</div>` : ''}</td><td><div class="row-actions"><button class="row-action" data-source-sync="${s.id}">Refresh</button><button class="row-action" data-source-test="${s.id}">Test</button><button class="row-action" data-source-edit="${s.id}">Edit</button></div></td></tr>`).join('')}</tbody></table>` : emptyBlock('No Google Sheets sources configured', 'Add the Village Master source first, then add progress, PPB, targets and resource sources. Credentials remain on the server.', 'database')}</section>
 <section class="section-card sync-log"><div class="section-header"><div><h3>Mandal name standardization</h3><p>Confirmed aliases are normalized before filtering, grouping, ranking, reporting and synchronization.</p></div><button class="outline-button" data-action="open-alias-modal">${icon('plus')} Add alias</button></div><div class="empty-compact">Gudupalle → Gudipalle · Palamaneru / Palmaner → Palamaner · V Kota → Venkatagirikota · additional aliases can be maintained by an administrator.</div></section>
 <section class="section-card sync-log"><div class="section-header"><div><h3>Synchronization history</h3><p>Source errors do not stop other sources from using their last successfully synchronized data.</p></div></div><div id="sync-log-body">${emptyBlock('Loading sync history', '')}</div></section>`; loadSyncHistory();
}
async function loadSyncHistory() { try { const data = await api('/api/sync-history'); const target = $('#sync-log-body'); if (!target) return; target.innerHTML = data.logs.length ? `<table class="performance-table log-table"><thead><tr><th>DATE / TIME</th><th>SOURCE</th><th>READ</th><th>ADDED</th><th>UPDATED</th><th>CHANGED</th><th>ERRORS</th><th>STATUS</th></tr></thead><tbody>${data.logs.slice(0, 10).map(log => `<tr><td class="mono">${h(formatDate(log.dateTime))}</td><td>${h(log.source)}</td><td class="mono">${log.recordsRead}</td><td class="mono">${log.recordsAdded}</td><td class="mono">${log.recordsUpdated}</td><td class="mono">${log.recordsChanged}</td><td class="mono">${log.errors}</td><td><span class="tiny-status ${statusClass(log.status)}">${h(log.status)}</span></td></tr>`).join('')}</tbody></table>` : emptyBlock('No synchronization activity yet', 'Source activity will be recorded here after a connection is tested or refreshed.', 'history'); } catch (e) { console.error(e); } }
async function renderAudit() { root.innerHTML = `<div class="content-heading"><div><h3>Audit history</h3><p>Every website-originated authorized update is recorded with its source and sync state.</p></div></div><section class="section-card"><div class="section-header"><div><h3>Website modifications</h3><p>Changes from Google Sheets are tracked in synchronization history.</p></div></div><div id="audit-body">${emptyBlock('Loading audit history', '')}</div></section>`; try { const d = await api('/api/audit'); const target = $('#audit-body'); target.innerHTML = d.entries.length ? `<table class="performance-table"><thead><tr><th>DATE / TIME</th><th>USER</th><th>VILLAGE</th><th>FIELD</th><th>CHANGE</th><th>SOURCE</th><th>SYNC STATUS</th></tr></thead><tbody>${d.entries.map(e => `<tr><td class="mono">${h(formatDate(e.dateTime))}</td><td>${h(e.user)}</td><td>${h(e.village)}</td><td>${h(e.field)}</td><td class="audit-change"><b>${h(e.oldValue || 'Blank')} → ${h(e.newValue)}</b></td><td>${h(e.source)}</td><td><span class="status-pill pending">${h(e.syncStatus)}</span></td></tr>`).join('')}</tbody></table>` : emptyBlock('No website modifications recorded', 'Updates made by authorized officers will appear here with their write-back status.', 'history'); } catch (e) { toast(e.message, 'error'); } }
function render() { if (state.view === 'dashboard') renderDashboard(); else if (state.view === 'villages') renderVillageMonitoring(); else if (state.view === 'performance') renderPerformance(); else if (state.view === 'quality') renderQuality(); else if (state.view === 'reports') renderReports(); else if (state.view === 'sources') renderSources(); else if (state.view === 'audit') renderAudit(); }
async function loadVillages() { const qs = new URLSearchParams(Object.entries(state.villageFilters).filter(([, v]) => v)); const data = await api(`/api/villages?${qs}`); state.villages = data.villages; state.filterOptions = data.filters; }
function modal(title, subtitle, body, footer = '') { modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><header class="modal-head"><div><h3>${h(title)}</h3>${subtitle ? `<p>${h(subtitle)}</p>` : ''}</div><button class="modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`; }
function closeModal() { modalRoot.innerHTML = ''; }
function sourceModal(source = null) { const s = source || { direction: 'READ ONLY', refreshFrequency: '15 minutes', mappings: state.defaultMappings || {} }; modal(source ? 'Edit data source' : 'Connect Google Sheet source', 'Credentials are configured server-side and are never sent to this browser.', `<form id="source-form"><div class="form-grid"><label class="form-field"><span>Source name</span><input required name="name" value="${h(s.name || '')}" placeholder="e.g. Resurvey Progress" /></label><label class="form-field"><span>Purpose</span><input name="purpose" value="${h(s.purpose || '')}" placeholder="e.g. Village workflow progress" /></label><label class="form-field full"><span>Google Sheet URL or spreadsheet ID</span><input required name="spreadsheetId" value="${h(s.spreadsheetId || s.googleSheet || '')}" placeholder="https://docs.google.com/spreadsheets/d/..." /><small>Use the spreadsheet shared with the backend Google identity.</small></label><label class="form-field"><span>Sheet / tab name</span><input required name="tab" value="${h(s.tab || '')}" placeholder="Progress" /></label><label class="form-field"><span>Synchronization direction</span><select name="direction">${['READ ONLY', 'WRITE ONLY', 'TWO WAY'].map(v => `<option ${s.direction === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="form-field"><span>Refresh frequency</span><select name="refreshFrequency">${['5 minutes', '15 minutes', '30 minutes', '1 hour'].map(v => `<option ${s.refreshFrequency === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="form-field"><span>Field mappings (optional JSON)</span><textarea name="mappings" rows="3" placeholder='{"village_code":"Village Code"}'>${s.mappings && source ? h(JSON.stringify(s.mappings, null, 2)) : ''}</textarea></label></div><div class="mapping-note"><b>Default mapping:</b> Village Code → village_code, Village Name → village_name, Mandal → mandal, division/phase, GT through Final RoR and PPB. Add a source-specific JSON mapping only when the sheet column names differ.</div></form>`, `<button class="soft-button" data-action="close-modal">Cancel</button><button class="primary-button" data-action="save-source" data-source-id="${s.id || ''}">${source ? 'Save changes' : 'Add source'}</button>`); }
function aliasModal() { modal('Add Mandal alias', 'The alias will normalize to the official Mandal name throughout the application.', `<form id="alias-form"><div class="form-grid"><label class="form-field"><span>Source spelling / alias</span><input required name="alias" placeholder="e.g. Palamaneru" /></label><label class="form-field"><span>Standardized Mandal name</span><input required name="standard" placeholder="e.g. Palamaner" /></label></div><div class="mapping-note">Only add aliases that refer to the same Mandal. Do not merge distinct Mandals based solely on similar spelling.</div></form>`, `<button class="soft-button" data-action="close-modal">Cancel</button><button class="primary-button" data-action="save-alias">Save alias</button>`); }
async function openVillage(id) {
  try {
    const v = await api(`/api/villages/${id}`);
    const statusOptions = ['Completed', 'In Progress', 'Pending', 'Delayed', 'Not Started', 'Not Updated'];

    const citizenSteps = [
      { key: 'gt_status', num: 1, title: 'Ground Truthing (GT)', desc: 'Drone aerial boundary survey and physical ground verification by survey field team.', tier: 'Survey Field Team (RSDT / MLSO)' },
      { key: 'vectorization_status', num: 2, title: 'Digital Vectorization', desc: 'Computerized boundary digitization, GIS shapefile plotting, and parcel map generation.', tier: 'GIS Vectorization Team' },
      { key: 'vs_status', num: 3, title: 'Village Secretariat (VS)', desc: 'Secretariat data synchronization, Grama Sabha review, and landholder record verification.', tier: 'Village Secretariat' },
      { key: 'vro_status', num: 4, title: 'VRO Verification', desc: 'Village Revenue Officer field inspection, ownership cross-check with 1B Webland register.', tier: 'Village Revenue Officer (VRO)' },
      { key: 'tahsildar_status', num: 5, title: 'Tahsildar Approval', desc: 'Mandal Revenue Officer statutory scrutiny, discrepancy resolution, and approval.', tier: 'Tahsildar Office' },
      { key: 'rdo_status', num: 6, title: 'RDO Review', desc: 'Sub-divisional revenue officer validation of survey boundaries and khatas.', tier: 'Revenue Divisional Officer (RDO)' },
      { key: 'jc_status', num: 7, title: 'Joint Collector Sanction', desc: 'District Collectorate resurvey validation and administrative approval.', tier: 'Joint Collectorate' },
      { key: 'section13_status', num: 8, title: 'Section 13 Gazette Notice', desc: 'Statutory district gazette notification published for public claims & objections.', tier: 'Revenue Notification Cell' },
      { key: 'draft_ror_status', num: 9, title: 'Draft RoR 1(B)', desc: 'Draft Record of Rights published for public scrutiny and objection hearing.', tier: 'Tahsildar & VRO Field Unit' },
      { key: 'final_ror_status', num: 10, title: 'Final RoR & Passbooks', desc: 'Final Record of Rights confirmed, permanent land title validated, and Pattadar Passbooks issued.', tier: 'SSLR & Collectorate' }
    ];

    const currentStageName = v.current_stage || 'Not Started';
    const activeStep = citizenSteps.find(s => s.title.toLowerCase().includes(currentStageName.toLowerCase()) || currentStageName.toLowerCase().includes(s.title.toLowerCase())) || citizenSteps[0];

    const isComplete = (val) => {
      const s = String(val || '').toLowerCase().trim();
      return s === 'completed' || s === 'true' || s === 'yes' || s === '1' || s === 'done';
    };

    modal(
      `Village Resurvey Tracker · ${v.village_name || 'Village Details'}`,
      `Official Land Record Status for General Citizens & Revenue Officers`,
      `
        <div class="village-profile">
          <div>
            <h4 style="font-size:16px;font-weight:800;color:var(--navy);">${h(v.village_name || 'Village name unavailable')}</h4>
            <p style="font-size:11px;color:var(--muted);margin-top:4px;">
              Village Code: <b>${h(v.village_code || '—')}</b> · Mandal: <b>${h(v.mandal || '—')}</b> · Division: <b>${h(v.division || '—')}</b>
            </p>
          </div>
          <div class="profile-data">
            <span>PHASE<b>${h(v.phase || '—')}</b></span>
            <span>EXTENT<b>${v.extent ? `${h(v.extent)} Ac` : '—'}</b></span>
            <span>TOTAL KHATAS<b>${v.total_khatas ?? v.khatas ?? '—'}</b></span>
            <span>STATUS<b><span class="status-pill ${statusClass(v.status)}">${h(v.status)}</span></b></span>
          </div>
        </div>

        ${(v.patta_khatas != null || v.govt_khatas != null || v.both_khatas != null) ? `
          <div class="khata-badge-strip">
            <span>Patta Khatas: <b>${v.patta_khatas ?? '—'}</b></span>
            <span>Govt Khatas: <b>${v.govt_khatas ?? '—'}</b></span>
            <span>Both Patta & Dkt: <b>${v.both_khatas ?? '—'}</b></span>
            <span>Deletions: <b>${v.deletions ?? '—'}</b></span>
            <span>Online Khatas: <b>${v.online_khatas ?? '—'}</b></span>
          </div>
        ` : ''}

        <div class="citizen-stage-banner">
          <span>CURRENT WORKFLOW MILESTONE</span>
          <h3>Step ${activeStep.num} of 10: ${h(v.current_stage || 'Not Started')}</h3>
          <p>${h(activeStep.desc)}</p>
        </div>

        <div class="citizen-stepper">
          ${citizenSteps.map(step => {
            const val = v[step.key];
            const comp = isComplete(val);
            const isCurr = (step.num === activeStep.num) || (v.current_stage && (step.title.toLowerCase().includes(v.current_stage.toLowerCase()) || v.current_stage.toLowerCase().includes(step.title.toLowerCase())));
            const isDel = isCurr && (v.status === 'Delayed' || Number(v.days_delayed) > 0);
            const rowClass = comp ? 'completed' : isDel ? 'delayed' : isCurr ? 'active' : '';

            return `
              <div class="citizen-step-row ${rowClass}">
                <div class="citizen-step-circle">
                  ${comp ? '✓' : step.num}
                </div>
                <div class="citizen-step-body">
                  <div class="citizen-step-head">
                    <h5>Step ${step.num}: ${h(step.title)}</h5>
                    <span class="status-pill ${statusClass(comp ? 'completed' : val || (isCurr ? 'in-progress' : 'not-started'))}">
                      ${comp ? 'Completed' : h(stageStatus(val || (isCurr ? 'In Progress' : 'Pending')))}
                    </span>
                  </div>
                  <p class="citizen-step-desc">${h(step.desc)}</p>
                  <div class="citizen-step-meta">
                    <span>Accountable Tier: <b>${h(step.tier)}</b></span>
                    ${v.target_date ? `<span>Target: <b>${h(v.target_date)}</b></span>` : ''}
                    ${isDel && v.days_delayed ? `<span style="color:var(--red);font-weight:700;">⚠️ ${v.days_delayed} days overdue</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="citizen-officer-box">
          <button type="button" class="citizen-officer-toggle" data-officer-toggle="true">
            <span>⚙️ Authorized Officer Controls & Stage Status Overrides</span>
            <span>▼</span>
          </button>
          <div id="officer-updates-section" class="officer-updates-body">
            <p style="font-size:10px;color:var(--muted);margin:0 0 10px;">Updates are logged to the district audit trail with authorized revenue credentials.</p>
            <div class="form-grid">
              ${citizenSteps.map(step => `
                <label class="form-field">
                  <span>${step.num}. ${h(step.title)}</span>
                  <select class="edit-select" data-stage-update="${step.key}">
                    ${statusOptions.map(x => `<option ${stageStatus(v[step.key]) === x ? 'selected' : ''}>${x}</option>`).join('')}
                  </select>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
      `,
      `
        <button class="soft-button" data-action="close-modal">Close</button>
        <button class="primary-button" data-action="save-village" data-village-id="${v.id}">Save Updates</button>
      `
    );
  } catch (e) {
    toast(e.message, 'error');
  }
}
async function saveSource(button) { const form = $('#source-form'); if (!form.reportValidity()) return; const raw = Object.fromEntries(new FormData(form)); if (raw.mappings.trim()) { try { raw.mappings = JSON.parse(raw.mappings); } catch { toast('Field mappings must be valid JSON.', 'error'); return; } } else delete raw.mappings; try { button.disabled = true; if (button.dataset.sourceId) await api(`/api/sources/${button.dataset.sourceId}`, { method: 'PATCH', body: JSON.stringify(raw) }); else await api('/api/sources', { method: 'POST', body: JSON.stringify(raw) }); closeModal(); await reloadDashboard(); await navigate('sources'); toast('Data source saved. Test or refresh it to synchronize.'); } catch (e) { button.disabled = false; toast(e.message, 'error'); } }
async function saveAlias() { const form = $('#alias-form'); if (!form.reportValidity()) return; try { const raw = Object.fromEntries(new FormData(form)); await api('/api/mandal-aliases', { method: 'POST', body: JSON.stringify(raw) }); closeModal(); await reloadDashboard(); render(); toast('Mandal alias standardized across the monitoring system.'); } catch (e) { toast(e.message, 'error'); } }
async function syncAll() { const b = $('#refresh-button'); b.classList.add('loading'); b.disabled = true; try { const result = await api('/api/sync', { method: 'POST' }); await reloadDashboard(); render(); const failed = result.logs.filter(x => x.status === 'Failed').length; toast(!result.logs.length ? 'No data sources are configured yet.' : failed ? `${failed} source connection issue(s); last synchronized data was retained.` : 'All configured data sources synchronized.'); } catch (e) { toast(e.message, 'error'); } finally { b.classList.remove('loading'); b.disabled = false; } }
async function sourceAction(id, kind) { try { if (kind === 'edit') return sourceModal(state.sources.find(s => s.id === id)); const endpoint = kind === 'test' ? 'test' : 'sync'; const result = await api(`/api/sources/${id}/${endpoint}`, { method: 'POST' }); await reloadDashboard(); await loadSources(); renderSources(); toast(result.result.status === 'Success' ? 'Source synchronized successfully.' : 'The source could not be connected. Details are in sync history.', result.result.status === 'Success' ? '' : 'error'); } catch (e) { toast(e.message, 'error'); } }
async function saveVillage(id) { const updates = {}; document.querySelectorAll('[data-stage-update]').forEach(el => updates[el.dataset.stageUpdate] = el.value); try { await api(`/api/villages/${id}`, { method: 'PATCH', body: JSON.stringify({ updates }) }); closeModal(); await reloadDashboard(); if (state.view === 'villages') await loadVillages(); render(); toast('Village update recorded. Write-back is queued for the authorized source.'); } catch (e) { toast(e.message, 'error'); } }
async function showConflicts() { try { const data = await api('/api/conflicts'); const rows = data.conflicts.filter(c => c.status === 'Open'); modal('Data sync conflicts', 'Select a resolution; no values are silently overwritten.', rows.length ? `<div class="attention-list">${rows.map(c => `<div class="review-item"><span class="review-bullet alert"></span><p><b>${h(c.village)}</b><br><small>${h(c.field)} · ${h(c.source)}</small><br>Website: <b>${h(c.websiteValue)}</b><br>Google Sheet: <b>${h(c.sheetValue)}</b></p><div><button class="row-action" data-resolve-conflict="${c.id}" data-resolution="Keep Website Value">Keep website</button><button class="row-action" data-resolve-conflict="${c.id}" data-resolution="Keep Google Sheet Value">Keep sheet</button></div></div>`).join('')}</div>` : emptyBlock('No open conflicts', 'No reconciliation is currently required.', 'shield'), `<button class="soft-button" data-action="close-modal">Close</button>`); } catch (e) { toast(e.message, 'error'); } }
function exportCsv() { if (!state.villages.length) { toast('No synchronized village records are available to export.', 'error'); return; } const columns = ['village_code', 'village_name', 'mandal', 'division', 'phase', 'extent', 'patta_khatas', 'govt_khatas', 'both_khatas', 'deletions', 'total_khatas', 'online_khatas', 'current_stage', 'gt_status', 'vectorization_status', 'vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status', 'section13_status', 'draft_ror_status', 'final_ror_status', 'ppb_status', 'target_month', 'target_date', 'status']; const out = [columns.join(','), ...state.villages.map(row => columns.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'); const blob = new Blob([out], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `chittoor-village-monitoring-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href); }
document.addEventListener('click', async event => {
  const el = event.target.closest('[data-view],[data-action],[data-kpi-filter],[data-village],[data-view-link],[data-drill-type],[data-phase],[data-source-sync],[data-source-test],[data-source-edit],[data-resolve-conflict],[data-analysis-tab],[data-quick-filter],[data-filter-phase],[data-filter-stage],[data-clear-chip],[data-officer-toggle]');
  if (!el) return;
  if (el.dataset.officerToggle) {
    const sec = $('#officer-updates-section');
    if (sec) sec.classList.toggle('open');
    return;
  }
  if (el.dataset.analysisTab) {
    state.analysisTab = el.dataset.analysisTab;
    renderPerformance();
    return;
  }
  if (el.dataset.filterPhase) {
    return navigate('villages', { filters: { phase: el.dataset.filterPhase } });
  }
  if (el.dataset.filterStage) {
    return navigate('villages', { filters: { current_stage: el.dataset.filterStage } });
  }
  if (el.dataset.clearChip) {
    delete state.villageFilters[el.dataset.clearChip];
    await loadVillages();
    renderVillageMonitoring();
    return;
  }
  if (el.dataset.quickFilter) {
    const qf = el.dataset.quickFilter;
    if (qf === 'all') {
      delete state.villageFilters.phase;
      delete state.villageFilters.delayed;
      delete state.villageFilters.status;
      delete state.villageFilters.stage;
      delete state.villageFilters.current_stage;
    } else if (qf.startsWith('phase:')) {
      state.villageFilters.phase = qf.replace('phase:', '');
      delete state.villageFilters.delayed;
      delete state.villageFilters.stage;
      delete state.villageFilters.current_stage;
    } else if (qf === 'delayed:true') {
      state.villageFilters.delayed = 'true';
      state.villageFilters.status = 'Delayed';
      delete state.villageFilters.phase;
      delete state.villageFilters.current_stage;
    } else if (qf.startsWith('stage:')) {
      state.villageFilters.current_stage = qf.replace('stage:', '');
      delete state.villageFilters.phase;
      delete state.villageFilters.delayed;
    }
    await loadVillages();
    renderVillageMonitoring();
    return;
  }
  if (el.dataset.view) return navigate(el.dataset.view);
  if (el.dataset.kpiFilter) {
    const key = el.dataset.kpiKey || 'status';
    if (el.dataset.kpiFilter === 'all') return navigate('villages', { filters: {} });
    return navigate('villages', { filters: { [key]: el.dataset.kpiFilter } });
  }
  if (el.dataset.viewLink) return navigate(el.dataset.viewLink, el.dataset.filterStatus ? { filters: { status: el.dataset.filterStatus } } : {});
  if (el.dataset.village) return openVillage(el.dataset.village);
  if (el.dataset.drillType) return navigate('villages', { filters: { [el.dataset.drillType]: el.dataset.drillValue } });
  if (el.dataset.phase) return navigate('villages', { filters: { phase: el.dataset.phase } });
  if (el.dataset.sourceSync) return sourceAction(el.dataset.sourceSync, 'sync');
  if (el.dataset.sourceTest) return sourceAction(el.dataset.sourceTest, 'test');
  if (el.dataset.sourceEdit) return sourceAction(el.dataset.sourceEdit, 'edit');
  if (el.dataset.resolveConflict) {
    try {
      await api('/api/conflicts/resolve', { method: 'POST', body: JSON.stringify({ id: el.dataset.resolveConflict, resolution: el.dataset.resolution }) });
      closeModal();
      await reloadDashboard();
      render();
      toast('Conflict resolution recorded.');
    } catch (e) {
      toast(e.message, 'error');
    }
    return;
  }
  if (el.dataset.action === 'toggle-adv-filter') {
    state.advancedFilterOpen = !state.advancedFilterOpen;
    renderVillageMonitoring();
    return;
  }
  if (el.dataset.action === 'clear-stage-filters') {
    STAGE_KEYS.forEach(k => delete state.villageFilters[k]);
    delete state.villageFilters.current_stage;
    await loadVillages();
    renderVillageMonitoring();
    return;
  }
  if (el.dataset.action === 'clear-all-filters') {
    state.villageFilters = {};
    await loadVillages();
    renderVillageMonitoring();
    return;
  }
  if (el.dataset.action === 'logout') return performLogout();
  if (el.dataset.action === 'close-modal') return closeModal();
  if (el.dataset.action === 'open-source-modal') return sourceModal();
  if (el.dataset.action === 'open-alias-modal') return aliasModal();
  if (el.dataset.action === 'save-source') return saveSource(el);
  if (el.dataset.action === 'save-alias') return saveAlias();
  if (el.dataset.action === 'sync-all') return syncAll();
  if (el.dataset.action === 'save-village') return saveVillage(el.dataset.villageId);
  if (el.dataset.action === 'export-csv') return exportCsv();
  if (el.dataset.action === 'view-conflicts') return showConflicts();
});
document.addEventListener('change', async event => {
  const el = event.target;
  if (!el.dataset.filter) return;
  state.villageFilters[el.dataset.filter] = el.value;
  try {
    await loadVillages();
    renderVillageMonitoring();
  } catch (e) {
    toast(e.message, 'error');
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'village-search') {
    clearTimeout(event.target._debounce);
    event.target._debounce = setTimeout(async () => {
      state.villageFilters.search = event.target.value;
      await loadVillages();
      renderVillageMonitoring();
    }, 260);
  } else if (event.target.id === 'mandal-search-input') {
    state.mandalSearch = event.target.value;
    renderPerformance();
  }
});

function performLogout() {
  sessionStorage.removeItem('ctr_officer_token');
  localStorage.removeItem('ctr_officer_token');
  state.dashboard = null;
  state.villages = [];
  state.villageFilters = {};
  renderAuthGate();
  toast('Officer session locked. Logged out securely.');
}

$('#refresh-button').addEventListener('click', syncAll);
$('#source-status').addEventListener('click', () => navigate('sources'));
$('#mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
$('#lock-session-btn')?.addEventListener('click', performLogout);
$('#topbar-logout-btn')?.addEventListener('click', performLogout);

if (!sessionStorage.getItem('ctr_officer_token')) {
  renderAuthGate();
} else {
  navigate('dashboard', { fresh: true });
}
