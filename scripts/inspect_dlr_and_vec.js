const fs = require('fs');
const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));

const vlgs = store.villages || [];
console.log('Total villages:', vlgs.length);

const jcCompleted = vlgs.filter(v => v.jc_status === 'Completed' || v.dlr_active_stage === 'Completed');
console.log('Villages with JC/DLR completed:', jcCompleted.length);

const sec13Completed = vlgs.filter(v => v.section13_status === 'Completed');
console.log('Villages with section13_status === Completed:', sec13Completed.length);

const diff = vlgs.filter(v => (v.jc_status === 'Completed' || v.dlr_active_stage === 'Completed') && v.section13_status !== 'Completed');
console.log('Difference (JC complete but sec13 not complete):', diff.length);

diff.forEach((v, idx) => {
  console.log(`${idx + 1}. ${v.village_name} (${v.mandal}) [${v.phase}]: current_stage="${v.current_stage}", jc_status="${v.jc_status}", sec13="${v.section13_status}"`);
});

// Also check vectorization fields in villages
console.log('\n--- VECTORIZATION FIELDS CHECK ---');
const withChalthas = vlgs.filter(v => v.chalthas !== undefined && v.chalthas !== null && v.chalthas !== '');
console.log('Villages with v.chalthas:', withChalthas.length);
if (withChalthas.length > 0) {
  console.log('Sample with chalthas:', withChalthas.slice(0, 3).map(v => ({ name: v.village_name, chalthas: v.chalthas, extent: v.extent, lpms: v.lpms, total_lpms: v.total_lpms })));
}

// Check LPM fields
const keys = new Set();
vlgs.forEach(v => Object.keys(v).forEach(k => {
  if (k.toLowerCase().includes('lpm') || k.toLowerCase().includes('chaltha') || k.toLowerCase().includes('vec')) {
    keys.add(k);
  }
}));
console.log('Vectorization / LPM related keys in villages:', Array.from(keys));
