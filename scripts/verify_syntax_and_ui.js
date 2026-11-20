const fs = require('fs');
const path = require('path');

function checkFile(relPath) {
  const fullPath = path.join(__dirname, '..', relPath);
  console.log(`Checking ${relPath}...`);
  const code = fs.readFileSync(fullPath, 'utf8');
  try {
    new Function(code);
    console.log(`✓ ${relPath} JavaScript syntax is VALID (Size: ${code.length} bytes)`);
  } catch (err) {
    console.error(`✗ ${relPath} syntax error:`, err);
    process.exit(1);
  }
}

checkFile('public/app.js');
checkFile('app.js');

// Parity check
const pub = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const root = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
if (pub === root) {
  console.log('✓ public/app.js and app.js are IDENTICAL');
} else {
  console.error('✗ Parity mismatch between public/app.js and app.js');
  process.exit(1);
}

// Check remaining occurrences of removed elements
const checks = [
  ['fig-click-hint', (pub.match(/fig-click-hint/g) || []).length, 0],
  ['twenty-four-hr-badge', (pub.match(/twenty-four-hr-badge/g) || []).length, 0],
  ['th-target-date', (pub.match(/th-target-date/g) || []).length, 0],
  ['badge-trailed-mini in app.js', (pub.match(/badge-trailed-mini/g) || []).length, 0],
  ['mandal-plan-stages-timeline in app.js', (pub.match(/mandal-plan-stages-timeline/g) || []).length, 0]
];

checks.forEach(([name, count, expected]) => {
  if (count === expected) {
    console.log(`✓ ${name}: count=${count} (matches expected ${expected})`);
  } else {
    console.warn(`! ${name}: count=${count} (expected ${expected})`);
  }
});
