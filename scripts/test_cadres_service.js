const store = require('../data/store.json');
const wa = require('../lib/whatsappService.js');
const assert = require('assert');

console.log('=== TESTING SURVEY & REVENUE CADRES & 6:00 AM SCHEDULE LOGIC ===');

// 1. Survey Cadre
const vsList = wa.getPoorVS(store);
const mlsoList = wa.getPoorMLSO(store);
const diosList = wa.getPoorDIOS(store);

console.log(`✓ Survey Cadre - VS count: ${vsList.length}, MLSO count: ${mlsoList.length}, DIOS count: ${diosList.length}`);
assert(vsList.length > 0, 'VS list must not be empty');
assert(mlsoList.length > 0, 'MLSO list must not be empty');
assert(diosList.length === 6, 'DIOS list must contain 6 officers');

// Sender check for Survey Cadre
assert.strictEqual(wa.getDefaultSenderForTier('vs'), 'DSLRO, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('mlso'), 'DSLRO, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('dios'), 'DSLRO, Chittoor');
console.log('✓ Survey Cadre official sender verified: DSLRO, Chittoor');

// 2. Revenue Cadre
const vroList = wa.getPoorVRO(store);
const tahList = wa.getPoorTahsildars(store);
const rdoList = wa.getPoorRDOs(store);

console.log(`✓ Revenue Cadre - VRO count: ${vroList.length}, Tahsildars count: ${tahList.length}, RDOs count: ${rdoList.length}`);
assert(vroList.length > 0, 'VRO list must not be empty');
assert(tahList.length > 0, 'Tahsildars list must not be empty');
assert(rdoList.length === 4, 'RDO list must contain 4 division officers');

// Sender check for Revenue Cadre
assert.strictEqual(wa.getDefaultSenderForTier('vro'), 'Joint Collector, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('tahsildar'), 'Joint Collector, Chittoor');
assert.strictEqual(wa.getDefaultSenderForTier('rdo'), 'Joint Collector, Chittoor');
console.log('✓ Revenue Cadre official sender verified: Joint Collector, Chittoor');

// 3. Notice Template Formatting Checks
const vsNotice = wa.formatOfficerNotice(vsList[0], 'vs');
assert(vsNotice.includes('DSLRO, Chittoor'), 'VS notice must be signed by DSLRO, Chittoor');
assert(vsNotice.includes('OFFICE OF THE DISTRICT SURVEY & LAND RECORDS OFFICER'), 'VS notice must have DSLRO office banner');

const mlsoNotice = wa.formatOfficerNotice(mlsoList[0], 'mlso');
assert(mlsoNotice.includes('DSLRO, Chittoor'), 'MLSO notice must be signed by DSLRO, Chittoor');

const diosNotice = wa.formatOfficerNotice(diosList[0], 'dios');
assert(diosNotice.includes('DSLRO, Chittoor'), 'DIOS notice must be signed by DSLRO, Chittoor');

const vroNotice = wa.formatOfficerNotice(vroList[0], 'vro');
assert(vroNotice.includes('Joint Collector, Chittoor'), 'VRO notice must be signed by Joint Collector, Chittoor');
assert(vroNotice.includes('COLLECTORATE & REVENUE ADMINISTRATION'), 'VRO notice must have Collectorate banner');

const tahNotice = wa.formatOfficerNotice(tahList[0], 'tahsildar');
assert(tahNotice.includes('Joint Collector, Chittoor'), 'Tahsildar notice must be signed by Joint Collector, Chittoor');

const rdoNotice = wa.formatOfficerNotice(rdoList[0], 'rdo');
assert(rdoNotice.includes('Joint Collector, Chittoor'), 'RDO notice must be signed by Joint Collector, Chittoor');

console.log('✓ All 6 notice templates verified with appropriate official headers and senders');

// 4. Test Daily 6:00 AM Broadcast function
console.log('Testing executeDaily6AMWhatsAppBroadcast with simulation...');
wa.executeDaily6AMWhatsAppBroadcast(store).then(summary => {
  console.log(`✓ Daily broadcast completed! Dispatched: ${summary.totalDispatched}, Sent: ${summary.totalSent}, Simulated: ${summary.totalSimulated}`);
  assert(summary.totalDispatched > 0, 'Total dispatches must be > 0');
  assert.strictEqual(store.whatsappScheduleStatus.surveyCadreSender, 'DSLRO, Chittoor');
  assert.strictEqual(store.whatsappScheduleStatus.revenueCadreSender, 'Joint Collector, Chittoor');
  console.log('\nALL CADRE & SCHEDULE SERVICE TESTS PASSED! 🎉');
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
