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

const MANDAL_SURVEYOR_DIRECTORY = {
  'Baireddipalle': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Bangarupalem': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Chittoor': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'G.D.Nellore': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Gangadhara Nellore': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Gangavaram': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Gudipala': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Gudipalle': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '' },
  'Irala': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Karvetinagar': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Kuppam': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '' },
  'Nagari': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Nindra': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Palamaner': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Palasamudram': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Peddapanjani': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Penumuru': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '' },
  'Pulicherla': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '' },
  'Puthalapattu': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '' },
  'Ramakuppam': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '' },
  'Rompicherla': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '' },
  'S.R.Puram': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Srirangarajapuram': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Santhipuram': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '' },
  'Thavanampalli': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Vedurukuppam': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '' },
  'Venkatagirikota': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '' },
  'Vijayapuram': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '' },
  'Yadamari': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '' }
};

function getMandalSurveyor(mandalName, store) {
  const norm = String(mandalName || '').trim();
  const k = normalKey(norm);
  const mapped = normalizeMandal(norm, store);
  if (MANDAL_SURVEYOR_DIRECTORY[mapped]) return MANDAL_SURVEYOR_DIRECTORY[mapped];
  const found = Object.keys(MANDAL_SURVEYOR_DIRECTORY).find(m => m.toLowerCase() === mapped.toLowerCase() || normalKey(m) === k);
  if (found) return MANDAL_SURVEYOR_DIRECTORY[found];
  return { name: 'Concerned Mandal Surveyor', role: 'Mandal Surveyor (MS)', phone: '', hasSheetPhone: false };
}

function getVillageSurveyorContacts(v, store) {
  const res = [];
  if (v.gt_team_mobiles) {
    const nLines = String(v.gt_team_names || '').split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
    const mLines = String(v.gt_team_mobiles || '').split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
    for (let i = 0; i < Math.max(nLines.length, mLines.length); i++) {
      const ph = (mLines[i] || '').replace(/[^0-9]/g, '');
      if (ph.length >= 10) {
        const nm = (nLines[i] || 'Village Surveyor').replace(/^\d+[\.\)]\s*/, '').trim();
        const isVro = /vro/i.test(nm);
        res.push({
          name: nm,
          phone: ph.slice(-10),
          role: isVro ? 'Village Revenue Officer (VRO)' : 'Village Surveyor (VS)',
          isVS: !isVro,
          hasSheetPhone: true,
          phoneSource: 'Google Spreadsheet'
        });
      }
    }
  }
  const vsOnly = res.filter(x => x.isVS);
  if (vsOnly.length > 0) return vsOnly;
  const ms = getMandalSurveyor(v.mandal, store);
  return [{
    name: ms.name || `${v.mandal} Mandal Surveyor`,
    phone: '',
    role: ms.role || 'Mandal Surveyor (MS)',
    isVS: true,
    isMS: true,
    hasSheetPhone: false,
    phoneSource: 'Awaiting in Google Spreadsheet'
  }];
}

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
 * Evaluates whether a village is considered poor performing / lagging
 */
function isVillagePoorPerforming(v) {
  if (!v) return false;
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
  if (isPorted || isComplete(v.final_ror_status) || v.status === 'Completed') return false;

  const todayGt = parseFloat(v.today_gt_extent) || 0;
  const totExt = parseFloat(v.extent) || ((parseFloat(v.patta_extent) || 0) + (parseFloat(v.govt_extent) || 0));
  const cumGt = parseFloat(v.cumulative_gt_extent) || 0;
  const pct = totExt > 0 ? (cumGt / totExt) * 100 : 0;
  const isDelayed = v.status === 'Delayed' || Number(v.days_delayed) > 0;

  // GT lag: 0 progress today and pending balance or low completion
  if (todayGt === 0 && !isComplete(v.gt_status)) {
    if (isDelayed) return true;
    if (v.gt_status === 'In Progress' && pct < 50) return true;
    if (pct < 30) return true;
    if (v.gt_start_date || v.current_stage === 'GT' || String(v.current_stage).includes('GT')) return true;
  }

  // DLR lag: balance > 0 and 0 today at VS / active login
  const vsBal = v.dlr_stages_detail?.vs_status?.balance ?? v.dlr_entries_balance ?? 0;
  const vsToday = v.dlr_stages_detail?.vs_status?.today ?? v.dlr_entries_today ?? 0;
  if (vsBal > 0 && vsToday === 0 && (v.dlr_active_stage || v.vs_status === 'In Progress' || !isComplete(v.vs_status))) {
    return true;
  }

  return isDelayed;
}

/**
 * Returns all poor performing villages with calculated metrics and mapped surveyor contacts
 */
function getPoorPerformingVillages(store) {
  const villages = store.villages || [];
  const list = [];

  villages.forEach(v => {
    const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
    const isDone = isPorted || isComplete(v.final_ror_status) || v.status === 'Completed';
    if (isDone) return;

    const lagReasons = [];
    const lagTypes = [];

    const todayGt = parseFloat(v.today_gt_extent) || 0;
    const totExt = parseFloat(v.extent) || ((parseFloat(v.patta_extent) || 0) + (parseFloat(v.govt_extent) || 0));
    const cumGt = parseFloat(v.cumulative_gt_extent) || 0;
    const balGt = (v.balance_gt_extent !== undefined && v.balance_gt_extent !== null) 
      ? parseFloat(v.balance_gt_extent) 
      : Math.max(0, totExt - cumGt);

    // 1. GT Lag
    const isGtLag = !isComplete(v.gt_status) && todayGt === 0 && balGt > 0;
    if (isGtLag) {
      lagTypes.push('GT');
      lagReasons.push(`Zero GT Progress Today (${formatExtent(balGt)} Ac balance pending)`);
    }

    // 2. DLR Lag
    const vsBal = v.dlr_stages_detail?.vs_status?.balance ?? v.dlr_entries_balance ?? 0;
    const vsToday = v.dlr_stages_detail?.vs_status?.today ?? v.dlr_entries_today ?? 0;
    const isDlrLag = (vsBal > 0 && vsToday === 0 && (v.dlr_active_stage || v.vs_status === 'In Progress' || !isComplete(v.vs_status)));
    if (isDlrLag) {
      lagTypes.push('DLR');
      lagReasons.push(`DLR VS Login Pending (${vsBal} balance khatas, 0 cleared today)`);
    }

    // 3. Schedule Delay
    const daysDelayed = Number(v.days_delayed) || 0;
    const isDelay = v.status === 'Delayed' || daysDelayed > 0;
    if (isDelay) {
      lagTypes.push('DELAY');
      lagReasons.push(`Schedule Lag: ${daysDelayed > 0 ? daysDelayed + ' days delayed' : 'Flagged as Delayed'}`);
    }

    if (lagTypes.length > 0) {
      const contacts = getVillageSurveyorContacts(v, store);
      list.push({
        id: v.id,
        village_code: v.village_code,
        village_name: v.village_name,
        mandal: v.mandal,
        division: v.division,
        extent: v.extent,
        current_stage: v.current_stage || 'Ground Truthing (GT)',
        status: v.status,
        today_gt_extent: todayGt,
        cumulative_gt_extent: cumGt,
        balance_gt_extent: balGt,
        dlr_active_stage: v.dlr_active_stage || 'DLR @ VS Login',
        dlr_balance: vsBal,
        days_delayed: daysDelayed,
        primaryLag: lagTypes[0],
        lagTypes,
        lagReasons,
        surveyors: contacts,
        village: v
      });
    }
  });

  return list;
}

/**
 * Formats high-priority official WhatsApp notification for a poor performing village
 */
function formatPoorVillageNotice(v, contact, hostUrl = 'https://chittoor-resurvey.vercel.app', senderTitle = 'AD, Chittoor') {
  const extent = formatExtent(v.extent);
  const cumGt = formatExtent(v.cumulative_gt_extent || 0);
  const balGt = formatExtent(v.balance_gt_extent !== undefined ? v.balance_gt_extent : Math.max(0, (parseFloat(v.extent) || 0) - (parseFloat(v.cumulative_gt_extent) || 0)));
  const todayGt = formatExtent(v.today_gt_extent || 0);
  const stage = v.current_stage || 'Ground Truthing (GT)';
  const daysDelayed = Number(v.days_delayed) || 0;
  
  let dlrInfo = '';
  if (v.dlr_active_stage) {
    dlrInfo = `\n• DLR Review Stage: *${v.dlr_active_stage}*\n• DLR Pending Balance: *${v.dlr_entries_balance || 0} Khatas*`;
  }
  const delayInfo = daysDelayed > 0 ? `\n⚠️ *Schedule Lag:* ${daysDelayed} Days Behind Target` : '';

  return `🚨 *RESURVEY PROGRESS MONITORING NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *${contact.name}* (${contact.role})
Village: *${v.village_name}* (Code: \`${v.village_code}\`)
Mandal: *${v.mandal}* · Division: *${v.division || 'Chittoor'}*

⚠️ *FLAGGED: POOR RESURVEY PROGRESS / PERFORMANCE LAG*
Resurvey progress in *${v.village_name}* is lagging behind the district action plan milestones.

📊 *PROGRESS SNAPSHOT AS ON DATE:*
• Total Revenue Extent: *${extent} Acres*
• Current Workflow Stage: *${stage}*
• Ground Truthing Completed: *${cumGt} Acres*
• Ground Truthing Pending: *${balGt} Acres*
• Today's GT Progress: *${todayGt} Acres (0.00 Ac / Lagging)*${dlrInfo}${delayInfo}
• Target Completion Date: *${v.target_date || '2027-03-31'}*

⚠️ *DIRECTIVE FOR IMMEDIATE ACTION:*
You are hereby instructed to immediately accelerate ground truthing / DLR verification, mobilize rovers, and eliminate field bottlenecks. Daily progress must be uploaded to the district portal without fail.

🌐 *Live Village Dashboard:*
${hostUrl}/?village=${v.village_code || v.id}

━━━━━━━━━━━━━━━━━━━━━━━━━
*${senderTitle}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh`;
}

/**
 * Dispatches WhatsApp message back to user via Meta WhatsApp Cloud API
 */
async function sendWhatsAppCloudMessage(to, messageText, config = {}) {
  const phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  let cleanTo = String(to || '').replace(/[^0-9]/g, '');
  if (cleanTo.length === 10) {
    cleanTo = '91' + cleanTo;
  }

  if (!phoneNumberId || !accessToken) {
    // Return simulated delivery when API credentials are not yet configured on this server
    return {
      simulated: true,
      delivered: true,
      to: cleanTo,
      preview: messageText.slice(0, 140),
      note: 'Credentials not set. Message processed in simulation mode.'
    };
  }

  const postData = JSON.stringify({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: true,
      body: messageText
    }
  });

  return new Promise((resolve) => {
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
            resolve({ success: true, data: json, to: cleanTo });
          } else {
            resolve({ success: false, status: res.statusCode, error: json.error?.message || body, to: cleanTo });
          }
        } catch (e) {
          resolve({ success: false, status: res.statusCode, error: body, to: cleanTo });
        }
      });
    });

    req.on('error', err => resolve({ success: false, error: err.message, to: cleanTo }));
    req.on('timeout', () => {
      req.abort();
      resolve({ success: false, error: 'Meta API request timed out', to: cleanTo });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Dispatches bulk official notices to Village Surveyors of poor performing villages
 */
async function sendPoorVillagesNotices(options = {}, store, baseUrl = 'https://chittoor-resurvey.vercel.app') {
  const { villageIds, filterType = 'all', senderTitle, dryRun = false } = options;
  const config = store.whatsappConfig || {};
  const effectiveSender = senderTitle || config.senderName || process.env.WHATSAPP_SENDER_NAME || 'AD, Chittoor';
  
  let poorVillages = getPoorPerformingVillages(store);
  
  if (Array.isArray(villageIds) && villageIds.length > 0) {
    const idSet = new Set(villageIds.map(String));
    poorVillages = poorVillages.filter(pv => idSet.has(String(pv.id)) || idSet.has(String(pv.village_code)));
  } else if (filterType && filterType !== 'all') {
    poorVillages = poorVillages.filter(pv => pv.primaryLag === filterType || pv.lagTypes.includes(filterType));
  }

  if (!store.whatsappLogs) store.whatsappLogs = [];

  const results = [];
  let sentCount = 0;
  let simulatedCount = 0;
  let failedCount = 0;

  for (const pv of poorVillages) {
    const v = pv.village;
    const contacts = pv.surveyors;
    
    for (const contact of contacts) {
      if (!contact.phone) {
        results.push({
          villageId: v.id,
          villageName: v.village_name,
          contactName: contact.name,
          contactPhone: '',
          hasSheetPhone: false,
          status: 'Skipped - Awaiting in Spreadsheet',
          reason: 'Phone number strictly restricted to Google Spreadsheet source — not found in linked sheets'
        });
        continue;
      }

      const noticeText = formatPoorVillageNotice(v, contact, baseUrl, effectiveSender);
      
      let sendResult;
      if (dryRun) {
        sendResult = { simulated: true, delivered: true, dryRun: true, to: contact.phone, preview: noticeText.slice(0, 140) };
      } else {
        sendResult = await sendWhatsAppCloudMessage(contact.phone, noticeText, config);
      }

      const status = sendResult.success ? 'Delivered' : (sendResult.simulated ? 'Simulated' : 'Failed');
      if (sendResult.success) sentCount++;
      else if (sendResult.simulated) simulatedCount++;
      else failedCount++;

      const logEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : ('wa-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
        timestamp: new Date().toISOString(),
        direction: 'OUTBOUND_NOTICE',
        from: effectiveSender,
        to: contact.phone,
        senderName: effectiveSender,
        recipientName: contact.name,
        recipientRole: contact.role,
        villageName: v.village_name,
        villageCode: v.village_code,
        mandal: v.mandal,
        sender: effectiveSender,
        noticeType: 'POOR_PERFORMANCE_NOTICE',
        query: `Official Notice: ${v.village_name} (${pv.primaryLag} Lag)`,
        replyPreview: noticeText.slice(0, 160),
        fullText: noticeText,
        status,
        error: sendResult.error || null
      };

      store.whatsappLogs.unshift(logEntry);
      if (store.whatsappLogs.length > 300) store.whatsappLogs.pop();

      results.push({
        villageId: v.id,
        villageName: v.village_name,
        villageCode: v.village_code,
        mandal: v.mandal,
        surveyorName: contact.name,
        surveyorPhone: contact.phone,
        surveyorRole: contact.role,
        status,
        sendResult
      });
    }
  }

  return {
    totalTargetedVillages: poorVillages.length,
    totalDispatches: results.length,
    sentCount,
    simulatedCount,
    failedCount,
    sender: effectiveSender,
    dryRun,
    results
  };
}

const DIOS_DIRECTORY = {
  'B. Prasada Rao': {
    name: 'B. Prasada Rao',
    role: 'Deputy Inspector of Survey (DIOS)',
    phone: '',
    mandals: ['Chittoor', 'Irala', 'G.D.Nellore', 'S.R.Puram']
  },
  'M. Krishna Moorthy': {
    name: 'M. Krishna Moorthy',
    role: 'Deputy Inspector of Survey (DIOS)',
    phone: '',
    mandals: ['Bangarupalem', 'Gudipala', 'Thavanampalli', 'Yadamari']
  },
  'V. Ravi Sekhar': {
    name: 'V. Ravi Sekhar',
    role: 'Deputy Inspector of Survey (DIOS)',
    phone: '',
    mandals: ['Penumuru', 'Pulicherla', 'Puthalapattu', 'Rompicherla', 'Vedurukuppam']
  },
  'R.V. Prasad Rao': {
    name: 'R.V. Prasad Rao',
    role: 'Deputy Inspector of Survey (DIOS)',
    phone: '',
    mandals: ['Karvetinagar', 'Nagari', 'Nindra', 'Palasamudram', 'Vijayapuram']
  },
  'G. Venkata Ramana Reddy': {
    name: 'G. Venkata Ramana Reddy',
    role: 'Deputy Inspector of Survey (DIOS)',
    phone: '',
    mandals: ['Baireddipalle', 'Gangavaram', 'Palamaner', 'Peddapanjani', 'Venkatagirikota']
  },
  'S. Ravi Chandra': {
    name: 'S. Ravi Chandra',
    role: 'Deputy Inspector of Survey (DIOS)',
    phone: '',
    mandals: ['Gudipalle', 'Kuppam', 'Ramakuppam', 'Santhipuram']
  }
};

/**
 * Returns poor performing Village Surveyors (VS), fixing jurisdiction by assigned revenue villages
 */
function getPoorVS(store) {
  const poorVillages = getPoorPerformingVillages(store);
  const poorVillageMap = new Map();
  poorVillages.forEach(pv => poorVillageMap.set(String(pv.village_code || pv.id), pv));

  const vsMap = new Map();
  (store.villages || []).forEach(v => {
    const contacts = getVillageSurveyorContacts(v, store);
    contacts.forEach(c => {
      const key = (c.phone || c.name);
      if (!vsMap.has(key)) {
        vsMap.set(key, {
          id: 'vs_' + key.replace(/[^a-zA-Z0-9]/g, '_'),
          name: c.name,
          role: c.role || 'Village Surveyor (VS)',
          phone: c.phone,
          isMS: Boolean(c.isMS),
          mandals: new Set(),
          assignedVillages: [],
          today_gt_extent: 0,
          dlr_entries_today: 0,
          balance_gt_extent: 0,
          dlr_entries_balance: 0,
          total_extent: 0,
          laggingVillages: []
        });
      }
      const entry = vsMap.get(key);
      const mNorm = normalizeMandal(v.mandal, store);
      entry.mandals.add(mNorm);
      entry.assignedVillages.push({
        code: v.village_code,
        name: v.village_name,
        mandal: mNorm,
        extent: parseFloat(v.extent) || 0,
        today_gt_extent: parseFloat(v.today_gt_extent) || 0,
        balance_gt_extent: parseFloat(v.balance_gt_extent) || 0,
        dlr_today: v.dlr_entries_today || 0,
        dlr_balance: v.dlr_entries_balance || 0
      });
      entry.today_gt_extent += parseFloat(v.today_gt_extent) || 0;
      entry.dlr_entries_today += parseFloat(v.dlr_entries_today) || 0;
      entry.balance_gt_extent += parseFloat(v.balance_gt_extent) || 0;
      entry.dlr_entries_balance += parseFloat(v.dlr_entries_balance) || 0;
      entry.total_extent += parseFloat(v.extent) || 0;

      if (poorVillageMap.has(String(v.village_code || v.id))) {
        entry.laggingVillages.push(poorVillageMap.get(String(v.village_code || v.id)));
      }
    });
  });

  return Array.from(vsMap.values())
    .filter(vs => vs.laggingVillages.length > 0 || (vs.balance_gt_extent > 0 && vs.today_gt_extent === 0))
    .map(vs => {
      const mandalList = Array.from(vs.mandals);
      const lagReasons = [];
      if (vs.balance_gt_extent > 0 && vs.today_gt_extent === 0) {
        lagReasons.push(`Zero GT Progress Today (${formatExtent(vs.balance_gt_extent)} Ac balance)`);
      }
      if (vs.dlr_entries_balance > 0 && vs.dlr_entries_today === 0) {
        lagReasons.push(`Zero DLR Entries Today (${vs.dlr_entries_balance} Khatas pending)`);
      }
      if (vs.laggingVillages.length > 0) {
        lagReasons.push(`${vs.laggingVillages.length} assigned village(s) lagging behind schedule`);
      }

      return {
        id: vs.id,
        name: vs.name,
        role: vs.role,
        tier: 'vs',
        phone: vs.phone,
        isMS: vs.isMS,
        mandal: mandalList.join(', '),
        mandals: mandalList,
        jurisdictionCount: vs.assignedVillages.length,
        jurisdictionUnit: 'Revenue Villages',
        jurisdictionText: `${vs.assignedVillages.length} Revenue Village(s) Assigned`,
        assignedVillages: vs.assignedVillages,
        today_gt_extent: Math.round(vs.today_gt_extent * 100) / 100,
        dlr_entries_today: vs.dlr_entries_today,
        balance_gt_extent: Math.round(vs.balance_gt_extent * 100) / 100,
        dlr_entries_balance: vs.dlr_entries_balance,
        total_extent: Math.round(vs.total_extent * 100) / 100,
        laggingCount: vs.laggingVillages.length,
        laggingVillages: vs.laggingVillages,
        lagReasons,
        primaryLag: vs.today_gt_extent === 0 ? 'GT' : (vs.dlr_entries_today === 0 ? 'DLR' : 'DELAY')
      };
    })
    .sort((a, b) => b.laggingCount - a.laggingCount || b.balance_gt_extent - a.balance_gt_extent);
}

/**
 * Returns poor performing Mandal Surveyors (MS), fixing jurisdiction across all 27 Mandals
 */
function getPoorMS(store) {
  const poorVillages = getPoorPerformingVillages(store);
  const poorVillageMap = new Map();
  poorVillages.forEach(pv => poorVillageMap.set(String(pv.village_code || pv.id), pv));

  // Normalized list of 27 mandals from directory
  const mandalMap = new Map();
  Object.entries(MANDAL_SURVEYOR_DIRECTORY).forEach(([rawMandal, ms]) => {
    const norm = normalizeMandal(rawMandal, store);
    if (!mandalMap.has(norm)) {
      mandalMap.set(norm, ms);
    }
  });

  const msList = [];
  mandalMap.forEach((ms, mandalName) => {
    const mVillages = (store.villages || []).filter(v => normalizeMandal(v.mandal, store) === mandalName);
    let todayGt = 0;
    let dlrToday = 0;
    let balGt = 0;
    let dlrBal = 0;
    let totExt = 0;
    const lagging = [];

    mVillages.forEach(v => {
      todayGt += parseFloat(v.today_gt_extent) || 0;
      dlrToday += parseFloat(v.dlr_entries_today) || 0;
      balGt += parseFloat(v.balance_gt_extent) || 0;
      dlrBal += parseFloat(v.dlr_entries_balance) || 0;
      totExt += parseFloat(v.extent) || 0;
      if (poorVillageMap.has(String(v.village_code || v.id))) {
        lagging.push(poorVillageMap.get(String(v.village_code || v.id)));
      }
    });

    const lagReasons = [];
    if (balGt > 0 && todayGt === 0) {
      lagReasons.push(`Zero Mandal GT Progress Today (${formatExtent(balGt)} Ac balance)`);
    }
    if (dlrBal > 0 && dlrToday === 0) {
      lagReasons.push(`Zero DLR Entries Today (${dlrBal} Khatas pending)`);
    }
    if (lagging.length > 0) {
      lagReasons.push(`${lagging.length} of ${mVillages.length} villages lagging in mandal`);
    }

    msList.push({
      id: 'ms_' + mandalName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: ms.name,
      role: 'Mandal Surveyor (MS)',
      tier: 'ms',
      phone: ms.phone,
      mandal: mandalName,
      jurisdictionCount: mVillages.length,
      jurisdictionUnit: 'Revenue Villages in Mandal',
      jurisdictionText: `${mVillages.length} Revenue Villages in ${mandalName} Mandal`,
      assignedVillages: mVillages.map(v => ({ code: v.village_code, name: v.village_name })),
      today_gt_extent: Math.round(todayGt * 100) / 100,
      dlr_entries_today: dlrToday,
      balance_gt_extent: Math.round(balGt * 100) / 100,
      dlr_entries_balance: dlrBal,
      total_extent: Math.round(totExt * 100) / 100,
      laggingCount: lagging.length,
      laggingVillages: lagging,
      lagReasons,
      primaryLag: todayGt === 0 ? 'GT' : (dlrToday === 0 ? 'DLR' : 'DELAY')
    });
  });

  return msList
    .filter(m => m.laggingCount > 0 || (m.balance_gt_extent > 0 && m.today_gt_extent === 0))
    .sort((a, b) => b.laggingCount - a.laggingCount || b.balance_gt_extent - a.balance_gt_extent);
}

/**
 * Returns poor performing Deputy Inspectors of Survey (DIOS), fixing jurisdiction by assigned Mandals (6 DIOS · 27 Mandals)
 */
function getPoorDIOS(store) {
  const poorVillages = getPoorPerformingVillages(store);
  const poorVillageMap = new Map();
  poorVillages.forEach(pv => poorVillageMap.set(String(pv.village_code || pv.id), pv));

  const list = [];
  Object.values(DIOS_DIRECTORY).forEach(d => {
    const normMandals = d.mandals.map(m => normalizeMandal(m, store));
    const divVillages = (store.villages || []).filter(v => normMandals.includes(normalizeMandal(v.mandal, store)));
    let todayGt = 0;
    let dlrToday = 0;
    let balGt = 0;
    let dlrBal = 0;
    let totExt = 0;
    const laggingVillages = [];
    const mandalProgress = {};

    normMandals.forEach(m => {
      mandalProgress[m] = { villages: 0, todayGt: 0, balGt: 0, dlrToday: 0, dlrBal: 0, lagging: 0 };
    });

    divVillages.forEach(v => {
      const m = normalizeMandal(v.mandal, store);
      todayGt += parseFloat(v.today_gt_extent) || 0;
      dlrToday += parseFloat(v.dlr_entries_today) || 0;
      balGt += parseFloat(v.balance_gt_extent) || 0;
      dlrBal += parseFloat(v.dlr_entries_balance) || 0;
      totExt += parseFloat(v.extent) || 0;
      if (mandalProgress[m]) {
        mandalProgress[m].villages++;
        mandalProgress[m].todayGt += parseFloat(v.today_gt_extent) || 0;
        mandalProgress[m].balGt += parseFloat(v.balance_gt_extent) || 0;
        mandalProgress[m].dlrToday += parseFloat(v.dlr_entries_today) || 0;
        mandalProgress[m].dlrBal += parseFloat(v.dlr_entries_balance) || 0;
      }
      if (poorVillageMap.has(String(v.village_code || v.id))) {
        laggingVillages.push(poorVillageMap.get(String(v.village_code || v.id)));
        if (mandalProgress[m]) mandalProgress[m].lagging++;
      }
    });

    const laggingMandals = Object.keys(mandalProgress).filter(m => mandalProgress[m].lagging > 0 || (mandalProgress[m].balGt > 0 && mandalProgress[m].todayGt === 0));

    const lagReasons = [];
    if (balGt > 0 && todayGt === 0) {
      lagReasons.push(`Zero Division GT Progress Today (${formatExtent(balGt)} Ac balance pending)`);
    }
    if (laggingMandals.length > 0) {
      lagReasons.push(`${laggingMandals.length} of ${d.mandals.length} mandals severely lagging`);
    }
    if (laggingVillages.length > 0) {
      lagReasons.push(`${laggingVillages.length} villages lagging across division`);
    }

    list.push({
      id: 'dios_' + d.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: d.name,
      role: 'Deputy Inspector of Survey (DIOS)',
      tier: 'dios',
      phone: d.phone,
      hasSheetPhone: Boolean(d.phone),
      assignedMandalsCount: d.mandals.length,
      assignedMandals: d.mandals,
      jurisdictionCount: d.mandals.length,
      jurisdictionUnit: 'Mandals Assigned',
      jurisdictionText: `${d.mandals.length} Mandals (${d.mandals.join(', ')}) · ${divVillages.length} Villages`,
      totalVillagesInDivision: divVillages.length,
      today_gt_extent: Math.round(todayGt * 100) / 100,
      dlr_entries_today: dlrToday,
      balance_gt_extent: Math.round(balGt * 100) / 100,
      dlr_entries_balance: dlrBal,
      total_extent: Math.round(totExt * 100) / 100,
      laggingMandalsCount: laggingMandals.length,
      laggingMandals,
      laggingCount: laggingVillages.length,
      laggingVillages,
      mandalProgress,
      lagReasons,
      primaryLag: todayGt === 0 ? 'GT' : 'DELAY'
    });
  });

  return list
    .filter(d => d.laggingCount > 0 || (d.balance_gt_extent > 0 && d.today_gt_extent === 0))
    .sort((a, b) => b.laggingCount - a.laggingCount || b.balance_gt_extent - a.balance_gt_extent);
}

/**
 * Returns poor performing officers by tier ('vs', 'ms', 'dios')
 */
function getPoorOfficersByTier(tier = 'vs', store) {
  const normTier = String(tier || 'vs').toLowerCase().trim();
  if (normTier === 'dios') return getPoorDIOS(store);
  if (normTier === 'ms') return getPoorMS(store);
  return getPoorVS(store);
}

/**
 * Formats official tiered WhatsApp notice signed by AD, Chittoor
 */
function formatOfficerNotice(officer, tier = 'vs', baseUrl = 'https://chittoor-resurvey.vercel.app', senderTitle = 'AD, Chittoor') {
  const effectiveSender = senderTitle || 'AD, Chittoor';
  const normTier = String(tier || 'vs').toLowerCase();

  // 1. DIOS Notice (Jurisdiction by Mandals)
  if (normTier === 'dios') {
    const mandalsStr = (officer.assignedMandals || []).join(', ') || officer.mandal;
    const laggingMandalsStr = (officer.laggingMandals || []).join(', ') || 'None';
    const breakdownLines = Object.entries(officer.mandalProgress || {}).map(([m, p]) => {
      const isLag = p.lagging > 0 || (p.balGt > 0 && p.todayGt === 0);
      return `• *${m}:* Today: ${formatExtent(p.todayGt)} Ac · Bal: ${formatExtent(p.balGt)} Ac ${isLag ? `(⚠️ ${p.lagging} Lagging)` : '✅'}`;
    }).join('\n');

    return `🚨 *DIVISION RESURVEY MONITORING DIRECTIVE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *${officer.name}* (Deputy Inspector of Survey - DIOS)
Jurisdiction: *${officer.assignedMandalsCount} Mandals Assigned* (${mandalsStr})
Total Universe: *${officer.totalVillagesInDivision} Revenue Villages*

⚠️ *FLAGGED: DIVISION PERFORMANCE REVIEW & LAG ALERT*
In your assigned jurisdiction of ${officer.assignedMandalsCount} Mandals, *${officer.laggingMandalsCount} Mandals* and *${officer.laggingCount} Villages* are lagging behind district milestones.

📊 *DIVISION DAILY EXTRACTED PERFORMANCE:*
• Today's Division GT Out-turn: *${formatExtent(officer.today_gt_extent)} Acres*
• Division Balance GT Extent: *${formatExtent(officer.balance_gt_extent)} Acres*
• Division DLR Logins Today: *${officer.dlr_entries_today || 0} Entries*
• Division DLR Pending Balance: *${officer.dlr_entries_balance || 0} Khatas*
• Critical Lagging Mandals: *${laggingMandalsStr}*

📋 *MANDAL PROGRESS BREAKDOWN IN YOUR CHARGE:*
${breakdownLines}

⚠️ *URGENT DIRECTIVE FROM AD, CHITTOOR:*
As Deputy Inspector of Survey (DIOS), you are instructed to conduct immediate physical field inspections across lagging Mandals in your jurisdiction. Review all Mandal Surveyors and Village Surveyors without delay and submit action taken report.

🌐 *Live District Resurvey Dashboard:*
${baseUrl}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*${effectiveSender}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh`;
  }

  // 2. MS Notice (Jurisdiction by Mandal)
  if (normTier === 'ms') {
    const zeroVillages = (officer.laggingVillages || []).filter(v => (v.today_gt_extent || 0) === 0).length;
    const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
      `• *${v.village_name}* (Code: \`${v.village_code}\`): Today: ${formatExtent(v.today_gt_extent)} Ac, Bal: ${formatExtent(v.balance_gt_extent)} Ac`
    ).join('\n');

    return `🚨 *MANDAL RESURVEY PROGRESS NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *${officer.name}* (Mandal Surveyor - MS)
Jurisdiction: *${officer.mandal} Mandal* (${officer.jurisdictionCount} Revenue Villages)

⚠️ *FLAGGED: POOR RESURVEY PERFORMANCE IN MANDAL*
Resurvey progress in *${officer.mandal} Mandal* is lagging behind the target schedule. Out of ${officer.jurisdictionCount} revenue villages, *${officer.laggingCount} villages are flagged for severe lag*.

📊 *MANDAL DAILY EXTRACTED PERFORMANCE:*
• Today's Mandal GT Out-Turn: *${formatExtent(officer.today_gt_extent)} Acres*
• Total Pending GT Balance: *${formatExtent(officer.balance_gt_extent)} Acres*
• Today's DLR Clearances: *${officer.dlr_entries_today || 0} Entries*
• DLR Pending Khatas: *${officer.dlr_entries_balance || 0} Khatas*
• Villages with Zero Progress Today: *${zeroVillages} Villages*

⚠️ *KEY LAGGING REVENUE VILLAGES:*
${sampleVillages}

⚠️ *DIRECTIVE FOR MANDAL SURVEYOR:*
Convene an immediate review with all Village Surveyors in ${officer.mandal} Mandal. Inspect rover ground positions, resolve boundary conflicts, and ensure daily out-turn benchmark is met.

🌐 *Live Mandal Village Dashboard:*
${baseUrl}/report/mandal-villages?mandal=${encodeURIComponent(officer.mandal)}

━━━━━━━━━━━━━━━━━━━━━━━━━
*${effectiveSender}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh`;
  }

  // 3. VS Notice (Jurisdiction by Assigned Revenue Villages)
  const mandalNames = Array.from(officer.mandals || []).join(', ') || officer.mandal || 'Chittoor';
  const sampleVillages = (officer.laggingVillages || []).slice(0, 4).map(v => 
    `• *${v.village_name}* (Code: \`${v.village_code}\`): Today: ${formatExtent(v.today_gt_extent)} Ac, Bal: ${formatExtent(v.balance_gt_extent)} Ac`
  ).join('\n');

  return `🚨 *VILLAGE SURVEYOR PERFORMANCE NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *${officer.name}* (Village Surveyor - VS)
Jurisdiction: *${officer.jurisdictionCount} Revenue Villages Assigned*
Mandal: *${mandalNames}*

⚠️ *FLAGGED: POOR RESURVEY PROGRESS / PERFORMANCE LAG*
You are assigned to monitor ${officer.jurisdictionCount} revenue villages in your jurisdiction, of which *${officer.laggingCount} villages are lagging* behind daily milestones.

📊 *DAILY EXTRACTED PERFORMANCE (TODAY):*
• Today's GT Progress: *${formatExtent(officer.today_gt_extent)} Acres*
• Total Pending GT Balance: *${formatExtent(officer.balance_gt_extent)} Acres*
• Today's DLR Clearances: *${officer.dlr_entries_today || 0} Khatas*
• DLR Pending Balance: *${officer.dlr_entries_balance || 0} Khatas*

⚠️ *LAGGING REVENUE VILLAGES IN YOUR CHARGE:*
${sampleVillages}

⚠️ *DIRECTIVE FOR IMMEDIATE ACTION:*
Accelerate ground truthing and DLR verification in your assigned revenue villages immediately. Field teams must be mobilized and daily progress uploaded without fail.

🌐 *Live District Resurvey Dashboard:*
${baseUrl}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*${effectiveSender}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh`;
}

/**
 * Dispatches bulk official notices to officers of a specific tier ('vs', 'ms', 'dios')
 */
async function sendOfficerNotices(options = {}, store, baseUrl = 'https://chittoor-resurvey.vercel.app') {
  const { tier = 'vs', officerIds, senderTitle, dryRun = false } = options;
  const config = store.whatsappConfig || {};
  const effectiveSender = senderTitle || config.senderName || process.env.WHATSAPP_SENDER_NAME || 'AD, Chittoor';

  let officers = getPoorOfficersByTier(tier, store);

  if (Array.isArray(officerIds) && officerIds.length > 0) {
    const idSet = new Set(officerIds.map(String));
    officers = officers.filter(o => idSet.has(String(o.id)) || idSet.has(String(o.phone)) || idSet.has(String(o.name)));
  }

  if (!store.whatsappLogs) store.whatsappLogs = [];

  const results = [];
  let sentCount = 0;
  let simulatedCount = 0;
  let failedCount = 0;

  for (const officer of officers) {
    if (!officer.phone) {
      results.push({
        officerId: officer.id,
        officerName: officer.name,
        officerRole: officer.role,
        officerPhone: '',
        hasSheetPhone: false,
        jurisdiction: officer.jurisdictionText,
        tier,
        status: 'Skipped - Awaiting in Spreadsheet',
        reason: 'Phone number strictly restricted to Google Spreadsheet source — not found in linked sheets'
      });
      continue;
    }

    const noticeText = formatOfficerNotice(officer, tier, baseUrl, effectiveSender);
    
    let sendResult;
    if (dryRun) {
      sendResult = { simulated: true, delivered: true, dryRun: true, to: officer.phone, preview: noticeText.slice(0, 140) };
    } else {
      sendResult = await sendWhatsAppCloudMessage(officer.phone, noticeText, config);
    }

    const status = sendResult.success ? 'Delivered' : (sendResult.simulated ? 'Simulated' : 'Failed');
    if (sendResult.success) sentCount++;
    else if (sendResult.simulated) simulatedCount++;
    else failedCount++;

    const logEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : ('wa-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
      timestamp: new Date().toISOString(),
      direction: 'OUTBOUND_NOTICE',
      from: effectiveSender,
      to: officer.phone,
      senderName: effectiveSender,
      recipientName: officer.name,
      recipientRole: officer.role,
      officerTier: tier.toUpperCase(),
      jurisdiction: officer.jurisdictionText,
      mandal: officer.mandal || (officer.assignedMandals ? officer.assignedMandals.join(', ') : 'Chittoor'),
      sender: effectiveSender,
      noticeType: `${tier.toUpperCase()}_PERFORMANCE_NOTICE`,
      query: `Official Notice: ${officer.name} (${officer.role})`,
      replyPreview: noticeText.slice(0, 160),
      fullText: noticeText,
      status,
      error: sendResult.error || null
    };

    store.whatsappLogs.unshift(logEntry);
    if (store.whatsappLogs.length > 300) store.whatsappLogs.pop();

    results.push({
      officerId: officer.id,
      officerName: officer.name,
      officerRole: officer.role,
      officerPhone: officer.phone,
      jurisdiction: officer.jurisdictionText,
      tier,
      status,
      sendResult
    });
  }

  return {
    tier,
    totalTargetedOfficers: officers.length,
    totalDispatches: results.length,
    sentCount,
    simulatedCount,
    failedCount,
    sender: effectiveSender,
    dryRun,
    results
  };
}

module.exports = {
  verifyWebhook,
  extractInboundMessages,
  processWhatsAppQuery,
  sendWhatsAppCloudMessage,
  DEFAULT_VERIFY_TOKEN,
  MANDAL_SURVEYOR_DIRECTORY,
  DIOS_DIRECTORY,
  getMandalSurveyor,
  getVillageSurveyorContacts,
  isVillagePoorPerforming,
  getPoorPerformingVillages,
  getPoorVS,
  getPoorMS,
  getPoorDIOS,
  getPoorOfficersByTier,
  formatPoorVillageNotice,
  formatOfficerNotice,
  sendPoorVillagesNotices,
  sendOfficerNotices
};


