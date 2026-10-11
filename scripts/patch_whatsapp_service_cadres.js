const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const waServicePath = path.join(rootDir, 'lib', 'whatsappService.js');

let waServiceCode = fs.readFileSync(waServicePath, 'utf8').replace(/\r\n/g, '\n');

// 1. ADD REVENUE CADRE CONSTANTS & FUNCTIONS
const revenueCadreCode = `
const REVENUE_DIVISIONS = {
  'Chittoor': {
    name: 'RDO, Chittoor Division',
    division: 'Chittoor',
    mandals: ['Chittoor', 'Gudipala', 'Yadamari', 'G.D.Nellore', 'Penumuru', 'Puthalapattu', 'Thavanampalli', 'Irala']
  },
  'Palamaner': {
    name: 'RDO, Palamaner Division',
    division: 'Palamaner',
    mandals: ['Palamaner', 'Baireddipalle', 'Gangavaram', 'Peddapanjani', 'Venkatagirikota']
  },
  'Kuppam': {
    name: 'RDO, Kuppam Division',
    division: 'Kuppam',
    mandals: ['Kuppam', 'Gudipalle', 'Ramakuppam', 'Santhipuram']
  },
  'Nagari': {
    name: 'RDO, Nagari Division',
    division: 'Nagari',
    mandals: ['Nagari', 'Karvetinagar', 'Nindra', 'Palasamudram', 'Vijayapuram', 'S.R.Puram', 'Vedurukuppam', 'Pulicherla', 'Rompicherla']
  }
};

/**
 * Returns default official sender designation by cadre tier:
 * Survey Cadre (VS, MLSO, DIOS) -> DSLRO, Chittoor
 * Revenue Cadre (VRO, Tahsildars, RDOs) -> Joint Collector, Chittoor
 */
function getDefaultSenderForTier(tier) {
  const norm = String(tier || '').toLowerCase().trim();
  if (norm === 'vs' || norm === 'mlso' || norm === 'ms' || norm === 'dios') {
    return 'DSLRO, Chittoor';
  }
  if (norm === 'vro' || norm === 'tahsildar' || norm === 'tah' || norm === 'rdo') {
    return 'Joint Collector, Chittoor';
  }
  return 'AD, Chittoor';
}

/**
 * Returns poor performing Mandal Level Survey Officers (MLSO)
 */
function getPoorMLSO(store) {
  const msList = getPoorMS(store);
  return msList.map(m => ({
    ...m,
    id: m.id.replace(/^ms_/, 'mlso_'),
    role: 'Mandal Level Survey Officer (MLSO)',
    tier: 'mlso'
  }));
}

/**
 * Returns poor performing Village Revenue Officers (VRO), extracting verified phone numbers strictly from spreadsheets
 */
function getPoorVRO(store) {
  const poorVillages = getPoorPerformingVillages(store);
  const poorVillageMap = new Map();
  poorVillages.forEach(pv => poorVillageMap.set(String(pv.village_code || pv.id), pv));

  const vroMap = new Map();
  (store.villages || []).forEach(v => {
    const names = String(v.gt_team_names || '').split(/[\\r\\n]+/).map(s => s.trim()).filter(Boolean);
    const mobiles = String(v.gt_team_mobiles || '').split(/[\\r\\n]+/).map(s => s.trim()).filter(Boolean);

    let foundVro = false;
    names.forEach((rawName, idx) => {
      if (/vro/i.test(rawName)) {
        foundVro = true;
        const cleanName = rawName.replace(/^\\d+[\\.\\)]\\s*/, '').trim();
        const ph = (mobiles[idx] || '').replace(/\\D/g, '').slice(-10);
        const mNorm = normalizeMandal(v.mandal, store);
        const key = ph ? ph : (cleanName.toLowerCase() + '_' + mNorm.toLowerCase());

        if (!vroMap.has(key)) {
          vroMap.set(key, {
            id: 'vro_' + key.replace(/[^a-zA-Z0-9]/g, '_'),
            name: cleanName,
            role: 'Village Revenue Officer (VRO)',
            tier: 'vro',
            phone: ph,
            hasSheetPhone: Boolean(ph && ph.length >= 10),
            mandal: mNorm,
            mandals: new Set([mNorm]),
            assignedVillages: [],
            today_gt_extent: 0,
            dlr_entries_today: 0,
            balance_gt_extent: 0,
            dlr_entries_balance: 0,
            total_extent: 0,
            laggingVillages: []
          });
        }
        const entry = vroMap.get(key);
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
      }
    });

    if (!foundVro && (poorVillageMap.has(String(v.village_code || v.id)) || (v.dlr_entries_balance || 0) > 0)) {
      const mNorm = normalizeMandal(v.mandal, store);
      const vKey = 'concerned_vro_' + String(v.village_code || v.village_name).toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (!vroMap.has(vKey)) {
        vroMap.set(vKey, {
          id: 'vro_' + vKey,
          name: \`VRO, \${v.village_name}\`,
          role: 'Village Revenue Officer (VRO)',
          tier: 'vro',
          phone: '',
          hasSheetPhone: false,
          mandal: mNorm,
          mandals: new Set([mNorm]),
          assignedVillages: [{
            code: v.village_code,
            name: v.village_name,
            mandal: mNorm,
            extent: parseFloat(v.extent) || 0,
            today_gt_extent: parseFloat(v.today_gt_extent) || 0,
            balance_gt_extent: parseFloat(v.balance_gt_extent) || 0,
            dlr_today: v.dlr_entries_today || 0,
            dlr_balance: v.dlr_entries_balance || 0
          }],
          today_gt_extent: parseFloat(v.today_gt_extent) || 0,
          dlr_entries_today: parseFloat(v.dlr_entries_today) || 0,
          balance_gt_extent: parseFloat(v.balance_gt_extent) || 0,
          dlr_entries_balance: parseFloat(v.dlr_entries_balance) || 0,
          total_extent: parseFloat(v.extent) || 0,
          laggingVillages: [poorVillageMap.get(String(v.village_code || v.id)) || v]
        });
      }
    }
  });

  return Array.from(vroMap.values())
    .filter(vro => vro.laggingVillages.length > 0 || (vro.balance_gt_extent > 0 && vro.today_gt_extent === 0) || vro.dlr_entries_balance > 0)
    .map(vro => {
      const mandalList = Array.from(vro.mandals);
      const lagReasons = [];
      if (vro.balance_gt_extent > 0 && vro.today_gt_extent === 0) {
        lagReasons.push(\`Zero GT Progress Today (\${formatExtent(vro.balance_gt_extent)} Ac balance pending)\`);
      }
      if (vro.dlr_entries_balance > 0 && vro.dlr_entries_today === 0) {
        lagReasons.push(\`DLR Pending: \${vro.dlr_entries_balance} Khatas awaiting VRO clearance\`);
      }
      if (vro.laggingVillages.length > 0) {
        lagReasons.push(\`\${vro.laggingVillages.length} assigned village(s) lagging behind schedule\`);
      }

      return {
        id: vro.id,
        name: vro.name,
        role: vro.role,
        tier: 'vro',
        phone: vro.phone,
        hasSheetPhone: Boolean(vro.phone && vro.phone.length >= 10),
        mandal: mandalList.join(', '),
        mandals: mandalList,
        jurisdictionCount: vro.assignedVillages.length,
        jurisdictionUnit: 'Revenue Villages',
        jurisdictionText: \`\${vro.assignedVillages.length} Revenue Village(s) Assigned (\${vro.mandal})\`,
        assignedVillages: vro.assignedVillages,
        today_gt_extent: Math.round(vro.today_gt_extent * 100) / 100,
        dlr_entries_today: vro.dlr_entries_today,
        balance_gt_extent: Math.round(vro.balance_gt_extent * 100) / 100,
        dlr_entries_balance: vro.dlr_entries_balance,
        total_extent: Math.round(vro.total_extent * 100) / 100,
        laggingCount: vro.laggingVillages.length,
        laggingVillages: vro.laggingVillages,
        lagReasons,
        primaryLag: vro.dlr_entries_balance > 0 && vro.dlr_entries_today === 0 ? 'DLR' : (vro.today_gt_extent === 0 ? 'GT' : 'DELAY')
      };
    })
    .sort((a, b) => (b.dlr_entries_balance - a.dlr_entries_balance) || (b.laggingCount - a.laggingCount) || (b.balance_gt_extent - a.balance_gt_extent));
}

/**
 * Returns poor performing Tahsildars (27 Mandals in Chittoor district)
 */
function getPoorTahsildars(store) {
  const poorVillages = getPoorPerformingVillages(store);
  const poorVillageMap = new Map();
  poorVillages.forEach(pv => poorVillageMap.set(String(pv.village_code || pv.id), pv));

  const mandalNames = Object.keys(MANDAL_SURVEYOR_DIRECTORY).map(m => normalizeMandal(m, store));
  const uniqueMandals = Array.from(new Set(mandalNames));

  const tahList = [];
  uniqueMandals.forEach(mandalName => {
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
      lagReasons.push(\`Zero Mandal GT Progress Today (\${formatExtent(balGt)} Ac balance pending)\`);
    }
    if (dlrBal > 0 && dlrToday === 0) {
      lagReasons.push(\`Zero DLR Clearances Today (\${dlrBal} Khatas pending in Mandal)\`);
    }
    if (lagging.length > 0) {
      lagReasons.push(\`\${lagging.length} of \${mVillages.length} revenue villages lagging\`);
    }

    tahList.push({
      id: 'tah_' + mandalName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: \`Tahsildar, \${mandalName}\`,
      role: 'Tahsildar (Mandal Executive Magistrate)',
      tier: 'tahsildar',
      phone: '',
      hasSheetPhone: false,
      mandal: mandalName,
      jurisdictionCount: mVillages.length,
      jurisdictionUnit: 'Revenue Villages in Mandal',
      jurisdictionText: \`\${mVillages.length} Revenue Villages in \${mandalName} Mandal\`,
      assignedVillages: mVillages.map(v => ({ code: v.village_code, name: v.village_name })),
      today_gt_extent: Math.round(todayGt * 100) / 100,
      dlr_entries_today: dlrToday,
      balance_gt_extent: Math.round(balGt * 100) / 100,
      dlr_entries_balance: dlrBal,
      total_extent: Math.round(totExt * 100) / 100,
      laggingCount: lagging.length,
      laggingVillages: lagging,
      lagReasons,
      primaryLag: dlrBal > 0 && dlrToday === 0 ? 'DLR' : (todayGt === 0 ? 'GT' : 'DELAY')
    });
  });

  return tahList
    .filter(t => t.laggingCount > 0 || (t.balance_gt_extent > 0 && t.today_gt_extent === 0) || t.dlr_entries_balance > 0)
    .sort((a, b) => (b.dlr_entries_balance - a.dlr_entries_balance) || (b.laggingCount - a.laggingCount) || (b.balance_gt_extent - a.balance_gt_extent));
}

/**
 * Returns poor performing Revenue Divisional Officers (RDOs) across 4 Revenue Divisions
 */
function getPoorRDOs(store) {
  const poorVillages = getPoorPerformingVillages(store);
  const poorVillageMap = new Map();
  poorVillages.forEach(pv => poorVillageMap.set(String(pv.village_code || pv.id), pv));

  const list = [];
  Object.entries(REVENUE_DIVISIONS).forEach(([divName, divInfo]) => {
    const normMandals = divInfo.mandals.map(m => normalizeMandal(m, store));
    const divVillages = (store.villages || []).filter(v => {
      const vm = normalizeMandal(v.mandal, store);
      const vd = (v.division || '').trim();
      return normMandals.includes(vm) || (vd && vd.toLowerCase().startsWith(divName.toLowerCase().slice(0, 4)));
    });

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

    const laggingMandals = Object.keys(mandalProgress).filter(m => mandalProgress[m].lagging > 0 || (mandalProgress[m].balGt > 0 && mandalProgress[m].todayGt === 0) || mandalProgress[m].dlrBal > 0);

    const lagReasons = [];
    if (balGt > 0 && todayGt === 0) {
      lagReasons.push(\`Zero Division GT Progress Today (\${formatExtent(balGt)} Ac balance pending)\`);
    }
    if (dlrBal > 0 && dlrToday === 0) {
      lagReasons.push(\`Zero DLR Clearances Today (\${dlrBal} Khatas pending in Division)\`);
    }
    if (laggingMandals.length > 0) {
      lagReasons.push(\`\${laggingMandals.length} of \${divInfo.mandals.length} mandals severely lagging\`);
    }

    list.push({
      id: 'rdo_' + divName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: divInfo.name,
      role: 'Revenue Divisional Officer (RDO)',
      tier: 'rdo',
      division: divName,
      phone: '',
      hasSheetPhone: false,
      assignedMandalsCount: divInfo.mandals.length,
      assignedMandals: divInfo.mandals,
      jurisdictionCount: divInfo.mandals.length,
      jurisdictionUnit: 'Mandals in Division',
      jurisdictionText: \`\${divName} Division (\${divInfo.mandals.length} Mandals · \${divVillages.length} Villages)\`,
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
      primaryLag: dlrBal > 0 && dlrToday === 0 ? 'DLR' : (todayGt === 0 ? 'GT' : 'DELAY')
    });
  });

  return list
    .filter(r => r.laggingCount > 0 || (r.balance_gt_extent > 0 && r.today_gt_extent === 0) || r.dlr_entries_balance > 0)
    .sort((a, b) => (b.dlr_entries_balance - a.dlr_entries_balance) || (b.laggingCount - a.laggingCount));
}

/**
 * Executes Automated Daily 6:00 AM WhatsApp alerts broadcast
 * Survey Cadre (VS, MLSO, DIOS) -> Dispatched by DSLRO, Chittoor
 * Revenue Cadre (VRO, Tahsildars, RDOs) -> Dispatched by Joint Collector, Chittoor
 */
async function executeDaily6AMWhatsAppBroadcast(store, baseUrl = 'https://chittoor-resurvey.vercel.app') {
  console.log('⏰ [Daily 6:00 AM Scheduler] Initiating official WhatsApp alerts broadcast...');
  const startTime = new Date().toISOString();
  const summary = {
    scheduledTime: 'Daily 06:00 AM IST (00:30 UTC)',
    executedAt: startTime,
    surveyCadre: { sender: 'DSLRO, Chittoor', vs: null, mlso: null, dios: null },
    revenueCadre: { sender: 'Joint Collector, Chittoor', vro: null, tahsildar: null, rdo: null },
    totalTargeted: 0,
    totalDispatched: 0,
    totalSent: 0,
    totalSimulated: 0,
    totalSkipped: 0
  };

  // 1. Survey Cadre Dispatches (Sender: DSLRO, Chittoor)
  const surveyTiers = [
    { tier: 'vs', label: 'Village Surveyors' },
    { tier: 'mlso', label: 'Mandal Level Survey Officers' },
    { tier: 'dios', label: 'Deputy Inspectors of Survey' }
  ];

  for (const item of surveyTiers) {
    try {
      const rep = await sendOfficerNotices({
        tier: item.tier,
        senderTitle: 'DSLRO, Chittoor',
        dryRun: false
      }, store, baseUrl);
      summary.surveyCadre[item.tier] = rep;
      summary.totalTargeted += rep.totalTargetedOfficers || 0;
      summary.totalDispatched += rep.totalDispatches || 0;
      summary.totalSent += rep.sentCount || 0;
      summary.totalSimulated += rep.simulatedCount || 0;
    } catch (err) {
      console.error(\`Error dispatching to \${item.label}:\`, err.message);
    }
  }

  // 2. Revenue Cadre Dispatches (Sender: Joint Collector, Chittoor)
  const revenueTiers = [
    { tier: 'vro', label: 'Village Revenue Officers' },
    { tier: 'tahsildar', label: 'Tahsildars' },
    { tier: 'rdo', label: 'Revenue Divisional Officers' }
  ];

  for (const item of revenueTiers) {
    try {
      const rep = await sendOfficerNotices({
        tier: item.tier,
        senderTitle: 'Joint Collector, Chittoor',
        dryRun: false
      }, store, baseUrl);
      summary.revenueCadre[item.tier] = rep;
      summary.totalTargeted += rep.totalTargetedOfficers || 0;
      summary.totalDispatched += rep.totalDispatches || 0;
      summary.totalSent += rep.sentCount || 0;
      summary.totalSimulated += rep.simulatedCount || 0;
    } catch (err) {
      console.error(\`Error dispatching to \${item.label}:\`, err.message);
    }
  }

  // Update schedule status in store
  store.whatsappScheduleStatus = {
    active: true,
    scheduledCron: '30 0 * * * (Daily 06:00 AM IST)',
    lastExecution: startTime,
    nextScheduledRun: 'Tomorrow at 06:00 AM IST',
    surveyCadreSender: 'DSLRO, Chittoor',
    revenueCadreSender: 'Joint Collector, Chittoor',
    lastSummary: summary
  };

  console.log(\`⏰ [Daily 6:00 AM Scheduler] Broadcast complete. Targeted: \${summary.totalTargeted}, Dispatched: \${summary.totalDispatched}, Sent: \${summary.totalSent}\`);
  return summary;
}
`;

// Insert revenueCadreCode right before getPoorOfficersByTier
const targetGetPoorOfficers = 'function getPoorOfficersByTier(tier = \'vs\', store) {';
if (!waServiceCode.includes('function getPoorVRO(')) {
  waServiceCode = waServiceCode.replace(targetGetPoorOfficers, revenueCadreCode + '\n' + targetGetPoorOfficers);
}

// Update getPoorOfficersByTier to route all 6 tiers
const oldGetPoorOfficers = `function getPoorOfficersByTier(tier = 'vs', store) {
  const normTier = String(tier || 'vs').toLowerCase().trim();
  if (normTier === 'dios') return getPoorDIOS(store);
  if (normTier === 'ms') return getPoorMS(store);
  return getPoorVS(store);
}`;

const newGetPoorOfficers = `function getPoorOfficersByTier(tier = 'vs', store) {
  const normTier = String(tier || 'vs').toLowerCase().trim();
  if (normTier === 'dios') return getPoorDIOS(store);
  if (normTier === 'mlso' || normTier === 'ms') return getPoorMLSO(store);
  if (normTier === 'vs') return getPoorVS(store);
  if (normTier === 'vro') return getPoorVRO(store);
  if (normTier === 'tahsildar' || normTier === 'tah') return getPoorTahsildars(store);
  if (normTier === 'rdo') return getPoorRDOs(store);
  return getPoorVS(store);
}`;

waServiceCode = waServiceCode.replace(oldGetPoorOfficers, newGetPoorOfficers);

// Update formatOfficerNotice to handle all tiers and proper default senders
const oldFormatOfficerNoticeStart = `function formatOfficerNotice(officer, tier = 'vs', baseUrl = 'https://chittoor-resurvey.vercel.app', senderTitle = 'AD, Chittoor') {
  const effectiveSender = senderTitle || 'AD, Chittoor';
  const normTier = String(tier || 'vs').toLowerCase();`;

const newFormatOfficerNoticeStart = `function formatOfficerNotice(officer, tier = 'vs', baseUrl = 'https://chittoor-resurvey.vercel.app', senderTitle = '') {
  const normTier = String(tier || 'vs').toLowerCase();
  const effectiveSender = senderTitle || getDefaultSenderForTier(normTier);`;

waServiceCode = waServiceCode.replace(oldFormatOfficerNoticeStart, newFormatOfficerNoticeStart);

// Update DIOS notice template header/footer
waServiceCode = waServiceCode.replace(
  `🚨 *DIVISION RESURVEY MONITORING DIRECTIVE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*`,
  `🚨 *DIVISION RESURVEY MONITORING DIRECTIVE*
🏛️ *OFFICE OF THE DISTRICT SURVEY & LAND RECORDS OFFICER (DSLRO)*
*Survey & Land Records, Chittoor District*`
);

waServiceCode = waServiceCode.replace(
  `⚠️ *URGENT DIRECTIVE FROM AD, CHITTOOR:*`,
  `⚠️ *URGENT DIRECTIVE FROM DSLRO, CHITTOOR:*`
);

// Update MS/MLSO notice template header/footer
waServiceCode = waServiceCode.replace(
  `🚨 *MANDAL RESURVEY PROGRESS NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*`,
  `🚨 *MANDAL LEVEL SURVEY OFFICER (MLSO) DIRECTIVE*
🏛️ *OFFICE OF THE DISTRICT SURVEY & LAND RECORDS OFFICER (DSLRO)*
*Survey & Land Records, Chittoor District*`
);

waServiceCode = waServiceCode.replace(
  `⚠️ *DIRECTIVE FOR MANDAL SURVEYOR:*`,
  `⚠️ *DIRECTIVE FOR MANDAL LEVEL SURVEY OFFICER (MLSO):*`
);

// Update VS notice template header/footer
waServiceCode = waServiceCode.replace(
  `🚨 *VILLAGE SURVEYOR PERFORMANCE NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*`,
  `🚨 *VILLAGE SURVEYOR (VS) PERFORMANCE NOTICE*
🏛️ *OFFICE OF THE DISTRICT SURVEY & LAND RECORDS OFFICER (DSLRO)*
*Survey & Land Records, Chittoor District*`
);

// Add VRO, Tahsildar, RDO notice templates inside formatOfficerNotice
const vroTahRdoTemplates = `
  // 4. VRO Notice (Revenue Cadre - Issued by Joint Collector, Chittoor)
  if (normTier === 'vro') {
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
\${baseUrl}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Joint Collector & Additional District Magistrate
Chittoor District, Government of Andhra Pradesh\`;
  }

  // 5. Tahsildar Notice (Revenue Cadre - Issued by Joint Collector, Chittoor)
  if (normTier === 'tahsildar' || normTier === 'tah') {
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
\${baseUrl}/report/mandal-villages?mandal=\${encodeURIComponent(officer.mandal)}

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Joint Collector & Additional District Magistrate
Chittoor District, Government of Andhra Pradesh\`;
  }

  // 6. RDO Notice (Revenue Cadre - Issued by Joint Collector, Chittoor)
  if (normTier === 'rdo') {
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
\${baseUrl}/

━━━━━━━━━━━━━━━━━━━━━━━━━
*\${effectiveSender}*
Joint Collector & Additional District Magistrate
Chittoor District, Government of Andhra Pradesh\`;
  }
`;

const vsNoticeAnchor = '  // 3. VS Notice (Jurisdiction by Assigned Revenue Villages)';
if (!waServiceCode.includes('// 4. VRO Notice')) {
  waServiceCode = waServiceCode.replace(vsNoticeAnchor, vroTahRdoTemplates + '\n' + vsNoticeAnchor);
}

// Update module.exports in whatsappService.js
const oldExports = `module.exports = {
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
};`;

const newExports = `module.exports = {
  verifyWebhook,
  extractInboundMessages,
  processWhatsAppQuery,
  sendWhatsAppCloudMessage,
  DEFAULT_VERIFY_TOKEN,
  MANDAL_SURVEYOR_DIRECTORY,
  DIOS_DIRECTORY,
  REVENUE_DIVISIONS,
  getDefaultSenderForTier,
  getMandalSurveyor,
  getVillageSurveyorContacts,
  isVillagePoorPerforming,
  getPoorPerformingVillages,
  getPoorVS,
  getPoorMS,
  getPoorMLSO,
  getPoorDIOS,
  getPoorVRO,
  getPoorTahsildars,
  getPoorRDOs,
  getPoorOfficersByTier,
  formatPoorVillageNotice,
  formatOfficerNotice,
  sendPoorVillagesNotices,
  sendOfficerNotices,
  executeDaily6AMWhatsAppBroadcast
};`;

waServiceCode = waServiceCode.replace(oldExports, newExports);

fs.writeFileSync(waServicePath, waServiceCode, 'utf8');
console.log('✓ Successfully patched lib/whatsappService.js with Survey and Revenue Cadres and Daily 6:00 AM Broadcast function');
