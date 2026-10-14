const https = require('https');
const zlib = require('zlib');

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

function parseZip(buf) {
  const files = {};
  let p = 0;
  while (p < buf.length - 4) {
    const sig = buf.readUInt32LE(p);
    if (sig === 0x04034b50) {
      const compMethod = buf.readUInt16LE(p + 8);
      const compSize = buf.readUInt32LE(p + 18);
      const uncompSize = buf.readUInt32LE(p + 22);
      const fnLen = buf.readUInt16LE(p + 26);
      const extraLen = buf.readUInt16LE(p + 28);
      const fn = buf.toString('utf8', p + 30, p + 30 + fnLen);
      const start = p + 30 + fnLen + extraLen;
      const compData = buf.slice(start, start + compSize);
      if (compMethod === 8) {
        try { files[fn] = zlib.inflateRawSync(compData).toString('utf8'); } catch(e){}
      } else if (compMethod === 0) {
        files[fn] = compData.toString('utf8');
      }
      p = start + compSize;
    } else {
      p++;
    }
  }
  return files;
}

(async () => {
  const buf = await fetchBuffer('https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k/export?format=xlsx');
  const files = parseZip(buf);
  console.log('Zip file list:', Object.keys(files));
  for (const k of Object.keys(files)) {
    if (k.includes('workbook')) {
      console.log('=== ' + k + ' ===\n', files[k].slice(0, 1000));
    }
  }
})();
