const server = require('../server.js');
const fs = require('fs');

const store = JSON.parse(fs.readFileSync('./data/store.json', 'utf8').replace(/^\uFEFF/, ''));
const data = server.dashboard(store);

console.log('Total villages in dashboard payload:', data.villages.length);
const sample = data.villages.find(v => v.village_code === '1061007'); // Devadoddi
console.log('\nSample village in dashboard (Devadoddi):');
console.log('Village:', sample.village_name, 'Mandal:', sample.mandal);
console.log('Target date:', sample.target_date);
console.log('Stage targets:', JSON.stringify(sample.stage_targets, null, 2));

const withStageTargets = data.villages.filter(v => v.stage_targets && Object.keys(v.stage_targets).length > 2);
console.log(`\nVillages with detailed stage_targets in dashboard(): ${withStageTargets.length} / ${data.villages.length}`);

if (data.mandal_action_plan) {
  console.log('\nMandal Action Plan sample:');
  console.log('Total mandals in plan:', Object.keys(data.mandal_action_plan).length);
  const sampleMandal = Object.values(data.mandal_action_plan)[0];
  console.log('Sample mandal plan:', sampleMandal.mandal, sampleMandal.stage_target_dates);
}
