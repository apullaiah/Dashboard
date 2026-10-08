const https = require('https');

function getPage(sheetId) {
  return new Promise((resolve) => {
    https.get(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', err => resolve(''));
  });
}

function extractTabs(html) {
  const tabs = [];
  // Google sheets embedded bootstrap data contains tab names and sheet IDs
  const regex = /\[(\d{1,12}),"([^"]+)",(?:null|\d+),(?:null|\d+)\]/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (m[2] && m[2].length < 60 && !m[2].includes('http') && !m[2].includes('{')) {
      tabs.push({ gid: m[1], name: m[2] });
    }
  }
  return tabs;
}

async function run() {
  const p5Html = await getPage('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0');
  console.log('--- Phase 5 Sheet (1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0) ---');
  const p5Tabs = extractTabs(p5Html);
  console.log('Tabs found:', p5Tabs);

  const p6Html = await getPage('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ');
  console.log('--- Phase 6 Sheet (10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ) ---');
  const p6Tabs = extractTabs(p6Html);
  console.log('Tabs found:', p6Tabs);
}

run();
