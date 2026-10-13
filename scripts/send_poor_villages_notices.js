/**
 * Command-line tool to identify poor performing villages and dispatch official WhatsApp progress notices to all VS concerned.
 * Sender name: AD, Chittoor (Assistant Director, Survey & Land Records, Chittoor District)
 */
const fs = require('fs');
const path = require('path');
const {
  getPoorPerformingVillages,
  formatPoorVillageNotice,
  sendPoorVillagesNotices
} = require('../lib/whatsappService.js');

const STORE_PATH = path.join(__dirname, '../data/store.json');

async function main() {
  console.log('========================================================================');
  console.log('🏛️ CHITTOOR DISTRICT RESURVEY MONITORING - WHATSAPP PROGRESS NOTICES');
  console.log('Office of the Assistant Director (AD), Survey & Land Records, Chittoor');
  console.log('========================================================================\n');

  if (!fs.existsSync(STORE_PATH)) {
    console.error('Error: store.json not found at', STORE_PATH);
    process.exit(1);
  }

  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  const config = store.whatsappConfig || {};

  const senderName = process.env.WHATSAPP_SENDER_NAME || config.senderName || 'AD, Chittoor';
  const isDryRun = process.argv.includes('--dry-run');
  const filterType = process.argv.find(arg => arg.startsWith('--filter='))?.split('=')[1] || 'all';

  console.log(`📋 SENDER DETAILS   : ${senderName}`);
  console.log(`📡 CLOUD API STATUS : ${config.phoneNumberId && config.accessToken ? 'LIVE META GRAPH API' : 'SIMULATION MODE (Safe preview)'}`);
  console.log(`🎯 FILTER CATEGORY  : ${filterType}`);
  console.log(`⚙️ MODE             : ${isDryRun ? 'DRY RUN (Preview Only)' : 'ACTIVE DISPATCH'}\n`);

  console.log('🔍 Analyzing village performance across 736 revenue villages...');
  const poorVillages = getPoorPerformingVillages(store);

  console.log(`⚠️ Identified ${poorVillages.length} poor performing / lagging villages.\n`);

  // Count by primary lag
  const gtLags = poorVillages.filter(pv => pv.primaryLag === 'GT');
  const dlrLags = poorVillages.filter(pv => pv.primaryLag === 'DLR');
  const delayLags = poorVillages.filter(pv => pv.primaryLag === 'DELAY');

  console.log(`   • Ground Truthing (GT) Zero Progress / Lagging : ${gtLags.length} villages`);
  console.log(`   • DLR Review at VS Login Pending               : ${dlrLags.length} villages`);
  console.log(`   • Schedule Delayed Past Target Date            : ${delayLags.length} villages`);
  console.log('------------------------------------------------------------------------\n');

  console.log('🚀 Dispatching official notices to concerned Village Surveyors (VS)...');
  const baseUrl = process.env.BASE_URL || 'https://chittor-resurvey-dashboard.vercel.app';

  const report = await sendPoorVillagesNotices({
    filterType,
    senderTitle: senderName,
    dryRun: isDryRun
  }, store, baseUrl);

  // Save back store with audit entries
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');

  console.log('\n========================================================================');
  console.log('📊 DISPATCH SUMMARY REPORT:');
  console.log('========================================================================');
  console.log(`🏛️ Sender Identity           : ${report.sender}`);
  console.log(`🏡 Total Poor Villages Targeted: ${report.totalTargetedVillages}`);
  console.log(`📱 Total WhatsApp Messages     : ${report.totalDispatches}`);
  console.log(`✅ Delivered / Queued          : ${report.sentCount}`);
  console.log(`🔄 Simulated (Test Mode)       : ${report.simulatedCount}`);
  console.log(`❌ Failed                      : ${report.failedCount}`);
  console.log('========================================================================\n');

  console.log('📋 SAMPLE DISPATCHED NOTICES (FIRST 3):');
  report.results.slice(0, 3).forEach((r, idx) => {
    console.log(`\n[#${idx + 1}] Village: ${r.villageName} (${r.mandal})`);
    console.log(`     VS Concerned : ${r.surveyorName} (${r.surveyorRole})`);
    console.log(`     Mobile Number: +${r.surveyorPhone}`);
    console.log(`     Status       : ${r.status}`);
  });

  console.log('\n✅ All notice events audited in store.json and visible in Dashboard WhatsApp Log.');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
