const STAGES = [
  ['gt_status', 'GT'],
  ['vectorization_status', 'Vectorization/Correlation'],
  ['vs_status', 'DLR@VS Login'],
  ['vro_status', 'DLR@VRO Login'],
  ['tahsildar_status', 'DLR@Tahsildar Login'],
  ['rdo_status', 'DLR@RDO Login'],
  ['jc_status', 'DLR@JC Login'],
  ['section13_status', '13 Notification'],
  ['draft_ror_status', 'Draft RoR'],
  ['final_ror_status', 'Final RoR'],
  ['webland_2_status', 'Porting DLR to Webland-2.0']
];

const state = { view: 'dashboard', dashboard: null, villages: [], villageFilters: {}, filterOptions: {}, sources: [], advancedFilterOpen: false, analysisTab: 'phases', mandalSearch: '', currentMonthSearch: '', overviewMode: 'both', villageFilterMode: 'cycle' };
const STAGE_KEYS = [
  'gt_status', 'vectorization_status', 'vs_status', 'vro_status',
  'tahsildar_status', 'rdo_status', 'jc_status', 'section13_status',
  'draft_ror_status', 'final_ror_status', 'webland_2_status'
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
function updateNav() { document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === state.view)); const names = { dashboard: ['MONITORING CENTRE', 'District overview'], villages: ['MONITORING', 'Village monitoring'], performance: ['ANALYTICS', 'Multi-Page Analytics Hub'], quality: ['DATA ASSURANCE', 'Data quality'], reports: ['REPORTING', 'Reports'], sources: ['ADMINISTRATION', 'Data sources'], audit: ['GOVERNANCE', 'Audit history'] }; $('#breadcrumb').textContent = names[state.view][0]; $('#page-title').textContent = names[state.view][1]; }
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
            <button type="button" id="toggle-pin-vis" title="Toggle PIN visibility">${icon('eye')}</button>
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

function renderTodayProgressSection(d) {
  if (!d.dailyProgress || !d.dailyProgress.combined) return '';
  const p = d.dailyProgress;

  return `
    <section class="section-card today-progress-card">
      <div class="today-progress-header">
        <div class="today-progress-title-block">
          <span class="live-pulse-badge"><span class="pulse-ring"></span> TODAY'S RESURVEY MONITORING (PHASE 5 & 6)</span>
          <h3>Today's GT Progress & Revenue Officer Login Status</h3>
          <p>Official District Collectorate review as on ${p.asOnDate || '14-09-2026'} · Real-time Ground Truthing out-turn & Village Secretariat / VRO login tracking.</p>
        </div>
        <div class="today-header-badges">
          <button class="today-badge-filter-btn" data-action="filter-ported-villages" title="Click to view all 72 Webland-2 ported villages">
            <span class="badge-icon">${icon('shield')}</span>
            <span>Webland-2 Ported: <strong>${p.combined.portedVillages || 72} Villages</strong></span>
            <small class="badge-pill-green">100% COMPLETED</small>
          </button>
        </div>
      </div>

      <div class="today-kpi-row">
        <!-- 1. Today's GT Progress -->
        <div class="today-kpi-box gt-box">
          <div class="today-kpi-top">
            <span class="today-kpi-icon">${icon('map')}</span>
            <span class="today-kpi-tag">TODAY'S GT OUT-TURN EXTENT</span>
          </div>
          <div class="today-kpi-main">
            <b class="today-kpi-val">${Number(p.combined.todayGtExtent).toLocaleString()} <small>Acres</small></b>
            <span class="today-kpi-sub">Today's Combined Out-turn (Phase 5 & 6)</span>
          </div>
          <div class="today-kpi-split">
            <div class="split-col">
              <span class="split-label">PHASE 5 TODAY</span>
              <strong class="split-val">${Number(p.phase5.todayGtExtent).toLocaleString()} Ac</strong>
              <small class="split-note">Cum: ${Number(p.phase5.cumulativeGtExtent).toLocaleString()} Ac (${p.phase5.gtCompletedVillages}/${p.phase5.totalVillages} Vlgs Done)</small>
            </div>
            <div class="split-divider"></div>
            <div class="split-col">
              <span class="split-label">PHASE 6 TODAY</span>
              <strong class="split-val">${Number(p.phase6.todayGtExtent).toLocaleString()} Ac</strong>
              <small class="split-note">Cum: ${Number(p.phase6.cumulativeGtExtent).toLocaleString()} Ac (${p.phase6.gtCompletedVillages}/${p.phase6.totalVillages} Vlgs Done)</small>
            </div>
          </div>
        </div>

        <!-- 2. VS Login Status Today -->
        <div class="today-kpi-box vs-box">
          <div class="today-kpi-top">
            <span class="today-kpi-icon">${icon('users')}</span>
            <span class="today-kpi-tag">VS LOGIN STATUS TODAY</span>
          </div>
          <div class="today-kpi-main">
            <b class="today-kpi-val">${p.combined.vsLoginToday} <small>Villages</small></b>
            <span class="today-kpi-sub">Village Secretariat Active Logins</span>
          </div>
          <div class="today-kpi-split">
            <div class="split-col">
              <span class="split-label">PHASE 5 ACTIVE</span>
              <strong class="split-val">${p.phase5.vsLoginToday} Villages</strong>
              <small class="split-note">Village Secretariat</small>
            </div>
            <div class="split-divider"></div>
            <div class="split-col">
              <span class="split-label">PHASE 6 ACTIVE</span>
              <strong class="split-val">${p.phase6.vsLoginToday} Villages</strong>
              <small class="split-note">Village Secretariat</small>
            </div>
          </div>
        </div>

        <!-- 3. VRO Login Status Today -->
        <div class="today-kpi-box vro-box">
          <div class="today-kpi-top">
            <span class="today-kpi-icon">${icon('user')}</span>
            <span class="today-kpi-tag">VRO LOGIN STATUS TODAY</span>
          </div>
          <div class="today-kpi-main">
            <b class="today-kpi-val">${p.combined.vroLoginToday} <small>Villages</small></b>
            <span class="today-kpi-sub">Village Revenue Officer Active</span>
          </div>
          <div class="today-kpi-split">
            <div class="split-col">
              <span class="split-label">PHASE 5 ACTIVE</span>
              <strong class="split-val">${p.phase5.vroLoginToday} Villages</strong>
              <small class="split-note">Tah: ${p.phase5.tahLoginToday} · RDO: ${p.phase5.rdoLoginToday}</small>
            </div>
            <div class="split-divider"></div>
            <div class="split-col">
              <span class="split-label">PHASE 6 ACTIVE</span>
              <strong class="split-val">${p.phase6.vroLoginToday} Villages</strong>
              <small class="split-note">Tah: 0 · RDO: 0</small>
            </div>
          </div>
        </div>

        <!-- 4. Webland-2 Ported Completed -->
        <div class="today-kpi-box ported-box clickable" data-action="filter-ported-villages">
          <div class="today-kpi-top">
            <span class="today-kpi-icon">${icon('shield')}</span>
            <span class="today-kpi-tag">WEBLAND 2.0 PORTED</span>
          </div>
          <div class="today-kpi-main">
            <b class="today-kpi-val">${p.combined.portedVillages || 72} <small>Villages</small></b>
            <span class="today-kpi-sub">All Resurvey Activities Completed</span>
          </div>
          <div class="today-kpi-split">
            <div class="split-col">
              <span class="split-label">PHASE BREAKDOWN</span>
              <strong class="split-val">P1: ${p.portedToWebland.phase1} · P2: ${p.portedToWebland.phase2} · P3: ${p.portedToWebland.phase3}</strong>
              <small class="split-note" style="color:var(--teal);font-weight:700;">View 72 Completed Villages →</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTodayHeroSection(d) {
  if (!d.dailyProgress || !d.dailyProgress.combined) return '';
  const p = d.dailyProgress;
  const c = p.combined;
  const p5 = p.phase5 || {};
  const p6 = p.phase6 || {};
  const totalLogins = (c.vsLoginToday || 0) + (c.vroLoginToday || 0) + (c.tahLoginToday || 0) + (c.rdoLoginToday || 0) + (c.jcLoginToday || 0);

  return `
    <section class="today-hero-grid" aria-label="Today's live resurvey out-turn and revenue officer logins">
      <!-- 1. Today's GT Progress Card -->
      <div class="today-hero-card gt-hero-card">
        <div>
          <div class="hero-top-badge-row">
            <span class="hero-badge-pill">
              <span class="pulse-ring"></span> TODAY'S GT OUT-TURN EXTENT
            </span>
            <span class="hero-date-tag">LIVE REVIEW: ${p.asOnDate || '16-09-2026'}</span>
          </div>
          <div class="hero-primary-val">
            ${Number(c.todayGtExtent).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
            <small>Acres Today</small>
          </div>
          <div class="hero-sub-text">
            Cumulative Ground Truthing: <strong>${Number(c.cumulativeGtExtent).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} Acres</strong> across Phase 5 &amp; 6 (Target: 2,77,090 Ac · 60 Villages 100% Done).
          </div>
        </div>
        <div class="hero-stats-row">
          <div class="hero-stat-col">
            <span>PHASE 5 GT TODAY</span>
            <strong>${Number(p5.todayGtExtent || 0).toFixed(2)} Ac</strong>
            <small>Cum: ${Number(p5.cumulativeGtExtent || 0).toLocaleString()} Ac (${p5.gtCompletedVillages || 49}/${p5.totalVillages || 60} Vlgs Done)</small>
          </div>
          <div class="hero-stat-col">
            <span>PHASE 6 GT TODAY</span>
            <strong>${Number(p6.todayGtExtent || 0).toFixed(2)} Ac</strong>
            <small>Cum: ${Number(p6.cumulativeGtExtent || 0).toLocaleString()} Ac (${p6.gtCompletedVillages || 11}/${p6.totalVillages || 92} Vlgs Done)</small>
          </div>
        </div>
      </div>

      <!-- 2. Today's Revenue Officer DLR Logins Progress Card -->
      <div class="today-hero-card dlr-hero-card">
        <div>
          <div class="hero-top-badge-row">
            <span class="hero-badge-pill">
              <span class="pulse-ring" style="background:#34d399;"></span> TODAY'S REVENUE OFFICER DLR LOGINS
            </span>
            <span class="hero-date-tag">ACTIVE REVENUE DISPOSAL</span>
          </div>
          <div class="hero-primary-val">
            ${totalLogins}
            <small>Active Logins Today</small>
          </div>
          <div class="hero-sub-text">
            Real-time workflow disposal across Village Secretariats, VROs, Tahsildars, RDOs, and Joint Collectorate.
          </div>
        </div>
        <div class="hero-stats-row dlr-stats-row">
          <div class="hero-stat-col">
            <span>DLR@VS</span>
            <strong>${c.vsLoginToday || 0}</strong>
            <small>Secretariats</small>
          </div>
          <div class="hero-stat-col">
            <span>DLR@VRO</span>
            <strong>${c.vroLoginToday || 0}</strong>
            <small>VROs Active</small>
          </div>
          <div class="hero-stat-col">
            <span>TAHSILDAR</span>
            <strong>${c.tahLoginToday || 9}</strong>
            <small>Sign-offs</small>
          </div>
          <div class="hero-stat-col">
            <span>RDO</span>
            <strong>${c.rdoLoginToday || 3}</strong>
            <small>Appellate</small>
          </div>
          <div class="hero-stat-col">
            <span>JC</span>
            <strong>${c.jcLoginToday || 2}</strong>
            <small>Clearances</small>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPhaseStagePendencySection(d, has) {
  const stages = d.stagePendency || [];
  const matrix = d.phaseStagePendencyMatrix || [];
  if (!has || !stages.length) return '';

  const totalVillages = d.kpis?.totalVillages || d.kpis?.total || 774;
  const completedFinal = d.kpis?.finalRorCompleted || d.kpis?.completed || 72;
  const totalPending = totalVillages - completedFinal;

  const shortHeaders = [
    ['gt_status', '1. GT'],
    ['vectorization_status', '2. Vect'],
    ['vs_status', '3. VS'],
    ['vro_status', '4. VRO'],
    ['tahsildar_status', '5. Tah'],
    ['rdo_status', '6. RDO'],
    ['jc_status', '7. JC'],
    ['section13_status', '8. Sec13'],
    ['draft_ror_status', '9. Draft'],
    ['final_ror_status', '10. Final'],
    ['webland_2_status', '11. W2.0']
  ];

  return `
    <section class="section-card overview-pendency-container">
      <div class="section-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span class="live-pulse-badge" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5;">
              <span class="pulse-ring" style="background:#ef4444;"></span> DISTRICT STATUTORY PENDENCY ANALYSIS
            </span>
          </div>
          <h3>Phase-Wise & Stage-Wise Resurvey Pendency</h3>
          <p>Real-time backlog analysis across all 11 statutory resurvey milestones and 8 phase categories (774 villages universe).</p>
        </div>
        <div class="pendency-header-meta">
          <div class="pendency-stat-badge alert">
            <span>ACTIVE RESURVEY WORKLOAD</span>
            <strong>${totalPending} <small>Villages Pending</small></strong>
          </div>
          <div class="pendency-stat-badge">
            <span>FINAL CLEARANCE (WEBLAND-2)</span>
            <strong style="color:var(--teal);">${completedFinal} <small>Villages Ported</small></strong>
          </div>
        </div>
      </div>

      <!-- Stage-Wise Pendency Across 11 Statutory Milestones -->
      <div style="padding:14px 20px 6px;font-size:12.5px;font-weight:800;color:var(--navy);letter-spacing:0.5px;text-transform:uppercase;display:flex;align-items:center;gap:8px;">
        ${icon('chart')} <span>Stage-Wise Pendency Across 11 Statutory Milestones</span>
      </div>
      <div class="stage-pendency-grid">
        ${stages.map(s => {
          const badgeCls = s.pending === 0 ? 'zero' : s.pending < 200 ? 'low' : s.pending < 340 ? 'high' : 'critical';
          return `
            <div class="stage-pendency-card">
              <div class="stage-pendency-head">
                <span class="stage-pendency-num">Stage ${s.stageNumber}</span>
                <span class="matrix-pend-badge ${badgeCls}">${s.pending} Pending</span>
              </div>
              <div class="stage-pendency-name" title="${h(s.label)}">${h(s.label)}</div>
              <div class="stage-pendency-counts">
                <span class="done-tag">${s.completed} Cleared</span>
                <span class="pend-tag">${s.percent}% Done</span>
              </div>
              <div class="bottleneck-bar" style="margin-top:4px;" title="${s.percent}% completed">
                <i style="width:${Math.max(3, s.percent)}%;background:${s.percent > 70 ? 'var(--teal)' : s.percent > 40 ? 'var(--blue)' : 'var(--orange)'};"></i>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Phase-Wise & Stage-Wise Pendency Matrix -->
      <div style="padding:16px 20px 8px;font-size:12.5px;font-weight:800;color:var(--navy);letter-spacing:0.5px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          ${icon('map')} <span>Phase × Stage Pendency Matrix (Pending Villages Per Stage)</span>
        </div>
        <span style="font-size:11px;font-weight:600;color:var(--muted);text-transform:none;">
          Click badge to view phase villages · Figures represent pending villages
        </span>
      </div>
      <div class="phase-stage-matrix-wrap">
        <table class="phase-stage-matrix-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Universe</th>
              <th>Final Cleared</th>
              <th>Overall Pending</th>
              ${shortHeaders.map(([k, lbl]) => `<th title="${lbl}">${lbl}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${matrix.map(row => {
              return `
                <tr>
                  <td><strong>${h(row.phase)}</strong></td>
                  <td style="font-family:'DM Mono',monospace;font-weight:700;">${row.total}</td>
                  <td style="font-family:'DM Mono',monospace;color:var(--teal);font-weight:700;">${row.completed}</td>
                  <td>
                    <span class="matrix-pend-badge ${row.pending === 0 ? 'zero' : row.pending < 10 ? 'low' : row.pending < 60 ? 'high' : 'critical'}" data-phase="${h(row.phase)}" title="Click to view ${row.pending} pending villages in ${h(row.phase)}">
                      ${row.pending}
                    </span>
                  </td>
                  ${shortHeaders.map(([k, lbl]) => {
                    const st = row.stages[k] || { pending: 0, completed: 0 };
                    const badgeCls = st.pending === 0 ? 'zero' : st.pending < 6 ? 'low' : st.pending < 30 ? 'high' : 'critical';
                    return `
                      <td>
                        <span class="matrix-pend-badge ${badgeCls}" title="${h(row.phase)} - ${lbl}: ${st.pending} Pending / ${st.completed} Cleared" data-phase="${h(row.phase)}">
                          ${st.pending}
                        </span>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9;font-weight:800;border-top:2px solid #cbd5e1;">
              <td>District Total</td>
              <td style="font-family:'DM Mono',monospace;">${totalVillages}</td>
              <td style="font-family:'DM Mono',monospace;color:var(--teal);">${completedFinal}</td>
              <td><span class="matrix-pend-badge critical">${totalPending}</span></td>
              ${shortHeaders.map(([k, lbl]) => {
                const sObj = stages.find(s => s.key === k) || { pending: 0 };
                const badgeCls = sObj.pending === 0 ? 'zero' : sObj.pending < 200 ? 'low' : sObj.pending < 340 ? 'high' : 'critical';
                return `<td><span class="matrix-pend-badge ${badgeCls}">${sObj.pending}</span></td>`;
              }).join('')}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  `;
}

function renderCurrentMonthPpbSection(d, has) {
  const cur = d.currentMonthPpb;
  if (!has || !cur || !cur.villages) return '';

  const q = (state.currentMonthSearch || '').toLowerCase().trim();
  const allVlgs = cur.villages;
  const filtered = q ? allVlgs.filter(v => 
    (v.village_name || '').toLowerCase().includes(q) ||
    (v.village_code || '').toLowerCase().includes(q) ||
    (v.mandal || '').toLowerCase().includes(q) ||
    (v.division || '').toLowerCase().includes(q)
  ) : allVlgs;

  return `
    <section class="section-card current-month-ppb-section" id="current-month-ppb-card">
      <div class="current-month-header">
        <div class="current-month-title">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span class="hero-badge-pill" style="background:rgba(255,255,255,0.2);color:#ffffff;">
              <span class="pulse-ring"></span> CURRENT MONTH PPB DISTRIBUTION CYCLE
            </span>
            <span class="hero-date-tag">SEPTEMBER 2026</span>
          </div>
          <h3>September 2026 Cycle — Pattadar Passbooks (PPBs) Pending Villages &amp; Status</h3>
          <p>Active ryot passbook distribution drive across <strong>37 cleared villages</strong> in 10 Mandals (Target: 22,375 Passbooks).</p>
        </div>
        <div class="current-month-kpi-strip">
          <div class="cur-month-pill">
            <span>TARGET VILLAGES</span>
            <strong>${cur.totalVillages}</strong>
          </div>
          <div class="cur-month-pill">
            <span>TARGET PASSBOOKS</span>
            <strong>${cur.targetPPBs.toLocaleString()}</strong>
          </div>
          <div class="cur-month-pill">
            <span>MANDALS COVERED</span>
            <strong>${cur.mandalsCount}</strong>
          </div>
        </div>
      </div>

      <div class="current-month-controls">
        <div class="cur-search-box">
          ${icon('search')}
          <input type="text" id="current-month-search" placeholder="Search village, mandal, or code..." value="${h(state.currentMonthSearch || '')}" />
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <span id="current-month-filtered-count" style="font-size:12.5px;font-weight:700;color:var(--navy);">
            Showing ${filtered.length} of ${allVlgs.length} villages
          </span>
          <span style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:5px 12px;border-radius:6px;font-size:11.5px;font-weight:800;">
            100% Resurvey Cleared · In Passbook Handover
          </span>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="cur-month-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Village Code</th>
              <th>Village Name</th>
              <th>Mandal</th>
              <th>Division</th>
              <th>Phase</th>
              <th>Extent</th>
              <th>Target PPBs</th>
              <th>Resurvey Stage</th>
              <th>PPB Distribution Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="current-month-table-body">
            ${filtered.length ? filtered.map((v, i) => `
              <tr>
                <td style="font-weight:700;color:var(--muted);">${i + 1}</td>
                <td><code>${h(v.village_code)}</code></td>
                <td><strong>${h(v.village_name)}</strong></td>
                <td>${h(v.mandal)}</td>
                <td>${h(v.division)}</td>
                <td><span class="phase-pill">${h(v.phase)}</span></td>
                <td>${v.extent ? Number(v.extent).toLocaleString() + ' Ac' : '—'}</td>
                <td><strong style="font-family:'DM Mono',monospace;color:var(--blue);font-size:14px;">${v.ppb_target ? Number(v.ppb_target).toLocaleString() : '—'}</strong></td>
                <td><span class="badge-pill-green">${icon('shield')} Final RoR Ported</span></td>
                <td><span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11.5px;">Distribution Active</span></td>
                <td><button class="inline-link" data-village="${v.id}" title="Drill down to village details">Track →</button></td>
              </tr>
            `).join('') : `<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--muted);">No September 2026 villages match "${h(q)}"</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function updateCurrentMonthTable() {
  const tbody = document.getElementById('current-month-table-body');
  const countEl = document.getElementById('current-month-filtered-count');
  if (!tbody || !state.dashboard?.currentMonthPpb?.villages) return;
  const q = (state.currentMonthSearch || '').toLowerCase().trim();
  const allVlgs = state.dashboard.currentMonthPpb.villages;
  const filtered = q ? allVlgs.filter(v => 
    (v.village_name || '').toLowerCase().includes(q) ||
    (v.village_code || '').toLowerCase().includes(q) ||
    (v.mandal || '').toLowerCase().includes(q) ||
    (v.division || '').toLowerCase().includes(q)
  ) : allVlgs;

  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${allVlgs.length} villages`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--muted);">No September 2026 villages match "${h(q)}"</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((v, i) => `
    <tr>
      <td style="font-weight:700;color:var(--muted);">${i + 1}</td>
      <td><code>${h(v.village_code)}</code></td>
      <td><strong>${h(v.village_name)}</strong></td>
      <td>${h(v.mandal)}</td>
      <td>${h(v.division)}</td>
      <td><span class="phase-pill">${h(v.phase)}</span></td>
      <td>${v.extent ? Number(v.extent).toLocaleString() + ' Ac' : '—'}</td>
      <td><strong style="font-family:'DM Mono',monospace;color:var(--blue);font-size:14px;">${v.ppb_target ? Number(v.ppb_target).toLocaleString() : '—'}</strong></td>
      <td><span class="badge-pill-green">${icon('shield')} Final RoR Ported</span></td>
      <td><span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11.5px;">Distribution Active</span></td>
      <td><button class="inline-link" data-village="${v.id}" title="Drill down to village details">Track →</button></td>
    </tr>
  `).join('');
}

function renderDashboard() {
  const d = state.dashboard; const has = d.hasData; const sourceReady = d.sourceSummary.configured > 0;
  const progressCount = d.villageRecordCount || d.kpis?.total || (state.villages && state.villages.length) || (has ? 774 : 0);
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

    <!-- 1. Executive Hero: Today's GT Progress & DLR Revenue Officer Logins -->
    ${has && d.dailyProgress ? renderTodayHeroSection(d) : ''}

    <!-- 2. Phase-Wise & Stage-Wise Pendency Analysis (All 11 Stages & Matrix) -->
    ${has ? renderPhaseStagePendencySection(d, has) : ''}

    <!-- 3. Dedicated Section: PPB Current Month (September 2026) Pending Villages & Status -->
    ${has ? renderCurrentMonthPpbSection(d, has) : ''}

    <section class="section-card workflow-card"><div class="section-header"><div><h3>Sequential Workflow Progress</h3><p>Completion is calculated from actual stage statuses across all 11 statutory resurvey activities.</p></div><span class="section-meta">736 VILLAGES</span></div>
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

    <!-- 1. Dedicated Phase-wise Resurvey Progress Section -->
    ${renderPhaseProgressSection(d, has)}

    <!-- 2. Separately: Month-Wise PPBs Distribution Cycle Section -->
    ${renderDashboardPpbCycleSection(d, has)}

    <div class="performance-grid" style="margin-top:20px">
      <section class="section-card"><div class="section-header"><div><h3>Current bottleneck</h3><p>Stage with the largest pending workload.</p></div></div>${d.bottleneck && has ? `<div class="bottleneck-body"><div class="bottleneck-header-row"><div class="bottleneck-stage-name">${h(d.bottleneck.label)}</div><span class="bottleneck-pending-badge">${d.bottleneck.pending} pending villages</span></div><div class="bottleneck-bar" title="${100 - (d.bottleneck.percent || 0)}% pendency"><i style="width:${Math.max(4, 100 - (d.bottleneck.percent || 0))}%"></i></div><div class="bottleneck-footer-row"><span>Stage completion rate</span><strong>${d.bottleneck.percent ?? 0}% completed</strong></div></div>` : emptyBlock('Workflow data not available', 'The bottleneck will appear after stage progress is synchronized.', 'chart')}</section>
      <section class="section-card"><div class="section-header"><div><h3>Data quality</h3><p>Records requiring verification.</p></div>${has ? `<button class="inline-link" data-view-link="quality">Review issues</button>` : ''}</div><div class="data-grid">${qualityCells(d.quality, has)}</div></section>
    </div>`;
}

function renderPhaseProgressSection(d, has) {
  const phases = d.phases || [];
  if (!has || !phases.length) {
    return emptyBlock('Phase data not available', 'Phase records will appear once synchronized.', 'map');
  }

  return `
    <section class="section-card phase-progress-dashboard-card">
      <div class="section-header">
        <div>
          <h3>Phase-Wise Resurvey Progress</h3>
          <p>Village progress and statutory activity completion across all phases (Phase I through Phase VII, Before 2024, and Yet to be Scheduled).</p>
        </div>
        <div class="ppb-cycle-header-meta">
          <div class="cycle-stat-badge">
            <span>TOTAL PHASES</span>
            <strong>${phases.length} <small>Classifications</small></strong>
          </div>
          <div class="cycle-stat-badge current-active">
            <span>ACTIVE RESURVEY PHASES</span>
            <strong>PHASE IV, V, VI, VII</strong>
          </div>
          <div class="cycle-stat-badge">
            <span>WEBLAND-2 PORTED</span>
            <strong>${d.kpis?.webland2Completed || d.kpis?.portedToWeblandVillages || 72} <small>Villages</small></strong>
          </div>
        </div>
      </div>

      <div class="phase-progress-grid">
        ${phases.map(p => {
          const isCompletePhase = p.pending === 0;
          return `
            <div class="phase-progress-card ${isCompletePhase ? 'is-complete' : ''}">
              <div class="phase-card-header">
                <div>
                  <h4 class="phase-title">${h(p.name)}</h4>
                  <div class="phase-meta-line">
                    <span>${p.mandals_count || (p.mandals && p.mandals.length) || 0} Mandals</span>
                    ${p.extent ? ` · <span>${p.extent} Ac</span>` : ''}
                  </div>
                </div>
                <span class="phase-badge ${isCompletePhase ? 'completed' : 'active'}">
                  ${isCompletePhase ? 'COMPLETED' : `${p.completed}/${p.total} DONE`}
                </span>
              </div>

              <div class="phase-kpi-row">
                <div class="phase-kpi-item">
                  <span>VILLAGES</span>
                  <b>${p.total}</b>
                </div>
                <div class="phase-kpi-item">
                  <span>FINAL ROR</span>
                  <b style="color:var(--teal);">${p.completed}</b>
                </div>
                <div class="phase-kpi-item">
                  <span>PENDING</span>
                  <b style="color:var(--orange);">${p.pending}</b>
                </div>
                <div class="phase-kpi-item">
                  <span>DELAYED</span>
                  <b style="${p.delayed > 0 ? 'color:var(--red);' : ''}">${p.delayed}</b>
                </div>
              </div>

              <div class="phase-activities-strip">
                <span class="activity-pill ${p.gt_status === 100 ? 'done' : ''}" title="GT: ${formatPct(p.gt_status)}">GT: ${formatPct(p.gt_status)}</span>
                <span class="activity-pill ${p.vectorization_status === 100 ? 'done' : ''}" title="Vectorization/Correlation: ${formatPct(p.vectorization_status)}">Vec: ${formatPct(p.vectorization_status)}</span>
                <span class="activity-pill ${p.vs_status === 100 ? 'done' : ''}" title="DLR@VS Login: ${formatPct(p.vs_status)}">VS: ${formatPct(p.vs_status)}</span>
                <span class="activity-pill ${p.vro_status === 100 ? 'done' : ''}" title="DLR@VRO Login: ${formatPct(p.vro_status)}">VRO: ${formatPct(p.vro_status)}</span>
                <span class="activity-pill ${p.final_ror_status === 100 ? 'done' : ''}" title="Final RoR: ${formatPct(p.final_ror_status)}">Final RoR: ${formatPct(p.final_ror_status)}</span>
                <span class="activity-pill ${p.webland_2_status === 100 ? 'done' : ''}" title="Porting DLR to Webland-2.0: ${formatPct(p.webland_2_status)}">Webland 2: ${formatPct(p.webland_2_status)}</span>
              </div>

              <div class="phase-progress-bar-wrap">
                <div class="phase-bar-label">
                  <span>Resurvey Completion</span>
                  <b>${formatPct(p.final_ror_status || p.overall)}</b>
                </div>
                <div class="progress-bar" style="height:6px;">
                  <i style="width:${p.final_ror_status || p.overall || 0}%;"></i>
                </div>
              </div>

              <button class="phase-drilldown-btn" data-filter-phase="${h(p.name)}">
                ${icon('search')} View ${h(p.name)} Villages (${p.total}) →
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="section-card phase-table-card" style="margin-bottom:0;box-shadow:none;border:1px solid #e2e8f0;margin-top:16px;">
        <div class="section-header">
          <div>
            <h4 style="font-size:13px;font-weight:800;color:var(--ink);margin:0 0 2px;">Phase-Wise Resurvey Milestone Matrix</h4>
            <p style="font-size:11px;color:var(--muted);margin:0;">Activity clearance across all 11 resurvey stages by Phase.</p>
          </div>
          <button class="inline-link" data-view-link="villages">View all villages ${icon('arrow')}</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="performance-table phase-progress-table">
            <thead>
              <tr>
                <th>PHASE</th>
                <th class="mono">VILLAGES</th>
                <th class="mono">EXTENT (AC)</th>
                <th class="mono">GT</th>
                <th class="mono">VEC/CORR</th>
                <th class="mono">DLR@VS</th>
                <th class="mono">DLR@VRO</th>
                <th class="mono">DLR@TAH</th>
                <th class="mono">DLR@RDO</th>
                <th class="mono">DLR@JC</th>
                <th class="mono">13 NOTIF</th>
                <th class="mono">DRAFT ROR</th>
                <th class="mono">FINAL ROR</th>
                <th class="mono">WEBLAND 2.0</th>
                <th>PROGRESS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${phases.map(p => `
                <tr class="clickable" data-filter-phase="${h(p.name)}">
                  <td><b style="color:var(--navy);font-weight:800;">${h(p.name)}</b></td>
                  <td class="mono"><b>${p.total}</b></td>
                  <td class="mono">${p.extent ? `${p.extent}` : '—'}</td>
                  <td class="mono">${formatPct(p.gt_status)}</td>
                  <td class="mono">${formatPct(p.vectorization_status)}</td>
                  <td class="mono">${formatPct(p.vs_status)}</td>
                  <td class="mono">${formatPct(p.vro_status)}</td>
                  <td class="mono">${formatPct(p.tahsildar_status)}</td>
                  <td class="mono">${formatPct(p.rdo_status)}</td>
                  <td class="mono">${formatPct(p.jc_status)}</td>
                  <td class="mono">${formatPct(p.section13_status)}</td>
                  <td class="mono">${formatPct(p.draft_ror_status)}</td>
                  <td class="mono"><b style="color:var(--teal);">${formatPct(p.final_ror_status)}</b></td>
                  <td class="mono"><b style="color:var(--blue);">${formatPct(p.webland_2_status)}</b></td>
                  <td>
                    <div class="progress-cell">
                      <span class="progress-bar"><i style="width:${p.final_ror_status || p.overall || 0}%;"></i></span>
                      <b>${formatPct(p.final_ror_status || p.overall)}</b>
                    </div>
                  </td>
                  <td>
                    <button class="inline-link" data-filter-phase="${h(p.name)}">Filter →</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderDashboardPpbCycleSection(d, has) {
  const cycles = d.ppbCycles || [];
  if (!has || !cycles.length) {
    return emptyBlock('PPBs Cycle data not available', 'Cycle records will appear once synchronized.', 'chart');
  }

  return `
    <section class="section-card ppb-cycle-dashboard-card">
      <div class="section-header">
        <div>
          <h3>Month-Wise PPBs Distribution Cycle</h3>
          <p>Official timelines & delivery targets from the Joint Collector / SSLR Plan of Action (Aug 2026 to Mar 2027).</p>
        </div>
        <div class="ppb-cycle-header-meta">
          <div class="cycle-stat-badge">
            <span>BALANCE TARGET</span>
            <strong>332,013 <small>PPBs (434 Vlgs)</small></strong>
          </div>
          <div class="cycle-stat-badge current-active">
            <span>CURRENT OPERATIONAL CYCLE</span>
            <strong>SEP 2026 <small>(37 Villages · 22.3k PPBs)</small></strong>
          </div>
          <div class="cycle-stat-badge">
            <span>PRIOR DISTRIBUTED</span>
            <strong>59,533+ <small>PPBs</small></strong>
          </div>
        </div>
      </div>

      <div class="ppb-cycle-grid">
        ${cycles.map(c => `
          <div class="ppb-cycle-card ${c.isCurrent ? 'is-current' : ''}">
            <div>
              <div class="ppb-cycle-card-top">
                <div>
                  <h4 class="ppb-cycle-name">${h(c.name)}</h4>
                  <div class="ppb-cycle-sub">${c.year} · ${c.mandalsCount} Mandals</div>
                </div>
                <span class="ppb-cycle-status-badge ${c.isCurrent ? 'active' : c.status === 'completed' ? 'completed' : c.key === 'Mar-27' ? 'peak' : 'scheduled'}">
                  ${c.isCurrent ? 'ACTIVE CYCLE' : h(c.badge)}
                </span>
              </div>

              <div class="ppb-cycle-metrics">
                <div class="ppb-cycle-metric">
                  <span>TARGET VILLAGES</span>
                  <b>${c.totalVillages}</b>
                </div>
                <div class="ppb-cycle-metric">
                  <span>TARGET PPBS</span>
                  <b>${c.targetPPBs ? c.targetPPBs.toLocaleString() : '—'}</b>
                </div>
              </div>

              <div class="ppb-cycle-progress-label">
                <span>Final RoR Progress</span>
                <b>${c.completionPercent}% (${c.completedVillages}/${c.totalVillages})</b>
              </div>
              <div class="progress-bar" style="height:6px;">
                <i style="width:${c.completionPercent || 0}%;"></i>
              </div>
            </div>

            <button class="ppb-cycle-action-btn" data-cycle="${h(c.key)}">
              ${icon('search')} View ${h(c.shortName)} Villages (${c.totalVillages}) →
            </button>
          </div>
        `).join('')}
      </div>

      <div class="section-card ppb-cycle-table-card" style="margin-bottom:0;box-shadow:none;border:1px solid #e2e8f0;">
        <div class="section-header">
          <div>
            <h4 style="font-size:13px;font-weight:800;color:var(--ink);margin:0 0 2px;">PPBs Cycle Performance & Rollout Schedule</h4>
            <p style="font-size:11px;color:var(--muted);margin:0;">Click any monthly cycle row to drill down into its village records.</p>
          </div>
          <button class="inline-link" data-view-link="villages">View all 774 villages ${icon('arrow')}</button>
        </div>
        <table class="performance-table ppb-cycle-table">
          <thead>
            <tr>
              <th>CYCLE MONTH</th>
              <th>OPERATIONAL STATUS</th>
              <th class="mono">VILLAGES</th>
              <th class="mono">TARGET PPBS</th>
              <th class="mono">FINAL ROR COMPLETED</th>
              <th class="mono">IN PROGRESS</th>
              <th class="mono">PENDING</th>
              <th class="mono">DELAYED</th>
              <th>COMPLETION RATE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${cycles.map(c => `
              <tr class="clickable ${c.isCurrent ? 'current-cycle-row' : ''}" data-cycle="${h(c.key)}">
                <td>
                  <b style="color:var(--navy);font-weight:800;">${h(c.name)}</b>
                  ${c.isCurrent ? `<span class="ppb-cycle-pill active-cycle" style="margin-left:6px;font-size:9px;">CURRENT</span>` : ''}
                </td>
                <td>
                  <span class="ppb-cycle-status-badge ${c.isCurrent ? 'active' : c.status === 'completed' ? 'completed' : c.key === 'Mar-27' ? 'peak' : 'scheduled'}">
                    ${c.isCurrent ? 'ACTIVE' : h(c.badge)}
                  </span>
                </td>
                <td class="mono"><b>${c.totalVillages}</b></td>
                <td class="mono"><b>${c.targetPPBs ? c.targetPPBs.toLocaleString() : '—'}</b></td>
                <td class="mono" style="color:var(--teal);font-weight:700;">${c.completedVillages}</td>
                <td class="mono" style="color:var(--blue);font-weight:700;">${c.inProgressVillages}</td>
                <td class="mono">${c.pendingVillages}</td>
                <td class="mono" style="${c.delayedVillages > 0 ? 'color:var(--red);font-weight:800;' : ''}">${c.delayedVillages}</td>
                <td>
                  <div class="progress-cell">
                    <span class="progress-bar"><i style="width:${c.completionPercent || 0}%;"></i></span>
                    <b>${c.completionPercent}%</b>
                  </div>
                </td>
                <td>
                  <button class="inline-link" data-cycle="${h(c.key)}">
                    Filter →
                  </button>
                </td>
              </tr>
            `).join('')}
            <tr class="total-summary-row">
              <td><b>DISTRICT TOTAL (ALL CYCLES)</b></td>
              <td><b>774 VILLAGE UNIVERSE</b></td>
              <td class="mono"><b>${d.kpis?.total || 774}</b></td>
              <td class="mono"><b>391,546</b></td>
              <td class="mono" style="color:var(--teal);"><b>${d.kpis?.finalRorCompleted || d.kpis?.completed || 0}</b></td>
              <td class="mono" style="color:var(--blue);"><b>${d.kpis?.inProgress || 0}</b></td>
              <td class="mono"><b>${(d.kpis?.total || 774) - (d.kpis?.completed || 0)}</b></td>
              <td class="mono" style="color:var(--red);"><b>${d.kpis?.delayed || 0}</b></td>
              <td>
                <div class="progress-cell">
                  <span class="progress-bar"><i style="width:${d.stageProgress ? (d.stageProgress[d.stageProgress.length - 1]?.percent || 0) : 0}%;"></i></span>
                  <b>${d.stageProgress ? (d.stageProgress[d.stageProgress.length - 1]?.percent || 0) : 0}%</b>
                </div>
              </td>
              <td><button class="inline-link" data-view-link="villages">All Villages →</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function performanceCard(title, note, rows, has, type) { return `<section class="section-card"><div class="section-header"><div><h3>${title}</h3><p>${note}</p></div>${has ? `<button class="inline-link" data-view-link="performance">View all</button>` : ''}</div>${has && rows.length ? `<table class="performance-table"><thead><tr><th>${type === 'mandal' ? 'MANDAL' : 'DIVISION'}</th><th>VILLAGES</th><th>FINAL ROR</th><th>PENDING</th><th>DELAYED</th></tr></thead><tbody>${rows.slice(0, 5).map(r => `<tr data-drill-type="${type}" data-drill-value="${h(r.name)}"><td>${h(r.name)}</td><td class="mono">${r.total}</td><td><div class="progress-cell"><span class="progress-bar"><i style="width:${r.final_ror_status || 0}%"></i></span><b>${formatPct(r.final_ror_status)}</b></div></td><td class="mono">${r.pending}</td><td class="mono">${r.delayed}</td></tr>`).join('')}</tbody></table><div class="section-footer"><button class="inline-link" data-view-link="villages">Open village records ${icon('arrow')}</button></div>` : emptyBlock('Performance data not available', 'Rollups are calculated after the village master and progress data are connected.', 'chart')}</section>`; }
function phaseCells(rows, has) { if (!has || !rows.length) return `<div class="phase-strip"><div class="phase-cell empty"><div class="phase-name">PHASE DATA</div><div class="phase-values"><span>Total<b>—</b></span><span>Completed<b>—</b></span><span>Pending<b>—</b></span></div></div></div>`; return `<div class="phase-strip">${rows.map(r => `<button class="phase-cell" data-phase="${h(r.name)}"><div class="phase-name">${h(r.name)}</div><div class="phase-values"><span>Total<b>${r.total}</b></span><span>Completed<b>${r.completed}</b></span><span>Pending<b>${r.pending}</b></span></div></button>`).join('')}</div>`; }
function qualityCells(q, has) { const cells = [['Duplicate codes', q.duplicateVillageCodes], ['Missing village codes', q.missingVillageCodes], ['Missing target dates', q.missingTargetDates], ['Workflow conflicts', q.workflowConflicts], ['Missing Mandal', q.missingMandal], ['Missing Division', q.missingDivision]]; return cells.map(([label, value]) => `<button class="quality-item ${has && value ? 'alert' : ''}" ${has ? 'data-view-link="quality"' : 'disabled'}><span>${label}</span><b>${noValue(value, has)}</b></button>`).join(''); }
function renderVillageMonitoring() {
  const has = state.dashboard && state.dashboard.hasData;
  const f = state.filterOptions || {};
  const active = state.villageFilters || {};

  const activeStageCount = ['current_stage', ...STAGE_KEYS].filter(k => Boolean(active[k])).length;

  const phasesList = state.dashboard?.phases || [];
  function getPhaseTotal(pName, fallback) {
    const p = phasesList.find(x => x.name === pName);
    return p ? p.total : fallback;
  }
  const hasData = Boolean(state.dashboard?.hasData);
  const cycleList = state.dashboard?.ppbCycles || [];
  function getCycleTotal(cKey, fallback) {
    if (!hasData) return 0;
    const c = cycleList.find(x => x.key === cKey);
    return c ? c.totalVillages : fallback;
  }

  const cycleQuickPills = [
    { id: 'all', label: 'All Villages', count: hasData ? (state.dashboard?.kpis?.total ?? 0) : 0 },
    { id: 'ported:true', label: 'Webland-2 Ported', count: hasData ? (state.dashboard?.dailyProgress?.combined?.portedVillages || 0) : 0, isPorted: true },
    { id: 'cycle:Sep-26', label: 'Sep-26 (Active)', count: getCycleTotal('Sep-26', 37), isCurrent: true },
    { id: 'cycle:Aug-26', label: 'Aug-26', count: getCycleTotal('Aug-26', 20) },
    { id: 'cycle:Oct-26', label: 'Oct-26', count: getCycleTotal('Oct-26', 44) },
    { id: 'cycle:Nov-26', label: 'Nov-26', count: getCycleTotal('Nov-26', 43) },
    { id: 'cycle:Dec-26', label: 'Dec-26', count: getCycleTotal('Dec-26', 60) },
    { id: 'cycle:Jan-27', label: 'Jan-27', count: getCycleTotal('Jan-27', 48) },
    { id: 'cycle:Feb-27', label: 'Feb-27', count: getCycleTotal('Feb-27', 63) },
    { id: 'cycle:Mar-27', label: 'Mar-27 (Peak)', count: getCycleTotal('Mar-27', 123) },
    { id: 'cycle:Prior Completed (Jan–Jul 2026)', label: 'Prior Completed', count: getCycleTotal('Prior Completed (Jan–Jul 2026)', 239) },
    { id: 'delayed:true', label: 'Overdue Villages', count: hasData ? (state.dashboard?.kpis?.delayed ?? 0) : 0, alert: true }
  ];

  const phaseQuickPills = [
    { id: 'all', label: 'All Villages', count: hasData ? (state.dashboard?.kpis?.total ?? 0) : 0 },
    { id: 'ported:true', label: 'Webland-2 Ported', count: hasData ? (state.dashboard?.dailyProgress?.combined?.portedVillages || 0) : 0, isPorted: true },
    { id: 'phase:Phase I', label: 'Phase 1', count: getPhaseTotal('Phase I', 27) },
    { id: 'phase:Phase II', label: 'Phase 2', count: getPhaseTotal('Phase II', 34) },
    { id: 'phase:Phase III', label: 'Phase 3', count: getPhaseTotal('Phase III', 14) },
    { id: 'phase:Phase IV', label: 'Phase 4', count: getPhaseTotal('Phase IV', 101) },
    { id: 'phase:Phase V', label: 'Phase 5', count: getPhaseTotal('Phase V', 60) },
    { id: 'phase:Phase VI', label: 'Phase 6', count: getPhaseTotal('Phase VI', 92) },
    { id: 'phase:Phase VII', label: 'Phase 7', count: getPhaseTotal('Phase VII', 91) },
    { id: 'delayed:true', label: 'Overdue Villages', count: hasData ? (state.dashboard?.kpis?.delayed ?? 0) : 0, alert: true }
  ];

  const pillsToShow = (state.villageFilterMode === 'phase') ? phaseQuickPills : cycleQuickPills;

  function isPillActive(pId) {
    if (pId === 'all') {
      return !active.phase && !active.delayed && !active.status && !active.stage && !active.current_stage && !active.ppb_cycle && !active.ported;
    }
    const [k, v] = pId.split(':');
    if (k === 'ported') return active.ported === 'true';
    if (k === 'cycle') return active.ppb_cycle === v;
    if (k === 'phase') return active.phase === v || normalizePhase(active.phase) === normalizePhase(v);
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
      <div class="view-mode-toggle" style="margin-right:8px;">
        <button class="view-mode-btn ${state.villageFilterMode !== 'phase' ? 'active' : ''}" data-toggle-village-mode="cycle">
          PPBs Cycle
        </button>
        <button class="view-mode-btn ${state.villageFilterMode === 'phase' ? 'active' : ''}" data-toggle-village-mode="phase">
          Phases
        </button>
      </div>
      <span style="font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;margin-right:2px;">Quick View:</span>
      ${pillsToShow.map(p => `
        <button class="quick-pill ${isPillActive(p.id) ? 'active' : ''} ${p.alert ? 'alert' : ''} ${p.isCurrent ? 'active-cycle' : ''} ${p.isPorted ? 'ported-pill' : ''}" data-quick-filter="${p.id}">
          ${p.isPorted ? icon('shield') : ''} ${h(p.label)} <span class="pill-count">${p.count}</span>
        </button>
      `).join('')}
    </div>

    ${renderActiveChips(active)}

    <div class="filters">
      <div class="search-box">
        ${icon('search')}
        <input id="village-search" value="${h(active.search || '')}" placeholder="Search Village Name, Code, or Mandal..." />
      </div>
      ${selectFilter('ppb_cycle', 'All PPBs Cycles', (f.ppbCycles ? f.ppbCycles.map(c => c.id) : ['Sep-26', 'Aug-26', 'Oct-26', 'Nov-26', 'Dec-26', 'Jan-27', 'Feb-27', 'Mar-27', 'Prior Completed (Jan–Jul 2026)']), active.ppb_cycle)}
      ${selectFilter('phase', 'All Phases', f.phases, active.phase)}
      ${selectFilter('division', 'All Divisions', f.divisions, active.division)}
      ${selectFilter('mandal', 'All Mandals', f.mandals, active.mandal)}
      ${selectFilter('status', 'All Statuses', ['Completed', 'Pending', 'Delayed', 'In Progress', 'Not Started'], active.status)}
      <button class="adv-filter-toggle ${state.advancedFilterOpen ? 'active' : ''}" data-action="toggle-adv-filter">
        ${icon('sliders')} Workflow Stage Filters ${activeStageCount > 0 ? `<span class="pill-count" style="background:#fff;color:var(--blue);padding:1px 6px;border-radius:10px;margin-left:4px;">${activeStageCount}</span>` : ''}
      </button>
      <span class="filter-count">${has ? `${state.villages.length} village record${state.villages.length === 1 ? '' : 's'}` : 'No records available'}</span>
    </div>

    ${state.advancedFilterOpen ? `
      <div class="adv-filter-drawer">
        <div class="adv-filter-header">
          <h4>${icon('filter')} Stage & Bottleneck Analysis Filters</h4>
          <button class="outline-button" style="padding:4px 8px;font-size:10px;" data-action="toggle-adv-filter">${icon('close')} Close Drawer</button>
        </div>
        <div class="adv-filter-grid">
          <div class="filter-field-box">
            <label>Current Resurvey Stage</label>
            ${selectFilter('current_stage', 'All Current Stages', (f.stages || ['GT', 'Vectorization/Correlation', 'DLR@VS Login', 'DLR@VRO Login', 'DLR@Tahsildar Login', 'DLR@RDO Login', 'DLR@JC Login', '13 Notification', 'Draft RoR', 'Final RoR', 'Porting DLR to Webland-2.0', 'Completed']), active.current_stage)}
          </div>
          <div class="filter-field-box">
            <label>1. GT (Ground Truthing)</label>
            ${selectFilter('gt_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.gt_status)}
          </div>
          <div class="filter-field-box">
            <label>2. Vectorization/Correlation</label>
            ${selectFilter('vectorization_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.vectorization_status)}
          </div>
          <div class="filter-field-box">
            <label>3. DLR@VS Login</label>
            ${selectFilter('vs_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.vs_status)}
          </div>
          <div class="filter-field-box">
            <label>4. DLR@VRO Login</label>
            ${selectFilter('vro_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.vro_status)}
          </div>
          <div class="filter-field-box">
            <label>5. DLR@Tahsildar Login</label>
            ${selectFilter('tahsildar_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.tahsildar_status)}
          </div>
          <div class="filter-field-box">
            <label>6. DLR@RDO Login</label>
            ${selectFilter('rdo_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.rdo_status)}
          </div>
          <div class="filter-field-box">
            <label>7. DLR@JC Login</label>
            ${selectFilter('jc_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.jc_status)}
          </div>
          <div class="filter-field-box">
            <label>8. 13 Notification</label>
            ${selectFilter('section13_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.section13_status)}
          </div>
          <div class="filter-field-box">
            <label>9. Draft RoR</label>
            ${selectFilter('draft_ror_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.draft_ror_status)}
          </div>
          <div class="filter-field-box">
            <label>10. Final RoR</label>
            ${selectFilter('final_ror_status', 'Any Status', ['Completed', 'In Progress', 'Pending', 'Not Started'], active.final_ror_status)}
          </div>
          <div class="filter-field-box">
            <label>11. Porting DLR to Webland-2.0</label>
            ${selectFilter('webland_2_status', 'Any Status', ['Ported', 'Completed', 'In Progress', 'Pending', 'Not Started'], active.webland_2_status)}
          </div>
        </div>
        <div class="adv-filter-foot">
          <button class="clear-all-link" data-action="clear-stage-filters">Reset Stage Filters</button>
          <button class="primary-button" data-action="toggle-adv-filter">Done</button>
        </div>
      </div>
    ` : ''}

    <section class="section-card data-table-card">
      ${has ? villageTable(state.villages) : emptyBlock('Village master data is not available', 'The 774-village monitoring universe will appear here after the master source is synchronized.', 'map')}
    </section>
  `;
}

function renderActiveChips(active) {
  const chips = [];
  if (active.ported === 'true') chips.push({ key: 'ported', label: `Webland-2 Ported (Completed)` });
  if (active.search) chips.push({ key: 'search', label: `Search: "${active.search}"` });
  if (active.ppb_cycle) chips.push({ key: 'ppb_cycle', label: `PPBs Cycle: ${active.ppb_cycle}` });
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
      ${chips.map(c => `<span class="active-chip">${h(c.label)} <button data-clear-chip="${c.key}" title="Remove filter">${icon('close')}</button></span>`).join('')}
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
          <th>PPBS CYCLE</th>
          <th>PHASE</th>
          <th>EXTENT (AC)</th>
          <th>PPBs TARGET</th>
          <th>CURRENT RESURVEY STAGE</th>
          <th>OVERALL STATUS</th>
          <th>ACTION</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(v => `
          <tr class="clickable" data-village="${v.id}">
            <td class="mono">${h(v.village_code || '—')}</td>
            <td class="village-name" style="font-weight:800;color:var(--navy);">
              ${h(v.village_name || 'Village name unavailable')}
              ${(v.ported_to_webland || v.webland_2_status === 'Ported') ? `<span class="webland-ported-badge" title="Ported to Webland 2.0 - All Resurvey Activities Completed">${icon('shield')} WEBLAND 2.0</span>` : ''}
            </td>
            <td>${h(v.mandal || '—')}</td>
            <td>${h(v.division || '—')}</td>
            <td>
              <span class="ppb-cycle-pill ${v.ppb_cycle === 'Sep-26' ? 'active-cycle' : (v.ppb_cycle && v.ppb_cycle.includes('Prior')) ? 'completed-cycle' : ''}">
                ${h(v.ppb_cycle || v.target_month || '—')}
              </span>
            </td>
            <td><span class="phase-card-badge" style="font-size:9px;padding:2px 7px;">${h(v.phase || '—')}</span></td>
            <td class="mono">${v.extent ? `${h(v.extent)}` : '—'}</td>
            <td class="mono"><b>${v.ppb_target ? Number(v.ppb_target).toLocaleString() : '—'}</b></td>
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
    <div class="analysis-tabs-nav">
      <button class="analysis-tab-btn ${state.analysisTab === 'cycles' ? 'active' : ''}" data-analysis-tab="cycles">
        ${icon('grid')} Month-wise PPBs Cycle
      </button>
      <button class="analysis-tab-btn ${state.analysisTab === 'phases' ? 'active' : ''}" data-analysis-tab="phases">
        ${icon('map')} Phase-Wise Progress
      </button>
      <button class="analysis-tab-btn ${state.analysisTab === 'divisions' ? 'active' : ''}" data-analysis-tab="divisions">
        ${icon('chart')} Division & Mandal Hub
      </button>
      <button class="analysis-tab-btn ${state.analysisTab === 'stages' ? 'active' : ''}" data-analysis-tab="stages">
        ${icon('workflow')} 10-Stage Workflow Journey
      </button>
      <button class="analysis-tab-btn ${state.analysisTab === 'matrix' ? 'active' : ''}" data-analysis-tab="matrix">
        ${icon('document')} Executive Summary Matrix
      </button>
    </div>

    ${!has ? emptyBlock('Performance data not available', 'Connect and synchronize village master records first.', 'chart') :
      state.analysisTab === 'cycles' ? renderPpbCycleAnalysis(d) :
      state.analysisTab === 'phases' ? renderPhaseAnalysis(d) :
      state.analysisTab === 'divisions' ? renderDivisionAnalysis(d) :
      state.analysisTab === 'stages' ? renderStageAnalysis(d) :
      renderMatrixAnalysis(d)
    }
  `;
}

function renderPpbCycleAnalysis(d) {
  const cycles = d.ppbCycles || [];
  return `
    <div class="analysis-intro-box">
      <div>
        <h3>${icon('grid')} Month-Wise PPBs Distribution Cycle Analytics</h3>
        <p>Comprehensive operational tracking across the 8 Collectorate monthly delivery cycles (Aug 2026 to Mar 2027) covering 434 target villages (332,013 PPBs) and prior completions.</p>
      </div>
      <button class="outline-button" data-view-link="villages">${icon('arrow')} View All 774 Villages</button>
    </div>

    <div class="khata-metrics-grid" style="margin-bottom:22px;border:1px solid var(--line);border-radius:9px;overflow:hidden;">
      <div class="khata-metric-box">
        <span class="khata-metric-label">Balance Target PPBs</span>
        <b class="khata-metric-val" style="color:var(--blue);">332,013</b>
        <small>434 Villages (Aug 2026 - Mar 2027)</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-label">Prior Distributed PPBs</span>
        <b class="khata-metric-val" style="color:var(--teal);">59,533+</b>
        <small>Distributed till July 2026</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-label">Current Cycle (Sep-26)</span>
        <b class="khata-metric-val" style="color:var(--ink);">22,375</b>
        <small>37 Active Deployment Villages</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-label">Peak Month (Mar-27)</span>
        <b class="khata-metric-val" style="color:#7c3aed;">90,789</b>
        <small>123 Peak Villages Scheduled</small>
      </div>
    </div>

    <div class="phase-deep-grid">
      ${cycles.map(c => `
        <div class="phase-deep-card ${c.isCurrent ? 'is-current' : ''}">
          <div>
            <div class="phase-card-top">
              <div>
                <h4 style="font-size:15px;font-weight:800;color:var(--navy);margin:0 0 2px;">${h(c.name)}</h4>
                <div class="phase-card-vcount">${c.totalVillages} <small>villages</small></div>
              </div>
              <span class="ppb-cycle-status-badge ${c.isCurrent ? 'active' : c.status === 'completed' ? 'completed' : c.key === 'Mar-27' ? 'peak' : 'scheduled'}">
                ${c.isCurrent ? 'ACTIVE CYCLE' : h(c.badge)}
              </span>
            </div>

            <div class="phase-card-stats">
              <div>
                <span>TARGET PPBS</span>
                <b style="color:var(--navy);">${c.targetPPBs ? c.targetPPBs.toLocaleString() : '—'}</b>
              </div>
              <div>
                <span>MANDALS COVERED</span>
                <b>${c.mandalsCount}</b>
              </div>
              <div>
                <span>FINAL ROR DONE</span>
                <b style="color:var(--teal);">${c.completedVillages}</b>
              </div>
              <div>
                <span>PENDING WORKLOAD</span>
                <b style="color:var(--orange);">${c.pendingVillages}</b>
              </div>
            </div>

            <div class="phase-card-bar-label">
              <span>Cycle Completion</span>
              <b>${c.completionPercent}%</b>
            </div>
            <div class="progress-bar" style="height:6px;">
              <i style="width:${c.completionPercent || 0}%;"></i>
            </div>
          </div>

          <button class="phase-card-action-btn" data-cycle="${h(c.key)}">
            ${icon('search')} View ${h(c.shortName)} Villages (${c.totalVillages}) →
          </button>
        </div>
      `).join('')}
    </div>

    <section class="section-card">
      <div class="section-header">
        <div>
          <h3>Monthly PPBs Rollout Schedule Matrix</h3>
          <p>Chronological breakdown of passbooks target and milestone completion rates.</p>
        </div>
      </div>
      <table class="performance-table ppb-cycle-table">
        <thead>
          <tr>
            <th>CYCLE MONTH</th>
            <th>STATUS</th>
            <th>MANDALS</th>
            <th class="mono">VILLAGES</th>
            <th class="mono">TARGET PPBS</th>
            <th class="mono">FINAL ROR COMPLETED</th>
            <th class="mono">IN PROGRESS</th>
            <th class="mono">PENDING</th>
            <th class="mono">DELAYED</th>
            <th>PROGRESS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${cycles.map(c => `
            <tr class="clickable ${c.isCurrent ? 'current-cycle-row' : ''}" data-cycle="${h(c.key)}">
              <td>
                <b style="color:var(--navy);font-weight:800;">${h(c.name)}</b>
                ${c.isCurrent ? `<span class="ppb-cycle-pill active-cycle" style="margin-left:6px;font-size:9px;">CURRENT</span>` : ''}
              </td>
              <td><span class="ppb-cycle-status-badge ${c.isCurrent ? 'active' : c.status === 'completed' ? 'completed' : c.key === 'Mar-27' ? 'peak' : 'scheduled'}">${c.isCurrent ? 'ACTIVE' : h(c.badge)}</span></td>
              <td><small style="color:var(--muted);">${c.mandals ? c.mandals.slice(0, 3).join(', ') + (c.mandals.length > 3 ? ` +${c.mandals.length - 3}` : '') : '—'}</small></td>
              <td class="mono"><b>${c.totalVillages}</b></td>
              <td class="mono"><b>${c.targetPPBs ? c.targetPPBs.toLocaleString() : '—'}</b></td>
              <td class="mono" style="color:var(--teal);">${c.completedVillages}</td>
              <td class="mono" style="color:var(--blue);">${c.inProgressVillages}</td>
              <td class="mono">${c.pendingVillages}</td>
              <td class="mono" style="${c.delayedVillages > 0 ? 'color:var(--red);font-weight:800;' : ''}">${c.delayedVillages}</td>
              <td>
                <div class="progress-cell">
                  <span class="progress-bar"><i style="width:${c.completionPercent || 0}%;"></i></span>
                  <b>${c.completionPercent}%</b>
                </div>
              </td>
              <td><button class="inline-link" data-cycle="${h(c.key)}">Filter →</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderPhaseAnalysis(d) {
  const phases = d.phases || [];
  return `
    <div class="analysis-intro-box">
      <div>
        <h3>${icon('map')} Government Phase-Wise Resurvey Tracking</h3>
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
            <th class="mono">VILLAGES</th>
            <th class="mono">EXTENT (AC)</th>
            <th class="mono">GT</th>
            <th class="mono">VEC/CORR</th>
            <th class="mono">DLR@VS</th>
            <th class="mono">DLR@VRO</th>
            <th class="mono">DLR@TAH</th>
            <th class="mono">DLR@RDO</th>
            <th class="mono">DLR@JC</th>
            <th class="mono">13 NOTIF</th>
            <th class="mono">DRAFT ROR</th>
            <th class="mono">FINAL ROR</th>
            <th class="mono">WEBLAND 2.0</th>
            <th class="mono">DELAYED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${phases.map(p => `
            <tr>
              <td style="font-weight:800;color:var(--navy);">${h(p.name)}</td>
              <td class="mono"><b>${p.total}</b></td>
              <td class="mono">${p.extent ? `${p.extent}` : '—'}</td>
              <td class="mono">${formatPct(p.gt_status)}</td>
              <td class="mono">${formatPct(p.vectorization_status)}</td>
              <td class="mono">${formatPct(p.vs_status)}</td>
              <td class="mono">${formatPct(p.vro_status)}</td>
              <td class="mono">${formatPct(p.tahsildar_status)}</td>
              <td class="mono">${formatPct(p.rdo_status)}</td>
              <td class="mono">${formatPct(p.jc_status)}</td>
              <td class="mono">${formatPct(p.section13_status)}</td>
              <td class="mono">${formatPct(p.draft_ror_status)}</td>
              <td class="mono"><b style="color:var(--teal);">${formatPct(p.final_ror_status)}</b></td>
              <td class="mono"><b style="color:var(--blue);">${formatPct(p.webland_2_status)}</b></td>
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
        <h3>${icon('chart')} Revenue Division & Mandal Resurvey Performance</h3>
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
        <h3>${icon('workflow')} 10-Step Sequential Resurvey Workflow Journey</h3>
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
        <h3>${icon('document')} Executive Summary & Cross-Tabulation Matrix</h3>
        <p>Distribution of all 774 villages across Revenue Divisions and Government Phases, alongside district-wide resurvey totals.</p>
      </div>
    </div>

    <div class="khata-metrics-grid" style="margin-bottom:20px;">
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">TOTAL DISTRICT VILLAGES</span>
        <span class="khata-metric-val">774</span>
        <small>Master monitoring universe</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">TOTAL RESURVEY EXTENT</span>
        <span class="khata-metric-val">${d.kpis?.totalExtent ? `${d.kpis.totalExtent} Ac` : '—'}</span>
        <small>Total geographical area</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">TOTAL TARGET PPBS</span>
        <span class="khata-metric-val">391,546</span>
        <small>District-wide passbook universe</small>
      </div>
      <div class="khata-metric-box">
        <span class="khata-metric-lbl">TOTAL MANDALS</span>
        <span class="khata-metric-val">27</span>
        <small>Across 4 Revenue Divisions</small>
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
function modal(title, subtitle, body, footer = '') {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><header class="modal-head"><div><h3>${h(title)}</h3>${subtitle ? `<p>${h(subtitle)}</p>` : ''}</div><button class="modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
}
function closeModal() { modalRoot.innerHTML = ''; }
function sourceModal(source = null) {
  const s = source || { direction: 'READ ONLY', refreshFrequency: '15 minutes', accessMode: 'PUBLIC', tab: 'Sheet1', mappings: state.defaultMappings || {} };
  modal(source ? 'Edit data source' : 'Connect Google Sheet source', 'Connect a live Google Sheet. Ensure the spreadsheet is shared with "Anyone with the link can view".', `
    <form id="source-form">
      <div class="form-grid">
        <label class="form-field">
          <span>Source name *</span>
          <input required name="name" value="${h(s.name || '')}" placeholder="e.g. Village Progress or Resurvey Targets" />
        </label>
        <label class="form-field">
          <span>Data category</span>
          <select name="recordType">
            <option value="village_progress" ${s.recordType === 'village_progress' ? 'selected' : ''}>Village Workflow Progress</option>
            <option value="action_plan" ${s.recordType === 'action_plan' ? 'selected' : ''}>PPBs Action Plan / Cycles</option>
            <option value="phase_targets" ${s.recordType === 'phase_targets' ? 'selected' : ''}>Phase Targets & Timelines</option>
            <option value="summary" ${s.recordType === 'summary' ? 'selected' : ''}>Daily Monitoring Summary</option>
            <option value="village_master" ${s.recordType === 'village_master' ? 'selected' : ''}>Village Master (774 Universe)</option>
          </select>
        </label>
        <label class="form-field full">
          <span>Google Sheet URL or Spreadsheet ID *</span>
          <input required name="spreadsheetId" value="${h(s.spreadsheetId || s.googleSheet || '')}" placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit..." />
          <small>Paste the full Google Sheet URL here. It will not close when you click or paste.</small>
        </label>
        <label class="form-field">
          <span>Sheet / Tab name *</span>
          <input required name="tab" value="${h(s.tab || 'Sheet1')}" placeholder="Sheet1" />
          <small>Exact tab name at bottom of sheet.</small>
        </label>
        <label class="form-field">
          <span>Access Mode</span>
          <select name="accessMode">
            <option value="PUBLIC" ${s.accessMode !== 'API' ? 'selected' : ''}>Public Link (No login/token required)</option>
            <option value="API" ${s.accessMode === 'API' ? 'selected' : ''}>Private Google API (Server Token)</option>
          </select>
        </label>
        <label class="form-field">
          <span>Sync Direction</span>
          <select name="direction">
            ${['READ ONLY', 'WRITE ONLY', 'TWO WAY'].map(v => `<option ${s.direction === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="form-field">
          <span>Refresh Frequency</span>
          <select name="refreshFrequency">
            ${['5 minutes', '15 minutes', '30 minutes', '1 hour'].map(v => `<option ${s.refreshFrequency === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="form-field full">
          <span>Field mappings (optional JSON)</span>
          <textarea name="mappings" rows="3" placeholder='{"village_code":"Village Code"}'>${s.mappings && source ? h(JSON.stringify(s.mappings, null, 2)) : ''}</textarea>
        </label>
      </div>
      <div class="mapping-note">
        <b>Standard Mappings:</b> Standard columns (Village Code, Village Name, Mandal, Division, GT, Vectorization, VS, VRO, RoR, PPB) are mapped automatically.
      </div>
    </form>`, `
      <button type="button" class="soft-button" data-action="close-modal">Cancel</button>
      <button type="button" class="primary-button" data-action="save-source" data-source-id="${s.id || ''}">${source ? 'Save changes' : 'Add source'}</button>
    `);
}
function aliasModal() { modal('Add Mandal alias', 'The alias will normalize to the official Mandal name throughout the application.', `<form id="alias-form"><div class="form-grid"><label class="form-field"><span>Source spelling / alias</span><input required name="alias" placeholder="e.g. Palamaneru" /></label><label class="form-field"><span>Standardized Mandal name</span><input required name="standard" placeholder="e.g. Palamaner" /></label></div><div class="mapping-note">Only add aliases that refer to the same Mandal. Do not merge distinct Mandals based solely on similar spelling.</div></form>`, `<button class="soft-button" data-action="close-modal">Cancel</button><button class="primary-button" data-action="save-alias">Save alias</button>`); }
async function openVillage(id) {
  try {
    const v = await api(`/api/villages/${id}`);
    const statusOptions = ['Completed', 'In Progress', 'Pending', 'Delayed', 'Not Started', 'Not Updated'];

    const citizenSteps = [
      { key: 'gt_status', num: 1, title: 'GT', desc: 'DGPS ground truthing & preliminary perimeter survey by survey team.', tier: 'Survey Field Team (RSDT / MLSO)' },
      { key: 'vectorization_status', num: 2, title: 'Vectorization/Correlation', desc: 'Computerized boundary digitization, GIS shapefile correlation, and parcel map generation.', tier: 'GIS Vectorization Team' },
      { key: 'vs_status', num: 3, title: 'DLR@VS Login', desc: 'Secretariat data synchronization, Grama Sabha review, and landholder record linking.', tier: 'Village Secretariat Staff' },
      { key: 'vro_status', num: 4, title: 'DLR@VRO Login', desc: 'Village Revenue Officer field inspection, ownership cross-check with 1B Webland register.', tier: 'Village Revenue Officer (VRO)' },
      { key: 'tahsildar_status', num: 5, title: 'DLR@Tahsildar Login', desc: 'Mandal Revenue Officer statutory scrutiny, discrepancy resolution, and sign-off.', tier: 'Tahsildar Office' },
      { key: 'rdo_status', num: 6, title: 'DLR@RDO Login', desc: 'Sub-divisional revenue officer validation of survey boundaries and records.', tier: 'Revenue Divisional Officer (RDO)' },
      { key: 'jc_status', num: 7, title: 'DLR@JC Login', desc: 'District Joint Collectorate final administrative sanction and clearance.', tier: 'Joint Collectorate' },
      { key: 'section13_status', num: 8, title: '13 Notification', desc: 'Statutory district gazette notification published for public claims & objections.', tier: 'Revenue Notification Cell' },
      { key: 'draft_ror_status', num: 9, title: 'Draft RoR', desc: 'Draft Record of Rights (1B) published for public scrutiny and objection hearing.', tier: 'Tahsildar & VRO Field Unit' },
      { key: 'final_ror_status', num: 10, title: 'Final RoR', desc: 'Final Record of Rights confirmed and permanent land title validated.', tier: 'Collectorate SSLR Wing' },
      { key: 'webland_2_status', num: 11, title: 'Porting DLR to Webland-2.0', desc: 'Porting digital land records to Webland-2.0 portal for official mutation & registry.', tier: 'District SSLR & Webland Portal Wing' }
    ];

    const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
    const currentStageName = isPorted ? 'Completed' : (v.current_stage || 'Not Started');
    const activeStep = isPorted ? citizenSteps[citizenSteps.length - 1] : (citizenSteps.find(s => s.title.toLowerCase().includes(currentStageName.toLowerCase()) || currentStageName.toLowerCase().includes(s.title.toLowerCase())) || citizenSteps[0]);

    const isComplete = (val) => {
      if (isPorted) return true;
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
            ${isPorted ? `<span>WEBLAND 2.0<b><span class="badge-pill-green">PORTED (100%)</span></b></span>` : ''}
            <span>PPB CYCLE<b><span class="ppb-cycle-pill ${v.ppb_cycle === 'Sep-26' ? 'active-cycle' : (v.ppb_cycle && v.ppb_cycle.includes('Prior')) ? 'completed-cycle' : ''}">${h(v.ppb_cycle || v.target_month || '—')}</span></b></span>
            <span>TARGET PPBS<b>${v.ppb_target ? Number(v.ppb_target).toLocaleString() : (v.target_ppbs ? Number(v.target_ppbs).toLocaleString() : '—')}</b></span>
            <span>PHASE<b>${h(v.phase || '—')}</b></span>
            <span>EXTENT<b>${v.extent ? `${h(v.extent)} Ac` : '—'}</b></span>
            <span>STATUS<b><span class="status-pill ${statusClass(isPorted ? 'Completed' : v.status)}">${h(isPorted ? 'Completed' : v.status)}</span></b></span>
          </div>
        </div>

        ${isPorted ? `
          <div class="ported-webland-alert">
            <span class="ported-icon">${icon('shield')}</span>
            <div>
              <strong>Ported to Webland 2.0 · All 11 Resurvey Activities Completed</strong>
              <p>This village has successfully completed all 11 statutory resurvey stages and its final record of rights and digital land records are officially ported to Webland 2.0.</p>
            </div>
          </div>
        ` : ''}

        <div class="citizen-stage-banner" style="${isPorted ? 'border-color:#bbf7d0;background:#f0fdf4;' : ''}">
          <span style="${isPorted ? 'color:#16a34a;' : ''}">${isPorted ? 'RESURVEY STATUS' : 'CURRENT WORKFLOW MILESTONE'}</span>
          <h3 style="${isPorted ? 'color:#15803d;' : ''}">${isPorted ? 'All 11 Resurvey Activities Completed' : `Step ${activeStep.num} of 11: ${h(activeStep.title)}`}</h3>
          <p style="${isPorted ? 'color:#166534;' : ''}">${isPorted ? 'GT, Vectorization/Correlation, DLR@VS, DLR@VRO, DLR@Tahsildar, DLR@RDO, DLR@JC, 13 Notification, Draft RoR, Final RoR and Porting DLR to Webland-2.0 are verified and completed.' : h(activeStep.desc)}</p>
        </div>

        <div class="citizen-stepper">
          ${citizenSteps.map(step => {
            const isVsOrAbove = isPorted || (activeStep.num >= 3) || citizenSteps.slice(2).some(s => isComplete(v[s.key]));
            const val = isPorted ? 'Completed' : ((isVsOrAbove && step.num <= 2) ? 'Completed' : v[step.key]);
            const comp = isPorted || isComplete(val);
            const isCurr = !isPorted && ((step.num === activeStep.num) || (v.current_stage && (step.title.toLowerCase().includes(v.current_stage.toLowerCase()) || v.current_stage.toLowerCase().includes(step.title.toLowerCase()))));
            const isDel = !isPorted && isCurr && (v.status === 'Delayed' || Number(v.days_delayed) > 0);
            const rowClass = comp ? 'completed' : isDel ? 'delayed' : isCurr ? 'active' : '';

            return `
              <div class="citizen-step-row ${rowClass}">
                <div class="citizen-step-circle">
                  ${comp ? icon('check') : step.num}
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
                    ${isDel && v.days_delayed ? `<span style="color:var(--red);font-weight:700;">${icon('warning')} ${v.days_delayed} days overdue</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="citizen-officer-box">
          <button type="button" class="citizen-officer-toggle" data-officer-toggle="true">
            <span>${icon('sliders')} Authorized Officer Controls & Stage Status Overrides</span>
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
async function saveSource(button) {
  const form = $('#source-form');
  if (!form.reportValidity()) return;
  const raw = Object.fromEntries(new FormData(form));
  if (raw.mappings && raw.mappings.trim()) {
    try {
      raw.mappings = JSON.parse(raw.mappings);
    } catch {
      toast('Field mappings must be valid JSON.', 'error');
      return;
    }
  } else {
    delete raw.mappings;
  }
  try {
    button.disabled = true;
    button.textContent = 'Saving...';
    let saved;
    if (button.dataset.sourceId) {
      saved = await api(`/api/sources/${button.dataset.sourceId}`, { method: 'PATCH', body: JSON.stringify(raw) });
    } else {
      saved = await api('/api/sources', { method: 'POST', body: JSON.stringify(raw) });
    }
    closeModal();
    await reloadDashboard();
    await loadSources();
    await navigate('sources');
    toast('Data source saved. Initiating synchronization...');
    if (saved && saved.id) {
      try {
        const testRes = await api(`/api/sources/${saved.id}/sync`, { method: 'POST' });
        await reloadDashboard();
        await loadSources();
        renderSources();
        if (testRes.result && testRes.result.status === 'Success') {
          toast(`Successfully connected and synchronized ${testRes.result.recordsRead || testRes.result.recordsAdded || 0} records!`);
        } else {
          toast('Source registered. Click "Test" to verify spreadsheet sharing permissions.', 'error');
        }
      } catch (err) {
        toast(`Source saved, but sync failed: ${err.message}`, 'error');
      }
    }
  } catch (e) {
    button.disabled = false;
    button.textContent = button.dataset.sourceId ? 'Save changes' : 'Add source';
    toast(e.message, 'error');
  }
}
async function saveAlias() { const form = $('#alias-form'); if (!form.reportValidity()) return; try { const raw = Object.fromEntries(new FormData(form)); await api('/api/mandal-aliases', { method: 'POST', body: JSON.stringify(raw) }); closeModal(); await reloadDashboard(); render(); toast('Mandal alias standardized across the monitoring system.'); } catch (e) { toast(e.message, 'error'); } }
async function syncAll() { const b = $('#refresh-button'); b.classList.add('loading'); b.disabled = true; try { const result = await api('/api/sync', { method: 'POST' }); await reloadDashboard(); render(); const failed = result.logs.filter(x => x.status === 'Failed').length; toast(!result.logs.length ? 'No data sources are configured yet.' : failed ? `${failed} source connection issue(s); last synchronized data was retained.` : 'All configured data sources synchronized.'); } catch (e) { toast(e.message, 'error'); } finally { b.classList.remove('loading'); b.disabled = false; } }
async function sourceAction(id, kind) { try { if (kind === 'edit') return sourceModal(state.sources.find(s => s.id === id)); const endpoint = kind === 'test' ? 'test' : 'sync'; const result = await api(`/api/sources/${id}/${endpoint}`, { method: 'POST' }); await reloadDashboard(); await loadSources(); renderSources(); toast(result.result.status === 'Success' ? 'Source synchronized successfully.' : 'The source could not be connected. Details are in sync history.', result.result.status === 'Success' ? '' : 'error'); } catch (e) { toast(e.message, 'error'); } }
async function saveVillage(id) { const updates = {}; document.querySelectorAll('[data-stage-update]').forEach(el => updates[el.dataset.stageUpdate] = el.value); try { await api(`/api/villages/${id}`, { method: 'PATCH', body: JSON.stringify({ updates }) }); closeModal(); await reloadDashboard(); if (state.view === 'villages') await loadVillages(); render(); toast('Village update recorded. Write-back is queued for the authorized source.'); } catch (e) { toast(e.message, 'error'); } }
async function showConflicts() { try { const data = await api('/api/conflicts'); const rows = data.conflicts.filter(c => c.status === 'Open'); modal('Data sync conflicts', 'Select a resolution; no values are silently overwritten.', rows.length ? `<div class="attention-list">${rows.map(c => `<div class="review-item"><span class="review-bullet alert"></span><p><b>${h(c.village)}</b><br><small>${h(c.field)} · ${h(c.source)}</small><br>Website: <b>${h(c.websiteValue)}</b><br>Google Sheet: <b>${h(c.sheetValue)}</b></p><div><button class="row-action" data-resolve-conflict="${c.id}" data-resolution="Keep Website Value">Keep website</button><button class="row-action" data-resolve-conflict="${c.id}" data-resolution="Keep Google Sheet Value">Keep sheet</button></div></div>`).join('')}</div>` : emptyBlock('No open conflicts', 'No reconciliation is currently required.', 'shield'), `<button class="soft-button" data-action="close-modal">Close</button>`); } catch (e) { toast(e.message, 'error'); } }
function exportCsv() { if (!state.villages.length) { toast('No synchronized village records are available to export.', 'error'); return; } const columns = ['village_code', 'village_name', 'mandal', 'division', 'phase', 'ppb_cycle', 'ppb_target', 'extent', 'khatas', 'current_stage', 'gt_status', 'vectorization_status', 'vs_status', 'vro_status', 'tahsildar_status', 'rdo_status', 'jc_status', 'section13_status', 'draft_ror_status', 'final_ror_status', 'ppb_status', 'target_month', 'target_date', 'status']; const out = [columns.join(','), ...state.villages.map(row => columns.map(c => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'); const blob = new Blob([out], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `chittoor-village-monitoring-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href); }
document.addEventListener('click', async event => {
  const el = event.target.closest('[data-view],[data-action],[data-kpi-filter],[data-village],[data-view-link],[data-drill-type],[data-phase],[data-source-sync],[data-source-test],[data-source-edit],[data-resolve-conflict],[data-analysis-tab],[data-quick-filter],[data-filter-phase],[data-filter-stage],[data-clear-chip],[data-officer-toggle],[data-cycle],[data-filter-cycle],[data-toggle-overview-mode],[data-toggle-village-mode]');
  if (!el) return;
  if (el.dataset.officerToggle) {
    const sec = $('#officer-updates-section');
    if (sec) sec.classList.toggle('open');
    return;
  }
  if (el.dataset.toggleOverviewMode) {
    state.overviewMode = el.dataset.toggleOverviewMode;
    renderDashboard();
    return;
  }
  if (el.dataset.toggleVillageMode) {
    state.villageFilterMode = el.dataset.toggleVillageMode;
    renderVillageMonitoring();
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
  if (el.dataset.filterCycle) {
    return navigate('villages', { filters: { ppb_cycle: el.dataset.filterCycle } });
  }
  if (el.dataset.cycle) {
    return navigate('villages', { filters: { ppb_cycle: el.dataset.cycle } });
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
      delete state.villageFilters.ppb_cycle;
      delete state.villageFilters.delayed;
      delete state.villageFilters.status;
      delete state.villageFilters.stage;
      delete state.villageFilters.current_stage;
      delete state.villageFilters.ported;
    } else if (qf === 'ported:true') {
      state.villageFilters = { ported: 'true' };
    } else if (qf.startsWith('cycle:')) {
      state.villageFilters.ppb_cycle = qf.replace('cycle:', '');
      delete state.villageFilters.phase;
      delete state.villageFilters.delayed;
      delete state.villageFilters.stage;
      delete state.villageFilters.current_stage;
      delete state.villageFilters.ported;
    } else if (qf.startsWith('phase:')) {
      state.villageFilters.phase = qf.replace('phase:', '');
      delete state.villageFilters.ppb_cycle;
      delete state.villageFilters.delayed;
      delete state.villageFilters.stage;
      delete state.villageFilters.current_stage;
      delete state.villageFilters.ported;
    } else if (qf === 'delayed:true') {
      state.villageFilters.delayed = 'true';
      state.villageFilters.status = 'Delayed';
      delete state.villageFilters.phase;
      delete state.villageFilters.ppb_cycle;
      delete state.villageFilters.current_stage;
      delete state.villageFilters.ported;
    } else if (qf.startsWith('stage:')) {
      state.villageFilters.current_stage = qf.replace('stage:', '');
      delete state.villageFilters.phase;
      delete state.villageFilters.ppb_cycle;
      delete state.villageFilters.delayed;
      delete state.villageFilters.ported;
    }
    await loadVillages();
    renderVillageMonitoring();
    return;
  }
  if (el.dataset.action === 'filter-ported-villages') {
    return navigate('villages', { filters: { ported: 'true' } });
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
  if (el.dataset.action === 'backdrop-close') {
    if (event.target === el) return closeModal();
    return;
  }
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
  } else if (event.target.id === 'current-month-search') {
    state.currentMonthSearch = event.target.value;
    updateCurrentMonthTable();
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
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

if (!sessionStorage.getItem('ctr_officer_token')) {
  renderAuthGate();
} else {
  navigate('dashboard', { fresh: true });
}
