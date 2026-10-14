const fs = require('fs');
const zlib = require('zlib');

function parseZip(buf) {
  const files = {};
  let p = 0;
  while (p < buf.length - 30) {
    if (buf.readUInt32LE(p) !== 0x04034b50) {
      p++;
      continue;
    }
    const compMethod = buf.readUInt16LE(p + 8);
    const compSize = buf.readUInt32LE(p + 18);
    const uncompSize = buf.readUInt32LE(p + 22);
    const fnLen = buf.readUInt16LE(p + 26);
    const extraLen = buf.readUInt16LE(p + 28);
    const fn = buf.toString('utf8', p + 30, p + 30 + fnLen);
    const start = p + 30 + fnLen + extraLen;
    const compData = buf.slice(start, start + compSize);
    if (compMethod === 8) {
      try {
        files[fn] = zlib.inflateRawSync(compData).toString('utf8');
      } catch (e) {}
    } else if (compMethod === 0) {
      files[fn] = compData.toString('utf8');
    }
    p = start + compSize;
  }
  return files;
}

const testBuf = fs.readFileSync('scratch/phase4.xlsx');
const files = parseZip(testBuf);
console.log('phase4.xlsx files:', Object.keys(files));
