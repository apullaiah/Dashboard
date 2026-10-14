const fs = require('fs');
const store = JSON.parse(fs.readFileSync('./data/store.json', 'utf8'));
if (store.sources) {
  store.sources.forEach((s, idx) => {
    console.log(`\n--- Source ${idx}: ${s.name} ---`);
    console.log(JSON.stringify({
      id: s.id,
      name: s.name,
      sheetUrl: s.sheetUrl,
      url: s.url,
      sheetId: s.sheetId,
      recordType: s.recordType,
      gid: s.gid
    }, null, 2));
  });
}
