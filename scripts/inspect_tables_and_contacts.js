const fs = require('fs');

const appContent = fs.readFileSync('app.js', 'utf8');
const lines = appContent.split('\n');

console.log('--- TABLES AND COLUMNS IN APP.JS ---');
lines.forEach((l, i) => {
  if (/<table|class="table-wrap"|id="home-village|ppb-village-section|col-officers|<thead/i.test(l)) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});

console.log('\n--- SURVEYOR AND CONTACT REFERENCES ---');
lines.forEach((l, i) => {
  if (/col-officers|officer-phone|officerContact|getVillageOfficerContact|getMandalSurveyor|MANDAL_SURVEYOR/i.test(l)) {
    console.log(`${i + 1}: ${l.trim().slice(0, 100)}`);
  }
});
