// scripts/apply_emergent_reference_dashboard.js
const fs = require('fs');
const path = require('path');

console.log('=== Preparing Reference Dashboard & Retained Options ===\n');

const appPath = path.join(__dirname, '../app.js');
let appCode = fs.readFileSync(appPath, 'utf8');

// 1. Add pagination and sorting state
if (!appCode.includes('villageTablePageSize:')) {
  appCode = appCode.replace(
    /homeFilters:\s*\{[^}]+\}/,
    `homeFilters: { phase: 'All phases', division: 'All', mandal: 'All mandals', month: 'All months', stage: 'All stages', zone: 'All', search: '' },
  villageTablePageSize: 25,
  villageTablePageIndex: 0,
  villageTableSortCol: 'village_name',
  villageTableSortDir: 'asc',
  mandalDrilldownSortCol: 'mandal',
  mandalDrilldownSortDir: 'asc'`
  );
  console.log('✓ Added table pagination & sorting state');
}

fs.writeFileSync(appPath, appCode, 'utf8');
console.log('Done.');
