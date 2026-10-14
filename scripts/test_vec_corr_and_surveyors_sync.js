const https = require('https');
const store = require('../data/store.json');
const { normalizeMandal, cleanNum } = require('../lib/syncService.js');

function fetchGviz(sheetId, param) {
  return new Promise((resolve) => {
    let url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json';
    if (/^\d+$/.test(param)) url += '&gid=' + param;
    else if (param) url += '&sheet=' + encodeURIComponent(param);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const m = d.match(/setResponse\((.*)\);\s*$/s);
        if (m) {
          try { resolve(JSON.parse(m[1]).table.rows); } catch(e) { resolve([]); }
        } else resolve([]);
      });
    }).on('error', () => resolve([]));
  });
}

function cellVal(c) {
  if (!c) return '';
  if (c.f !== undefined && c.f !== null) return String(c.f).trim();
  return c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
}

function parseJurisdiction(raw) {
  if (!raw) return [];
  return raw.split(/(?:^\s*\d+[\.\)]|\s*\d+[\.\)]|(?<=[a-zA-Z\s])\d+(?=[a-zA-Z])|\s*,\s*|\s*;\s*|\n+)/)
    .map(s => s.trim().replace(/^[\d\.\)\s]+/, '').replace(/[\d\.\)\s]+$/, ''))
    .filter(s => s.length > 1 && !/^\d+$/.test(s));
}

(async () => {
  console.log('Testing live fetch of Vectorization & Correlation and Surveyors...');
  
  // 1. Phase 5 Vectorization
  const p5v = await fetchGviz('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', 'Vectorization');
  console.log('Phase 5 Vectorization rows:', p5v.length);
  const p5vRecords = [];
  p5v.forEach(r => {
    const row = (r.c || []).map(cellVal);
    const sno = row[0]; const mandal = normalizeMandal(row[2]); const vName = row[3]; const code = row[4];
    if (!/^\d{5,8}$/.test(code) && !vName) return;
    if (/total/i.test(row.join(' '))) return;
    const totExtent = cleanNum(row[7]);
    const totLpms = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const total = cleanNum(row[13]);
    const balance = cleanNum(row[14]);
    const targetDate = row[15] || '';
    p5vRecords.push({ sno, mandal, vName, code, totExtent, totLpms, tillYest, today, total, balance, targetDate });
  });
  console.log('Parsed Phase 5 Vectorization records:', p5vRecords.length);

  // 2. Phase 6 Vectorization
  const p6v = await fetchGviz('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', 'Vectorization');
  console.log('Phase 6 Vectorization rows:', p6v.length);
  const p6vRecords = [];
  p6v.forEach(r => {
    const row = (r.c || []).map(cellVal);
    const sno = row[0]; const mandal = normalizeMandal(row[2]); const vName = row[3]; const code = row[4];
    if (!/^\d{5,8}$/.test(code) && !vName) return;
    if (/total/i.test(row.join(' '))) return;
    const totExtent = cleanNum(row[7]);
    const totLpms = cleanNum(row[10]);
    const tillYest = cleanNum(row[11]);
    const today = cleanNum(row[12]);
    const total = cleanNum(row[13]);
    const balance = cleanNum(row[14]);
    const targetDate = row[15] || '';
    p6vRecords.push({ sno, mandal, vName, code, totExtent, totLpms, tillYest, today, total, balance, targetDate });
  });
  console.log('Parsed Phase 6 Vectorization records:', p6vRecords.length);

  // 3. Contacts Sheet Tab 0 (Village Surveyors)
  const vsRows = await fetchGviz('1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk', '0');
  console.log('Contacts VS rows:', vsRows.length);
  const vsList = [];
  for (let r = 1; r < vsRows.length; r++) {
    const row = (vsRows[r].c || []).map(cellVal);
    const sno = row[0];
    const division = row[2];
    const mandal = normalizeMandal(row[3]);
    const rawJur = row[4];
    const secName = row[5];
    const vsName = row[6];
    const phone = (row[7] || '').replace(/\D/g, '').slice(-10);
    if (!mandal || !vsName) continue;
    const jurVillages = parseJurisdiction(rawJur);
    vsList.push({
      sno: cleanNum(sno) || r,
      division,
      mandal,
      secretariat_name: secName,
      surveyor_name: vsName,
      phone,
      jurisdiction_raw: rawJur,
      jurisdiction_villages: jurVillages
    });
  }
  console.log('Parsed Village Surveyors:', vsList.length);
  console.log('Sample parsed surveyor:', vsList[0]);
})();
