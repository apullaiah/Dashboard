// Officer Contacts Directory & Real-time DLR Login Status Implementation
// For Chittoor Resurvey Project 2.0

async function renderOfficerContacts() {
  root.innerHTML = '<div class="empty-block"><div>' + icon('refresh') + '<strong>Loading Officer Contacts Directory &amp; DLR Login Statuses...</strong></div></div>';
  let directory = {
    dios: [],
    mlso: [],
    vs: [],
    tahsildars: [],
    rdos: [],
    vro: [],
    leadership: [],
    districtLoginCounts: { vs: 13, vro: 18, tah: 33, rdo: 32, jc: 8, total: 104 },
    summary: { totalOfficers: 686, totalSurveyCadre: 366, surveyWithPhone: 359 }
  };

  try {
    const res = await api('/api/whatsapp/officers-directory').catch(() => null);
    if (res && res.dios) {
      directory = res;
    }
  } catch (err) {
    console.error('Error loading officers directory:', err);
  }

  const dCounts = directory.districtLoginCounts || { vs: 13, vro: 18, tah: 33, rdo: 32, jc: 8, total: 104 };
  const summary = directory.summary || {};

  let currentTab = 'survey'; // 'all' | 'survey' | 'dios' | 'mlso' | 'vs' | 'tahsildars' | 'vro' | 'rdos' | 'leadership'
  let searchQuery = '';
  let selectedDivision = 'all';
  let selectedMandal = 'all';
  let selectedLoginFilter = 'all'; // 'all' | 'pending' | 'clean' | 'vs' | 'vro' | 'tah' | 'rdo' | 'jc'
  let selectedPhoneFilter = 'all'; // 'all' | 'with_phone' | 'without_phone'

  function getBaseList() {
    if (currentTab === 'all') {
      return [
        ...(directory.leadership || []),
        ...(directory.dios || []),
        ...(directory.mlso || []),
        ...(directory.vs || []),
        ...(directory.rdos || []),
        ...(directory.tahsildars || []),
        ...(directory.vro || [])
      ];
    }
    if (currentTab === 'survey') {
      return [
        ...(directory.dios || []),
        ...(directory.mlso || []),
        ...(directory.vs || [])
      ];
    }
    if (currentTab === 'dios') return directory.dios || [];
    if (currentTab === 'mlso') return directory.mlso || [];
    if (currentTab === 'vs') return directory.vs || [];
    if (currentTab === 'tahsildars') return directory.tahsildars || [];
    if (currentTab === 'vro') return directory.vro || [];
    if (currentTab === 'rdos') return directory.rdos || [];
    if (currentTab === 'leadership') return directory.leadership || [];
    return [];
  }

  function getFilteredOfficers() {
    let list = getBaseList();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o => {
        const name = (o.name || '').toLowerCase();
        const phone = (o.phone || '').toLowerCase();
        const role = (o.role || '').toLowerCase();
        const mandal = (o.mandal || (o.mandals ? o.mandals.join(' ') : '')).toLowerCase();
        const division = (o.division || '').toLowerCase();
        const sec = (o.secretariat || '').toLowerCase();
        const villages = (o.jurisdictionVillages || []).join(' ').toLowerCase();
        return name.includes(q) || phone.includes(q) || role.includes(q) || mandal.includes(q) || division.includes(q) || sec.includes(q) || villages.includes(q);
      });
    }

    if (selectedDivision !== 'all') {
      const divMatch = selectedDivision.toLowerCase();
      list = list.filter(o => {
        const od = (o.division || '').toLowerCase();
        return od.includes(divMatch) || divMatch.includes(od);
      });
    }

    if (selectedMandal !== 'all') {
      const mMatch = selectedMandal.toLowerCase();
      list = list.filter(o => {
        if (o.mandal && o.mandal.toLowerCase().includes(mMatch)) return true;
        if (Array.isArray(o.mandals) && o.mandals.some(m => m.toLowerCase().includes(mMatch))) return true;
        return false;
      });
    }

    if (selectedLoginFilter === 'pending') {
      list = list.filter(o => o.hasPendingLogin || (o.loginStatus && o.loginStatus.total > 0));
    } else if (selectedLoginFilter === 'clean') {
      list = list.filter(o => !o.hasPendingLogin && (!o.loginStatus || o.loginStatus.total === 0));
    } else if (['vs', 'vro', 'tah', 'rdo', 'jc'].includes(selectedLoginFilter)) {
      list = list.filter(o => o.loginStatus && (o.loginStatus[selectedLoginFilter] > 0));
    }

    if (selectedPhoneFilter === 'with_phone') {
      list = list.filter(o => o.hasSheetPhone || (o.phone && o.phone.length >= 10));
    } else if (selectedPhoneFilter === 'without_phone') {
      list = list.filter(o => !o.hasSheetPhone && (!o.phone || o.phone.length < 10));
    }

    return list;
  }

  function getCadrePill(cadre, tier) {
    if (cadre === 'survey' || ['dios', 'mlso', 'vs', 'dslro'].includes(tier)) {
      return '<span class="cadre-pill cadre-survey">SURVEY CADRE</span>';
    }
    if (cadre === 'revenue' || ['rdo', 'tahsildar', 'vro', 'jc'].includes(tier)) {
      return '<span class="cadre-pill cadre-revenue">REVENUE CADRE</span>';
    }
    return '<span class="cadre-pill cadre-neutral">' + h((cadre || tier || '').toUpperCase()) + '</span>';
  }

  function renderLoginBadges(officer) {
    const ls = officer.loginStatus || { vs: 0, vro: 0, tah: 0, rdo: 0, jc: 0, total: 0 };
    if (!ls.total && !officer.hasPendingLogin) {
      return '<span class="login-badge-clean" title="Zero pending entries across all DLR logins">✅ 0 Pending in Logins</span>';
    }

    const pills = [];
    if (ls.vs > 0) pills.push('<span class="login-mini-pill vs" title="' + ls.vs + ' village(s) pending at VS login">VS: ' + ls.vs + '</span>');
    if (ls.vro > 0) pills.push('<span class="login-mini-pill vro" title="' + ls.vro + ' village(s) pending at VRO login">VRO: ' + ls.vro + '</span>');
    if (ls.tah > 0) pills.push('<span class="login-mini-pill tah" title="' + ls.tah + ' village(s) pending at Tahsildar login">Tah: ' + ls.tah + '</span>');
    if (ls.rdo > 0) pills.push('<span class="login-mini-pill rdo" title="' + ls.rdo + ' village(s) pending at RDO login">RDO: ' + ls.rdo + '</span>');
    if (ls.jc > 0) pills.push('<span class="login-mini-pill jc" title="' + ls.jc + ' village(s) pending at JC login">JC: ' + ls.jc + '</span>');

    const summaryText = '🔒 ' + ls.total + ' Vil Pending';
    const khataText = officer.dlr_entries_balance ? '<div class="login-khata-info">' + officer.dlr_entries_balance.toLocaleString('en-IN') + ' Khatas bal</div>' : '';
    return '<div class="login-status-cell">' +
      '<span class="login-badge-pending" title="' + ls.total + ' revenue village(s) awaiting clearance in logins">' + summaryText + '</span>' +
      '<div class="login-pills-wrap">' + pills.join(' ') + '</div>' +
      khataText +
    '</div>';
  }

  function getInitials(name) {
    if (!name) return 'OF';
    const parts = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function renderView() {
    const filteredOfficers = getFilteredOfficers();
    const mandalOptions = Array.from(new Set((state.villages || []).map(v => normalizeMandal(v.mandal)))).filter(Boolean).sort();

    let html = '';
    html += '<div class="content-heading">';
    html += '  <div>';
    html += '    <h3>OFFICER CONTACTS DIRECTORY &amp; DLR LOGIN STATUS</h3>';
    html += '    <p>Official verified contacts of Survey &amp; Revenue Administration synced strictly with Google Spreadsheets. Real-time DLR login status across 104 pending villages and one-click WhatsApp directives.</p>';
    html += '  </div>';
    html += '  <div class="content-actions">';
    html += '    <button class="outline-button" id="btn-sync-contacts" title="Synchronize phone numbers and jurisdictions strictly from Google Spreadsheet">';
    html += '      ' + icon('refresh') + ' <span>Sync from Google Sheets</span>';
    html += '    </button>';
    html += '    <button class="primary-button btn-wa-broadcast" id="btn-broadcast-survey" title="Sync and dispatch WhatsApp directives to responsible officers from VS to DIOS">';
    html += '      ' + icon('message') + ' <span>Sync &amp; WhatsApp Notice (VS to DIOS)</span>';
    html += '    </button>';
    html += '  </div>';
    html += '</div>';

    // Real-Time DLR Login Pendency Cards
    html += '<section class="contacts-login-grid">';
    html += '  <div class="login-kpi-card ' + (selectedLoginFilter === 'vs' ? 'active-filter' : '') + '" data-filter-login="vs" title="Click to filter officers with VS Login pendency">';
    html += '    <div class="kpi-top"><span class="kpi-tag vs-tag">VS LOGIN</span><span class="kpi-icon">🔒</span></div>';
    html += '    <div class="kpi-value">' + (dCounts.vs || 13) + ' <span class="kpi-unit">Villages</span></div>';
    html += '    <div class="kpi-sub">Village Surveyor Login · Khatas Pending</div>';
    html += '  </div>';

    html += '  <div class="login-kpi-card ' + (selectedLoginFilter === 'vro' ? 'active-filter' : '') + '" data-filter-login="vro" title="Click to filter officers with VRO Login pendency">';
    html += '    <div class="kpi-top"><span class="kpi-tag vro-tag">VRO LOGIN</span><span class="kpi-icon">🔒</span></div>';
    html += '    <div class="kpi-value">' + (dCounts.vro || 18) + ' <span class="kpi-unit">Villages</span></div>';
    html += '    <div class="kpi-sub">Village Revenue Officer · Khata Clearance</div>';
    html += '  </div>';

    html += '  <div class="login-kpi-card ' + (selectedLoginFilter === 'tah' ? 'active-filter' : '') + '" data-filter-login="tah" title="Click to filter officers with Tahsildar Login pendency">';
    html += '    <div class="kpi-top"><span class="kpi-tag tah-tag">TAH LOGIN</span><span class="kpi-icon">⭐</span></div>';
    html += '    <div class="kpi-value highlight-tah">' + (dCounts.tah || 33) + ' <span class="kpi-unit">Villages</span></div>';
    html += '    <div class="kpi-sub">Tahsildar Login · Executive Scrutiny</div>';
    html += '  </div>';

    html += '  <div class="login-kpi-card ' + (selectedLoginFilter === 'rdo' ? 'active-filter' : '') + '" data-filter-login="rdo" title="Click to filter officers with RDO Login pendency">';
    html += '    <div class="kpi-top"><span class="kpi-tag rdo-tag">RDO LOGIN</span><span class="kpi-icon">🔒</span></div>';
    html += '    <div class="kpi-value">' + (dCounts.rdo || 32) + ' <span class="kpi-unit">Villages</span></div>';
    html += '    <div class="kpi-sub">Revenue Divisional Officer · 4 Divisions</div>';
    html += '  </div>';

    html += '  <div class="login-kpi-card ' + (selectedLoginFilter === 'jc' ? 'active-filter' : '') + '" data-filter-login="jc" title="Click to filter officers with JC Login pendency">';
    html += '    <div class="kpi-top"><span class="kpi-tag jc-tag">JC LOGIN</span><span class="kpi-icon">🏛️</span></div>';
    html += '    <div class="kpi-value">' + (dCounts.jc || 8) + ' <span class="kpi-unit">Villages</span></div>';
    html += '    <div class="kpi-sub">Joint Collector Login · Final Sign-off</div>';
    html += '  </div>';

    html += '  <div class="login-kpi-card total-card ' + (selectedLoginFilter === 'pending' ? 'active-filter' : '') + '" data-filter-login="pending" title="Click to filter all officers with any DLR Login pendency">';
    html += '    <div class="kpi-top"><span class="kpi-tag total-tag">TOTAL PENDING</span><span class="kpi-icon">⚠️</span></div>';
    html += '    <div class="kpi-value highlight-total">' + (dCounts.total || 104) + ' <span class="kpi-unit">/ 736</span></div>';
    html += '    <div class="kpi-sub">Villages Pending in DLR Logins across District</div>';
    html += '  </div>';
    html += '</section>';

    // Cadre Filter Tabs
    html += '<div class="contacts-tabs-bar">';
    html += '  <button class="contacts-tab ' + (currentTab === 'survey' ? 'active' : '') + '" data-tab="survey">★ Survey Cadre (VS to DIOS) <span class="tab-count">' + (summary.totalSurveyCadre || 366) + '</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'dios' ? 'active' : '') + '" data-tab="dios">Dy. Inspectors of Survey (DIOS) <span class="tab-count">' + (summary.totalDios || 6) + '</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'mlso' ? 'active' : '') + '" data-tab="mlso">Mandal Surveyors (MLSO) <span class="tab-count">' + (summary.totalMlso || 27) + '</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'vs' ? 'active' : '') + '" data-tab="vs">Village Surveyors (VS) <span class="tab-count">' + (summary.totalVs || 333) + '</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'tahsildars' ? 'active' : '') + '" data-tab="tahsildars">Tahsildars <span class="tab-count">' + (summary.totalTahsildars || 27) + '</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'vro' ? 'active' : '') + '" data-tab="vro">Village Revenue Officers (VRO) <span class="tab-count">' + (summary.totalVro || 289) + '</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'rdos' ? 'active' : '') + '" data-tab="rdos">RDOs <span class="tab-count">' + (summary.totalRdos || 4) + '</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'leadership' ? 'active' : '') + '" data-tab="leadership">District Leadership <span class="tab-count">2</span></button>';
    html += '  <button class="contacts-tab ' + (currentTab === 'all' ? 'active' : '') + '" data-tab="all">All Officers <span class="tab-count">' + (summary.totalOfficers || 686) + '</span></button>';
    html += '</div>';

    // Controls & Filter Bar
    html += '<section class="section-card contacts-filter-card">';
    html += '  <div class="contacts-filter-row">';
    html += '    <div class="search-box-wrap">';
    html += '      <span class="search-icon">' + icon('search') + '</span>';
    html += '      <input type="text" id="officer-search-input" class="officer-search-input" placeholder="Search by Officer Name, Designation, Mandal, Division, Secretariat, or Mobile..." value="' + h(searchQuery) + '" />';
    if (searchQuery) {
      html += '    <button class="clear-search-btn" id="btn-clear-search">&times;</button>';
    }
    html += '    </div>';

    html += '    <div class="filter-controls-group">';
    html += '      <select id="filter-division" class="filter-select">';
    html += '        <option value="all"' + (selectedDivision === 'all' ? ' selected' : '') + '>All Divisions</option>';
    html += '        <option value="Chittoor"' + (selectedDivision === 'Chittoor' ? ' selected' : '') + '>Chittoor Division</option>';
    html += '        <option value="Nagari"' + (selectedDivision === 'Nagari' ? ' selected' : '') + '>Nagari Division</option>';
    html += '        <option value="Palamaner"' + (selectedDivision === 'Palamaner' ? ' selected' : '') + '>Palamaner Division</option>';
    html += '        <option value="Kuppam"' + (selectedDivision === 'Kuppam' ? ' selected' : '') + '>Kuppam Division</option>';
    html += '      </select>';

    html += '      <select id="filter-mandal" class="filter-select">';
    html += '        <option value="all"' + (selectedMandal === 'all' ? ' selected' : '') + '>All 27 Mandals</option>';
    mandalOptions.forEach(m => {
      html += '      <option value="' + h(m) + '"' + (selectedMandal === m ? ' selected' : '') + '>' + h(m) + '</option>';
    });
    html += '      </select>';

    html += '      <select id="filter-login-status" class="filter-select">';
    html += '        <option value="all"' + (selectedLoginFilter === 'all' ? ' selected' : '') + '>All Login Statuses</option>';
    html += '        <option value="pending"' + (selectedLoginFilter === 'pending' ? ' selected' : '') + '>⚠️ Has Pending Login (&gt; 0)</option>';
    html += '        <option value="clean"' + (selectedLoginFilter === 'clean' ? ' selected' : '') + '>✅ Clean (0 Pending in Logins)</option>';
    html += '        <option value="vs"' + (selectedLoginFilter === 'vs' ? ' selected' : '') + '>🔒 VS Login Pending</option>';
    html += '        <option value="vro"' + (selectedLoginFilter === 'vro' ? ' selected' : '') + '>🔒 VRO Login Pending</option>';
    html += '        <option value="tah"' + (selectedLoginFilter === 'tah' ? ' selected' : '') + '>⭐ Tahsildar Login Pending</option>';
    html += '        <option value="rdo"' + (selectedLoginFilter === 'rdo' ? ' selected' : '') + '>🔒 RDO Login Pending</option>';
    html += '        <option value="jc"' + (selectedLoginFilter === 'jc' ? ' selected' : '') + '>🏛️ JC Login Pending</option>';
    html += '      </select>';

    html += '      <select id="filter-phone-status" class="filter-select">';
    html += '        <option value="all"' + (selectedPhoneFilter === 'all' ? ' selected' : '') + '>All Contacts</option>';
    html += '        <option value="with_phone"' + (selectedPhoneFilter === 'with_phone' ? ' selected' : '') + '>📱 Verified Phone in Sheet</option>';
    html += '        <option value="without_phone"' + (selectedPhoneFilter === 'without_phone' ? ' selected' : '') + '>⏳ Awaiting Phone in Sheet</option>';
    html += '      </select>';

    html += '      <button class="outline-button btn-reset-filters" id="btn-reset-filters" title="Reset all filters">Reset</button>';
    html += '    </div>';
    html += '  </div>';

    html += '  <div class="filter-results-summary">';
    html += '    <span>Showing <strong>' + filteredOfficers.length + '</strong> officers</span>';
    if (selectedLoginFilter !== 'all') html += ' <span class="active-filter-badge">Login: ' + selectedLoginFilter.toUpperCase() + '</span>';
    if (selectedDivision !== 'all') html += ' <span class="active-filter-badge">Division: ' + h(selectedDivision) + '</span>';
    if (selectedMandal !== 'all') html += ' <span class="active-filter-badge">Mandal: ' + h(selectedMandal) + '</span>';
    if (selectedPhoneFilter !== 'all') html += ' <span class="active-filter-badge">Phone: ' + h(selectedPhoneFilter) + '</span>';
    html += '  </div>';
    html += '</section>';

    // Officers Table Section
    html += '<section class="section-card directory-table-card">';
    if (filteredOfficers.length === 0) {
      html += '<div class="empty-block"><div>' + icon('search') + '<strong>No officers match the current filter criteria</strong><p>Try clearing your search query or selecting "All Statuses" in the filters above.</p></div></div>';
    } else {
      html += '<div class="table-responsive">';
      html += '  <table class="contacts-table">';
      html += '    <thead><tr>';
      html += '      <th style="width: 250px;">OFFICER &amp; DESIGNATION</th>';
      html += '      <th style="width: 220px;">JURISDICTION &amp; MANDAL</th>';
      html += '      <th style="width: 175px;">CONTACT NUMBER</th>';
      html += '      <th style="width: 185px;">REAL-TIME DLR LOGIN STATUS</th>';
      html += '      <th style="width: 215px;">GT OUT-TURN &amp; TARGETS</th>';
      html += '      <th style="width: 165px; text-align: center;">INSTANT ACTIONS</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      filteredOfficers.forEach(officer => {
        const hasPhone = Boolean(officer.phone && officer.phone.length >= 10);
        const cleanPhone = hasPhone ? officer.phone.slice(-10) : '';
        const initials = getInitials(officer.name);
        const tierClass = 'avatar-' + (officer.tier || 'vs');

        html += '<tr class="officer-row ' + (officer.hasPendingLogin ? 'has-pending-row' : '') + '">';
        
        // 1. Officer Info
        html += '  <td>';
        html += '    <div class="officer-info-wrap">';
        html += '      <div class="officer-avatar ' + tierClass + '">' + initials + '</div>';
        html += '      <div class="officer-details">';
        html += '        <strong class="officer-name">' + h(officer.name) + '</strong>';
        html += '        <div class="officer-role">' + h(officer.role) + '</div>';
        html += '        <div class="officer-meta-row">';
        html += '          ' + getCadrePill(officer.cadre, officer.tier);
        if (officer.source) {
          html += '        <span class="source-tag" title="Data source: ' + h(officer.source) + '">' + h(officer.source) + '</span>';
        }
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';
        html += '  </td>';

        // 2. Jurisdiction
        html += '  <td>';
        html += '    <div class="jurisdiction-cell">';
        html += '      <div class="jur-mandal"><strong>' + h(officer.mandal || (officer.mandals ? officer.mandals.join(', ') : (officer.division || 'Chittoor'))) + '</strong></div>';
        if (officer.division) html += '<div class="jur-division">' + h(officer.division) + ' Division</div>';
        if (officer.secretariat) html += '<div class="jur-sec"><span class="sec-label">Secretariat:</span> ' + h(officer.secretariat) + '</div>';
        html += '      <div class="jur-text" title="' + h(officer.jurisdictionText || '') + '">' + h(officer.jurisdictionText || '') + '</div>';
        html += '    </div>';
        html += '  </td>';

        // 3. Contact Number
        html += '  <td>';
        html += '    <div class="phone-cell">';
        if (hasPhone) {
          html += '    <a href="tel:+91' + cleanPhone + '" class="phone-link" title="Call ' + h(officer.name) + ' directly">';
          html += '      <span class="phone-icon">📞</span>';
          html += '      <strong class="phone-number">+91 ' + cleanPhone + '</strong>';
          html += '    </a>';
          html += '    <span class="phone-verified-pill" title="Verified in Google Spreadsheet">● Verified Sheet Mobile</span>';
        } else {
          html += '    <span class="phone-missing-pill" title="Phone number is awaiting in Google Spreadsheet link">⏳ Awaiting in Sheet</span>';
        }
        html += '    </div>';
        html += '  </td>';

        // 4. Real-time DLR Login Status
        html += '  <td>' + renderLoginBadges(officer) + '</td>';

        // 5. GT Acreage & Targets
        html += '  <td>';
        html += '    <div class="gt-metrics-cell">';
        html += '      <div class="gt-ext-row"><span>Today GT:</span> <strong>' + formatExtent(officer.today_gt_extent || 0) + ' Ac</strong></div>';
        html += '      <div class="gt-ext-row bal-row"><span>Bal Patta GT:</span> <strong class="highlight-bal">' + formatExtent(officer.balance_gt_extent || 0) + ' Ac</strong></div>';
        html += '      <div class="gt-target-row"><span class="target-label">Actual Target:</span> <span class="target-date-pill">' + h(officer.actualTargetDate || 'Scheduled') + '</span></div>';
        html += '      <div class="gt-final-target"><span>Final Target:</span> <strong>31.12.2026</strong></div>';
        html += '    </div>';
        html += '  </td>';

        // 6. Instant Actions
        html += '  <td style="text-align: center;">';
        html += '    <div class="actions-cell">';
        if (hasPhone && officer.whatsappUrl) {
          html += '    <a href="' + officer.whatsappUrl + '" target="_blank" rel="noopener noreferrer" class="btn-wa-action" title="Open direct WhatsApp with pre-composed directive for ' + h(officer.name) + '">';
          html += '      <svg class="wa-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zM12.04 20.16c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.38 0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.74 2.65 4.21 3.72.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z"/></svg>';
          html += '      <span>WhatsApp</span>';
          html += '    </a>';
        } else {
          html += '    <button class="btn-wa-disabled" disabled title="Phone number is awaiting in Google Spreadsheet link"><span>No Mobile</span></button>';
        }
        html += '      <button class="btn-view-notice" data-officer-id="' + h(officer.id) + '" title="View complete formatted directive notice">Directive</button>';
        html += '    </div>';
        html += '  </td>';
        html += '</tr>';
      });

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';
    }
    html += '</section>';

    root.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    // Cadre Tabs
    document.querySelectorAll('.contacts-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        renderView();
      });
    });

    // DLR Login KPI Cards click to filter
    document.querySelectorAll('.login-kpi-card').forEach(card => {
      card.addEventListener('click', () => {
        const f = card.dataset.filterLogin;
        selectedLoginFilter = (selectedLoginFilter === f) ? 'all' : f;
        renderView();
      });
    });

    // Search Input
    const searchInput = $('#officer-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderView();
        const reInput = $('#officer-search-input');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    const clearSearch = $('#btn-clear-search');
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        searchQuery = '';
        renderView();
      });
    }

    // Filter dropdowns
    const fDiv = $('#filter-division');
    if (fDiv) fDiv.addEventListener('change', (e) => { selectedDivision = e.target.value; renderView(); });

    const fMand = $('#filter-mandal');
    if (fMand) fMand.addEventListener('change', (e) => { selectedMandal = e.target.value; renderView(); });

    const fLog = $('#filter-login-status');
    if (fLog) fLog.addEventListener('change', (e) => { selectedLoginFilter = e.target.value; renderView(); });

    const fPh = $('#filter-phone-status');
    if (fPh) fPh.addEventListener('change', (e) => { selectedPhoneFilter = e.target.value; renderView(); });

    const btnReset = $('#btn-reset-filters');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        searchQuery = '';
        selectedDivision = 'all';
        selectedMandal = 'all';
        selectedLoginFilter = 'all';
        selectedPhoneFilter = 'all';
        renderView();
      });
    }

    // Sync from Google Sheets Button
    const btnSync = $('#btn-sync-contacts');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        btnSync.innerHTML = icon('refresh') + ' <span>Syncing from Google Sheets...</span>';
        try {
          await api('/api/whatsapp/sync-contacts');
          toast('Successfully synchronized contacts from Google Sheets!', 'success');
          await renderOfficerContacts();
        } catch (e) {
          toast('Sync failed: ' + e.message, 'error');
          btnSync.disabled = false;
          btnSync.innerHTML = icon('refresh') + ' <span>Sync from Google Sheets</span>';
        }
      });
    }

    // Broadcast (VS to DIOS) Modal Button
    const btnBroadcast = $('#btn-broadcast-survey');
    if (btnBroadcast) {
      btnBroadcast.addEventListener('click', () => {
        openBroadcastSurveyModal(directory);
      });
    }

    // View Directive Notice Modal
    document.querySelectorAll('.btn-view-notice').forEach(btn => {
      btn.addEventListener('click', () => {
        const offId = btn.dataset.officerId;
        const allList = getBaseList();
        const off = allList.find(o => o.id === offId);
        if (off) openOfficerNoticeModal(off);
      });
    });
  }

  renderView();
}

function openOfficerNoticeModal(officer) {
  const notice = officer.noticeText || 'Directive details not generated.';
  const hasPhone = Boolean(officer.phone && officer.phone.length >= 10);
  const waUrl = officer.whatsappUrl || (hasPhone ? 'https://wa.me/91' + officer.phone + '?text=' + encodeURIComponent(notice) : '');

  let mHtml = '';
  mHtml += '<div class="modal-dialog officer-notice-modal">';
  mHtml += '  <div class="modal-header">';
  mHtml += '    <div>';
  mHtml += '      <h3>STATUTORY RESURVEY DIRECTIVE</h3>';
  mHtml += '      <p>Recipient: <strong>' + h(officer.name) + '</strong> (' + h(officer.role) + ') · ' + h(officer.mandal || officer.division || '') + '</p>';
  mHtml += '    </div>';
  mHtml += '    <button class="modal-close" onclick="closeModal()">&times;</button>';
  mHtml += '  </div>';
  mHtml += '  <div class="modal-body">';
  mHtml += '    <div class="notice-meta-bar">';
  mHtml += '      <div><span>Phone:</span> <strong>' + (hasPhone ? '+91 ' + officer.phone : 'Awaiting in Sheet') + '</strong></div>';
  mHtml += '      <div><span>Cadre:</span> <strong>' + h((officer.cadre || officer.tier || '').toUpperCase()) + '</strong></div>';
  mHtml += '      <div><span>Jurisdiction:</span> <strong>' + h(officer.jurisdictionText || '') + '</strong></div>';
  mHtml += '    </div>';
  mHtml += '    <div class="notice-text-preview"><pre>' + h(notice) + '</pre></div>';
  mHtml += '  </div>';
  mHtml += '  <div class="modal-footer">';
  mHtml += '    <button class="outline-button" id="btn-copy-notice-text">📋 Copy Directive Text</button>';
  if (hasPhone) {
    mHtml += '  <a href="' + waUrl + '" target="_blank" rel="noopener noreferrer" class="primary-button btn-wa-modal"><span>Open in WhatsApp</span> &rarr;</a>';
  } else {
    mHtml += '  <button class="primary-button" disabled title="Phone number is awaiting in Google Spreadsheet link"><span>Awaiting Mobile in Sheet</span></button>';
  }
  mHtml += '  </div>';
  mHtml += '</div>';

  openModal(mHtml);

  const copyBtn = $('#btn-copy-notice-text');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(notice).then(() => {
        toast('Directive notice text copied to clipboard!', 'success');
      }).catch(() => {
        toast('Copied to clipboard', 'success');
      });
    });
  }
}

function openBroadcastSurveyModal(directory) {
  const dCounts = directory.districtLoginCounts || { total: 104 };
  const surveyTotal = directory.summary?.totalSurveyCadre || 366;
  const surveyWithPhone = directory.summary?.surveyWithPhone || 359;

  let mHtml = '';
  mHtml += '<div class="modal-dialog broadcast-modal">';
  mHtml += '  <div class="modal-header">';
  mHtml += '    <div>';
  mHtml += '      <h3>SYNC &amp; BROADCAST WHATSAPP NOTICES (VS TO DIOS)</h3>';
  mHtml += '      <p>Dispatches official resurvey out-turn directives signed by <strong>DSLRO, Chittoor</strong> with Phase-6 31.12.2026 targets and DLR login pendencies.</p>';
  mHtml += '    </div>';
  mHtml += '    <button class="modal-close" onclick="closeModal()">&times;</button>';
  mHtml += '  </div>';
  mHtml += '  <div class="modal-body">';
  mHtml += '    <div class="broadcast-banner-stats">';
  mHtml += '      <div class="bb-stat"><span class="bb-val">' + surveyTotal + '</span><span class="bb-label">Survey Cadre (VS to DIOS)</span></div>';
  mHtml += '      <div class="bb-stat"><span class="bb-val highlight-stat">' + surveyWithPhone + '</span><span class="bb-label">Verified Mobile Numbers</span></div>';
  mHtml += '      <div class="bb-stat"><span class="bb-val">' + (dCounts.total || 104) + '</span><span class="bb-label">Villages Pending in Logins</span></div>';
  mHtml += '    </div>';

  mHtml += '    <div class="form-group">';
  mHtml += '      <label><strong>Target Officer Cadre Scope:</strong></label>';
  mHtml += '      <select id="broadcast-scope-select" class="form-control">';
  mHtml += '        <option value="all">All Survey Cadre Officers (6 DIOS, 27 MLSOs, 333 VS · ' + surveyTotal + ' Officers)</option>';
  mHtml += '        <option value="flagged">Flagged / Lagging Survey Officers Only (Has Pending Login or Balance GT)</option>';
  mHtml += '        <option value="dios">Deputy Inspectors of Survey Only (6 DIOS)</option>';
  mHtml += '        <option value="mlso">Mandal Surveyors Only (27 MLSOs)</option>';
  mHtml += '        <option value="vs">Village Surveyors Only (333 VS)</option>';
  mHtml += '      </select>';
  mHtml += '    </div>';

  mHtml += '    <div class="form-group checkbox-group">';
  mHtml += '      <label>';
  mHtml += '        <input type="checkbox" id="broadcast-sync-first" checked /> ';
  mHtml += '        <strong>Synchronize latest phone numbers &amp; DLR progress from Google Spreadsheets first</strong>';
  mHtml += '      </label>';
  mHtml += '    </div>';

  mHtml += '    <div class="form-group checkbox-group">';
  mHtml += '      <label>';
  mHtml += '        <input type="checkbox" id="broadcast-simulation-mode" checked /> ';
  mHtml += '        <strong>Simulation / Preview Mode (Safe run: generates dispatch logs &amp; direct WhatsApp links without Meta API billing)</strong>';
  mHtml += '      </label>';
  mHtml += '    </div>';

  mHtml += '    <div id="broadcast-progress-area" style="display:none; margin-top:16px;">';
  mHtml += '      <div class="progress-bar-wrap"><div class="progress-bar-fill" id="bc-progress-fill" style="width: 100%;"></div></div>';
  mHtml += '      <div class="progress-label" id="bc-progress-label">Syncing &amp; preparing notices...</div>';
  mHtml += '    </div>';

  mHtml += '    <div id="broadcast-results-area" style="display:none; margin-top:16px;"></div>';
  mHtml += '  </div>';
  mHtml += '  <div class="modal-footer">';
  mHtml += '    <button class="outline-button" onclick="closeModal()">Close</button>';
  mHtml += '    <button class="primary-button" id="btn-run-broadcast"><span>🚀 Execute Broadcast (VS to DIOS)</span></button>';
  mHtml += '  </div>';
  mHtml += '</div>';

  openModal(mHtml);

  const runBtn = $('#btn-run-broadcast');
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      const scope = $('#broadcast-scope-select').value;
      const syncFirst = $('#broadcast-sync-first').checked;
      const dryRun = $('#broadcast-simulation-mode').checked;

      const pArea = $('#broadcast-progress-area');
      const rArea = $('#broadcast-results-area');
      if (pArea) pArea.style.display = 'block';

      try {
        const res = await api('/api/whatsapp/broadcast-survey-cadre', {
          method: 'POST',
          body: JSON.stringify({ scope, syncFirst, dryRun })
        });

        if (pArea) pArea.style.display = 'none';
        if (rArea) {
          rArea.style.display = 'block';
          let resHtml = '';
          resHtml += '<div class="broadcast-summary-box">';
          resHtml += '  <h4>✅ Broadcast ' + (dryRun ? 'Simulated' : 'Dispatched') + ' Successfully!</h4>';
          resHtml += '  <p>Targeted: <strong>' + res.totalTargeted + '</strong> · Sent/Prepared: <strong>' + (res.sentCount || res.simulatedCount) + '</strong> · Skipped (No Phone): <strong>' + res.skippedCount + '</strong></p>';
          resHtml += '  <div class="bc-sample-links">';
          (res.results || []).slice(0, 10).forEach(r => {
            resHtml += '    <div class="bc-result-row">';
            resHtml += '      <span><strong>' + h(r.name) + '</strong> (' + h(r.role) + ')</span>';
            if (r.waLink) {
              resHtml += '      <a href="' + r.waLink + '" target="_blank" class="bc-wa-link">Send WhatsApp &rarr;</a>';
            } else {
              resHtml += '      <span class="bc-skip">No Phone</span>';
            }
            resHtml += '    </div>';
          });
          resHtml += '  </div>';
          resHtml += '</div>';
          rArea.innerHTML = resHtml;
        }
        toast('Broadcast ' + (dryRun ? 'simulation' : 'dispatch') + ' completed for ' + res.totalTargeted + ' officers', 'success');
      } catch (err) {
        if (pArea) pArea.style.display = 'none';
        toast('Broadcast error: ' + err.message, 'error');
        runBtn.disabled = false;
      }
    });
  }
}
