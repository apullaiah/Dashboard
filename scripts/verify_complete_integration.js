// scripts/verify_complete_integration.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const server = require('../server.js');
const reportService = require('../lib/reportService.js');
const whatsappService = require('../lib/whatsappService.js');

console.log('================================================================');
console.log('       COMPLETE INTEGRATION & POST-JC STAGE VERIFICATION        ');
console.log('================================================================\n');

let failed = false;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed = true;
  }
}

// Test 1: STAGES in server.js
console.log('1. Checking server.js STAGES schema:');
const expectedStages = [
  'gt_status',
  'vectorization_status',
  'vs_status',
  'vro_status',
  'tahsildar_status',
  'rdo_status',
  'jc_status',
  'dlr_completed_status',
  'final_ror_status',
  'blockchain_status'
];

assert(server.STAGES.length === 10, `server.STAGES has exactly 10 stages (got ${server.STAGES.length})`);
server.STAGES.forEach(([key, label], idx) => {
  assert(key === expectedStages[idx], `Stage ${idx + 1}: ${key} === ${expectedStages[idx]} ('${label}')`);
});

// Test 2: Dashboard KPIs & Structure
console.log('\n2. Testing dashboard(store) output:');
const store = server.load();
const d = server.dashboard(store);

assert(d.stageProgress && d.stageProgress.length === 10, `d.stageProgress contains exactly 10 stages (got ${d.stageProgress ? d.stageProgress.length : 0})`);
assert(d.stageDetails && d.stageDetails.length === 10, `d.stageDetails contains exactly 10 stages (got ${d.stageDetails ? d.stageDetails.length : 0})`);
assert(d.kpis && d.kpis.jcCompleted !== undefined, 'KPI contains jcCompleted');
assert(d.kpis && d.kpis.dlrCompleted !== undefined, `KPI contains dlrCompleted (${d.kpis.dlrCompleted})`);
assert(d.kpis && d.kpis.finalRorCompleted !== undefined, `KPI contains finalRorCompleted (${d.kpis.finalRorCompleted})`);
assert(d.kpis && d.kpis.blockchainCompleted !== undefined, `KPI contains blockchainCompleted (${d.kpis.blockchainCompleted})`);
assert(d.kpis && d.kpis.section13Completed === undefined, 'Legacy section13Completed removed from KPIs');
assert(d.kpis && d.kpis.draftRorCompleted === undefined, 'Legacy draftRorCompleted removed from KPIs');

// Test 3: Mandal Action Plan columns
console.log('\n3. Testing Mandal Action Plan summary:');
const ap = server.buildMandalActionPlan(store);
assert(ap.summary && ap.summary.dlr_completed !== undefined, `Mandal action plan summary has dlr_completed (${ap.summary.dlr_completed})`);
assert(ap.summary && ap.summary.final_ror !== undefined, `Mandal action plan summary has final_ror (${ap.summary.final_ror})`);
assert(ap.summary && ap.summary.blockchain !== undefined, `Mandal action plan summary has blockchain (${ap.summary.blockchain})`);
assert(ap.summary && ap.summary.sec13_notified === undefined, 'Mandal action plan summary removed legacy sec13_notified');
assert(ap.summary && ap.summary.ported_webland2 === undefined, 'Mandal action plan summary removed legacy ported_webland2');

// Test 4: ReportService Badges & Progress
console.log('\n4. Testing lib/reportService.js:');
const dummyBcVillage = { current_stage: 'Block Chain Technology Stage', blockchain_status: 'Completed', status: 'Completed' };
const badgeBc = reportService.getStageBadgeInfo(dummyBcVillage);
assert(badgeBc.name === 'Block Chain Technology Stage' || badgeBc.name.includes('Block Chain'), `Blockchain badge is '${badgeBc.name}'`);

const dummyDlrCompVillage = { current_stage: 'DLR Completed', jc_status: 'Completed', dlr_completed_status: 'Completed' };
const badgeDlr = reportService.getStageBadgeInfo(dummyDlrCompVillage);
assert(badgeDlr.name === 'DLR Completed', `DLR Completed badge is '${badgeDlr.name}'`);

const dummyFinalRorVillage = { current_stage: 'Final RoR', jc_status: 'Completed', final_ror_status: 'Completed' };
const badgeRor = reportService.getStageBadgeInfo(dummyFinalRorVillage);
assert(badgeRor.name === 'Final RoR', `Final RoR badge is '${badgeRor.name}'`);

// Test 5: WhatsApp Service Badges & Snapshot
console.log('\n5. Testing lib/whatsappService.js:');
const waBadgeBc = whatsappService.getStageBadgeInfo(dummyBcVillage);
assert(waBadgeBc.name === 'Block Chain Technology Stage', `WhatsApp badge for blockchain is '${waBadgeBc.name}'`);

const waReply = whatsappService.processWhatsAppQuery('summary', store, 'https://chittoor-resurvey.ap.gov.in');
assert(waReply && waReply.reply.includes('Block Chain Tech Stage:'), 'WhatsApp snapshot includes Block Chain Tech Stage');
assert(waReply && waReply.reply.includes('Final RoR Completed:'), 'WhatsApp snapshot includes Final RoR Completed');
assert(waReply && waReply.reply.includes('DLR Completed:'), 'WhatsApp snapshot includes DLR Completed');
assert(!waReply.reply.includes('Sec 13 Gazette Done:'), 'WhatsApp snapshot removed Sec 13 Gazette Done');

// Test 6: Verify Store Villages
console.log('\n6. Checking data/store.json villages stage distribution:');
const currentStagesMap = {};
store.villages.forEach(v => {
  const st = v.current_stage || 'Unknown';
  currentStagesMap[st] = (currentStagesMap[st] || 0) + 1;
});

console.log('  Current stage distribution across all 736 villages:');
Object.entries(currentStagesMap).sort((a,b) => b[1] - a[1]).forEach(([k, count]) => {
  console.log(`    - ${k}: ${count} villages`);
});

assert(!currentStagesMap['13 Notification'], 'Zero villages at legacy 13 Notification');
assert(!currentStagesMap['Draft RoR'], 'Zero villages at legacy Draft RoR');
assert(!currentStagesMap['Webland Porting'], 'Zero villages at legacy Webland Porting');
assert(!currentStagesMap['Porting DLR to Webland-2.0'], 'Zero villages at legacy Porting DLR to Webland-2.0');

console.log('\n================================================================');
if (failed) {
  console.error('VERIFICATION FAILED! Please review the errors above.');
  process.exit(1);
} else {
  console.log('ALL INTEGRATION & POST-JC STAGE CHECKS PASSED PERFECTLY (100%)!');
  console.log('================================================================\n');
}
