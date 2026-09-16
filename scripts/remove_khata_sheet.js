/**
 * Script to delete the villagewise Khata numbers Google Spreadsheet source
 * and truncate/purge all data associated with it from store.json.
 */
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');
const raw = fs.readFileSync(STORE_PATH, 'utf8').replace(/^\uFEFF/, '');
const store = JSON.parse(raw);

const targetSpreadsheetId = '1Zxf2e0MIsozaKk3XUc37mtznb7QfjknyETWyWP_v8fA';
const targetSourceId = '1fe2303f-0224-4ba0-a505-37c88433c81b';

// 1. Delete source from store.sources
const initialSourceCount = store.sources.length;
store.sources = store.sources.filter(s =>
  s.spreadsheetId !== targetSpreadsheetId &&
  s.id !== targetSourceId &&
  !s.name.includes('Khata Monitoring')
);
const removedSources = initialSourceCount - store.sources.length;
console.log(`Deleted ${removedSources} Khata Google Sheet source(s) from sources list.`);

// 2. Remove sync logs for this source
if (store.syncLogs) {
  const initialLogs = store.syncLogs.length;
  store.syncLogs = store.syncLogs.filter(l =>
    !l.source?.includes('Khata Monitoring') &&
    l.sourceId !== targetSourceId
  );
  console.log(`Cleaned up ${initialLogs - store.syncLogs.length} sync logs.`);
}

// 3. Remove conflicts for this source
if (store.conflicts) {
  const initialConflicts = store.conflicts.length;
  store.conflicts = store.conflicts.filter(c =>
    !c.source?.includes('Khata Monitoring')
  );
  console.log(`Cleaned up ${initialConflicts - store.conflicts.length} conflict records.`);
}

// 4. Truncate / purge khata fields from store.villages
let cleanedVillages = 0;
store.villages.forEach(v => {
  let modified = false;

  if (v.patta_khatas !== undefined) { delete v.patta_khatas; modified = true; }
  if (v.govt_khatas !== undefined) { delete v.govt_khatas; modified = true; }
  if (v.both_khatas !== undefined) { delete v.both_khatas; modified = true; }
  if (v.deletions !== undefined) { delete v.deletions; modified = true; }
  if (v.online_khatas !== undefined) { delete v.online_khatas; modified = true; }

  if (v.source_meta) {
    if (v.source_meta.khata_monitoring) { delete v.source_meta.khata_monitoring; modified = true; }
    if (v.source_meta.patta_khatas) { delete v.source_meta.patta_khatas; modified = true; }
    if (v.source_meta.govt_khatas) { delete v.source_meta.govt_khatas; modified = true; }
    if (v.source_meta.both_khatas) { delete v.source_meta.both_khatas; modified = true; }
    if (v.source_meta.deletions) { delete v.source_meta.deletions; modified = true; }
    if (v.source_meta.online_khatas) { delete v.source_meta.online_khatas; modified = true; }
    if (v.source_meta.total_khatas?.sourceId === targetSourceId) { delete v.source_meta.total_khatas; modified = true; }
  }

  // If total_khatas differed or came from khata monitoring, reset to official Action Plan khatas
  if (v.khatas !== undefined && v.khatas !== null) {
    v.total_khatas = v.khatas;
  } else {
    delete v.total_khatas;
  }

  if (modified) cleanedVillages++;
});

console.log(`Purged khata spreadsheet data across ${cleanedVillages} villages.`);
console.log(`Remaining total sources: ${store.sources.length}`);

fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
console.log('Successfully saved cleaned data/store.json.');
