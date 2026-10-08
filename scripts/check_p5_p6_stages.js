const store = require('../data/store.json');
const p5 = store.villages.filter(v => v.phase === 'Phase V');
const p6 = store.villages.filter(v => v.phase === 'Phase VI');

console.log('=== PHASE V (60 villages) ===');
const p5Stages = {};
p5.forEach(v => {
  p5Stages[v.current_stage] = (p5Stages[v.current_stage] || 0) + 1;
});
console.log('Current stages in Phase V:', JSON.stringify(p5Stages, null, 2));

console.log('\n=== PHASE VI (92 villages) ===');
const p6Stages = {};
p6.forEach(v => {
  p6Stages[v.current_stage] = (p6Stages[v.current_stage] || 0) + 1;
});
console.log('Current stages in Phase VI:', JSON.stringify(p6Stages, null, 2));
