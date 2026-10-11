const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const newRenderWhatsApp = `async function renderWhatsApp() {
  root.innerHTML = \`<div class="empty-block"><div>\${icon('refresh')}<strong>Loading WhatsApp Resurvey Monitoring &amp; Notice Engine...</strong></div></div>\`;
  let cfgData = { config: {}, stats: {} };
  let logsData = { logs: [] };
  let tierData = { vs: [], mlso: [], ms: [], dios: [], vro: [], tahsildar: [], rdo: [] };
  let counts = { vs: 0, mlso: 0, ms: 0, dios: 0, vro: 0, tahsildar: 0, rdo: 0 };
  let scheduleData = {
    active: true,
    scheduledCron: '30 0 * * * (Daily 06:00 AM IST)',
    nextRun: 'Tomorrow at 06:00 AM IST',
    surveyCadreSender: 'DSLRO, Chittoor',
    revenueCadreSender: 'Joint Collector, Chittoor'
  };

  try {
    const [cfg, logs, vsRes, mlsoRes, diosRes, vroRes, tahRes, rdoRes, schedRes] = await Promise.all([
      api('/api/whatsapp/config').catch(() => ({ config: {}, stats: {} })),
      api('/api/whatsapp/logs').catch(() => ({ logs: [] })),
      api('/api/whatsapp/poor-officers?tier=vs').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/poor-officers?tier=mlso').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/poor-officers?tier=dios').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/poor-officers?tier=vro').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/poor-officers?tier=tahsildar').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/poor-officers?tier=rdo').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/schedule-status').catch(() => ({ schedule: {} }))
    ]);

    cfgData = cfg || {};
    logsData = logs || {};
    tierData.vs = vsRes.officers || [];
    tierData.mlso = mlsoRes.officers || [];
    tierData.ms = mlsoRes.officers || [];
    tierData.dios = diosRes.officers || [];
    tierData.vro = vroRes.officers || [];
    tierData.tahsildar = tahRes.officers || [];
    tierData.rdo = rdoRes.officers || [];

    counts.vs = vsRes.count || tierData.vs.length;
    counts.mlso = mlsoRes.count || tierData.mlso.length;
    counts.ms = counts.mlso;
    counts.dios = diosRes.count || tierData.dios.length;
    counts.vro = vroRes.count || tierData.vro.length;
    counts.tahsildar = tahRes.count || tierData.tahsildar.length;
    counts.rdo = rdoRes.count || tierData.rdo.length;

    if (schedRes && schedRes.schedule) scheduleData = schedRes.schedule;
  } catch (e) {
    console.error('Error fetching initial WhatsApp officer data:', e);
  }

  const c = cfgData.config || {};
  const logs = logsData.logs || [];
  const webhookUrl = c.webhookUrl || \`\${window.location.origin}/api/whatsapp/webhook\`;
  const verifyToken = c.verifyToken || 'CTR_RESURVEY_WA_2026';
  const isLiveMode = c.mode === 'LIVE';

  let currentCadre = 'survey'; // 'survey' | 'revenue'
  let currentTier = 'vs';
  let currentCategory = 'all';
  let currentBulkMode = 'individual';
  let searchQuery = '';

  function getActiveOfficers() {
    return tierData[currentTier] || [];
  }

  function getFilteredOfficers() {
    const list = getActiveOfficers();
    return list.filter(o => {
      if (currentCategory !== 'all') {
        if (currentCategory === 'GT') {
          if (parseFloat(o.today_gt_extent || 0) > 0 || parseFloat(o.balance_gt_extent || 0) === 0) return false;
        } else if (currentCategory === 'DLR') {
          if ((o.dlr_entries_balance || 0) === 0 || (o.dlr_entries_today || 0) > 0) return false;
        } else if (currentCategory === 'DELAY') {
          if (o.primaryLag !== 'DELAY') return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const nm = (o.name || '').toLowerCase();
        const ph = (o.phone || '').toLowerCase();
        const md = (o.mandal || (o.assignedMandals ? o.assignedMandals.join(' ') : '') || o.division || '').toLowerCase();
        const jur = (o.jurisdictionText || '').toLowerCase();
        const vNames = (o.assignedVillages || []).map(v => (v.name || v.village_name || '').toLowerCase()).join(' ');
        return nm.includes(q) || ph.includes(q) || md.includes(q) || jur.includes(q) || vNames.includes(q);
      }
      return true;
    });
  }

  function getTierMeta() {
    if (currentTier === 'dios') {
      return {
        title: 'Deputy Inspectors of Survey (DIOS)',
        short: 'DIOS',
        cadre: 'survey',
        cadreTitle: 'Survey Cadre',
        defaultSender: 'DSLRO, Chittoor',
        senderDesignation: 'District Survey & Land Records Officer',
        unit: 'Mandals Assigned',
        scopeText: '6 DIOS Officers assigned across all 27 Mandals in Chittoor district',
        broadcastBtn: '⚡ Broadcast Notices to All Flagged Deputy Inspectors (DIOS)'
      };
    }
    if (currentTier === 'mlso' || currentTier === 'ms') {
      return {
        title: 'Mandal Level Survey Officers (MLSO)',
        short: 'MLSO',
        cadre: 'survey',
        cadreTitle: 'Survey Cadre',
        defaultSender: 'DSLRO, Chittoor',
        senderDesignation: 'District Survey & Land Records Officer',
        unit: 'Revenue Villages in Mandal',
        scopeText: '27 Mandals (Mandal Level Survey Officers monitoring assigned revenue villages)',
        broadcastBtn: '⚡ Broadcast Notices to All Flagged Mandal Level Survey Officers (MLSO)'
      };
    }
    if (currentTier === 'vro') {
      return {
        title: 'Village Revenue Officers (VRO)',
        short: 'VRO',
        cadre: 'revenue',
        cadreTitle: 'Revenue Cadre',
        defaultSender: 'Joint Collector, Chittoor',
        senderDesignation: 'Joint Collector & Additional District Magistrate',
        unit: 'Assigned Revenue Villages',
        scopeText: 'Village Revenue Officers responsible for door-to-door khata verification & DLR clearances',
        broadcastBtn: '⚡ Broadcast Directives to All Flagged Village Revenue Officers (VRO)'
      };
    }
    if (currentTier === 'tahsildar' || currentTier === 'tah') {
      return {
        title: 'Tahsildars (Mandal Revenue Executives)',
        short: 'Tahsildar',
        cadre: 'revenue',
        cadreTitle: 'Revenue Cadre',
        defaultSender: 'Joint Collector, Chittoor',
        senderDesignation: 'Joint Collector & Additional District Magistrate',
        unit: 'Revenue Villages in Mandal',
        scopeText: '27 Mandals (Tahsildars responsible for Mandal revenue administration & DLR clearance)',
        broadcastBtn: '⚡ Broadcast Directives to All Flagged Tahsildars'
      };
    }
    if (currentTier === 'rdo') {
      return {
        title: 'Revenue Divisional Officers (RDO)',
        short: 'RDO',
        cadre: 'revenue',
        cadreTitle: 'Revenue Cadre',
        defaultSender: 'Joint Collector, Chittoor',
        senderDesignation: 'Joint Collector & Additional District Magistrate',
        unit: 'Mandals in Division',
        scopeText: '4 Revenue Divisions (Chittoor, Palamaner, Kuppam, Nagari)',
        broadcastBtn: '⚡ Broadcast Directives to All Flagged Revenue Divisional Officers (RDO)'
      };
    }
    return {
      title: 'Village Surveyors (VS)',
      short: 'VS',
      cadre: 'survey',
      cadreTitle: 'Survey Cadre',
      defaultSender: 'DSLRO, Chittoor',
      senderDesignation: 'District Survey & Land Records Officer',
      unit: 'Revenue Villages Assigned',
      scopeText: 'Village Surveyors mapped to their designated revenue villages',
      broadcastBtn: '⚡ Broadcast Notices to All Flagged Village Surveyors (VS)'
    };
  }

  function renderStatsHtml() {
    const list = getActiveOfficers();
    const zeroToday = list.filter(o => (parseFloat(o.today_gt_extent) || 0) === 0 && (parseFloat(o.balance_gt_extent) || 0) > 0).length;
    const dlrPending = list.filter(o => (o.dlr_entries_balance || 0) > 0).length;
    const totalLaggingVillages = list.reduce((sum, o) => sum + (o.laggingCount || 0), 0);

    const meta = getTierMeta();

    return \`
      <div class="wa-stat-card is-red">
        <div class="wa-stat-num">\${list.length}</div>
        <div class="wa-stat-label">Total Poor Performing \${meta.short}</div>
      </div>
      <div class="wa-stat-card is-amber">
        <div class="wa-stat-num">\${zeroToday}</div>
        <div class="wa-stat-label">Zero GT Progress Today</div>
      </div>
      <div class="wa-stat-card is-blue">
        <div class="wa-stat-num">\${dlrPending}</div>
        <div class="wa-stat-label">DLR Entries Pending</div>
      </div>
      <div class="wa-stat-card is-emerald">
        <div class="wa-stat-num">\${totalLaggingVillages}</div>
        <div class="wa-stat-label">Total Lagging Villages in Charge</div>
      </div>
    \`;
  }

  function renderTableHtml(filteredList) {
    if (!filteredList.length) {
      return emptyBlock('No flagged officers matching current criteria', 'All officers in this tier and category are currently performing within benchmarks.', 'check');
    }

    const meta = getTierMeta();

    return \`
      <div style="overflow-x:auto;">
        <table class="performance-table" style="font-size:12px;">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>OFFICER &amp; CADRE ROLE</th>
              <th>ASSIGNED JURISDICTION</th>
              <th>TODAY'S EXTRACTED PROGRESS</th>
              <th>PENDING BALANCE</th>
              <th>LAG STATUS / REASONS</th>
              <th style="text-align:right;">ACTION</th>
            </tr>
          </thead>
          <tbody>
            \${filteredList.map((o, idx) => {
              const isZeroToday = (parseFloat(o.today_gt_extent) || 0) === 0;

              let jurisdictionRender = '';
              if (currentTier === 'rdo') {
                const mandals = o.assignedMandals || [];
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">⚖️ <b>\${o.division} Division</b></div>
                  <div style="font-size:11.5px;color:#0f172a;font-weight:700;margin-top:2px;">\${o.assignedMandalsCount || mandals.length} Mandals Assigned</div>
                  <div style="font-size:10.5px;color:#64748b;margin-top:1px;">Universe: <b>\${o.totalVillagesInDivision || 0} Villages</b></div>
                \`;
              } else if (currentTier === 'dios') {
                const mandals = o.assignedMandals || [];
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip">⭐ <b>\${o.assignedMandalsCount || mandals.length} Mandals Assigned</b></div>
                  <div class="wa-mandals-list-box">
                    \${mandals.map(m => \`<span class="wa-mandal-subchip">\${h(m)}</span>\`).join('')}
                  </div>
                  <div style="font-size:11px;color:#64748b;margin-top:2px;">Universe: <b>\${o.totalVillagesInDivision || 0} Villages</b></div>
                \`;
              } else if (currentTier === 'tahsildar') {
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">🏢 <b>\${h(o.mandal)} Mandal</b></div>
                  <div style="font-size:11px;color:#0f172a;font-weight:700;margin-top:2px;">\${o.jurisdictionCount} Revenue Villages in Mandal</div>
                \`;
              } else if (currentTier === 'mlso' || currentTier === 'ms') {
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip">🏛️ <b>\${o.jurisdictionCount} Revenue Villages</b></div>
                  <div style="font-weight:700;color:#0f172a;margin-top:2px;">\${h(o.mandal)} Mandal</div>
                \`;
              } else if (currentTier === 'vro') {
                const vCount = o.jurisdictionCount || (o.assignedVillages || []).length;
                const sampleV = (o.assignedVillages || []).slice(0, 2).map(v => v.name || v.village_name).join(', ');
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">✍️ <b>\${vCount} Revenue Village(s)</b></div>
                  <div style="font-size:11px;color:#475569;margin-top:2px;max-width:240px;line-height:1.3;">
                    \${h(sampleV)}\${vCount > 2 ? \` <span class="mono" style="color:#0284c7;">+\${vCount - 2} more</span>\` : ''}
                  </div>
                  <div style="font-size:10.5px;color:#64748b;margin-top:1px;">Mandal: <b>\${h(o.mandal || 'Chittoor')}</b></div>
                \`;
              } else {
                const vCount = o.jurisdictionCount || (o.assignedVillages || []).length;
                const sampleV = (o.assignedVillages || []).slice(0, 2).map(v => v.name || v.village_name).join(', ');
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip">👤 <b>\${vCount} Revenue Village(s) Assigned</b></div>
                  <div style="font-size:11px;color:#475569;margin-top:3px;max-width:240px;line-height:1.3;">
                    \${h(sampleV)}\${vCount > 2 ? \` <span class="mono" style="color:#0284c7;">+\${vCount - 2} more</span>\` : ''}
                  </div>
                  <div style="font-size:10.5px;color:#64748b;margin-top:1px;">Mandal: <b>\${h(o.mandal || 'Chittoor')}</b></div>
                \`;
              }

              return \`
                <tr id="officer-row-\${o.id}">
                  <td class="mono font-bold" style="color:#64748b;">\${idx + 1}</td>
                  <td>
                    <div style="font-weight:800;color:#0f172a;font-size:13px;">\${h(o.name)}</div>
                    <div style="font-size:11px;color:\${meta.cadre === 'revenue' ? '#ea580c' : '#0284c7'};font-weight:700;margin:1px 0;">
                      \${h(o.role || meta.title)}
                    </div>
                    \${o.phone ? \`
                    <div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                      <span>📞 <a href="tel:\${o.phone}" style="color:#0369a1;font-weight:700;font-family:var(--mono);">\${h(o.phone)}</a></span>
                      <span class="wa-sheet-phone-badge" style="background:#dcfce7;color:#15803d;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">✓ In Sheet</span>
                    </div>
                  \` : \`
                    <div style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                      <span style="color:#94a3b8;font-style:italic;">📞 Not in Spreadsheet</span>
                      <span style="background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">(Awaiting in Sheet)</span>
                    </div>
                  \`}
                  </td>
                  <td>
                    \${jurisdictionRender}
                  </td>
                  <td>
                    \${isZeroToday ? \`
                      <span class="badge-poor-pill" style="margin-bottom:2px;">⚠️ ZERO TODAY</span>
                      <div class="mono font-bold" style="color:#ef4444;font-size:11.5px;">0.00 Ac <small>(Lagging)</small></div>
                    \` : \`
                      <span class="text-emerald font-bold mono" style="font-size:12px;">+\${formatExtent(o.today_gt_extent)} Ac</span>
                    \`}
                    <div style="font-size:10.5px;color:#64748b;margin-top:2px;">
                      DLR Today: <b class="mono" style="color:#0f172a;">\${o.dlr_entries_today || 0} entries</b>
                    </div>
                  </td>
                  <td>
                    <div class="mono" style="font-weight:700;color:#b91c1c;">
                      \${formatExtent(o.balance_gt_extent)} Ac GT
                    </div>
                    \${(o.dlr_entries_balance || 0) > 0 ? \`
                      <div style="font-size:10.5px;color:#d97706;font-weight:700;">
                        🔒 \${o.dlr_entries_balance} Khatas Pending
                      </div>
                    \` : ''}
                    <div style="font-size:10.5px;color:#dc2626;font-weight:800;margin-top:2px;">
                      ⚠️ \${o.laggingCount || 0} lagging village(s)
                    </div>
                  </td>
                  <td>
                    \${(o.lagReasons || []).map(r => \`
                      <div style="font-size:11px;color:#b91c1c;margin-bottom:2px;line-height:1.3;">
                        • \${h(r)}
                      </div>
                    \`).join('')}
                  </td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button type="button" class="wa-preview-pill" data-action="preview-officer" data-oid="\${o.id}" title="Preview formatted official notice">
                      👁️ Preview
                    </button>
                    <button type="button" class="wa-single-send-btn" data-action="send-officer" data-oid="\${o.id}" title="Send notice to \${h(o.name)} via WhatsApp">
                      ➤ Send Notice
                    </button>
                  </td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    \`;
  }

  const initialMeta = getTierMeta();
  const surveyTotalFlagged = counts.vs + counts.mlso + counts.dios;
  const revenueTotalFlagged = counts.vro + counts.tahsildar + counts.rdo;

  root.innerHTML = \`
    <!-- POLISHED HEADER -->
    <div class="content-heading wa-header-polished">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 4px 12px rgba(16,185,129,0.25);">
          📱
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:18px;font-weight:800;color:var(--navy);">Meta WhatsApp Cloud API &amp; Resurvey Accountability Hub</h3>
            <span class="arch-badge-live \${isLiveMode ? 'is-live' : 'is-sim'}" style="background:\${isLiveMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)'};border:1px solid \${isLiveMode ? '#10b981' : '#eab308'};color:\${isLiveMode ? '#059669' : '#b45309'};font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;">
              \${isLiveMode ? '🟢 Meta Cloud API: LIVE GRAPH API' : '🟡 Simulation Mode: Webhook Online · Verified'}
            </span>
          </div>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">
            Direct Monitoring Engine · Survey Cadre alerts by <b>DSLRO, Chittoor</b> · Revenue Cadre alerts by <b>Joint Collector, Chittoor</b>.
          </p>
        </div>
      </div>
      <div class="content-actions">
        <button class="primary-button" id="wa-save-config-btn" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;">
          \${icon('check')} Save Webhook Settings
        </button>
      </div>
    </div>

    <!-- ⏰ AUTOMATED DAILY 6:00 AM SCHEDULE BANNER CARD -->
    <div class="wa-schedule-banner-card">
      <div class="wa-sched-left">
        <div class="wa-sched-icon">⏰</div>
        <div>
          <div class="wa-sched-title">
            <b>Automated Daily 06:00 AM IST WhatsApp Dispatch Engine</b>
            <span class="wa-sched-live-pill">● ACTIVE CRON (30 0 * * * UTC / 06:00 IST)</span>
          </div>
          <div class="wa-sched-subtitle">
            Scheduled alerts automatically broadcast to all officers with poor progress of GT &amp; DLR logins up to VS and VRO every morning.
          </div>
          <div class="wa-sched-routing-chips">
            <span class="wa-route-chip survey">📐 <b>Survey Cadre</b> (VS, MLSO, DIOS) ➔ Official Sender: <b>DSLRO, Chittoor</b></span>
            <span class="wa-route-chip revenue">🏛️ <b>Revenue Cadre</b> (VRO, Tahsildars, RDOs) ➔ Official Sender: <b>Joint Collector, Chittoor</b></span>
          </div>
        </div>
      </div>
      <div class="wa-sched-right">
        <button type="button" class="wa-trigger-sched-btn" id="wa-trigger-schedule-btn">
          ▶ Trigger Scheduled 06:00 AM Dispatch Now
        </button>
        <div class="wa-sched-last-run" id="wa-sched-last-run-label">
          Next Scheduled Run: Tomorrow at 06:00 AM IST
        </div>
      </div>
    </div>

    <!-- 🏛️ CADRE SWITCHER & TIER SELECTOR CARDS -->
    <div class="wa-cadres-container">
      <div class="wa-cadre-nav-tabs">
        <button type="button" class="wa-cadre-nav-btn active survey-tab" data-cadre-tab="survey">
          <div>
            <span style="font-size:15px;">📐</span> <b>SURVEY CADRE</b>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Issued by <b>DSLRO, Chittoor</b></div>
          </div>
          <span class="wa-cadre-badge-count" id="wa-survey-total-badge">\${surveyTotalFlagged} Flagged</span>
        </button>
        <button type="button" class="wa-cadre-nav-btn revenue-tab" data-cadre-tab="revenue">
          <div>
            <span style="font-size:15px;">🏛️</span> <b>REVENUE CADRE</b>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Issued by <b>Joint Collector, Chittoor</b></div>
          </div>
          <span class="wa-cadre-badge-count revenue" id="wa-revenue-total-badge">\${revenueTotalFlagged} Flagged</span>
        </button>
      </div>

      <!-- SURVEY CADRE RADIO GROUP (VS / MLSO / DIOS) -->
      <div class="wa-tier-radio-container" id="wa-survey-radio-group">
        <div class="wa-tier-radio-title">
          <span>🔘</span> SELECT SURVEY CADRE TIER (Official Directives Issued by <b>DSLRO, Chittoor</b>):
        </div>
        <div class="wa-tier-radio-group">
          <label class="wa-tier-radio-card active" data-tier-radio="vs">
            <input type="radio" name="wa-tier-selector" value="vs" checked />
            <div class="wa-radio-indicator"></div>
            <div class="wa-radio-info">
              <div class="wa-radio-name">👤 Village Surveyors (VS)</div>
              <div class="wa-radio-sub">Jurisdiction fixed by assigned revenue villages</div>
            </div>
            <span class="wa-radio-pill" id="wa-pill-vs">\${counts.vs} Flagged</span>
          </label>

          <label class="wa-tier-radio-card" data-tier-radio="mlso">
            <input type="radio" name="wa-tier-selector" value="mlso" />
            <div class="wa-radio-indicator"></div>
            <div class="wa-radio-info">
              <div class="wa-radio-name">🏛️ Mandal Level Survey Officers (MLSO)</div>
              <div class="wa-radio-sub">Monitoring assigned villages across 27 Mandals</div>
            </div>
            <span class="wa-radio-pill" id="wa-pill-mlso">\${counts.mlso} Flagged</span>
          </label>

          <label class="wa-tier-radio-card" data-tier-radio="dios">
            <input type="radio" name="wa-tier-selector" value="dios" />
            <div class="wa-radio-indicator"></div>
            <div class="wa-radio-info">
              <div class="wa-radio-name">⭐ Deputy Inspectors of Survey (DIOS)</div>
              <div class="wa-radio-sub">6 DIOS Officers monitoring all 27 Mandals</div>
            </div>
            <span class="wa-radio-pill" id="wa-pill-dios">\${counts.dios} Flagged</span>
          </label>
        </div>
      </div>

      <!-- REVENUE CADRE RADIO GROUP (VRO / TAHSILDAR / RDO) -->
      <div class="wa-tier-radio-container" id="wa-revenue-radio-group" style="display:none;">
        <div class="wa-tier-radio-title" style="color:#9a3412;">
          <span>🔘</span> SELECT REVENUE CADRE TIER (Official Directives Issued by <b>Joint Collector, Chittoor</b>):
        </div>
        <div class="wa-tier-radio-group">
          <label class="wa-tier-radio-card revenue-card" data-tier-radio="vro">
            <input type="radio" name="wa-tier-selector" value="vro" />
            <div class="wa-radio-indicator"></div>
            <div class="wa-radio-info">
              <div class="wa-radio-name">✍️ Village Revenue Officers (VRO)</div>
              <div class="wa-radio-sub">Door-to-door khata verification &amp; DLR clearance</div>
            </div>
            <span class="wa-radio-pill revenue" id="wa-pill-vro">\${counts.vro} Flagged</span>
          </label>

          <label class="wa-tier-radio-card revenue-card" data-tier-radio="tahsildar">
            <input type="radio" name="wa-tier-selector" value="tahsildar" />
            <div class="wa-radio-indicator"></div>
            <div class="wa-radio-info">
              <div class="wa-radio-name">🏢 Tahsildars (Mandal Level)</div>
              <div class="wa-radio-sub">Mandal revenue executives across 27 Mandals</div>
            </div>
            <span class="wa-radio-pill revenue" id="wa-pill-tahsildar">\${counts.tahsildar} Flagged</span>
          </label>

          <label class="wa-tier-radio-card revenue-card" data-tier-radio="rdo">
            <input type="radio" name="wa-tier-selector" value="rdo" />
            <div class="wa-radio-indicator"></div>
            <div class="wa-radio-info">
              <div class="wa-radio-name">⚖️ Revenue Divisional Officers (RDO)</div>
              <div class="wa-radio-sub">4 Revenue Divisions (Chittoor, Palamaner, Kuppam, Nagari)</div>
            </div>
            <span class="wa-radio-pill revenue" id="wa-pill-rdo">\${counts.rdo} Flagged</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 🚨 POOR PERFORMING OFFICERS BROADCAST CARD -->
    <section class="wa-broadcast-card">
      <div class="wa-broadcast-header">
        <div class="wa-broadcast-title">
          <span style="font-size:24px;">🚨</span>
          <div>
            <h3 id="wa-card-main-title">Poor Performing Village Surveyors (VS) Progress Notice</h3>
            <p style="font-size:12px;color:#64748b;margin:2px 0 0;" id="wa-card-sub-title">
              Daily performance extracted from Ground Truthing (GT) and DLR registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(initialMeta.defaultSender)}</b>.
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="wa-broadcast-badge" id="wa-card-badge">\${counts.vs} Flagged</span>
        </div>
      </div>

      <!-- 🔘 BULK MESSAGE SENDING RADIO BUTTON SELECTOR -->
      <div class="wa-bulk-radio-strip">
        <div class="wa-bulk-strip-header">
          <div class="wa-bulk-strip-title">
            <span>🔘</span> <b>MESSAGE DISPATCH &amp; BULK BROADCAST MODE:</b>
          </div>
          <span style="font-size:11.5px;color:#64748b;">Select radio option to trigger single or bulk WhatsApp notice broadcast</span>
        </div>

        <div class="wa-bulk-radios-grid">
          <!-- Radio 1: Individual Row-by-Row Mode -->
          <label class="wa-bulk-radio-card active" data-bulk-radio="individual">
            <input type="radio" name="wa-dispatch-type-selector" value="individual" checked />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">👤 Individual Send Mode</div>
              <div class="wa-bulk-radio-subtext">Review officer &amp; dispatch single notice</div>
            </div>
            <span class="wa-bulk-radio-pill individual">Single Dispatch</span>
          </label>

          <!-- Radio 2: Bulk Send to All Flagged Officers in Tier -->
          <label class="wa-bulk-radio-card" data-bulk-radio="bulk-all">
            <input type="radio" name="wa-dispatch-type-selector" value="bulk-all" />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">⚡ Bulk Send: All Flagged in Tier</div>
              <div class="wa-bulk-radio-subtext">Broadcast notices to all flagged officers in tier</div>
            </div>
            <span class="wa-bulk-radio-pill bulk" id="wa-radio-all-count">\${counts.vs} Officers</span>
          </label>

          <!-- Radio 3: Bulk Send to Zero GT Today -->
          <label class="wa-bulk-radio-card" data-bulk-radio="bulk-zero-gt">
            <input type="radio" name="wa-dispatch-type-selector" value="bulk-zero-gt" />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">⚠️ Bulk Send: Zero GT Today</div>
              <div class="wa-bulk-radio-subtext">Broadcast to officers with 0.00 Ac progress</div>
            </div>
            <span class="wa-bulk-radio-pill zero-gt" id="wa-radio-gt-count">0 Officers</span>
          </label>

          <!-- Radio 4: Bulk Send to DLR Pending -->
          <label class="wa-bulk-radio-card" data-bulk-radio="bulk-dlr">
            <input type="radio" name="wa-dispatch-type-selector" value="bulk-dlr" />
            <div class="wa-bulk-radio-indicator"></div>
            <div class="wa-bulk-radio-text">
              <div class="wa-bulk-radio-heading">🔒 Bulk Send: DLR Pending</div>
              <div class="wa-bulk-radio-subtext">Broadcast to officers with pending DLR entries</div>
            </div>
            <span class="wa-bulk-radio-pill dlr" id="wa-radio-dlr-count">0 Officers</span>
          </label>
        </div>

        <!-- DYNAMIC BULK BROADCAST ACTION BAR (Visible when any Bulk Radio is selected) -->
        <div class="wa-bulk-execute-panel" id="wa-bulk-execute-panel" style="display:none;">
          <div class="wa-bulk-panel-message">
            <div class="wa-bulk-panel-main" id="wa-bulk-panel-main">
              ⚡ Ready to broadcast official WhatsApp notices
            </div>
            <div class="wa-bulk-panel-desc" id="wa-bulk-panel-desc">
              Notices will be issued signed by <b>\${h(initialMeta.defaultSender)}</b> to officers with phone numbers verified in Google Spreadsheet.
            </div>
          </div>
          <button type="button" class="wa-bulk-send-btn-active" id="wa-bulk-send-btn">
            ⚡ Execute Bulk Broadcast Now
          </button>
        </div>
      </div>

      <!-- KPI TILES (DYNAMIC) -->
      <div class="wa-stats-grid" id="wa-stats-container">
        \${renderStatsHtml()}
      </div>

      <!-- CONTROL BAR: TABS, SEARCH, SENDER -->
      <div class="wa-control-strip">
        <div class="wa-filter-tabs">
          <button type="button" class="wa-tab-btn active" data-tab-cat="all">All Flagged</button>
          <button type="button" class="wa-tab-btn" data-tab-cat="GT">Zero GT Today</button>
          <button type="button" class="wa-tab-btn" data-tab-cat="DLR">DLR Pending</button>
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:11.5px;font-weight:700;color:#0f172a;white-space:nowrap;">Sender Title:</label>
            <input type="text" id="wa-sender-override-input" value="\${h(initialMeta.defaultSender)}" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:700;width:170px;" />
          </div>
          <input type="text" id="wa-officer-search-input" placeholder="Search officer, mandal, village..." style="padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;width:220px;" />
        </div>
      </div>

      <!-- OFFICERS TABLE CONTAINER -->
      <div id="wa-officers-table-wrap">
        \${renderTableHtml(getFilteredOfficers())}
      </div>
    </section>

    <!-- TWO COLUMN: SIMULATOR & WEBHOOK CONFIGURATION -->
    <div class="wa-grid-2col">
      <!-- LEFT: CHAT SIMULATOR -->
      <section class="section-card" style="padding:16px;">
        <div class="wa-sim-wrap">
          <div class="wa-sim-header">
            <div class="wa-sim-profile">
              <div class="wa-sim-avatar">🏛️</div>
              <div>
                <div class="wa-sim-name">Chittoor Resurvey Query Service</div>
                <div class="wa-sim-status">● Online · Official WhatsApp Bot</div>
              </div>
            </div>
            <span style="font-size:11px;color:#8696a0;">Meta Verified</span>
          </div>

          <div class="wa-sim-messages" id="wa-chat-window">
            <div class="wa-bubble incoming">
              Welcome to the Official WhatsApp Query Service! 📲<br><br>
              You can instantly query resurvey status for any of the <b>736 revenue villages</b> or <b>27 mandals</b>.<br><br>
              <i>Try typing a village or mandal name below:</i>
              <div class="wa-bubble-time">System</div>
            </div>
          </div>

          <div class="wa-chips-row">
            <span class="wa-chip" data-wa-chip="Belupalli">Belupalli</span>
            <span class="wa-chip" data-wa-chip="Bangarupalem">Bangarupalem</span>
            <span class="wa-chip" data-wa-chip="SUMMARY">District Summary</span>
            <span class="wa-chip" data-wa-chip="PDF">Full District PDF</span>
            <span class="wa-chip" data-wa-chip="ROVERS">Rovers</span>
            <span class="wa-chip" data-wa-chip="DLR">DLR Logins</span>
          </div>

          <div class="wa-sim-input-bar">
            <input type="text" id="wa-sim-text-input" class="wa-sim-input" placeholder="Type a village, mandal, or command (e.g. Bangarupalem)..." />
            <button type="button" id="wa-sim-send-btn" class="wa-sim-send-btn" title="Send query">➤</button>
          </div>
        </div>
      </section>

      <!-- RIGHT: WEBHOOK CREDENTIALS & GRAPH API CONFIG -->
      <section class="section-card" style="padding:16px;">
        <div class="section-header" style="margin-bottom:12px;">
          <div>
            <h3 style="font-size:15px;">Meta Cloud API &amp; Webhook Credentials</h3>
            <p style="font-size:12px;">Settings saved to secure persistent configuration.</p>
          </div>
          <span class="tiny-status completed">Config Valid</span>
        </div>

        <div class="form-grid" style="display:grid;gap:10px;">
          <label class="form-field">
            <span style="font-size:11px;font-weight:700;">Callback Webhook URL (Public Vercel HTTPS)</span>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="text" readonly value="\${h(webhookUrl)}" id="wa-webhook-url-input" style="font-family:var(--mono);font-size:11px;background:#f8fafc;" />
              <button type="button" class="table-action-button copy-badge-btn" data-copy="\${h(webhookUrl)}">Copy</button>
            </div>
          </label>

          <label class="form-field">
            <span style="font-size:11px;font-weight:700;">Verify Token</span>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="text" value="\${h(verifyToken)}" id="wa-verify-token-input" style="font-family:var(--mono);font-size:11px;" />
              <button type="button" class="table-action-button copy-badge-btn" data-copy="\${h(verifyToken)}">Copy</button>
            </div>
          </label>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <label class="form-field">
              <span style="font-size:11px;font-weight:700;">Phone Number ID</span>
              <input type="text" value="\${h(c.phoneNumberId || '')}" id="wa-phone-id-input" placeholder="e.g. 104829104928" style="font-family:var(--mono);font-size:11px;" />
            </label>
            <label class="form-field">
              <span style="font-size:11px;font-weight:700;">WABA Business Account ID</span>
              <input type="text" value="\${h(c.wabaId || '')}" id="wa-waba-input" placeholder="e.g. 91823901923" style="font-family:var(--mono);font-size:11px;" />
            </label>
          </div>

          <label class="form-field">
            <span style="font-size:11px;font-weight:700;">Permanent System Access Token</span>
            <input type="password" value="\${h(c.accessToken || '')}" id="wa-token-input" placeholder="EAAB..." style="font-family:var(--mono);font-size:11px;" />
          </label>

          <label class="form-field">
            <span style="font-size:11px;font-weight:700;">Official Notice Header Sender Title</span>
            <input type="text" value="\${h(c.senderName || initialMeta.defaultSender)}" id="wa-sender-name-input" style="font-size:12px;font-weight:700;" />
          </label>
        </div>
      </section>
    </div>

    <!-- LOGS OF RECENT WHATSAPP DISPATCHES -->
    <section class="section-card" style="margin-top:16px;">
      <div class="section-header">
        <div>
          <h3>Live WhatsApp Inbound &amp; Outbound Notice Logs</h3>
          <p>Real-time audit record of WhatsApp notices dispatched to officers across Chittoor district.</p>
        </div>
      </div>
      <div id="wa-logs-table-container">
        \${renderLogsTable(logs)}
      </div>
    </section>

    <!-- NOTICE PREVIEW MODAL -->
    <div id="wa-preview-modal-backdrop" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;padding:16px;">
      <div style="background:#ffffff;border-radius:12px;max-width:560px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
          <div style="font-weight:800;font-size:14px;color:#0f172a;display:flex;align-items:center;gap:8px;">
            <span>📱</span> WhatsApp Notice Preview
          </div>
          <button type="button" id="wa-close-preview-btn" style="border:none;background:transparent;font-size:18px;cursor:pointer;color:#64748b;">✕</button>
        </div>
        <div style="padding:16px;overflow-y:auto;flex:1;background:#efeae2;">
          <div id="wa-modal-notice-content" style="background:#ffffff;padding:14px;border-radius:8px;font-family:sans-serif;font-size:12.5px;line-height:1.5;white-space:pre-wrap;box-shadow:0 1px 2px rgba(0,0,0,0.1);color:#111b21;"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <button type="button" id="wa-modal-cancel-btn" style="padding:7px 14px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Cancel</button>
          <button type="button" id="wa-modal-send-btn" class="wa-single-send-btn" style="margin:0;">➤ Send WhatsApp Notice Now</button>
        </div>
      </div>
    </div>
  \`;

  function renderLogsTable(logList) {
    if (!logList || !logList.length) {
      return emptyBlock('No notices dispatched yet', 'All incoming queries and outgoing official notices will be logged here.', 'refresh');
    }
    return \`
      <div style="overflow-x:auto;">
        <table class="performance-table" style="font-size:11.5px;">
          <thead>
            <tr>
              <th>TIME</th>
              <th>DIRECTION</th>
              <th>OFFICER &amp; TIER</th>
              <th>JURISDICTION</th>
              <th>PHONE</th>
              <th>OFFICIAL SENDER</th>
              <th>NOTICE PREVIEW</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            \${logList.slice(0, 50).map(l => \`
              <tr>
                <td class="mono" style="white-space:nowrap;font-size:11px;">\${formatDate(l.timestamp)}</td>
                <td>
                  <span class="tiny-status \${l.direction === 'INBOUND' ? 'completed' : 'pending'}" style="font-size:10px;">
                    \${l.direction === 'INBOUND' ? '📥 INBOUND' : '📤 DIRECTIVE'}
                  </span>
                </td>
                <td style="font-weight:700;">
                  \${h(l.recipientName || l.from || 'Officer')}
                  <div style="font-size:10.5px;color:#64748b;">\${h(l.recipientRole || l.officerTier || '')}</div>
                </td>
                <td>\${h(l.jurisdiction || l.mandal || '')}</td>
                <td class="mono font-bold" style="color:#0369a1;">\${h(l.to || l.from || '')}</td>
                <td style="font-weight:800;color:\${l.sender && l.sender.includes('Joint Collector') ? '#c2410c' : '#047857'};">\${h(l.sender || l.senderName || defaultSender)}</td>
                <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;" title="\${h(l.fullText || l.replyPreview)}">
                  \${h(l.replyPreview || l.query || '')}
                </td>
                <td>
                  <span class="status-pill \${l.status === 'Delivered' ? 'active' : (l.status === 'Simulated' ? 'draft' : 'delayed')}" style="font-size:10.5px;">
                    \${l.status === 'Delivered' ? '✓ Delivered' : (l.status === 'Simulated' ? '🟡 Simulated' : '⚠️ Failed')}
                  </span>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    \`;
  }

  const statsContainer = document.getElementById('wa-stats-container');
  const tableContainer = document.getElementById('wa-officers-table-wrap');
  const searchInput = document.getElementById('wa-officer-search-input');
  const senderOverride = document.getElementById('wa-sender-override-input');
  const saveBtn = document.getElementById('wa-save-config-btn');
  const mainTitle = document.getElementById('wa-card-main-title');
  const subTitle = document.getElementById('wa-card-sub-title');
  const cardBadge = document.getElementById('wa-card-badge');
  const bulkSendBtn = document.getElementById('wa-bulk-send-btn');
  const triggerScheduleBtn = document.getElementById('wa-trigger-schedule-btn');

  function updateView() {
    const meta = getTierMeta();
    const filtered = getFilteredOfficers();
    const active = getActiveOfficers();

    const zeroToday = active.filter(o => (parseFloat(o.today_gt_extent) || 0) === 0 && (parseFloat(o.balance_gt_extent) || 0) > 0);
    const dlrPending = active.filter(o => (o.dlr_entries_balance || 0) > 0);

    const radioAllCount = document.getElementById('wa-radio-all-count');
    const radioGtCount = document.getElementById('wa-radio-gt-count');
    const radioDlrCount = document.getElementById('wa-radio-dlr-count');

    if (radioAllCount) radioAllCount.textContent = \`\${active.length} Officers\`;
    if (radioGtCount) radioGtCount.textContent = \`\${zeroToday.length} Officers\`;
    if (radioDlrCount) radioDlrCount.textContent = \`\${dlrPending.length} Officers\`;

    if (mainTitle) mainTitle.textContent = \`Poor Performing \${meta.title} Progress Notice\`;
    if (subTitle) subTitle.innerHTML = \`Daily performance extracted from Ground Truthing (GT) and DLR registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(senderOverride?.value.trim() || meta.defaultSender)}</b>.\`;
    if (cardBadge) cardBadge.textContent = \`\${active.length} Flagged\`;

    const bulkPanel = document.getElementById('wa-bulk-execute-panel');
    const bulkPanelMain = document.getElementById('wa-bulk-panel-main');
    const bulkPanelDesc = document.getElementById('wa-bulk-panel-desc');

    if (currentBulkMode === 'individual') {
      if (bulkPanel) bulkPanel.style.display = 'none';
    } else {
      if (bulkPanel) bulkPanel.style.display = 'flex';
      let targetList = active;
      let targetLabel = \`All \${meta.title}\`;
      if (currentBulkMode === 'bulk-zero-gt') {
        targetList = zeroToday;
        targetLabel = \`Zero GT Progress Today (\${meta.short})\`;
      } else if (currentBulkMode === 'bulk-dlr') {
        targetList = dlrPending;
        targetLabel = \`DLR Pending Clearance (\${meta.short})\`;
      }

      const withPhone = targetList.filter(o => o.phone && o.phone.trim().length >= 10);
      const withoutPhone = targetList.filter(o => !o.phone || o.phone.trim().length < 10);

      if (bulkPanelMain) {
        bulkPanelMain.textContent = \`⚡ Bulk WhatsApp Broadcast Queue: \${targetLabel} (\${targetList.length} Flagged)\`;
      }
      if (bulkPanelDesc) {
        bulkPanelDesc.innerHTML = \`Directives issued from <b>\${h(senderOverride?.value.trim() || meta.defaultSender)}</b>. <b>\${withPhone.length}</b> verified with Spreadsheet phones. \${withoutPhone.length > 0 ? \`<span style="color:#b91c1c;">(\${withoutPhone.length} lacking sheet phone will be skipped)</span>\` : ''}\`;
      }
      if (bulkSendBtn) {
        bulkSendBtn.textContent = \`⚡ Broadcast Notices to \${withPhone.length} Verified \${meta.short}\`;
        bulkSendBtn.disabled = withPhone.length === 0;
      }
    }

    if (statsContainer) statsContainer.innerHTML = renderStatsHtml();
    if (tableContainer) {
      tableContainer.innerHTML = renderTableHtml(filtered);
      attachTableActions();
    }
  }

  // Cadre Tab Navigation (Survey Cadre vs Revenue Cadre)
  document.querySelectorAll('[data-cadre-tab]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-cadre-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCadre = btn.dataset.cadreTab;

      const surveyGroup = document.getElementById('wa-survey-radio-group');
      const revenueGroup = document.getElementById('wa-revenue-radio-group');

      if (currentCadre === 'survey') {
        if (surveyGroup) surveyGroup.style.display = 'block';
        if (revenueGroup) revenueGroup.style.display = 'none';
        currentTier = 'vs';
      } else {
        if (surveyGroup) surveyGroup.style.display = 'none';
        if (revenueGroup) revenueGroup.style.display = 'block';
        currentTier = 'vro';
      }

      // Sync active tier radio card
      document.querySelectorAll('[data-tier-radio]').forEach(c => {
        c.classList.toggle('active', c.dataset.tierRadio === currentTier);
        const radio = c.querySelector('input[type="radio"]');
        if (radio) radio.checked = (c.dataset.tierRadio === currentTier);
      });

      const meta = getTierMeta();
      if (senderOverride) senderOverride.value = meta.defaultSender;
      currentCategory = 'all';
      document.querySelectorAll('[data-tab-cat]').forEach(b => b.classList.toggle('active', b.dataset.tabCat === 'all'));

      updateView();
    };
  });

  // Bulk Message Sending Radio Button click handlers
  document.querySelectorAll('[data-bulk-radio]').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('[data-bulk-radio]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      currentBulkMode = card.dataset.bulkRadio;

      if (currentBulkMode === 'bulk-zero-gt') {
        currentCategory = 'GT';
      } else if (currentBulkMode === 'bulk-dlr') {
        currentCategory = 'DLR';
      } else {
        currentCategory = 'all';
      }

      document.querySelectorAll('[data-tab-cat]').forEach(b => {
        b.classList.toggle('active', b.dataset.tabCat === currentCategory);
      });

      updateView();
    };
  });

  // Tier Radio button click handlers (VS, MLSO, DIOS, VRO, Tahsildar, RDO)
  document.querySelectorAll('[data-tier-radio]').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('[data-tier-radio]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      currentTier = card.dataset.tierRadio;

      const meta = getTierMeta();
      if (senderOverride) senderOverride.value = meta.defaultSender;

      currentCategory = 'all';
      document.querySelectorAll('[data-tab-cat]').forEach(b => b.classList.remove('active'));
      const allBtn = document.querySelector('[data-tab-cat="all"]');
      if (allBtn) allBtn.classList.add('active');
      updateView();
    };
  });

  // Category filter buttons
  document.querySelectorAll('[data-tab-cat]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-tab-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.tabCat;
      updateView();
    };
  });

  // Search input
  if (searchInput) {
    searchInput.oninput = () => {
      searchQuery = searchInput.value;
      if (tableContainer) {
        tableContainer.innerHTML = renderTableHtml(getFilteredOfficers());
        attachTableActions();
      }
    };
  }

  // Trigger Scheduled Daily 6:00 AM broadcast immediately
  if (triggerScheduleBtn) {
    triggerScheduleBtn.onclick = async () => {
      const confirmRun = confirm(
        '⏰ TRIGGER DAILY 06:00 AM WHATSAPP BROADCAST\\n\\n' +
        'This will immediately execute the automated morning dispatch across all 6 cadres:\\n' +
        '• Survey Cadre (VS, MLSO, DIOS) ➔ Signed by DSLRO, Chittoor\\n' +
        '• Revenue Cadre (VRO, Tahsildars, RDOs) ➔ Signed by Joint Collector, Chittoor\\n\\n' +
        'Strict Spreadsheet Phone Policy will be applied.\\n\\n' +
        'Proceed with dispatch now?'
      );

      if (!confirmRun) return;

      triggerScheduleBtn.disabled = true;
      triggerScheduleBtn.innerHTML = '⏳ <span>Dispatching 06:00 AM Broadcast...</span>';

      try {
        const res = await api('/api/cron/daily-whatsapp-alerts', { method: 'POST' });
        const sum = res.summary || {};
        toast(\`Daily 06:00 AM Broadcast completed! Targeted: \${sum.totalTargeted || 0}, Dispatched: \${sum.totalDispatched || 0}\`, 'success');
        triggerScheduleBtn.innerHTML = '✓ Broadcast Executed';
        triggerScheduleBtn.style.background = '#059669';

        const lastLabel = document.getElementById('wa-sched-last-run-label');
        if (lastLabel) {
          lastLabel.textContent = \`Last Executed: Today at \${new Date().toLocaleTimeString()} · Next: Tomorrow at 06:00 AM IST\`;
        }

        const freshLogs = await api('/api/whatsapp/logs');
        const logsWrap = document.getElementById('wa-logs-table-container');
        if (logsWrap) logsWrap.innerHTML = renderLogsTable(freshLogs.logs || []);
      } catch (err) {
        toast(\`Failed to execute daily broadcast: \${err.message}\`, 'error');
        triggerScheduleBtn.disabled = false;
        triggerScheduleBtn.innerHTML = '▶ Trigger Scheduled 06:00 AM Dispatch Now';
      }
    };
  }

  // Notice preview modal logic
  const modalBackdrop = document.getElementById('wa-preview-modal-backdrop');
  const modalNoticeBody = document.getElementById('wa-modal-notice-content');
  const modalCloseBtn = document.getElementById('wa-close-preview-btn');
  const modalCancelBtn = document.getElementById('wa-modal-cancel-btn');
  const modalSendBtn = document.getElementById('wa-modal-send-btn');
  let currentModalOfficer = null;

  function closeModal() {
    if (modalBackdrop) modalBackdrop.style.display = 'none';
    currentModalOfficer = null;
  }

  if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
  if (modalCancelBtn) modalCancelBtn.onclick = closeModal;
  if (modalBackdrop) {
    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) closeModal();
    };
  }

  function formatModalNoticeText(officer, tier, senderTitle) {
    const meta = getTierMeta();
    const effectiveSender = senderTitle || meta.defaultSender;

    // 1. DIOS Notice (Survey Cadre)
    if (tier === 'dios') {
      const mandalsStr = (officer.assignedMandals || []).join(', ') || officer.mandal;
      const laggingMandalsStr = (officer.laggingMandals || []).join(', ') || 'None';
      const breakdownLines = Object.entries(officer.mandalProgress || {}).map(([m, p]) => {
        const isLag = p.lagging > 0 || (p.balGt > 0 && p.todayGt === 0);
        return \`• *\${m}:* Today: \${formatExtent(p.todayGt)} Ac · Bal: \${formatExtent(p.balGt)} Ac \${isLag ? \`(⚠️ \${p.lagging} Lagging)\` : '✅'}\`;
      }).join('\\n');

      return \`🚨 *DIVISION RESURVEY MONITORING DIRECTIVE*
🏛️ *OFFICE OF THE DISTRICT SURVEY & LAND RECORDS OFFICER (DSLRO)*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (Deputy Inspector of Survey - DIOS)
Jurisdiction: *\${officer.assignedMandalsCount || (officer.assignedMandals || []).length} Mandals Assigned* (\${mandalsStr})
Total Universe: *\${officer.totalVillagesInDivision} Revenue Villages*

⚠️ *FLAGGED: DIVISION PERFORMANCE REVIEW & LAG ALERT*
In your assigned jurisdiction of \${officer.assignedMandalsCount || (officer.assignedMandals || []).length} Mandals, *\${officer.laggingMandalsCount || 0} Mandals* and *\${officer.laggingCount} Villages* are lagging behind district milestones.

📊 *DIVISION DAILY EXTRACTED PERFORMANCE:*
• Today's Division GT Out-turn: *\${formatExtent(officer.today_gt_extent)} Acres*
• Division Balance GT Extent: *\${formatExtent(officer.balance_gt_extent)} Acres*
• Division DLR Logins Today: *\${officer.dlr_entries_today || 0} Entries*
• Division DLR Pending Balance: *\${officer.dlr_entries_balance || 0} Khatas*
• Critical Lagging Mandals: *\${laggingMandalsStr}*

📋 *MANDAL PROGRESS BREAKDOWN IN YOUR CHARGE:*
\${breakdownLines}

⚠️ *URGENT DIRECTIVE FROM DSLRO, CHITTOOR:*
As Deputy Inspector of Survey (DIOS), you are instructed to conduct immediate physical field inspections across lagging Mandals in your jurisdiction. Review all Mandal Surveyors and Village Surveyors without delay and submit action taken report.

🌐 *Live District Resurvey Dashboard:*
\${window.location.origin}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
District Survey & Land Records Officer
Chittoor District, Government of Andhra Pradesh\`;
    }

    // 2. MLSO Notice (Survey Cadre)
    if (tier === 'mlso' || tier === 'ms') {
      const zeroVillages = (officer.laggingVillages || []).filter(v => (v.today_gt_extent || 0) === 0).length;
      const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
        \`• *\${v.village_name}* (Code: \\\`\${v.village_code}\\\`): Today: \${formatExtent(v.today_gt_extent)} Ac, Bal: \${formatExtent(v.balance_gt_extent)} Ac\`
      ).join('\\n');

      return \`🚨 *MANDAL LEVEL SURVEY OFFICER (MLSO) DIRECTIVE*
🏛️ *OFFICE OF THE DISTRICT SURVEY & LAND RECORDS OFFICER (DSLRO)*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (Mandal Level Survey Officer - MLSO)
Jurisdiction: *\${officer.mandal} Mandal* (\${officer.jurisdictionCount} Revenue Villages)

⚠️ *FLAGGED: POOR RESURVEY PERFORMANCE IN MANDAL*
Resurvey progress in *\${officer.mandal} Mandal* is lagging behind the target schedule. Out of \${officer.jurisdictionCount} revenue villages, *\${officer.laggingCount} villages are flagged for severe lag*.

📊 *MANDAL DAILY EXTRACTED PERFORMANCE:*
• Today's Mandal GT Out-Turn: *\${formatExtent(officer.today_gt_extent)} Acres*
• Total Pending GT Balance: *\${formatExtent(officer.balance_gt_extent)} Acres*
• Today's DLR Clearances: *\${officer.dlr_entries_today || 0} Entries*
• DLR Pending Khatas: *\${officer.dlr_entries_balance || 0} Khatas*
• Villages with Zero Progress Today: *\${zeroVillages} Villages*

⚠️ *KEY LAGGING REVENUE VILLAGES:*
\${sampleVillages}

⚠️ *DIRECTIVE FOR MANDAL LEVEL SURVEY OFFICER (MLSO):*
Convene an immediate review with all Village Surveyors in \${officer.mandal} Mandal. Inspect rover ground positions, resolve boundary conflicts, and ensure daily out-turn benchmark is met.

🌐 *Live Mandal Village Dashboard:*
\${window.location.origin}/report/mandal-villages?mandal=\${encodeURIComponent(officer.mandal)}

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
District Survey & Land Records Officer
Chittoor District, Government of Andhra Pradesh\`;
    }

    // 3. VRO Notice (Revenue Cadre)
    if (tier === 'vro') {
      const mandalNames = Array.from(officer.mandals || []).join(', ') || officer.mandal || 'Chittoor';
      const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
        \`• *\${v.village_name}* (Code: \\\`\${v.village_code}\\\`): Today: \${formatExtent(v.today_gt_extent)} Ac, DLR Bal: \${v.dlr_entries_balance || 0} Khatas\`
      ).join('\\n');

      return \`🚨 *VILLAGE REVENUE OFFICER (VRO) DLR & RESURVEY DIRECTIVE*
🏛️ *COLLECTORATE & REVENUE ADMINISTRATION*
*Chittoor District, Government of Andhra Pradesh*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (Village Revenue Officer - VRO)
Jurisdiction: *\${officer.jurisdictionCount} Revenue Village(s) Assigned*
Mandal: *\${mandalNames}*

⚠️ *FLAGGED: DLR KHATA CLEARANCE & RESURVEY PROGRESS LAG*
You are hereby instructed regarding resurvey milestones in your assigned revenue villages. As Village Revenue Officer, door-to-door khata verification, title record scrutiny, and clearing pending khatas in DLR @ VRO Login is your primary official responsibility.

📊 *DAILY EXTRACTED PERFORMANCE (TODAY):*
• Today's GT Extent: *\${formatExtent(officer.today_gt_extent)} Acres*
• Total Pending GT Balance: *\${formatExtent(officer.balance_gt_extent)} Acres*
• DLR Pending Khatas: *\${officer.dlr_entries_balance || 0} Khatas*
• DLR Entries Cleared Today: *\${officer.dlr_entries_today || 0} Entries*

⚠️ *ASSIGNED REVENUE VILLAGES:*
\${sampleVillages}

⚠️ *URGENT DIRECTIVE FROM JOINT COLLECTOR:*
Immediately clear all pending Khatas in DLR @ VRO Login. Coordinate closely with Village Surveyors in field ground truthing, resolve land dispute objections on the ground, and submit action taken report by evening.

🌐 *Live District Resurvey Dashboard:*
\${window.location.origin}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Joint Collector & Additional District Magistrate
Chittoor District, Government of Andhra Pradesh\`;
    }

    // 4. Tahsildar Notice (Revenue Cadre)
    if (tier === 'tahsildar' || tier === 'tah') {
      const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
        \`• *\${v.village_name}* (Code: \\\`\${v.village_code}\\\`): Today: \${formatExtent(v.today_gt_extent)} Ac, DLR Bal: \${v.dlr_entries_balance || 0} Khatas\`
      ).join('\\n');

      return \`🚨 *TAHSILDAR RESURVEY & DLR MONITORING DIRECTIVE*
🏛️ *COLLECTORATE & REVENUE ADMINISTRATION*
*Chittoor District, Government of Andhra Pradesh*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (Tahsildar - Mandal Revenue Executive)
Jurisdiction: *\${officer.mandal} Mandal* (\${officer.jurisdictionCount} Revenue Villages)

⚠️ *FLAGGED: MANDAL DLR CLEARANCE & RESURVEY REVIEW*
Performance review for *\${officer.mandal} Mandal* indicates lagging progress in digital land record verification and ground truthing milestones.

📊 *MANDAL DAILY PERFORMANCE:*
• Today's GT Out-turn: *\${formatExtent(officer.today_gt_extent)} Acres*
• Pending GT Balance: *\${formatExtent(officer.balance_gt_extent)} Acres*
• Mandal DLR Pending Khatas: *\${officer.dlr_entries_balance || 0} Khatas*
• DLR Clearances Today: *\${officer.dlr_entries_today || 0} Khatas*
• Severe Lagging Villages: *\${officer.laggingCount} Villages*

⚠️ *KEY LAGGING REVENUE VILLAGES:*
\${sampleVillages}

⚠️ *EXECUTIVE DIRECTIVE FROM JOINT COLLECTOR:*
As Tahsildar, convene immediate coordination review with all VROs and MLSOs in \${officer.mandal} Mandal. Ensure zero pendency at Tahsildar login, issue Section 13 notices on schedule, and clear bottleneck disputes.

🌐 *Live Mandal Dashboard:*
\${window.location.origin}/report/mandal-villages?mandal=\${encodeURIComponent(officer.mandal)}

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Joint Collector & Additional District Magistrate
Chittoor District, Government of Andhra Pradesh\`;
    }

    // 5. RDO Notice (Revenue Cadre)
    if (tier === 'rdo') {
      const mandalsStr = (officer.assignedMandals || []).join(', ') || officer.division;
      const laggingMandalsStr = (officer.laggingMandals || []).join(', ') || 'None';

      return \`🚨 *REVENUE DIVISIONAL OFFICER (RDO) RESURVEY DIRECTIVE*
🏛️ *COLLECTORATE & REVENUE ADMINISTRATION*
*Chittoor District, Government of Andhra Pradesh*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (Revenue Divisional Officer - RDO)
Jurisdiction: *\${officer.division} Division* (\${officer.jurisdictionCount} Mandals · \${officer.totalVillagesInDivision} Villages)
Mandals: \${mandalsStr}

⚠️ *FLAGGED: DIVISION RESURVEY & DLR PENDENCY ALERT*
In *\${officer.division} Division*, *\${officer.laggingMandalsCount || 0} Mandals* and *\${officer.laggingCount} Villages* are lagging behind target schedules for Ground Truthing and DLR logins.

📊 *DIVISION EXTRACTED PERFORMANCE:*
• Today's Division GT Progress: *\${formatExtent(officer.today_gt_extent)} Acres*
• Division Balance GT Extent: *\${formatExtent(officer.balance_gt_extent)} Acres*
• Division DLR Pending Khatas: *\${officer.dlr_entries_balance || 0} Khatas*
• Critical Lagging Mandals: *\${laggingMandalsStr}*

⚠️ *DIRECTIVE FROM JOINT COLLECTOR:*
Conduct an immediate divisional review with Tahsildars, MLSOs, and DIOS in your jurisdiction. Inspect rover field operations in lagging villages and ensure target milestones are met without fail.

🌐 *Live District Resurvey Dashboard:*
\${window.location.origin}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Joint Collector & Additional District Magistrate
Chittoor District, Government of Andhra Pradesh\`;
    }

    // 6. VS Notice (Survey Cadre)
    const mandalNames = Array.from(officer.mandals || []).join(', ') || officer.mandal || 'Chittoor';
    const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
      \`• *\${v.village_name}* (Code: \\\`\${v.village_code}\\\`): Today: \${formatExtent(v.today_gt_extent)} Ac, Bal: \${formatExtent(v.balance_gt_extent)} Ac\`
    ).join('\\n');

    return \`🚨 *VILLAGE SURVEYOR (VS) PERFORMANCE NOTICE*
🏛️ *OFFICE OF THE DISTRICT SURVEY & LAND RECORDS OFFICER (DSLRO)*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (Village Surveyor - VS)
Jurisdiction: *\${officer.jurisdictionCount} Revenue Villages Assigned*
Mandal: *\${mandalNames}*

⚠️ *FLAGGED: POOR RESURVEY PROGRESS / PERFORMANCE LAG*
You are assigned to monitor \${officer.jurisdictionCount} revenue villages in your jurisdiction, of which *\${officer.laggingCount} villages are lagging* behind daily milestones.

📊 *DAILY EXTRACTED PERFORMANCE (TODAY):*
• Today's GT Progress: *\${formatExtent(officer.today_gt_extent)} Acres*
• Total Pending GT Balance: *\${formatExtent(officer.balance_gt_extent)} Acres*
• Today's DLR Clearances: *\${officer.dlr_entries_today || 0} Khatas*
• DLR Pending Balance: *\${officer.dlr_entries_balance || 0} Khatas*

⚠️ *LAGGING REVENUE VILLAGES IN YOUR CHARGE:*
\${sampleVillages}

⚠️ *DIRECTIVE FOR IMMEDIATE ACTION:*
Accelerate ground truthing and DLR verification in your assigned revenue villages immediately. Field teams must be mobilized and daily progress uploaded without fail.

🌐 *Live District Resurvey Dashboard:*
\${window.location.origin}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
District Survey & Land Records Officer
Chittoor District, Government of Andhra Pradesh\`;
  }

  function attachTableActions() {
    document.querySelectorAll('[data-action="preview-officer"]').forEach(btn => {
      btn.onclick = () => {
        const oid = btn.dataset.oid;
        const officer = getActiveOfficers().find(x => x.id === oid);
        if (!officer) return;
        currentModalOfficer = officer;
        const meta = getTierMeta();
        const sender = senderOverride?.value.trim() || meta.defaultSender;
        const text = formatModalNoticeText(officer, currentTier, sender);
        if (modalNoticeBody) modalNoticeBody.textContent = text;
        if (modalBackdrop) modalBackdrop.style.display = 'flex';
      };
    });

    document.querySelectorAll('[data-action="send-officer"]').forEach(btn => {
      btn.onclick = async () => {
        const oid = btn.dataset.oid;
        const officer = getActiveOfficers().find(x => x.id === oid);
        if (!officer) return;

        let phoneOverride = '';
        if (!officer.phone) {
          const promptMsg = \`Phone number for \${officer.name} (\${officer.role}) is not present in the Google Spreadsheet link.\\n\\n\` +
            \`Rule: Phone numbers are strictly taken from the Google Spreadsheet link.\\n\\n\` +
            \`If you wish to dispatch to \${officer.name} directly, enter the verified 10-digit mobile number, or press Cancel:\`;
          const entered = prompt(promptMsg, '');
          if (!entered) return;
          phoneOverride = entered.replace(/\\D/g, '');
          if (phoneOverride.length < 10) {
            toast('Please enter a valid 10-digit mobile number.', 'error');
            return;
          }
        }

        const meta = getTierMeta();
        const senderTitle = senderOverride?.value.trim() || meta.defaultSender;
        btn.disabled = true;
        btn.textContent = '⏳ Sending...';

        try {
          const res = await api('/api/whatsapp/send-officer-notice', {
            method: 'POST',
            body: JSON.stringify({ officerId: oid, tier: currentTier, senderTitle, phoneOverride })
          });
          toast(\`Notice sent to \${officer.name} (\${officer.role}) from \${senderTitle}!\`, 'success');
          btn.textContent = '✓ Sent';
          btn.style.background = '#059669';
          const freshLogs = await api('/api/whatsapp/logs');
          const logsWrap = document.getElementById('wa-logs-table-container');
          if (logsWrap) logsWrap.innerHTML = renderLogsTable(freshLogs.logs || []);
        } catch (err) {
          toast(\`Failed to send notice: \${err.message}\`, 'error');
          btn.disabled = false;
          btn.textContent = '➤ Send Notice';
        }
      };
    });
  }

  if (modalSendBtn) {
    modalSendBtn.onclick = async () => {
      if (!currentModalOfficer) return;
      const officer = currentModalOfficer;
      const meta = getTierMeta();
      const senderTitle = senderOverride?.value.trim() || meta.defaultSender;

      let phoneOverride = '';
      if (!officer.phone) {
        const promptMsg = \`Phone number for \${officer.name} (\${officer.role}) is not present in the Google Spreadsheet link.\\n\\n\` +
          \`Rule: Phone numbers are strictly taken from the Google Spreadsheet link.\\n\\n\` +
          \`Enter verified 10-digit mobile number to dispatch, or press Cancel:\`;
        const entered = prompt(promptMsg, '');
        if (!entered) return;
        phoneOverride = entered.replace(/\\D/g, '');
        if (phoneOverride.length < 10) {
          toast('Please enter a valid 10-digit mobile number.', 'error');
          return;
        }
      }

      modalSendBtn.disabled = true;
      modalSendBtn.textContent = '⏳ Sending...';

      try {
        await api('/api/whatsapp/send-officer-notice', {
          method: 'POST',
          body: JSON.stringify({ officerId: officer.id, tier: currentTier, senderTitle, phoneOverride })
        });
        toast(\`Notice sent to \${officer.name} from \${senderTitle}!\`, 'success');
        closeModal();
        const freshLogs = await api('/api/whatsapp/logs');
        const logsWrap = document.getElementById('wa-logs-table-container');
        if (logsWrap) logsWrap.innerHTML = renderLogsTable(freshLogs.logs || []);
      } catch (err) {
        toast(\`Failed to send notice: \${err.message}\`, 'error');
      } finally {
        modalSendBtn.disabled = false;
        modalSendBtn.textContent = '➤ Send WhatsApp Notice Now';
      }
    };
  }

  // Bulk Tier Broadcast Button (Controlled by Radio Button)
  if (bulkSendBtn) {
    bulkSendBtn.onclick = async () => {
      const active = getActiveOfficers();
      let targetList = active;
      if (currentBulkMode === 'bulk-zero-gt') {
        targetList = active.filter(o => (parseFloat(o.today_gt_extent) || 0) === 0 && (parseFloat(o.balance_gt_extent) || 0) > 0);
      } else if (currentBulkMode === 'bulk-dlr') {
        targetList = active.filter(o => (o.dlr_entries_balance || 0) > 0);
      }

      const meta = getTierMeta();
      const senderTitle = senderOverride?.value.trim() || meta.defaultSender;
      const count = targetList.length;

      const withPhone = targetList.filter(o => o.phone && o.phone.trim().length >= 10);
      const withoutPhone = targetList.filter(o => !o.phone || o.phone.trim().length < 10);

      let confirmMsg = \`Are you sure you want to broadcast official resurvey directives to \${count} flagged \${meta.title}?\\n\\n\` +
        \`• Cadre Hierarchy: \${meta.cadreTitle}\\n\` +
        \`• Official Directives issued from: "\${senderTitle}"\\n\` +
        \`• Live monitoring links will be attached to each officer notice.\\n\`;

      if (withoutPhone.length > 0) {
        confirmMsg += \`\\n⚠️ STRICT SPREADSHEET POLICY:\\n\` +
          \`• \${withPhone.length} officers have phone numbers verified from Google Spreadsheets.\\n\` +
          \`• \${withoutPhone.length} officers do NOT have phone numbers in the linked spreadsheets and will be skipped until updated in the Google Spreadsheet.\\n\`;
      }

      confirmMsg += \`\\nClick OK to proceed with dispatch.\`;

      if (!confirm(confirmMsg)) return;

      if (withPhone.length === 0) {
        toast(\`Cannot broadcast: None of the \${count} officers in this tier have phone numbers in the Google Spreadsheet link. Please update the Google Spreadsheet.\`, 'error');
        return;
      }

      bulkSendBtn.disabled = true;
      bulkSendBtn.innerHTML = \`⏳ <span>Dispatching notices to \${withPhone.length} \${meta.short}...</span>\`;

      try {
        const oids = withPhone.map(o => o.id);
        const res = await api('/api/whatsapp/broadcast-tier-notices', {
          method: 'POST',
          body: JSON.stringify({ tier: currentTier, officerIds: oids, senderTitle })
        });

        const rep = res.report || {};
        toast(\`Broadcast complete! Dispatched \${rep.sentCount || rep.totalDispatches || withPhone.length} notices from \${senderTitle}.\`, 'success');
        bulkSendBtn.innerHTML = \`✓ Dispatched (\${rep.sentCount || rep.totalDispatches || withPhone.length})\`;
        bulkSendBtn.style.background = '#059669';

        const freshLogs = await api('/api/whatsapp/logs');
        const logsWrap = document.getElementById('wa-logs-table-container');
        if (logsWrap) logsWrap.innerHTML = renderLogsTable(freshLogs.logs || []);
      } catch (err) {
        toast(\`Broadcast failed: \${err.message}\`, 'error');
        bulkSendBtn.disabled = false;
        bulkSendBtn.textContent = \`⚡ Broadcast Notices to \${withPhone.length} Verified \${meta.short}\`;
      }
    };
  }

  attachTableActions();

  // Attach interactive chat simulator logic
  const chatWindow = document.getElementById('wa-chat-window');
  const chatInput = document.getElementById('wa-sim-text-input');
  const sendBtn = document.getElementById('wa-sim-send-btn');

  async function sendSimQuery(query) {
    if (!query) return;
    const userBubble = document.createElement('div');
    userBubble.className = 'wa-bubble outgoing';
    userBubble.innerHTML = \`\${h(query)}<div class="wa-bubble-time">\${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>\`;
    chatWindow.appendChild(userBubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const botLoading = document.createElement('div');
    botLoading.className = 'wa-bubble incoming';
    botLoading.innerHTML = \`<i>Typing...</i><div class="wa-bubble-time">System</div>\`;
    chatWindow.appendChild(botLoading);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
      const res = await api('/api/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      botLoading.innerHTML = \`\${res.result ? res.result.replace(/\\n/g, '<br>') : 'Query processed successfully.'}<div class="wa-bubble-time">\${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>\`;
    } catch (err) {
      botLoading.innerHTML = \`<span style="color:#ef4444;">Error: \${h(err.message)}</span><div class="wa-bubble-time">\${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>\`;
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  if (sendBtn && chatInput) {
    sendBtn.onclick = () => {
      const q = chatInput.value.trim();
      chatInput.value = '';
      sendSimQuery(q);
    };
    chatInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const q = chatInput.value.trim();
        chatInput.value = '';
        sendSimQuery(q);
      }
    };
  }

  document.querySelectorAll('[data-wa-chip]').forEach(chip => {
    chip.onclick = () => {
      sendSimQuery(chip.dataset.waChip);
    };
  });

  // Save Webhook Settings button
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        const verifyTokenVal = document.getElementById('wa-verify-token-input')?.value.trim();
        const phoneIdVal = document.getElementById('wa-phone-id-input')?.value.trim();
        const tokenVal = document.getElementById('wa-token-input')?.value.trim();
        const wabaVal = document.getElementById('wa-waba-input')?.value.trim();
        const senderNameVal = document.getElementById('wa-sender-name-input')?.value.trim();

        await api('/api/whatsapp/config', {
          method: 'POST',
          body: JSON.stringify({
            verifyToken: verifyTokenVal,
            phoneNumberId: phoneIdVal,
            accessToken: tokenVal,
            wabaId: wabaVal,
            senderName: senderNameVal
          })
        });

        toast('Webhook settings saved successfully!', 'success');
      } catch (err) {
        toast(\`Failed to save settings: \${err.message}\`, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = \`\${icon('check')} Save Webhook Settings\`;
      }
    };
  }

  // Copy badges
  document.querySelectorAll('.copy-badge-btn').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.copy;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(val);
        const originalText = btn.textContent;
        btn.textContent = 'Copied! ✓';
        setTimeout(() => btn.textContent = originalText, 2000);
      }
    };
  });
}`;

['app.js', 'public/app.js'].forEach(fileName => {
  const filePath = path.join(rootDir, fileName);
  let code = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

  const startMarker = 'async function renderWhatsApp() {';
  const endMarker = 'function render() {';

  const startIndex = code.indexOf(startMarker);
  const endIndex = code.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error(`Could not find renderWhatsApp boundaries in ${fileName}`);
    process.exit(1);
  }

  const updatedCode = code.slice(0, startIndex) + newRenderWhatsApp + '\n\n' + code.slice(endIndex);
  fs.writeFileSync(filePath, updatedCode, 'utf8');
  console.log(`✓ Successfully updated renderWhatsApp in ${fileName}`);
});

console.log('Done patching frontend.');
