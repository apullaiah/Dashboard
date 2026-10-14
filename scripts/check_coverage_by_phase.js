const fs = require('fs');

const store = JSON.parse(fs.readFileSync('./data/store.json', 'utf8').replace(/^\uFEFF/, ''));
console.log('Store villages count:', store.villages.length);

const merged = JSON.parse(fs.readFileSync('./scratch/merged_village_targets.json', 'utf8'));
console.log('Merged villages with targets:', Object.keys(merged).length);

// Check coverage by phase in store
const byPhase = {};
store.villages.forEach(v => {
  const p = v.phase || 'Unknown';
  if (!byPhase[p]) byPhase[p] = { total: 0, withTargets: 0 };
  byPhase[p].total++;
  if (merged[v.id]) byPhase[p].withTargets++;
});

console.log('\nTarget Coverage by Phase:');
Object.keys(byPhase).forEach(p => {
  console.log(`   ${p.padEnd(20)}: ${byPhase[p].withTargets} / ${byPhase[p].total} have targets`);
});
