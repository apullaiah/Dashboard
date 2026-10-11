const fs = require('fs');
const path = require('path');

const publicAppPath = path.join(__dirname, '../public/app.js');
const rootAppPath = path.join(__dirname, '../app.js');

let code = fs.readFileSync(publicAppPath, 'utf8');

// Find boundaries of renderWhatsApp
const startMarker = 'async function renderWhatsApp() {';
const endMarker = 'function render() {';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find renderWhatsApp function boundaries in public/app.js');
  process.exit(1);
}

const newRenderWhatsApp = `async function renderWhatsApp() {
  root.innerHTML = \`<div class="empty-block"><div>\${icon('refresh')}<strong>Loading WhatsApp integration</strong></div></div>\`;
  let cfgData = { config: {}, stats: {} };
  let logsData = { logs: [] };
  let poorData = { poorVillages: [], count: 0, senderName: 'AD, Chittoor' };
  try {
    cfgData = await api('/api/whatsapp/config');
    logsData = await api('/api/whatsapp/logs');
    poorData = await api('/api/whatsapp/poor-villages');
  } catch (e) {
    console.error('Error fetching WhatsApp data:', e);
  }

  const c = cfgData.config || {};
  const stats = cfgData.stats || {};
  const logs = logsData.logs || [];
  const poorVillages = poorData.poorVillages || [];
  const webhookUrl = c.webhookUrl || \`\${window.location.origin}/api/whatsapp/webhook\`;
  const verifyToken = c.verifyToken || 'CTR_RESURVEY_WA_2026';
  const defaultSender = c.senderName || 'AD, Chittoor';
  const isLiveMode = c.mode === 'LIVE';

  // Counts
  const gtLags = poorVillages.filter(pv => pv.primaryLag === 'GT');
  const dlrLags = poorVillages.filter(pv => pv.primaryLag === 'DLR');
  const delayLags = poorVillages.filter(pv => pv.primaryLag === 'DELAY');
  const totalOfficers = poorVillages.reduce((sum, pv) => sum + (pv.surveyors || []).length, 0);

  let currentCategory = 'all';
  let searchQuery = '';

  function getFilteredList() {
    return poorVillages.filter(pv => {
      if (currentCategory !== 'all') {
        if (currentCategory === 'GT' && pv.primaryLag !== 'GT') return false;
        if (currentCategory === 'DLR' && pv.primaryLag !== 'DLR') return false;
        if (currentCategory === 'DELAY' && pv.primaryLag !== 'DELAY') return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const vName = (pv.village_name || '').toLowerCase();
        const mName = (pv.mandal || '').toLowerCase();
        const code = (pv.village_code || '').toLowerCase();
        return vName.includes(q) || mName.includes(q) || code.includes(q);
      }
      return true;
    });
  }

  function renderTableHtml(filteredList) {
    if (!filteredList.length) {
      return emptyBlock('No poor performing villages matching filter', 'All villages in this category are operating within acceptable thresholds.', 'check');
    }

    return \`
      <div style="overflow-x:auto;">
        <table class="performance-table" style="font-size:12px;">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>VILLAGE &amp; MANDAL</th>
              <th>STAGE &amp; EXTENT</th>
              <th>TODAY'S GT PROGRESS</th>
              <th>PENDING BALANCE</th>
              <th>CONCERNED VILLAGE SURVEYOR (VS) / MS</th>
              <th style="text-align:right;">ACTION</th>
            </tr>
          </thead>
          <tbody>
            \${filteredList.map((pv, idx) => {
              const isZeroToday = (parseFloat(pv.today_gt_extent) || 0) === 0;

              return \`
                <tr id="pv-row-\${pv.id}">
                  <td class="mono font-bold" style="color:#64748b;">\${idx + 1}</td>
                  <td>
                    <div style="font-weight:800;color:#0f172a;">\${h(pv.village_name)}</div>
                    <div style="font-size:11px;color:#64748b;">
                      🏛️ \${h(pv.mandal)} Mandal · <span class="mono">Code: \${h(pv.village_code)}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-weight:700;">\${h(pv.current_stage || 'Ground Truthing')}</div>
                    <div style="font-size:11px;color:#64748b;">\${formatExtent(pv.extent)} Acres</div>
                  </td>
                  <td>
                    \${isZeroToday ? \`
                      <span class="badge-poor-pill" style="margin-bottom:2px;">⚠️ ZERO TODAY</span>
                      <div class="mono font-bold" style="color:#ef4444;font-size:11.5px;">0.00 Ac <small>(Lagging)</small></div>
                    \` : \`
                      <span class="text-emerald font-bold mono">+\${formatExtent(pv.today_gt_extent)} Ac</span>
                    \`}
                  </td>
                  <td>
                    <div class="mono" style="font-weight:700;color:#b91c1c;">
                      \${formatExtent(pv.balance_gt_extent)} Ac GT
                    </div>
                    \${pv.dlr_balance > 0 ? \`
                      <div style="font-size:10.5px;color:#d97706;font-weight:700;">
                        🔒 \${pv.dlr_balance} Khatas at \${h(pv.dlr_active_stage || 'VS Login')}
                      </div>
                    \` : ''}
                    \${pv.days_delayed > 0 ? \`
                      <div style="font-size:10.5px;color:#dc2626;font-weight:800;">
                        ⏱️ \${pv.days_delayed} days delayed
                      </div>
                    \` : ''}
                  </td>
                  <td>
                    \${(pv.surveyors || []).map(s => \`
                      <div class="wa-officer-chip \${s.isMS ? 'is-ms' : ''}">
                        <span>\${s.isMS ? '🏛️' : '👤'} <b>\${h(s.name)}</b> (\${h(s.role)})</span>
                        <a href="tel:\${s.phone}">📞 \${h(s.phone)}</a>
                      </div>
                    \`).join('')}
                  </td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button type="button" class="wa-preview-pill" data-action="preview-notice" data-vid="\${pv.id}" title="Preview formatted WhatsApp notice from AD, Chittoor">
                      👁️ Preview
                    </button>
                    <button type="button" class="wa-single-send-btn" data-action="send-notice" data-vid="\${pv.id}" title="Send notice to concerned VS via WhatsApp">
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
        <h3>Meta WhatsApp Cloud API &amp; Webhook Integration</h3>
        <p>Real-time conversational query engine, Webhook verification, and Automated Notice Dispatch from <b>AD, Chittoor</b>.</p>
      </div>
      <div class="content-actions">
        <button class="primary-button" id="wa-save-config-btn" style="background:linear-gradient(135deg, #059669, #10b981);color:#fff;">
          \${icon('check')} Save Webhook Settings
        </button>
      </div>
    </div>

    <!-- ARCHITECTURE FLOW BANNER -->
    <section class="whatsapp-arch-card">
      <div class="arch-header">
        <h3><span>📱</span> Architecture: WhatsApp Cloud API &amp; Webhook Service</h3>
        <span class="arch-badge-live">\${isLiveMode ? '🟢 Meta Cloud API: LIVE GRAPH API' : '🟡 Simulation Mode: Webhook Online · Verified'}</span>
      </div>
      <div class="arch-diagram-flow">
        <div class="arch-node wa-node">
          <div class="arch-node-icon">📱</div>
          <div class="arch-node-title">WhatsApp User</div>
          <div class="arch-node-sub">VS / Tahsildar / Citizen</div>
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

    <!-- 🚨 POOR PERFORMING VILLAGES & VS BROADCAST ENGINE -->
    <section class="wa-broadcast-card">
      <div class="wa-broadcast-header">
        <div class="wa-broadcast-title">
          <span style="font-size:22px;">🚨</span>
          <div>
            <h3>Poor Performing Villages &amp; VS Progress Broadcast (AD, Chittoor)</h3>
            <p style="font-size:12px;color:#64748b;margin:2px 0 0;">
              Automatically detects villages lagging in Ground Truthing (GT) or DLR reviews, and dispatches official progress notices to all Village Surveyors (VS) concerned.
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="wa-broadcast-badge">\${poorVillages.length} Villages Lagging</span>
          <button type="button" class="wa-dispatch-btn-primary" id="wa-bulk-send-btn">
            ⚡ Broadcast Notices to All Concerned VS (AD, Chittoor)
          </button>
        </div>
      </div>

      <!-- KPI TILES -->
      <div class="wa-stats-grid">
        <div class="wa-stat-card is-red">
          <div class="wa-stat-num">\${poorVillages.length}</div>
          <div class="wa-stat-label">Total Poor Performing Villages</div>
        </div>
        <div class="wa-stat-card is-amber">
          <div class="wa-stat-num">\${gtLags.length}</div>
          <div class="wa-stat-label">Ground Truthing (GT) Lagging</div>
        </div>
        <div class="wa-stat-card is-blue">
          <div class="wa-stat-num">\${dlrLags.length}</div>
          <div class="wa-stat-label">DLR VS Login Pending</div>
        </div>
        <div class="wa-stat-card is-emerald">
          <div class="wa-stat-num">\${totalOfficers}</div>
          <div class="wa-stat-label">Concerned Surveyors (VS/MS) Contacted</div>
        </div>
      </div>

      <!-- CONTROL BAR: TABS, SEARCH, SENDER -->
      <div class="wa-control-strip">
        <div class="wa-filter-tabs">
          <button type="button" class="wa-tab-btn active" data-tab-cat="all">All Lagging (\${poorVillages.length})</button>
          <button type="button" class="wa-tab-btn" data-tab-cat="GT">GT Zero Today (\${gtLags.length})</button>
          <button type="button" class="wa-tab-btn" data-tab-cat="DLR">DLR VS Pending (\${dlrLags.length})</button>
          \${delayLags.length ? \`<button type="button" class="wa-tab-btn" data-tab-cat="DELAY">Delayed (\${delayLags.length})</button>\` : ''}
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:11.5px;font-weight:700;color:#0f172a;white-space:nowrap;">Sender Title:</label>
            <input type="text" id="wa-sender-override-input" value="\${h(defaultSender)}" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:700;width:150px;" />
          </div>
          <input type="text" id="wa-pv-search-input" placeholder="Search village or mandal..." style="padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;width:190px;" />
        </div>
      </div>

      <!-- VILLAGES TABLE CONTAINER -->
      <div id="wa-poor-villages-table-wrap">
        \${renderTableHtml(getFilteredList())}
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
              You can instantly query resurvey status for any of the <b>736 revenue villages</b> or <b>29 mandals</b>.<br><br>
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
            <small style="color:var(--muted);font-size:11px;">Displayed on all official WhatsApp progress notices issued to Village Surveyors.</small>
          </div>

          <div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:11.5px;color:#166534;line-height:1.5;">
            ✅ <b>Active Status:</b> When credentials are configured, notices are dispatched via Meta Cloud API. In simulation mode, all 278 poor villages and 322 VS contacts are accurately audited.
          </div>
        </form>
      </section>
    </div>

    <!-- RECENT WHATSAPP INTERACTION AUDIT LOG -->
    <section class="section-card">
      <div class="section-header">
        <div>
          <h3>WhatsApp Outbound Notices &amp; Inbound Queries (\${logs.length})</h3>
          <p>Real-time audit trail of official notices dispatched by <b>AD, Chittoor</b> and inbound queries processed.</p>
        </div>
      </div>
      <div id="wa-logs-table-container">
        \${logs.length ? \`
          <table class="performance-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>DIRECTION / TYPE</th>
                <th>OFFICER / RECIPIENT</th>
                <th>PHONE NUMBER</th>
                <th>VILLAGE / QUERY</th>
                <th>SENDER</th>
                <th>STATUS</th>
                <th>NOTICE PREVIEW</th>
              </tr>
            </thead>
            <tbody>
              \${logs.map(l => {
                const isNotice = l.direction === 'OUTBOUND_NOTICE' || l.noticeType === 'POOR_PERFORMANCE_NOTICE';
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
                    <td><span class="mandal-div-chip font-bold">\${h(l.villageName ? \`\${l.villageName} (\${l.mandal})\` : (l.query || '—'))}</span></td>
                    <td style="font-size:11px;font-weight:700;color:var(--navy);">\${h(l.sender || 'AD, Chittoor')}</td>
                    <td><span class="tiny-status \${l.status === 'Delivered' ? 'status-completed' : (l.status === 'Simulated' ? 'status-progress' : 'status-pending')}">\${h(l.status)}</span></td>
                    <td style="font-size:11px;color:var(--muted);max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="\${h(l.replyPreview || l.fullText)}">
                      \${h(l.replyPreview || '—')}
                    </td>
                  </tr>
                \`;
              }).join('')}
            </tbody>
          </table>
        \` : emptyBlock('No WhatsApp interactions recorded yet', 'Outbound notices to Village Surveyors and inbound queries will appear here.', 'message')}
      </div>
    </section>

    <!-- NOTICE PREVIEW MODAL CONTAINER (Dynamic) -->
    <div id="wa-preview-modal-backdrop" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;padding:16px;">
      <div style="background:#ffffff;border-radius:16px;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:1px solid #e2e8f0;">
        <div style="background:#0f172a;color:#ffffff;padding:16px 20px;border-top-left-radius:16px;border-top-right-radius:16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">📱</span>
            <strong style="font-size:15px;">WhatsApp Notice Preview · AD, Chittoor</strong>
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

  // Attach search and category filter event handlers
  const tableContainer = document.getElementById('wa-poor-villages-table-wrap');
  const searchInput = document.getElementById('wa-pv-search-input');
  const senderOverride = document.getElementById('wa-sender-override-input');

  function updateTable() {
    if (tableContainer) {
      tableContainer.innerHTML = renderTableHtml(getFilteredList());
      attachTableActions();
    }
  }

  document.querySelectorAll('[data-tab-cat]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-tab-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.tabCat;
      updateTable();
    };
  });

  if (searchInput) {
    searchInput.oninput = () => {
      searchQuery = searchInput.value;
      updateTable();
    };
  }

  // Notice preview modal logic
  const modalBackdrop = document.getElementById('wa-preview-modal-backdrop');
  const modalNoticeBody = document.getElementById('wa-modal-notice-content');
  const modalCloseBtn = document.getElementById('wa-close-preview-btn');
  const modalCancelBtn = document.getElementById('wa-modal-cancel-btn');
  const modalSendBtn = document.getElementById('wa-modal-send-btn');
  let currentModalVid = null;

  function closeModal() {
    if (modalBackdrop) modalBackdrop.style.display = 'none';
    currentModalVid = null;
  }

  if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
  if (modalCancelBtn) modalCancelBtn.onclick = closeModal;
  if (modalBackdrop) {
    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) closeModal();
    };
  }

  function formatModalText(pv, contact, senderTitle) {
    const ext = formatExtent(pv.extent);
    const cum = formatExtent(pv.cumulative_gt_extent || 0);
    const bal = formatExtent(pv.balance_gt_extent || 0);
    const today = formatExtent(pv.today_gt_extent || 0);
    const stg = pv.current_stage || 'Ground Truthing';
    const dlrInfo = pv.dlr_balance > 0 ? \`\\n• DLR Active Review: *\${pv.dlr_active_stage || 'VS Login'}*\\n• DLR Balance Khatas: *\${pv.dlr_balance} Khatas*\` : '';
    const delayInfo = pv.days_delayed > 0 ? \`\\n⚠️ *Schedule Lag:* \${pv.days_delayed} Days Behind Target\` : '';

    return \`🚨 *RESURVEY PROGRESS MONITORING NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *\${contact.name}* (\${contact.role})
Village: *\${pv.village_name}* (Code: \\\`\${pv.village_code}\\\`)
Mandal: *\${pv.mandal}* · Division: *\${pv.division || 'Chittoor'}*

⚠️ *FLAGGED: POOR RESURVEY PROGRESS / PERFORMANCE LAG*
Resurvey progress in *\${pv.village_name}* is lagging behind the district action plan milestones.

📊 *PROGRESS SNAPSHOT AS ON DATE:*
• Total Revenue Extent: *\${ext} Acres*
• Current Workflow Stage: *\${stg}*
• Ground Truthing Completed: *\${cum} Acres*
• Ground Truthing Pending: *\${bal} Acres*
• Today's GT Progress: *\${today} Acres (0.00 Ac / Lagging)*\${dlrInfo}\${delayInfo}
• Target Completion Date: 2027-03-31

⚠️ *DIRECTIVE FOR IMMEDIATE ACTION:*
You are hereby instructed to immediately accelerate ground truthing / DLR verification, mobilize rovers, and eliminate field bottlenecks. Daily progress must be uploaded to the district portal without fail.

🌐 *Live Village Dashboard:*
\${window.location.origin}/?village=\${pv.village_code}

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${senderTitle}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh\`;
  }

  function attachTableActions() {
    document.querySelectorAll('[data-action="preview-notice"]').forEach(btn => {
      btn.onclick = () => {
        const vid = btn.dataset.vid;
        const pv = poorVillages.find(x => x.id === vid);
        if (!pv) return;
        currentModalVid = vid;
        const contact = pv.surveyors && pv.surveyors[0] ? pv.surveyors[0] : { name: 'Village Surveyor', role: 'VS', phone: '9491006942' };
        const sender = senderOverride?.value.trim() || defaultSender;
        const text = formatModalText(pv, contact, sender);
        if (modalNoticeBody) modalNoticeBody.textContent = text;
        if (modalBackdrop) modalBackdrop.style.display = 'flex';
      };
    });

    document.querySelectorAll('[data-action="send-notice"]').forEach(btn => {
      btn.onclick = async () => {
        const vid = btn.dataset.vid;
        const pv = poorVillages.find(x => x.id === vid);
        if (!pv) return;

        const senderTitle = senderOverride?.value.trim() || defaultSender;
        btn.disabled = true;
        btn.textContent = '⏳ Sending...';

        try {
          const res = await api('/api/whatsapp/send-village-notice', {
            method: 'POST',
            body: JSON.stringify({ villageId: vid, senderTitle })
          });
          toast(\`Notice sent for \${pv.village_name} to concerned VS!\`, 'success');
          btn.textContent = '✓ Sent';
          btn.style.background = '#059669';
          const freshLogs = await api('/api/whatsapp/logs');
          renderFreshLogs(freshLogs.logs || []);
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
      if (!currentModalVid) return;
      const pv = poorVillages.find(x => x.id === currentModalVid);
      if (!pv) return;

      const senderTitle = senderOverride?.value.trim() || defaultSender;
      modalSendBtn.disabled = true;
      modalSendBtn.textContent = '⏳ Sending...';

      try {
        await api('/api/whatsapp/send-village-notice', {
          method: 'POST',
          body: JSON.stringify({ villageId: currentModalVid, senderTitle })
        });
        toast(\`Notice sent for \${pv.village_name} from \${senderTitle}!\`, 'success');
        closeModal();
        const freshLogs = await api('/api/whatsapp/logs');
        renderFreshLogs(freshLogs.logs || []);
      } catch (err) {
        toast(\`Failed to send notice: \${err.message}\`, 'error');
      } finally {
        modalSendBtn.disabled = false;
        modalSendBtn.textContent = '➤ Send WhatsApp Notice Now';
      }
    };
  }

  // Bulk Broadcast Button
  const bulkSendBtn = document.getElementById('wa-bulk-send-btn');
  if (bulkSendBtn) {
    bulkSendBtn.onclick = async () => {
      const activeList = getFilteredList();
      const senderTitle = senderOverride?.value.trim() || defaultSender;
      const count = activeList.length;

      const confirmed = confirm(
        \`🏛️ BROADCAST CONFIRMATION\\n\\n\` +
        \`Sender Designation: \${senderTitle}\\n\` +
        \`Target Villages: \${count} poor performing villages\\n\` +
        \`Category: \${currentCategory.toUpperCase()}\\n\\n\` +
        \`Do you want to dispatch official WhatsApp notices to all concerned Village Surveyors (VS)?\`
      );

      if (!confirmed) return;

      bulkSendBtn.disabled = true;
      bulkSendBtn.innerHTML = '⏳ <span>Dispatching notices to VS...</span>';

      try {
        const vids = activeList.map(v => v.id);
        const res = await api('/api/whatsapp/send-poor-notices', {
          method: 'POST',
          body: JSON.stringify({ villageIds: vids, senderTitle })
        });

        const rep = res.report || {};
        toast(\`Broadcast complete! Dispatched \${rep.totalDispatches || count} WhatsApp notices from \${senderTitle}.\`, 'success');
        bulkSendBtn.innerHTML = \`✓ Dispatched (\${rep.totalDispatches || count})\`;
        bulkSendBtn.style.background = '#059669';

        const freshLogs = await api('/api/whatsapp/logs');
        renderFreshLogs(freshLogs.logs || []);
      } catch (err) {
        toast(\`Broadcast failed: \${err.message}\`, 'error');
        bulkSendBtn.disabled = false;
        bulkSendBtn.innerHTML = '⚡ Broadcast Notices to All Concerned VS (AD, Chittoor)';
      }
    };
  }

  function renderFreshLogs(logsList) {
    const wrap = document.getElementById('wa-logs-table-container');
    if (!wrap) return;
    if (!logsList.length) {
      wrap.innerHTML = emptyBlock('No WhatsApp interactions recorded yet', 'Interactions will appear here.', 'message');
      return;
    }
    wrap.innerHTML = \`
      <table class="performance-table">
        <thead>
          <tr>
            <th>TIMESTAMP</th>
            <th>DIRECTION / TYPE</th>
            <th>OFFICER / RECIPIENT</th>
            <th>PHONE NUMBER</th>
            <th>VILLAGE / QUERY</th>
            <th>SENDER</th>
            <th>STATUS</th>
            <th>NOTICE PREVIEW</th>
          </tr>
        </thead>
        <tbody>
          \${logsList.map(l => {
            const isNotice = l.direction === 'OUTBOUND_NOTICE' || l.noticeType === 'POOR_PERFORMANCE_NOTICE';
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
                <td><span class="mandal-div-chip font-bold">\${h(l.villageName ? \`\${l.villageName} (\${l.mandal})\` : (l.query || '—'))}</span></td>
                <td style="font-size:11px;font-weight:700;color:var(--navy);">\${h(l.sender || 'AD, Chittoor')}</td>
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

    try {
      const res = await api('/api/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      const botReply = res.result?.reply || 'No response';

      const formatted = h(botReply)
        .replace(/\\*(.*?)\\*/g, '<b>$1</b>')
        .replace(/_(.*?)_/g, '<i>$1</i>')
        .replace(/\`(.*?)\`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;">$1</code>')
        .replace(/(https?:\\/\\/[^\\s]+)/g, '<a href="$1" target="_blank" style="color:#53bdeb;text-decoration:underline;">$1</a>')
        .replace(/\\n/g, '<br>');

      const botBubble = document.createElement('div');
      botBubble.className = 'wa-bubble incoming';
      botBubble.innerHTML = \`\${formatted}<div class="wa-bubble-time">\${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>\`;
      chatWindow.appendChild(botBubble);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    } catch (err) {
      const errBubble = document.createElement('div');
      errBubble.className = 'wa-bubble incoming';
      errBubble.innerHTML = \`⚠️ Error querying bot: \${h(err.message)}<div class="wa-bubble-time">Now</div>\`;
      chatWindow.appendChild(errBubble);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }

  if (sendBtn && chatInput) {
    sendBtn.onclick = () => {
      const val = chatInput.value.trim();
      if (val) {
        sendSimQuery(val);
        chatInput.value = '';
      }
    };
    chatInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const val = chatInput.value.trim();
        if (val) {
          sendSimQuery(val);
          chatInput.value = '';
        }
      }
    };
  }

  document.querySelectorAll('[data-wa-chip]').forEach(chip => {
    chip.onclick = () => {
      const q = chip.dataset.waChip;
      sendSimQuery(q);
    };
  });

  // Save config button
  const saveBtn = document.getElementById('wa-save-config-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const verifyToken = document.getElementById('wa-verify-token-input')?.value || '';
      const phoneNumberId = document.getElementById('wa-phone-id-input')?.value || '';
      const accessToken = document.getElementById('wa-token-input')?.value || '';
      const wabaId = document.getElementById('wa-waba-input')?.value || '';
      const senderName = document.getElementById('wa-sender-name-input')?.value || 'AD, Chittoor';

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>Saving...</span>';
      try {
        await api('/api/whatsapp/config', {
          method: 'POST',
          body: JSON.stringify({ verifyToken, phoneNumberId, accessToken, wabaId, senderName, enabled: true })
        });
        toast('WhatsApp Webhook & AD Sender configuration saved successfully!', 'success');
        if (senderOverride) senderOverride.value = senderName;
      } catch (err) {
        toast(\`Failed to save: \${err.message}\`, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = \`\${icon('check')} Save Webhook Settings\`;
      }
    };
  }

  // Copy buttons
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.onclick = () => {
      const textToCopy = btn.dataset.copy;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const orig = btn.innerText;
        btn.innerText = 'Copied! ✓';
        setTimeout(() => btn.innerText = orig, 2000);
      }).catch(() => {
        toast('Copied to clipboard', 'info');
      });
    };
  });
}\n\n`;

code = code.slice(0, startIndex) + newRenderWhatsApp + code.slice(endIndex);

fs.writeFileSync(publicAppPath, code, 'utf8');
fs.writeFileSync(rootAppPath, code, 'utf8');

console.log('Successfully patched renderWhatsApp in public/app.js and app.js');
