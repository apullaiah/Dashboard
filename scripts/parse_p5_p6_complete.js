const https = require('https');

function getCsv(id, gid) {
  return new Promise((res) => {
    https.get('https://docs.google.com/spreadsheets/d/' + id + '/export?format=csv&gid=' + gid, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        https.get(r.headers.location, r2 => {
          let b = '';
          r2.on('data', c => b += c);
          r2.on('end', () => res(b));
        });
      } else {
        let b = '';
        r.on('data', c => b += c);
        r.on('end', () => res(b));
      }
    });
  });
}

function parseCsv(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    const row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i+1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    row.push(cur.trim());
    return row;
  });
}

async function analyze() {
  console.log('================================================================');
  console.log('=== PHASE 5: VS - VRO (gid 1329023156) ===');
  const p5VsVroCsv = await getCsv('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1329023156');
  const p5VsVro = parseCsv(p5VsVroCsv);
  p5VsVro.forEach((r, idx) => {
    if (r.some(Boolean)) {
      console.log(`[P5 VS-VRO ${idx}]`, JSON.stringify(r.slice(0, 16)));
    }
  });

  console.log('\n================================================================');
  console.log('=== PHASE 5: TAH - RDO - JC (gid 1758823146) ===');
  const p5TahCsv = await getCsv('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '1758823146');
  const p5Tah = parseCsv(p5TahCsv);
  p5Tah.forEach((r, idx) => {
    if (r.some(Boolean)) {
      console.log(`[P5 TAH-RDO-JC ${idx}]`, JSON.stringify(r.slice(0, 16)));
    }
  });

  console.log('\n================================================================');
  console.log('=== PHASE 5: DLR COMPLETED (gid 167154929) ===');
  const p5CompCsv = await getCsv('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '167154929');
  const p5Comp = parseCsv(p5CompCsv);
  p5Comp.forEach((r, idx) => {
    if (r.some(Boolean)) {
      console.log(`[P5 COMP ${idx}]`, JSON.stringify(r.slice(0, 16)));
    }
  });

  console.log('\n================================================================');
  console.log('=== PHASE 5: VECTORIZATION / GT COMPLETED (gid 2048120699) ===');
  const p5VecCsv = await getCsv('1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0', '2048120699');
  const p5Vec = parseCsv(p5VecCsv);
  console.log('P5 Vec Header row 1:', JSON.stringify(p5Vec[1]));
  console.log('P5 Vec Header row 2:', JSON.stringify(p5Vec[2]));
  p5Vec.slice(3).forEach((r, idx) => {
    if (r.some(Boolean)) {
      console.log(`[P5 VEC ${idx}] S.No=${r[0]} Div=${r[1]} Mandal=${r[2]} Village=${r[3]} Code=${r[4]} DateComp=${r[5]} Extent=${r[6]} ChalthasArrived=${r[7]} ChalthasComp=${r[8]} PctVec=${r[9]} BalChalthas=${r[10]} VecComp=${r[11]} VSLoginStarted=${r[12]} VSLoginComp=${r[13]}`);
    }
  });

  console.log('\n================================================================');
  console.log('=== PHASE 6: VS - VRO (gid 941359880) ===');
  const p6VsVroCsv = await getCsv('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '941359880');
  const p6VsVro = parseCsv(p6VsVroCsv);
  p6VsVro.forEach((r, idx) => {
    if (r.some(Boolean)) {
      console.log(`[P6 VS-VRO ${idx}]`, JSON.stringify(r.slice(0, 16)));
    }
  });

  console.log('\n================================================================');
  console.log('=== PHASE 6: TAH - RDO - JC (gid 127310674) ===');
  const p6TahCsv = await getCsv('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '127310674');
  const p6Tah = parseCsv(p6TahCsv);
  p6Tah.forEach((r, idx) => {
    if (r.some(Boolean)) {
      console.log(`[P6 TAH-RDO-JC ${idx}]`, JSON.stringify(r.slice(0, 16)));
    }
  });

  console.log('\n================================================================');
  console.log('=== PHASE 6: VECTORIZATION / GT COMPLETED (gid 563060141) ===');
  const p6VecCsv = await getCsv('10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ', '563060141');
  const p6Vec = parseCsv(p6VecCsv);
  console.log('P6 Vec Header row 1:', JSON.stringify(p6Vec[1]));
  console.log('P6 Vec Header row 2:', JSON.stringify(p6Vec[2]));
  p6Vec.slice(3).forEach((r, idx) => {
    if (r.some(Boolean)) {
      console.log(`[P6 VEC ${idx}] S.No=${r[0]} Div=${r[1]} Mandal=${r[2]} Village=${r[3]} Code=${r[4]} DateComp=${r[5]} Extent=${r[6]} ChalthasArrived=${r[7]} ChalthasComp=${r[8]} PctVec=${r[9]} BalChalthas=${r[10]} VecComp=${r[11]} VSLoginStarted=${r[12]} VSLoginComp=${r[13]} VROLoginComp=${r[14]}`);
    }
  });
}

analyze();
