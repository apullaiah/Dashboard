const https = require('https');
const crypto = require('crypto');

// Default verification token for Meta WhatsApp Cloud API Webhook
const DEFAULT_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'CTR_RESURVEY_WA_2026';

const MANDAL_ALIASES = {
  gudupalle: 'Gudipalle', gudipalle: 'Gudipalle', palamaneru: 'Palamaner', palamaner: 'Palamaner',
  palmaner: 'Palamaner', bangarupalyam: 'Bangarupalem', bangarupalem: 'Bangarupalem',
  'v kota': 'Venkatagirikota', 'v.kota': 'Venkatagirikota', venkatagirikota: 'Venkatagirikota',
  penumur: 'Penumuru', penumuru: 'Penumuru', puthalapatu: 'Puthalapattu', puthalapattu: 'Puthalapattu',
  thavanampalle: 'Thavanampalli', thavanampalli: 'Thavanampalli',
  'g.d.nellore': 'G.D.Nellore', 'g d nellore': 'G.D.Nellore', 'gd nellore': 'G.D.Nellore',
  'g.d nellore': 'G.D.Nellore', 'g.d. nellore': 'G.D.Nellore',
  gangadharanellore: 'G.D.Nellore', 'gangadhara nellore': 'G.D.Nellore', 'gangadhara-nellore': 'G.D.Nellore',
  baireddipalle: 'Baireddipalle', baireddipalli: 'Baireddipalle',
  'baireddi palle': 'Baireddipalle', 'baireddi palli': 'Baireddipalle',
  'baireddy palle': 'Baireddipalle', 'baireddy palli': 'Baireddipalle',
  baireddypalle: 'Baireddipalle', baireddypalli: 'Baireddipalle',
  's.r.puram': 'S.R.Puram', 's r puram': 'S.R.Puram', srpuram: 'S.R.Puram', srirangarajapuram: 'S.R.Puram'
};

function normalKey(value) {
  return String(value ?? '').toLowerCase().trim().replace(/[\s\-_.]+/g, ' ');
}

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeMandal(value, store) {
  const key = normalKey(value);
  return ((store && store.customMandalAliases) || {})[key] || MANDAL_ALIASES[key] || clean(value);
}

function isComplete(value) {
  return /^(completed|complete|done|yes|y|ported|true|1)$/i.test(clean(value));
}

function formatExtent(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStageBadgeInfo(v) {
  const stage = String(v.current_stage || '').trim();
  const lower = stage.toLowerCase();
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');

  if (isPorted || lower.includes('webland') || lower.includes('ported')) {
    return { name: 'Webland 2.0 Ported', icon: '🌐' };
  }
  if (lower.includes('final ror') || isComplete(v.final_ror_status)) {
    return { name: 'Final RoR', icon: '📜' };
  }
  if (lower.includes('draft ror') || isComplete(v.draft_ror_status)) {
    return { name: 'Draft RoR', icon: '📑' };
  }
  if (lower.includes('13') || isComplete(v.section13_status)) {
    return { name: '13 Notification', icon: '📢' };
  }
  if (lower.includes('jc') || isComplete(v.jc_status)) {
    return { name: 'DLR @ JC Login', icon: '⚖️' };
  }
  if (lower.includes('rdo') || isComplete(v.rdo_status)) {
    return { name: 'DLR @ RDO Login', icon: '🏛️' };
  }
  if (lower.includes('tah') || isComplete(v.tahsildar_status)) {
    return { name: 'DLR @ Tahsildar Login', icon: '🏢' };
  }
  if (lower.includes('vro') || isComplete(v.vro_status)) {
    return { name: 'DLR @ VRO Login', icon: '✍️' };
  }
  if (lower.includes('vs') || isComplete(v.vs_status)) {
    return { name: 'DLR @ VS Login', icon: '🔒' };
  }
  if (lower.includes('vector') || isComplete(v.vectorization_status)) {
    return { name: 'Vectorization', icon: '📐' };
  }
  if (lower.includes('gt') || isComplete(v.gt_status)) {
    return { name: 'Ground Truthing', icon: '📡' };
  }
  return { name: stage || 'Under Survey', icon: '⏳' };
}

/**
 * Verifies webhook registration challenge from Meta
 */
function verifyWebhook(query, config = {}) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  const expectedToken = config.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken) {
    return { verified: true, challenge };
  }
  return { verified: false, error: 'Verification token mismatch or invalid mode' };
}

/**
 * Extracts incoming messages from Meta WhatsApp webhook payload
 */
function extractInboundMessages(body) {
  const messages = [];
  if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return messages;
  }

  body.entry.forEach(entry => {
    (entry.changes || []).forEach(change => {
      const value = change.value;
      if (!value || value.messaging_product !== 'whatsapp') return;

      const metadata = value.metadata || {};
      const contacts = value.contacts || [];
      const contactMap = {};
      contacts.forEach(c => {
        contactMap[c.wa_id] = c.profile?.name || c.wa_id;
      });

      (value.messages || []).forEach(msg => {
        let textBody = '';
        if (msg.type === 'text') {
          textBody = msg.text?.body || '';
        } else if (msg.type === 'interactive') {
          textBody = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.interactive?.button_reply?.id || '';
        } else if (msg.type === 'button') {
          textBody = msg.button?.text || msg.button?.payload || '';
        }

        messages.push({
          messageId: msg.id,
          from: msg.from,
          senderName: contactMap[msg.from] || msg.from,
          timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
          type: msg.type,
          text: textBody.trim(),
          phoneNumberId: metadata.phone_number_id || '',
          displayPhoneNumber: metadata.display_phone_number || ''
        });
      });
    });
  });

  return messages;
}

/**
 * Intelligent WhatsApp Query Engine for Chittoor Resurvey Monitoring
 */
function processWhatsAppQuery(queryText, store, baseUrl = 'http://localhost:4173') {
  const raw = clean(queryText);
  const lower = raw.toLowerCase();
  const villages = store.villages || [];

  // Normalize baseUrl
  const hostUrl = baseUrl.replace(/\/+$/, '');

  // 1. HELP / GREETING / MENU
  if (!raw || /^(hi|hello|hey|namaste|start|menu|help|\?|info)$/i.test(lower)) {
    return {
      type: 'menu',
      reply: `🏛️ *CHITTOOR DISTRICT RESURVEY MONITORING*
_Govt of Andhra Pradesh · Survey & Land Records_

Welcome to the Official WhatsApp Query Service! 📲

You can instantly check village & mandal resurvey progress:

🔹 *Village Status:* Send village name or 7-digit code
   _Example:_ \`Mogili\` or \`1057021\` or \`Bodabandla\`

🔹 *Mandal Report:* Send mandal name
   _Example:_ \`Bangarupalem\` or \`Palamaner\` or \`Chittoor\`

🔹 *District Summary:* Send \`SUMMARY\` or \`DISTRICT\`

🔹 *Colourful PDF:* Send \`PDF <Mandal>\`
   _Example:_ \`PDF Bangarupalem\` or \`PDF\` (Full District)

🔹 *DLR Logins:* Send \`DLR\` for active officer review stages
🔹 *Rovers Status:* Send \`ROVERS\` for rover deployment

_Type any village name or mandal name to begin!_`
    };
  }

  // 2. DISTRICT SUMMARY
  if (/^(summary|district|overview|total|kpi|progress)$/i.test(lower)) {
    const totalVillages = villages.length;
    let totalExtent = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let ported = 0;
    let sec13 = 0;
    let dlrTah = 0;
    let dlrRdo = 0;
    let dlrVs = 0;

    villages.forEach(v => {
      totalExtent += parseFloat(v.extent) || 0;
      const isPort = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
      const isComp = isPort || isComplete(v.final_ror_status) || isComplete(v.status);
      if (isComp) completed++;
      else if (String(v.status).toLowerCase().includes('progress') || v.dlr_active_stage || v.gt_status === 'In Progress') inProgress++;
      else pending++;

      if (isPort) ported++;
      if (isComplete(v.section13_status)) sec13++;
      if (isComplete(v.tahsildar_status)) dlrTah++;
      if (isComplete(v.rdo_status)) dlrRdo++;
      if (isComplete(v.vs_status)) dlrVs++;
    });

    const mandalsSet = new Set(villages.map(v => normalizeMandal(v.mandal, store)).filter(Boolean));
    const compPct = Math.round((completed / (totalVillages || 1)) * 100);

    return {
      type: 'summary',
      reply: `📊 *CHITTOOR DISTRICT RESURVEY SNAPSHOT*
━━━━━━━━━━━━━━━━━━━━
🏛️ *Universe:* ${mandalsSet.size} Mandals · ${totalVillages} Villages
📐 *Total Extent:* ${formatExtent(totalExtent)} Acres

✅ *Resurvey Completed:* ${completed} Villages (${compPct}%)
🔄 *Balance in Progress:* ${inProgress} Villages
⏳ *Pending / Scheduled:* ${pending} Villages

🌐 *Webland 2.0 Ported:* ${ported} Villages
📢 *Sec 13 Gazette Done:* ${sec13} Villages

*Active DLR Login Stages:*
• DLR @ VS Login: ${dlrVs} villages
• DLR @ Tahsildar Login: ${dlrTah} villages
• DLR @ RDO Login: ${dlrRdo} villages

━━━━━━━━━━━━━━━━━━━━
📄 *Download Official Mandal PDF Report:*
${hostUrl}/api/reports/mandal-villages-pdf

🌐 *Live Web Dashboard:*
${hostUrl}/`
    };
  }

  // 3. PDF / REPORT REQUEST
  if (lower.startsWith('pdf') || lower.startsWith('report') || lower.startsWith('download')) {
    const parts = raw.split(/\s+/).slice(1).join(' ').trim();
    if (parts) {
      // Check if mandal matches
      const matchedMandal = findMandal(parts, villages, store);
      if (matchedMandal) {
        return {
          type: 'pdf_mandal',
          reply: `📄 *Mandal-Wise Village Status PDF Report*
🏛️ *Mandal:* ${matchedMandal} Mandal

Download the high-resolution colourful PDF showing all villages in ${matchedMandal} with stage badges, extents, and milestones:

📥 *Direct PDF Download:*
${hostUrl}/api/reports/mandal-villages-pdf?mandal=${encodeURIComponent(matchedMandal)}

🌐 *Live Colourful Web View:*
${hostUrl}/report/mandal-villages?mandal=${encodeURIComponent(matchedMandal)}`
        };
      }
    }

    return {
      type: 'pdf_general',
      reply: `📄 *Official Colourful PDF Reports*
━━━━━━━━━━━━━━━━━━━━
Download certified A4 landscape reports with Plus Jakarta Sans typography and stage badges:

📥 *Full District PDF (All 736 Villages):*
${hostUrl}/api/reports/mandal-villages-pdf

💡 *Want a Specific Mandal?*
Send \`PDF <Mandal Name>\` (e.g. \`PDF Bangarupalem\`)

🌐 *Interactive Web Viewer:*
${hostUrl}/report/mandal-villages`
    };
  }

  // 4. DLR OFFICER LOGIN SUMMARY
  if (/^(dlr|dlr login|logins|tahsildar|rdo|jc)$/i.test(lower)) {
    let vsCount = 0, vroCount = 0, tahCount = 0, rdoCount = 0, jcCount = 0;
    villages.forEach(v => {
      if (v.dlr_active_stage === 'vs_status' || isComplete(v.vs_status)) vsCount++;
      if (v.dlr_active_stage === 'vro_status' || isComplete(v.vro_status)) vroCount++;
      if (v.dlr_active_stage === 'tahsildar_status' || isComplete(v.tahsildar_status)) tahCount++;
      if (v.dlr_active_stage === 'rdo_status' || isComplete(v.rdo_status)) rdoCount++;
      if (v.dlr_active_stage === 'jc_status' || isComplete(v.jc_status)) jcCount++;
    });

    return {
      type: 'dlr_summary',
      reply: `🔒 *DLR OFFICER LOGIN WORKFLOW TIERS*
_Chittoor District Resurvey Records_
━━━━━━━━━━━━━━━━━━━━
1️⃣ *Village Surveyor (VS):* ${vsCount} records
2️⃣ *VRO Login:* ${vroCount} records
3️⃣ *Tahsildar Login:* ${tahCount} records
4️⃣ *RDO Login:* ${rdoCount} records
5️⃣ *Joint Collector (JC):* ${jcCount} records

━━━━━━━━━━━━━━━━━━━━
💡 _Send a village name to inspect its exact login tier and pending action._`
    };
  }

  // 5. ROVERS STATUS
  if (/^(rover|rovers|equipment)$/i.test(lower)) {
    const totalRovers = (store.roverSummary?.totalRovers) || 108;
    return {
      type: 'rovers',
      reply: `📡 *ROVER DEPLOYMENT & CAPACITY*
━━━━━━━━━━━━━━━━━━━━
🛰️ *Total Active Rovers:* ${totalRovers} Units
⚡ *District Daily Capacity:* ~${totalRovers * 25} Acres / Day
👥 *Village Surveyors Active:* ~472 VS

💡 _Send a Mandal name to check rovers allotment for that mandal._`
    };
  }

  // 6. NUMERIC QUERY -> Check Village Code
  if (/^\d{5,8}$/.test(raw)) {
    const v = villages.find(x => String(x.village_code).trim() === raw || String(x.id).trim() === raw);
    if (v) {
      return { type: 'village', reply: formatVillageResponse(v, hostUrl) };
    }
  }

  // 7. CHECK MANDAL NAME
  const matchedMandal = findMandal(raw, villages, store);
  if (matchedMandal) {
    const mandalVillages = villages.filter(v => normalizeMandal(v.mandal, store).toLowerCase() === matchedMandal.toLowerCase());
    return {
      type: 'mandal',
      reply: formatMandalResponse(matchedMandal, mandalVillages, hostUrl)
    };
  }

  // 8. CHECK VILLAGE NAME (Exact or Partial)
  const matchedVillages = findVillagesByName(raw, villages);
  if (matchedVillages.length === 1) {
    return { type: 'village', reply: formatVillageResponse(matchedVillages[0], hostUrl) };
  }
  if (matchedVillages.length > 1 && matchedVillages.length <= 6) {
    return {
      type: 'village_list',
      reply: `🔍 *Multiple Villages Found for "${raw}":*
━━━━━━━━━━━━━━━━━━━━
${matchedVillages.map((v, i) => `${i + 1}️⃣ *${v.village_name}* (Code: \`${v.village_code}\`)
   📍 ${v.mandal} Mandal · ${getStageBadgeInfo(v).icon} ${getStageBadgeInfo(v).name}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
_Send the village code (e.g. \`${matchedVillages[0].village_code}\`) for full details._`
    };
  }

  // 9. FALLBACK / SUGGESTION
  return {
    type: 'not_found',
    reply: `⚠️ *No village or mandal found matching "${raw}".*

💡 *Suggestions:*
• Check the spelling (e.g., \`Mogili\`, \`Beripalle\`, \`Bangarupalem\`)
• Send a 7-digit Village Code (e.g., \`1057021\`)
• Send \`SUMMARY\` for district totals
• Send \`MENU\` for all available options`
  };
}

function findMandal(query, villages, store) {
  const norm = normalKey(query);
  const normalizedQuery = normalizeMandal(query, store);

  const mandals = [...new Set(villages.map(v => normalizeMandal(v.mandal, store)).filter(Boolean))];

  // Exact normalized match
  for (const m of mandals) {
    if (m.toLowerCase() === normalizedQuery.toLowerCase() || normalKey(m) === norm) {
      return m;
    }
  }

  // Substring match
  for (const m of mandals) {
    if (m.toLowerCase().includes(norm) || norm.includes(m.toLowerCase())) {
      return m;
    }
  }

  return null;
}

function findVillagesByName(query, villages) {
  const q = normalKey(query);
  if (!q) return [];

  // Exact name match
  const exact = villages.filter(v => normalKey(v.village_name) === q);
  if (exact.length > 0) return exact;

  // Prefix match
  const prefix = villages.filter(v => normalKey(v.village_name).startsWith(q));
  if (prefix.length > 0 && prefix.length <= 6) return prefix;

  // Contains match
  return villages.filter(v => normalKey(v.village_name).includes(q));
}

function formatVillageResponse(v, hostUrl) {
  const stageInfo = getStageBadgeInfo(v);
  const isPort = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
  const isComp = isPort || isComplete(v.final_ror_status) || isComplete(v.status);

  const statusEmoji = isComp ? '✅ Completed' : (v.status === 'Delayed' ? '⚠️ Delayed' : '🔄 In Progress');

  const targetPpb = parseInt(v.ppb_target) || parseInt(v.target_ppbs) || 0;
  const distPpb = parseInt(v.ppb_distributed) || parseInt(v.ppbs_distributed) || (isPort ? targetPpb : 0);

  return `📍 *VILLAGE RESURVEY STATUS*
━━━━━━━━━━━━━━━━━━━━
🏡 *Village:* ${v.village_name || '—'}
🔢 *Village Code:* \`${v.village_code || '—'}\`
🏛️ *Mandal:* ${v.mandal || '—'}
🏢 *Division:* ${v.division || '—'} Division
📌 *Phase:* ${v.phase || '—'}
📐 *Extent:* ${formatExtent(v.extent)} Acres

📊 *Current Stage:* ${stageInfo.icon} *${stageInfo.name}*
📌 *Workflow Status:* ${statusEmoji}
📦 *PPB Distribution:* ${distPpb} / ${targetPpb} Handed Over
📅 *Target Date:* ${v.target_date || '2027-03-31'}

━━━━━━━━━━━━━━━━━━━━
🌐 *View in Live Dashboard:*
${hostUrl}/?village=${v.village_code || v.id}

📄 *Download Mandal PDF:*
${hostUrl}/api/reports/mandal-villages-pdf?mandal=${encodeURIComponent(v.mandal || '')}`;
}

function formatMandalResponse(mandalName, mandalVillages, hostUrl) {
  const total = mandalVillages.length;
  let totalExtent = 0;
  let comp = 0;
  let inProg = 0;
  let pending = 0;
  let dlrLogins = 0;
  let ported = 0;

  mandalVillages.forEach(v => {
    totalExtent += parseFloat(v.extent) || 0;
    const isPort = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
    const isC = isPort || isComplete(v.final_ror_status) || isComplete(v.status);
    if (isC) comp++;
    else if (String(v.status).toLowerCase().includes('progress') || v.dlr_active_stage || v.gt_status === 'In Progress') inProg++;
    else pending++;

    if (isPort) ported++;
    if (v.dlr_active_stage || isComplete(v.vs_status) || isComplete(v.vro_status) || isComplete(v.tahsildar_status)) dlrLogins++;
  });

  const division = mandalVillages[0]?.division || '—';
  const compPct = Math.round((comp / (total || 1)) * 100);

  // Sample top 5 villages
  const topVillages = mandalVillages.slice(0, 5).map(v => {
    const st = getStageBadgeInfo(v);
    return `• ${v.village_name}: ${st.icon} ${st.name}`;
  }).join('\n');

  return `🏛️ *MANDAL REPORT: ${mandalName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
🏢 *Division:* ${division} Division
📊 *Total Villages:* ${total} Revenue Villages
📐 *Total Extent:* ${formatExtent(totalExtent)} Acres

✅ *Completed / Ported:* ${comp} (${compPct}%)
🔄 *In Progress (DLR/GT):* ${inProg}
⏳ *Pending:* ${pending}
🌐 *Webland-2 Ported:* ${ported}
🔒 *Active DLR Logins:* ${dlrLogins}

*Key Village Stages:*
${topVillages}${total > 5 ? `\n_...and ${total - 5} more villages_` : ''}

━━━━━━━━━━━━━━━━━━━━
📥 *Download Colourful Mandal PDF Report:*
${hostUrl}/api/reports/mandal-villages-pdf?mandal=${encodeURIComponent(mandalName)}

🌐 *Live Interactive View:*
${hostUrl}/report/mandal-villages?mandal=${encodeURIComponent(mandalName)}`;
}

/**
 * Dispatches WhatsApp message back to user via Meta WhatsApp Cloud API
 */
async function sendWhatsAppCloudMessage(to, messageText, config = {}) {
  const phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    // Return simulated delivery when API credentials are not yet configured on this server
    return {
      simulated: true,
      delivered: true,
      to,
      preview: messageText.slice(0, 120),
      note: 'Credentials not set. Message processed in simulation mode.'
    };
  }

  const postData = JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to).replace(/[^0-9]/g, ''),
    type: 'text',
    text: {
      preview_url: true,
      body: messageText
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v19.0/${phoneNumberId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: json });
          } else {
            resolve({ success: false, status: res.statusCode, error: json.error?.message || body });
          }
        } catch (e) {
          resolve({ success: false, status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', err => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.abort();
      resolve({ success: false, error: 'Meta API request timed out' });
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {
  verifyWebhook,
  extractInboundMessages,
  processWhatsAppQuery,
  sendWhatsAppCloudMessage,
  DEFAULT_VERIFY_TOKEN
};
