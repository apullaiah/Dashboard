const fs = require('fs');
const path = require('path');

const serverFile = path.resolve(__dirname, '..', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Update imports
const oldImports = `  getPoorVS,
  getPoorMS,
  getPoorDIOS,
  getPoorOfficersByTier,
  formatPoorVillageNotice,
  formatOfficerNotice,
  sendPoorVillagesNotices,
  sendOfficerNotices
} = require('./lib/whatsappService.js');`;

const newImports = `  getPoorVS,
  getPoorMS,
  getPoorMLSO,
  getPoorDIOS,
  getPoorVRO,
  getPoorTahsildars,
  getPoorRDOs,
  getPoorOfficersByTier,
  getDefaultSenderForTier,
  formatPoorVillageNotice,
  formatOfficerNotice,
  sendPoorVillagesNotices,
  sendOfficerNotices,
  executeDaily6AMWhatsAppBroadcast
} = require('./lib/whatsappService.js');`;

code = code.replace(oldImports, newImports);

// 2. Update /api/whatsapp/poor-officers
const oldPoorOfficersHandler = `  // Multi-tier Poor Performing Officers monitoring: VS (Village Surveyors), MS (Mandal Surveyors), DIOS (Deputy Inspectors)
  if (req.method === 'GET' && pathname === '/api/whatsapp/poor-officers') {
    const tier = clean(url.searchParams.get('tier') || 'vs').toLowerCase();
    const senderName = store.whatsappConfig?.senderName || process.env.WHATSAPP_SENDER_NAME || 'AD, Chittoor';
    const officers = getPoorOfficersByTier(tier, store);
    const vsCount = getPoorVS(store).length;
    const msCount = getPoorMS(store).length;
    const diosCount = getPoorDIOS(store).length;

    return json(res, 200, {
      tier,
      count: officers.length,
      counts: {
        vs: vsCount,
        ms: msCount,
        dios: diosCount
      },
      senderName,
      officers
    });
  }`;

const newPoorOfficersHandler = `  // Multi-tier & Cadre Poor Performing Officers monitoring:
  // Survey Cadre: VS (Village Surveyors), MLSO (Mandal Level Survey Officers), DIOS (Deputy Inspectors) -> Sender: DSLRO, Chittoor
  // Revenue Cadre: VRO (Village Revenue Officers), Tahsildars, RDOs -> Sender: Joint Collector, Chittoor
  if (req.method === 'GET' && pathname === '/api/whatsapp/poor-officers') {
    const tier = clean(url.searchParams.get('tier') || 'vs').toLowerCase();
    const defaultSender = getDefaultSenderForTier(tier);
    const senderName = clean(url.searchParams.get('sender')) || defaultSender;
    const officers = getPoorOfficersByTier(tier, store);

    const vsCount = getPoorVS(store).length;
    const mlsoCount = getPoorMLSO(store).length;
    const diosCount = getPoorDIOS(store).length;
    const vroCount = getPoorVRO(store).length;
    const tahCount = getPoorTahsildars(store).length;
    const rdoCount = getPoorRDOs(store).length;

    return json(res, 200, {
      tier,
      count: officers.length,
      counts: {
        vs: vsCount,
        mlso: mlsoCount,
        ms: mlsoCount,
        dios: diosCount,
        vro: vroCount,
        tahsildar: tahCount,
        tah: tahCount,
        rdo: rdoCount
      },
      cadres: {
        survey: {
          title: 'Survey Cadre',
          officialSender: 'DSLRO, Chittoor',
          vs: vsCount,
          mlso: mlsoCount,
          dios: diosCount
        },
        revenue: {
          title: 'Revenue Cadre',
          officialSender: 'Joint Collector, Chittoor',
          vro: vroCount,
          tahsildar: tahCount,
          rdo: rdoCount
        }
      },
      schedule: store.whatsappScheduleStatus || {
        active: true,
        scheduledCron: '30 0 * * * (Daily 06:00 AM IST)',
        nextRun: 'Tomorrow at 06:00 AM IST',
        surveyCadreSender: 'DSLRO, Chittoor',
        revenueCadreSender: 'Joint Collector, Chittoor'
      },
      senderName,
      defaultSender,
      officers
    });
  }`;

code = code.replace(oldPoorOfficersHandler, newPoorOfficersHandler);

// 3. Update send-officer-notice default sender
const oldSendOfficerNoticeSender = `    const effectiveSender = clean(b.senderTitle) || config.senderName || process.env.WHATSAPP_SENDER_NAME || 'AD, Chittoor';`;
const newSendOfficerNoticeSender = `    const effectiveSender = clean(b.senderTitle) || getDefaultSenderForTier(tier);`;
code = code.replace(oldSendOfficerNoticeSender, newSendOfficerNoticeSender);

// 4. Update broadcast-tier-notices default sender
const oldBroadcastTierNotice = `  // Bulk tier notices broadcast (alerts all flagged VS, MS, or DIOS)
  if (req.method === 'POST' && pathname === '/api/whatsapp/broadcast-tier-notices') {
    const b = await readBody(req);
    const baseUrl = \`\${url.protocol}//\${url.host}\`;
    const tier = clean(b.tier || 'vs').toLowerCase();
    const report = await sendOfficerNotices({
      tier,
      officerIds: b.officerIds,
      senderTitle: clean(b.senderTitle),
      dryRun: Boolean(b.dryRun)
    }, store, baseUrl);
    save(store);
    return json(res, 200, { success: true, report });
  }`;

const newBroadcastTierNotice = `  // Bulk tier notices broadcast (alerts all flagged officers in specified cadre tier)
  if (req.method === 'POST' && pathname === '/api/whatsapp/broadcast-tier-notices') {
    const b = await readBody(req);
    const baseUrl = \`\${url.protocol}//\${url.host}\`;
    const tier = clean(b.tier || 'vs').toLowerCase();
    const senderTitle = clean(b.senderTitle) || getDefaultSenderForTier(tier);
    const report = await sendOfficerNotices({
      tier,
      officerIds: b.officerIds,
      senderTitle,
      dryRun: Boolean(b.dryRun)
    }, store, baseUrl);
    save(store);
    return json(res, 200, { success: true, report });
  }

  // Automated Daily 6:00 AM WhatsApp Alerts Endpoint (Vercel Cron & Manual Trigger)
  // Cadre A: VS, MLSO, DIOS -> Dispatched by DSLRO, Chittoor
  // Cadre B: VRO, Tahsildar, RDO -> Dispatched by Joint Collector, Chittoor
  if ((req.method === 'GET' || req.method === 'POST') && (pathname === '/api/cron/daily-whatsapp-alerts' || pathname === '/api/whatsapp/trigger-daily-alerts')) {
    const baseUrl = \`\${url.protocol}//\${url.host}\`;
    const summary = await executeDaily6AMWhatsAppBroadcast(store, baseUrl);
    save(store);
    return json(res, 200, {
      success: true,
      message: 'Automated daily 6:00 AM WhatsApp alerts broadcast completed successfully.',
      schedule: store.whatsappScheduleStatus,
      summary
    });
  }

  // Schedule status query endpoint
  if (req.method === 'GET' && pathname === '/api/whatsapp/schedule-status') {
    return json(res, 200, {
      schedule: store.whatsappScheduleStatus || {
        active: true,
        scheduledCron: '30 0 * * * (Daily 06:00 AM IST)',
        nextRun: 'Tomorrow at 06:00 AM IST',
        surveyCadreSender: 'DSLRO, Chittoor',
        revenueCadreSender: 'Joint Collector, Chittoor'
      }
    });
  }`;

code = code.replace(oldBroadcastTierNotice, newBroadcastTierNotice);

// 5. In-process daily 6:00 AM IST scheduler loop
const schedulerSnippet = `
// ============================================================================
// IN-PROCESS AUTOMATED DAILY 6:00 AM IST WHATSAPP BROADCAST SCHEDULER
// ============================================================================
let lastDailyRunDate = null;
setInterval(async () => {
  try {
    // Current time in IST (UTC + 5.5 hours)
    const istDate = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    const todayStr = istDate.toISOString().slice(0, 10);

    // Trigger daily at 06:00 AM IST (window: 06:00 - 06:05)
    if (hours === 6 && minutes >= 0 && minutes <= 5 && lastDailyRunDate !== todayStr) {
      lastDailyRunDate = todayStr;
      console.log(\`⏰ [Automated Scheduler] Firing Daily 06:00 AM IST WhatsApp Alerts for \${todayStr}...\`);
      const baseUrl = process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : 'https://chittor-resurvey-dashboard.vercel.app';
      const storeObj = load();
      await executeDaily6AMWhatsAppBroadcast(storeObj, baseUrl);
      save(storeObj);
      console.log(\`⏰ [Automated Scheduler] Daily 06:00 AM IST broadcast finished successfully for \${todayStr}.\`);
    }
  } catch (err) {
    console.error('Error in in-process daily 6:00 AM scheduler:', err.message);
  }
}, 60000); // Check once every minute
`;

if (!code.includes('IN-PROCESS AUTOMATED DAILY 6:00 AM IST WHATSAPP BROADCAST SCHEDULER')) {
  // Append right above server export / listen
  const listenAnchor = 'if (require.main === module) {';
  code = code.replace(listenAnchor, schedulerSnippet + '\n' + listenAnchor);
}

fs.writeFileSync(serverFile, code, 'utf8');
console.log('✓ Successfully patched server.js with Survey and Revenue Cadres, Cron endpoint, and 6:00 AM IST scheduler');
