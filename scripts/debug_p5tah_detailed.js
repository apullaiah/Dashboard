const https = require('https');
function fetchGviz(sheetId, gid) {
  return new Promise(res => {
    https.get('https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&gid=' + gid, r => {
      let b = ''; r.on('data', c => b += c); r.on('end', () => {
        const m = b.match(/setResponse\((.*)\);\s*$/s);
        res(JSON.parse(m[1]).table);
      });
    });
  });
}
function cellVal(c) { return !c ? '' : (c.f !== undefined ? String(c.f).trim() : (c.v !== undefined ? String(c.v).trim() : '')); }
fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146').then(t => {
  let tier = 'tahsildar_status';
  for (let r = 0; r < t.rows.length; r++) {
    const row = (t.rows[r].c || []).map(cellVal);
    const c0 = row[0]; const c1 = row[1]; const vName = row[4]; const code = row[5];
    const isTotalRow = /^total$/i.test(String(c1).trim()) || /^total$/i.test(String(c0).trim()) || (row[4] === '11' || row[4] === '4' || row[4] === '2');
    console.log(`r=${r} tier=${tier} isTotal=${isTotalRow} c0="${c0}" c1="${c1}" vName="${vName}" code="${code}"`);
    if (isTotalRow) {
      if (tier === 'tahsildar_status') tier = 'rdo_status';
      else if (tier === 'rdo_status') tier = 'jc_status';
    }
  }
});
