const https = require('https');
const zlib = require('zlib');

const sheetIds = [
  { name: '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k', desc: 'PPBs Action Plan' },
  { name: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', desc: 'Phase-VI Completed' },
  { name: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', desc: 'Phase-V Completed' },
  { name: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4', desc: 'Phase-IV Completed' },
  { name: '1koBzjsrnv-9NUta66eWx6_RXd8TCQn-DQLUvQV5jRHk', desc: 'Contacts Sheet' },
  { name: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8', desc: 'Phase-V Daily' },
  { name: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY', desc: 'Phase-VI Daily' }
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(res.headers.location));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function parseZipEntries(buf) {
  const entries = {};
  let offset = 0;
  while (offset < buf.length - 30) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const compMethod = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const uncompSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
    const dataOffset = offset + 30 + nameLen + extraLen;
    const data = buf.slice(dataOffset, dataOffset + compSize);
    
    if (compMethod === 8) {
      try {
        entries[name] = zlib.inflateRawSync(data);
      } catch (e) {}
    } else if (compMethod === 0) {
      entries[name] = data;
    }
    offset = dataOffset + compSize;
  }
  return entries;
}

(async () => {
  for (const s of sheetIds) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${s.name}/export?format=xlsx`;
      const buf = await fetchBuffer(url);
      const zip = parseZipEntries(buf);
      const wbXml = zip['xl/workbook.xml'] ? zip['xl/workbook.xml'].toString('utf8') : '';
      const sheetNames = [];
      const m = wbXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+sheetId="([^"]+)"/g);
      for (const match of m) {
        sheetNames.push({ name: match[1], sheetId: match[2] });
      }
      console.log(`\n=== ${s.desc} (${s.name}) ===`);
      if (sheetNames.length) {
        sheetNames.forEach(x => console.log(`   [ID: ${x.sheetId}] ${x.name}`));
      } else {
        console.log(`   No sheets found in workbook.xml (Buffer size: ${buf.length})`);
      }
    } catch (e) {
      console.log(`Error on ${s.desc}:`, e.message);
    }
  }
})();
