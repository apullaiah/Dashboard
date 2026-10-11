const fs = require('fs');
const path = require('path');

const publicAppPath = path.join(__dirname, '../public/app.js');
const rootAppPath = path.join(__dirname, '../app.js');

let code = fs.readFileSync(publicAppPath, 'utf8');

const startMarker = 'async function renderWhatsApp() {';
const endMarker = 'function render() {';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find renderWhatsApp function boundaries in public/app.js');
  process.exit(1);
}

const newRenderWhatsApp = `async function renderWhatsApp() {
  root.innerHTML = \`<div class="empty-block"><div>\${icon('refresh')}<strong>Loading WhatsApp Resurvey Monitoring &amp; Notice Engine...</strong></div></div>\`;
  let cfgData = { config: {}, stats: {} };
  let logsData = { logs: [] };
  let tierData = { vs: [], ms: [], dios: [] };
  let counts = { vs: 0, ms: 0, dios: 0 };
  let defaultSender = 'AD, Chittoor';

  try {
    const [cfg, logs, vsRes, msRes, diosRes] = await Promise.all([
      api('/api/whatsapp/config').catch(() => ({ config: {}, stats: {} })),
      api('/api/whatsapp/logs').catch(() => ({ logs: [] })),
      api('/api/whatsapp/poor-officers?tier=vs').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/poor-officers?tier=ms').catch(() => ({ officers: [], count: 0 })),
      api('/api/whatsapp/poor-officers?tier=dios').catch(() => ({ officers: [], count: 0 }))
    ]);

    cfgData = cfg || {};
    logsData = logs || {};
    tierData.vs = vsRes.officers || [];
    tierData.ms = msRes.officers || [];
    tierData.dios = diosRes.officers || [];
    counts.vs = vsRes.count || tierData.vs.length;
    counts.ms = msRes.count || tierData.ms.length;
    counts.dios = diosRes.count || tierData.dios.length;
    defaultSender = vsRes.senderName || cfgData.config?.senderName || 'AD, Chittoor';
  } catch (e) {
    console.error('Error fetching initial WhatsApp officer data:', e);
  }

  const c = cfgData.config || {};
  const logs = logsData.logs || [];
  const webhookUrl = c.webhookUrl || \`\${window.location.origin}/api/whatsapp/webhook\`;
  const verifyToken = c.verifyToken || 'CTR_RESURVEY_WA_2026';
  const isLiveMode = c.mode === 'LIVE';

  let currentTier = 'vs';
  let currentCategory = 'all';
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
        const md = (o.mandal || (o.assignedMandals ? o.assignedMandals.join(' ') : '')).toLowerCase();
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
        title: 'District Inspectors of Survey (DIOS)',
        short: 'DIOS',
        unit: 'Mandals Assigned',
        scopeText: '6 DIOS Officers assigned across all 27 Mandals in Chittoor district',
        broadcastBtn: '⚡ Broadcast Notices to All Flagged District Inspectors (DIOS)'
      };
    }
    if (currentTier === 'ms') {
      return {
        title: 'Mandal Surveyors (MS)',
        short: 'MS',
        unit: 'Revenue Villages in Mandal',
        scopeText: '27 Mandals (Mandal Surveyors monitoring assigned revenue villages)',
        broadcastBtn: '⚡ Broadcast Notices to All Flagged Mandal Surveyors (MS)'
      };
    }
    return {
      title: 'Village Surveyors (VS)',
      short: 'VS',
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
              <th>OFFICER &amp; ROLE</th>
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
              if (currentTier === 'dios') {
                const mandals = o.assignedMandals || [];
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip">⭐ <b>\${o.assignedMandalsCount || mandals.length} Mandals Assigned</b></div>
                  <div class="wa-mandals-list-box">
                    \${mandals.map(m => \`<span class="wa-mandal-subchip">\${h(m)}</span>\`).join('')}
                  </div>
                  <div style="font-size:11px;color:#64748b;margin-top:2px;">Universe: <b>\${o.totalVillagesInDivision || 0} Villages</b></div>
                \`;
              } else if (currentTier === 'ms') {
                jurisdictionRender = \`
                  <div class="wa-jurisdiction-chip">🏛️ <b>\${o.jurisdictionCount} Revenue Villages</b></div>
                  <div style="font-weight:700;color:#0f172a;margin-top:2px;">\${h(o.mandal)} Mandal</div>
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
                    <div style="font-size:11px;color:#0284c7;font-weight:700;margin:1px 0;">
                      \${h(o.role || meta.title)}
                    </div>
                    <div style="font-size:11px;color:#475569;">
                      📞 <a href="tel:\${o.phone}" style="color:#0369a1;font-weight:700;font-family:var(--mono);">\${h(o.phone)}</a>
                    </div>
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
                    <button type="button" class="wa-preview-pill" data-action="preview-officer" data-oid="\${o.id}" title="Preview formatted WhatsApp notice from AD, Chittoor">
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

  root.innerHTML = \`
    <div class="content-heading">
      <div>
        <h3>Meta WhatsApp Cloud API &amp; Resurvey Accountability Hub</h3>
        <p>Direct Monitoring &amp; Notice Engine · Official Directives Issued by <b>AD, Chittoor</b>.</p>
      </div>
      <div class="content-actions">
        <button class="primary-button" id="wa-save-config-btn" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;">
          \${icon('check')} Save Webhook Settings
        </button>
      </div>
    </div>

    <!-- ARCHITECTURE BANNER -->
    <section class="whatsapp-arch-card">
      <div class="arch-header">
        <h3><span>📱</span> Architecture: WhatsApp Cloud API &amp; Webhook Service</h3>
        <span class="arch-badge-live">\${isLiveMode ? '🟢 Meta Cloud API: LIVE GRAPH API' : '🟡 Simulation Mode: Webhook Online · Verified'}</span>
      </div>
      <div class="arch-diagram-flow">
        <div class="arch-node wa-node">
          <div class="arch-node-icon">📱</div>
          <div class="arch-node-title">WhatsApp User</div>
          <div class="arch-node-sub">VS / MS / DIOS / Citizen</div>
        </div>
        <div class="arch-arrow">
          <span class="arch-arrow-line">⇄</span>
          <span class="arch-arrow-label">Query / Notice</span>
        </div>
        <div class="arch-node">
          <div class="arch-node-icon">☁️</div>
          <div class="arch-node-title">Meta WhatsApp Cloud API</div>
          <div class="arch-node-sub">Graph API v19.0</div>
        </div>
        <div class="arch-arrow">
          <span class="arch-arrow-line">⇄</span>
          <span class="arch-arrow-label">HTTPS Webhook</span>
        </div>
        <div class="arch-node active-node">
          <div class="arch-node-icon">🏛️</div>
          <div class="arch-node-title">Vercel Serverless Function</div>
          <div class="arch-node-sub">/api/whatsapp/webhook</div>
        </div>
        <div class="arch-arrow">
          <span class="arch-arrow-line">⇄</span>
          <span class="arch-arrow-label">JSON Sync</span>
        </div>
        <div class="arch-node">
          <div class="arch-node-icon">📊</div>
          <div class="arch-node-title">Monitoring Core</div>
          <div class="arch-node-sub">736 Villages · AD Chittoor</div>
        </div>
      </div>
    </section>

    <!-- 🔘 JURISDICTION TIER RADIO BUTTONS (VS / MS / DIOS) -->
    <div class="wa-tier-radio-container">
      <div class="wa-tier-radio-title">
        <span>🔘</span> SELECT OFFICER JURISDICTION TIER TO MONITOR &amp; ALERT:
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

        <label class="wa-tier-radio-card" data-tier-radio="ms">
          <input type="radio" name="wa-tier-selector" value="ms" />
          <div class="wa-radio-indicator"></div>
          <div class="wa-radio-info">
            <div class="wa-radio-name">🏛️ Mandal Surveyors (MS)</div>
            <div class="wa-radio-sub">Jurisdiction fixed across all 27 Mandals</div>
          </div>
          <span class="wa-radio-pill" id="wa-pill-ms">\${counts.ms} Flagged</span>
        </label>

        <label class="wa-tier-radio-card" data-tier-radio="dios">
          <input type="radio" name="wa-tier-selector" value="dios" />
          <div class="wa-radio-indicator"></div>
          <div class="wa-radio-info">
            <div class="wa-radio-name">⭐ District Inspectors (DIOS)</div>
            <div class="wa-radio-sub">Jurisdiction fixed by assigned Mandals (6 DIOS · 27 Mandals)</div>
          </div>
          <span class="wa-radio-pill" id="wa-pill-dios">\${counts.dios} Flagged</span>
        </label>
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
              Daily performance extracted from Ground Truthing (GT) and DLR entry registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(defaultSender)}</b>.
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="wa-broadcast-badge" id="wa-card-badge">\${counts.vs} Flagged</span>
          <button type="button" class="wa-dispatch-btn-primary" id="wa-bulk-send-btn">
            ⚡ Broadcast Notices to All Flagged Village Surveyors (VS)
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
            <input type="text" id="wa-sender-override-input" value="\${h(defaultSender)}" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:700;width:150px;" />
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

      <!-- RIGHT: META CLOUD API CONFIGURATION -->
      <section class="section-card">
        <div class="section-header">
          <div>
            <h3>Webhook Configuration (Vercel)</h3>
            <p>Paste these settings into Meta Developer Portal under WhatsApp &gt; Configuration.</p>
          </div>
        </div>

        <form id="wa-config-form" style="display:flex;flex-direction:column;gap:13px;">
          <div class="form-field">
            <label style="font-size:12px;font-weight:700;color:var(--navy);display:flex;justify-content:space-between;">
              <span>Callback URL (HTTPS Webhook)</span>
              <button type="button" class="copy-badge-btn" data-copy="\${webhookUrl}">Copy URL 📋</button>
            </label>
            <input type="text" readonly value="\${webhookUrl}" style="background:#f8fafc;font-family:var(--mono);font-size:12px;" />
            <small style="color:var(--muted);font-size:11px;">Configure this as the Webhook Callback URL in Meta Developer Dashboard.</small>
          </div>

          <div class="form-field">
            <label style="font-size:12px;font-weight:700;color:var(--navy);display:flex;justify-content:space-between;">
              <span>Verify Token</span>
              <button type="button" class="copy-badge-btn" data-copy="\${verifyToken}">Copy Token 📋</button>
            </label>
            <input type="text" id="wa-verify-token-input" value="\${verifyToken}" style="font-family:var(--mono);font-size:12px;" />
            <small style="color:var(--muted);font-size:11px;">Used by Meta to verify webhook challenge (GET request).</small>
          </div>

          <div class="form-field">
            <label style="font-size:12px;font-weight:700;color:var(--navy);">Meta Phone Number ID</label>
            <input type="text" id="wa-phone-id-input" value="\${h(c.phoneNumberId || '')}" placeholder="e.g. 109283746592019" />
            <small style="color:var(--muted);font-size:11px;">From Meta WhatsApp Getting Started section.</small>
          </div>

          <div class="form-field">
            <label style="font-size:12px;font-weight:700;color:var(--navy);">System User Access Token (Permanent)</label>
            <input type="password" id="wa-token-input" value="\${h(c.accessToken || '')}" placeholder="Bearer token from Meta System User" />
            <small style="color:var(--muted);font-size:11px;">Required to dispatch outgoing WhatsApp replies via Graph API.</small>
          </div>

          <div class="form-field">
            <label style="font-size:12px;font-weight:700;color:var(--navy);">WhatsApp Business Account ID (WABA)</label>
            <input type="text" id="wa-waba-input" value="\${h(c.wabaId || '')}" placeholder="e.g. 293847561029384" />
          </div>

          <div class="form-field">
            <label style="font-size:12px;font-weight:700;color:var(--navy);">Official Sender Identity / Designation</label>
            <input type="text" id="wa-sender-name-input" value="\${h(c.senderName || 'AD, Chittoor')}" placeholder="e.g. AD, Chittoor" />
            <small style="color:var(--muted);font-size:11px;">Displayed on all official WhatsApp progress notices issued to Surveyors &amp; Inspectors.</small>
          </div>

          <div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:11.5px;color:#166534;line-height:1.5;">
            ✅ <b>Jurisdiction Coverage:</b> All 6 DIOS officers, 27 Mandal Surveyors (MS), and Village Surveyors (VS) across all 736 villages are strictly audited with daily extracted performance figures.
          </div>
        </form>
      </section>
    </div>

    <!-- RECENT AUDIT LOGS -->
    <section class="section-card">
      <div class="section-header">
        <div>
          <h3>WhatsApp Outbound Notices &amp; Inbound Queries (\${logs.length})</h3>
          <p>Real-time audit trail of official notices dispatched by <b>\${h(defaultSender)}</b> and inbound queries processed.</p>
        </div>
      </div>
      <div id="wa-logs-table-container">
        \${renderLogsTable(logs)}
      </div>
    </section>

    <!-- NOTICE PREVIEW MODAL -->
    <div id="wa-preview-modal-backdrop" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;padding:16px;">
      <div style="background:#ffffff;border-radius:16px;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:1px solid #e2e8f0;">
        <div style="background:#0f172a;color:#ffffff;padding:16px 20px;border-top-left-radius:16px;border-top-right-radius:16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">📱</span>
            <strong style="font-size:15px;">WhatsApp Notice Preview · \${h(defaultSender)}</strong>
          </div>
          <button type="button" id="wa-close-preview-btn" style="background:transparent;border:none;color:#ffffff;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:20px;background:#f8fafc;">
          <div id="wa-modal-notice-content" style="background:#0b141a;color:#e9edef;padding:18px;border-radius:12px;font-family:inherit;font-size:12.5px;line-height:1.6;white-space:pre-wrap;box-shadow:inset 0 2px 8px rgba(0,0,0,0.4);border:1px solid #222e35;"></div>
        </div>
        <div style="padding:14px 20px;background:#ffffff;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:flex-end;gap:10px;">
          <button type="button" class="outline-button" id="wa-modal-cancel-btn">Close</button>
          <button type="button" class="primary-button" id="wa-modal-send-btn" style="background:#25d366;color:#ffffff;border:none;">
            ➤ Send WhatsApp Notice Now
          </button>
        </div>
      </div>
    </div>
  \`;

  function renderLogsTable(logsList) {
    if (!logsList || !logsList.length) {
      return emptyBlock('No WhatsApp interactions recorded yet', 'Outbound notices and inbound queries will appear here.', 'message');
    }
    return \`
      <table class="performance-table">
        <thead>
          <tr>
            <th>TIMESTAMP</th>
            <th>DIRECTION / TYPE</th>
            <th>OFFICER / RECIPIENT</th>
            <th>PHONE NUMBER</th>
            <th>JURISDICTION / QUERY</th>
            <th>SENDER</th>
            <th>STATUS</th>
            <th>NOTICE PREVIEW</th>
          </tr>
        </thead>
        <tbody>
          \${logsList.map(l => {
            const isNotice = l.direction === 'OUTBOUND_NOTICE' || (l.noticeType && l.noticeType.includes('NOTICE'));
            return \`
              <tr>
                <td class="mono" style="font-size:11px;">\${h(formatDate(l.timestamp))}</td>
                <td>
                  <span class="badge-status \${isNotice ? 'badge-poor-pill' : 'badge-completed'}">
                    \${isNotice ? '🚨 NOTICE OUT' : '📥 INBOUND'}
                  </span>
                </td>
                <td class="font-bold">\${h(l.recipientName || l.senderName || 'Officer')}</td>
                <td class="mono font-bold">\${h(l.to || l.from || '—')}</td>
                <td><span class="mandal-div-chip font-bold">\${h(l.jurisdiction || (l.villageName ? \`\${l.villageName} (\${l.mandal})\` : (l.query || '—')))}</span></td>
                <td style="font-size:11px;font-weight:700;color:var(--navy);">\${h(l.sender || defaultSender)}</td>
                <td><span class="tiny-status \${l.status === 'Delivered' ? 'status-completed' : (l.status === 'Simulated' ? 'status-progress' : 'status-pending')}">\${h(l.status)}</span></td>
                <td style="font-size:11px;color:var(--muted);max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="\${h(l.replyPreview || l.fullText)}">
                  \${h(l.replyPreview || '—')}
                </td>
              </tr>
            \`;
          }).join('')}
        </tbody>
      </table>
    \`;
  }

  // DOM Elements
  const tableContainer = document.getElementById('wa-officers-table-wrap');
  const statsContainer = document.getElementById('wa-stats-container');
  const searchInput = document.getElementById('wa-officer-search-input');
  const senderOverride = document.getElementById('wa-sender-override-input');
  const mainTitle = document.getElementById('wa-card-main-title');
  const subTitle = document.getElementById('wa-card-sub-title');
  const cardBadge = document.getElementById('wa-card-badge');
  const bulkSendBtn = document.getElementById('wa-bulk-send-btn');

  function updateView() {
    const meta = getTierMeta();
    const filtered = getFilteredOfficers();
    const active = getActiveOfficers();

    if (mainTitle) mainTitle.textContent = \`Poor Performing \${meta.title} Progress Notice\`;
    if (subTitle) subTitle.innerHTML = \`Daily performance extracted from Ground Truthing (GT) and DLR registers. Direct alerts dispatched via WhatsApp signed by <b>\${h(senderOverride?.value.trim() || defaultSender)}</b>.\`;
    if (cardBadge) cardBadge.textContent = \`\${active.length} Flagged\`;
    if (bulkSendBtn) {
      bulkSendBtn.textContent = meta.broadcastBtn;
      bulkSendBtn.disabled = false;
      bulkSendBtn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
    }

    if (statsContainer) statsContainer.innerHTML = renderStatsHtml();
    if (tableContainer) {
      tableContainer.innerHTML = renderTableHtml(filtered);
      attachTableActions();
    }
  }

  // Radio button click handlers
  document.querySelectorAll('[data-tier-radio]').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('[data-tier-radio]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      currentTier = card.dataset.tierRadio;
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
    const effectiveSender = senderTitle || defaultSender;

    if (tier === 'dios') {
      const mandalsStr = (officer.assignedMandals || []).join(', ') || officer.mandal;
      const laggingMandalsStr = (officer.laggingMandals || []).join(', ') || 'None';
      const breakdownLines = Object.entries(officer.mandalProgress || {}).map(([m, p]) => {
        const isLag = p.lagging > 0 || (p.balGt > 0 && p.todayGt === 0);
        return \`• *\${m}:* Today: \${formatExtent(p.todayGt)} Ac · Bal: \${formatExtent(p.balGt)} Ac \${isLag ? \`(⚠️ \${p.lagging} Lagging)\` : '✅'}\`;
      }).join('\\n');

      return \`🚨 *DIVISION RESURVEY MONITORING DIRECTIVE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (District Inspector of Survey - DIOS)
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

⚠️ *URGENT DIRECTIVE FROM AD, CHITTOOR:*
As District Inspector of Survey (DIOS), you are instructed to conduct immediate physical field inspections across lagging Mandals in your jurisdiction. Review all Mandal Surveyors and Village Surveyors without delay and submit action taken report.

🌐 *Live District Resurvey Dashboard:*
\${window.location.origin}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh\`;
    }

    if (tier === 'ms') {
      const zeroVillages = (officer.laggingVillages || []).filter(v => (v.today_gt_extent || 0) === 0).length;
      const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
        \`• *\${v.village_name}* (Code: \\\`\${v.village_code}\\\`): Today: \${formatExtent(v.today_gt_extent)} Ac, Bal: \${formatExtent(v.balance_gt_extent)} Ac\`
      ).join('\\n');

      return \`🚨 *MANDAL RESURVEY PROGRESS NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${officer.name}* (Mandal Surveyor - MS)
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

⚠️ *DIRECTIVE FOR MANDAL SURVEYOR:*
Convene an immediate review with all Village Surveyors in \${officer.mandal} Mandal. Inspect rover ground positions, resolve boundary conflicts, and ensure daily out-turn benchmark is met.

🌐 *Live Mandal Village Dashboard:*
\${window.location.origin}/report/mandal-villages?mandal=\${encodeURIComponent(officer.mandal)}

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh\`;
    }

    // VS Notice
    const mandalNames = Array.from(officer.mandals || []).join(', ') || officer.mandal || 'Chittoor';
    const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
      \`• *\${v.village_name}* (Code: \\\`\${v.village_code}\\\`): Today: \${formatExtent(v.today_gt_extent)} Ac, Bal: \${formatExtent(v.balance_gt_extent)} Ac\`
    ).join('\\n');

    return \`🚨 *VILLAGE SURVEYOR PERFORMANCE NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
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
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh\`;
  }

  function attachTableActions() {
    document.querySelectorAll('[data-action="preview-officer"]').forEach(btn => {
      btn.onclick = () => {
        const oid = btn.dataset.oid;
        const officer = getActiveOfficers().find(x => x.id === oid);
        if (!officer) return;
        currentModalOfficer = officer;
        const sender = senderOverride?.value.trim() || defaultSender;
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

        const senderTitle = senderOverride?.value.trim() || defaultSender;
        btn.disabled = true;
        btn.textContent = '⏳ Sending...';

        try {
          const res = await api('/api/whatsapp/send-officer-notice', {
            method: 'POST',
            body: JSON.stringify({ officerId: oid, tier: currentTier, senderTitle })
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
      const senderTitle = senderOverride?.value.trim() || defaultSender;

      modalSendBtn.disabled = true;
      modalSendBtn.textContent = '⏳ Sending...';

      try {
        await api('/api/whatsapp/send-officer-notice', {
          method: 'POST',
          body: JSON.stringify({ officerId: officer.id, tier: currentTier, senderTitle })
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

  // Bulk Tier Broadcast Button
  if (bulkSendBtn) {
    bulkSendBtn.onclick = async () => {
      const activeList = getFilteredOfficers();
      const meta = getTierMeta();
      const senderTitle = senderOverride?.value.trim() || defaultSender;
      const count = activeList.length;

      const confirmed = confirm(
        \`🏛️ BROADCAST CONFIRMATION\\n\\n\` +
        \`Sender Designation: \${senderTitle}\\n\` +
        \`Jurisdiction Tier: \${meta.title}\\n\` +
        \`Target Officers: \${count} flagged officers\\n\\n\` +
        \`Do you want to dispatch official WhatsApp notices to all \${count} flagged \${meta.short}?\`
      );

      if (!confirmed) return;

      bulkSendBtn.disabled = true;
      bulkSendBtn.innerHTML = \`⏳ <span>Dispatching notices to all \${meta.short}...</span>\`;

      try {
        const oids = activeList.map(o => o.id);
        const res = await api('/api/whatsapp/broadcast-tier-notices', {
          method: 'POST',
          body: JSON.stringify({ tier: currentTier, officerIds: oids, senderTitle })
        });

        const rep = res.report || {};
        toast(\`Broadcast complete! Dispatched \${rep.totalDispatches || count} notices from \${senderTitle}.\`, 'success');
        bulkSendBtn.innerHTML = \`✓ Dispatched (\${rep.totalDispatches || count})\`;
        bulkSendBtn.style.background = '#059669';

        const freshLogs = await api('/api/whatsapp/logs');
        const logsWrap = document.getElementById('wa-logs-table-container');
        if (logsWrap) logsWrap.innerHTML = renderLogsTable(freshLogs.logs || []);
      } catch (err) {
        toast(\`Broadcast failed: \${err.message}\`, 'error');
        bulkSendBtn.disabled = false;
        bulkSendBtn.textContent = meta.broadcastBtn;
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
      const rep = res.result?.reply || 'No response returned';
      botLoading.innerHTML = \`\${rep.replace(/\\n/g, '<br>').replace(/\\*([^*]+)\\*/g, '<b>$1</b>').replace(/_([^_]+)_/g, '<i>$1</i>')}<div class="wa-bubble-time">\${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>\`;
    } catch (e) {
      botLoading.innerHTML = \`❌ Error: \${h(e.message)}<div class="wa-bubble-time">System</div>\`;
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
      const val = chip.dataset.waChip;
      sendSimQuery(val);
    };
  });

  // Save Webhook Settings button
  const saveBtn = document.getElementById('wa-save-config-btn');
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
}
`;

const updatedCode = code.slice(0, startIndex) + newRenderWhatsApp + '\n\n' + code.slice(endIndex);

fs.writeFileSync(publicAppPath, updatedCode, 'utf8');
fs.writeFileSync(rootAppPath, updatedCode, 'utf8');

console.log('Successfully updated renderWhatsApp in public/app.js and app.js!');
console.log('New public/app.js size:', fs.statSync(publicAppPath).size);
console.log('New app.js size:', fs.statSync(rootAppPath).size);
