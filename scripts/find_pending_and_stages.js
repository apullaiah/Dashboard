const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split('\n');

console.log('=== Pending text in app.js ===');
lines.forEach((l, idx) => {
  const low = l.toLowerCase();
  if (low.includes('pending') && (low.includes('stage') || low.includes('resurvey') || low.includes('village') || low.includes('overview') || low.includes('section'))) {
    console.log(`${idx + 1}: ${l.trim().slice(0, 120)}`);
  }
});
