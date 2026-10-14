const fs = require('fs');
const path = require('path');
const { syncAllLiveData } = require('../lib/syncService.js');

const STORE_PATH = path.join(__dirname, '../data/store.json');
const DASH_STORE = path.join(__dirname, '../dashboard/data/store.json');

async function run() {
  console.log('=== EXTRACTING DIRECT DLR, VECTORIZATION & SURVEYORS DATA FROM GOOGLE SPREADSHEETS ===');
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  const updated = await syncAllLiveData(store);

  if (fs.existsSync(path.dirname(DASH_STORE))) {
    fs.writeFileSync(DASH_STORE, JSON.stringify(updated, null, 2), 'utf8');
    console.log('Also synced to dashboard/data/store.json');
  }

  console.log('✅ Direct extraction complete.');
}

run().catch(err => {
  console.error('Fatal error in extract_direct_dlr.js:', err);
  process.exit(1);
});
