/**
 * sync_all_live_data.js
 * Master sync script — runs DLR extraction then GT sync in sequence.
 * Run this daily (or on demand) to update the dashboard with live Google Spreadsheet data.
 * Usage:  node scripts/sync_all_live_data.js
 */
const fs = require('fs');
const path = require('path');
const { syncAllLiveData } = require('../lib/syncService.js');

const STORE_PATH = path.join(__dirname, '../data/store.json');

async function main() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  CHITTOOR RESURVEY DASHBOARD — LIVE DATA SYNC            ║');
  console.log('║  Syncing GT & DLR from official Google Spreadsheets      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Sync started at: ${new Date().toLocaleString('en-IN')}`);

  try {
    const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    const updated = await syncAllLiveData(store);
    
    // Also update dashboard/data/store.json if exists
    const altStore = path.join(__dirname, '../dashboard/data/store.json');
    if (fs.existsSync(path.dirname(altStore))) {
      fs.writeFileSync(altStore, JSON.stringify(updated, null, 2), 'utf8');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ ALL SYNCS COMPLETE in ${elapsed}s`);
    console.log(`   GT Today: ${updated.gtSummary?.todayTotal || 0} Ac across ${updated.gtSummary?.activeVillagesToday || 0} villages`);
    console.log(`   DLR Today: ${updated.dlrSummary?.todayTotal || 0} entries`);
    console.log(`   Dashboard data updated at: ${new Date().toLocaleString('en-IN')}`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('\n❌ Sync failed:', err.message);
    process.exit(1);
  }
}

main();
