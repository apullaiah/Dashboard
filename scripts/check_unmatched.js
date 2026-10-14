const fs = require('fs');
const store = JSON.parse(fs.readFileSync('./data/store.json', 'utf8').replace(/^\uFEFF/, ''));
const merged = JSON.parse(fs.readFileSync('./scratch/merged_village_targets.json', 'utf8'));

console.log('Unmatched Phase VI villages:');
store.villages.filter(v => v.phase === 'Phase VI' && !merged[v.id]).forEach(v => {
  console.log(`   [Code: ${v.village_code}] ${v.village_name} (${v.mandal})`);
});

console.log('\nUnmatched Phase I villages:');
store.villages.filter(v => v.phase === 'Phase I' && !merged[v.id]).forEach(v => {
  console.log(`   [Code: ${v.village_code}] ${v.village_name} (${v.mandal})`);
});
