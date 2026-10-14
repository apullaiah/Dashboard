const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function parseZip(buf) {
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
      try { entries[name] = zlib.inflateRawSync(data); } catch(e){}
    } else if (compMethod === 0) {
      entries[name] = data;
    }
    offset = dataOffset + compSize;
  }
  return entries;
}

const files = ['scratch/test.xlsx', 'scratch/phase4.xlsx', 'scratch/phase5.xlsx', 'scratch/phase6.xlsx'];
for (const file of files) {
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) continue;
  const buf = fs.readFileSync(fullPath);
  const zip = parseZip(buf);
  console.log(`\n=== ${file} ===`);
  const wbXml = zip['xl/workbook.xml'] ? zip['xl/workbook.xml'].toString('utf8') : '';
  const m = wbXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+sheetId="([^"]+)"/g);
  for (const match of m) {
    console.log(`  [SheetID: ${match[2]}] ${match[1]}`);
  }
}
