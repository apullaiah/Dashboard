const store = require('../data/store.json');
const villages = store.villages;

function normalizeMandal(val) {
  if (!val) return '';
  const s = String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s.includes('gangadhara') || s === 'gdnellore' || s.includes('gdnellore')) return 'G.D.Nellore';
  if (s.includes('baireddi') || s.includes('baireddy')) return 'Baireddipalle';
  if (s.includes('bangarupal')) return 'Bangarupalem';
  if (s.includes('penumur')) return 'Penumuru';
  if (s.includes('puthalapat')) return 'Puthalapattu';
  if (s.includes('thavanampall')) return 'Thavanampalli';
  if (s.includes('srpuram') || s.includes('srirangarajapuram')) return 'S.R.Puram';
  if (s.includes('venkatagiri') || s === 'vkota') return 'Venkatagirikota';
  if (s.includes('karvetinagar')) return 'Karvetinagar';
  return val.trim();
}

function findVillage(code, vName, mandal, targetPhase) {
  const c = String(code || '').trim();
  const cleanName = String(vName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normM = normalizeMandal(mandal);

  // Special overrides
  if ((c === '1054034' || cleanName.includes('krishna')) && (normM.includes('Venkatagiri') || normM === 'vkota')) {
    const v = villages.find(v => String(v.village_code) === '1062002');
    if (v) return v;
  }
  if (cleanName.includes('battam') || cleanName.includes('dasaralapalli')) {
    const v = villages.find(v => String(v.village_code) === '1060031' && (v.phase === 'Phase VI' || Math.abs(parseFloat(v.extent) - 489.41) < 5));
    if (v) return v;
  }
  if (cleanName.includes('muthukur') && cleanName.includes('karasana')) {
    const v = villages.find(v => String(v.village_code) === '1060033' || (String(v.village_code) === '1060031' && Math.abs(parseFloat(v.extent) - 91.45) < 5));
    if (v) return v;
  }
  if (c === '1047028' || cleanName.includes('52kanikapuram') || cleanName.includes('kanikapuram52')) {
    const v = villages.find(v => String(v.village_code) === '1047028');
    if (v) return v;
  }
  if (c === '1045001') {
    const v = villages.find(v => String(v.village_code) === '1045001');
    if (v) return v;
  }

  // Find by code within phase if provided
  if (/^\d{5,8}$/.test(c)) {
    if (targetPhase) {
      const byCodePhase = villages.find(v => String(v.village_code || '').trim() === c && v.phase === targetPhase);
      if (byCodePhase) return byCodePhase;
    }
    const byCode = villages.find(v => String(v.village_code || '').trim() === c);
    if (byCode) return byCode;
  }

  // Find by name + mandal
  return villages.find(v => {
    if (targetPhase && v.phase !== targetPhase) return false;
    if (normM && normalizeMandal(v.mandal) !== normM) return false;
    const vn = String(v.village_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return vn === cleanName || vn.includes(cleanName) || cleanName.includes(vn);
  });
}

// Test Phase 5
const p5Expected = [
  // Completed
  { c: '1045001', n: 'Adavikothuru', m: 'Nagari', s: 'Final ROR Completed' },
  // JC
  { c: '1062008', n: 'Hanumepalle', m: 'V Kota', s: 'Joint Collector Login (JC)' },
  { c: '1062029', n: 'Jodiverrivanipalle', m: 'V Kota', s: 'Joint Collector Login (JC)' },
  // RDO
  { c: '1059016', n: 'Mogilepalle', m: 'Gangavaram', s: 'Revenue Divisional Officer Login (RDO)' },
  { c: '1060019', n: 'Suddagundlapalle', m: 'Peddapanjani', s: 'Revenue Divisional Officer Login (RDO)' },
  { c: '1057020', n: 'Palamakulapalle', m: 'Bangarupalyam', s: 'Revenue Divisional Officer Login (RDO)' },
  { c: '1047029', n: 'Thatimakulapalle', m: 'S.R.Puram', s: 'Revenue Divisional Officer Login (RDO)' },
  // Tah
  { c: '1060021', n: 'Nagireddipalle', m: 'Peddapanjani', s: 'Tahsildar Login (Tah)' },
  { c: '1060013', n: 'Peddapanjani', m: 'Peddapanjani', s: 'Tahsildar Login (Tah)' },
  { c: '1060020', n: 'Rayalapeta', m: 'Peddapanjani', s: 'Tahsildar Login (Tah)' },
  { c: '1046024', n: 'Kotaravedu', m: 'Karvetinagar', s: 'Tahsildar Login (Tah)' },
  { c: '1048015', n: 'Tirumalarajupuram', m: 'Palasamudram', s: 'Tahsildar Login (Tah)' },
  { c: '1048016', n: 'Gangamambapuram', m: 'Palasamudram', s: 'Tahsildar Login (Tah)' },
  { c: '1053012', n: 'Karakampalle', m: 'Thavanampalle', s: 'Tahsildar Login (Tah)' },
  { c: '1055013', n: 'Kothapalle', m: 'Gudipala', s: 'Tahsildar Login (Tah)' },
  { c: '1047023', n: 'Giddamarajapuram', m: 'S.R.Puram', s: 'Tahsildar Login (Tah)' },
  { c: '1049033', n: 'Bojjinayanipalle', m: 'G D Nellore', s: 'Tahsildar Login (Tah)' },
  { c: '1050004', n: 'Charvaganipalle', m: 'Penumur', s: 'Tahsildar Login (Tah)' },
  // VS
  { c: '1054034', n: 'Krishnapuram', m: 'Venkatagirikota', s: 'Village Surveyor Login (VS)' },
  { c: '1022014', n: 'Athuru', m: 'Nindra', s: 'Village Surveyor Login (VS)' },
  { c: '1064030', n: 'Donkumanupalli', m: 'Santhipuram', s: 'Village Surveyor Login (VS)' },
  { c: '1063030', n: 'Peddur', m: 'Ramakuppam', s: 'Village Surveyor Login (VS)' },
  { c: '1043014', n: 'Veperi', m: 'Vedurukuppam', s: 'Village Surveyor Login (VS)' },
  { c: '1041014', n: 'Bodireddigaripalle', m: 'Pulicherla', s: 'Village Surveyor Login (VS)' },
  { c: '1041010', n: 'Rayavaripalle', m: 'Pulicherla', s: 'Village Surveyor Login (VS)' },
  { c: '1041009', n: 'Kavetigaripalle', m: 'Pulicherla', s: 'Village Surveyor Login (VS)' },
  { c: '1055029', n: 'Bomma Samudram', m: 'Gudipala', s: 'Village Surveyor Login (VS)' },
  { c: '1057008', n: 'Thambuganipalle', m: 'Bangarupalem', s: 'Village Surveyor Login (VS)' },
  { c: '1057026', n: 'Bodabandla', m: 'Bangarupalem', s: 'Village Surveyor Login (VS)' },
  { c: '1053010', n: 'Aragonda', m: 'Thavanampalle', s: 'Village Surveyor Login (VS)' },
  // VRO
  { c: '1054037', n: '5.Venkatapuram', m: 'Chittoor', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1043005', n: 'Mondivenganapalli', m: 'Vedurukuppam', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1051003', n: 'Thalupulapalle', m: 'Puthalapattu', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1053016', n: 'Nalisettipalle', m: 'Thavanampalle', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1056002', n: 'Kukkalapalle', m: 'Yadamari', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1057016', n: 'Venkatagiri', m: 'Bangarupalem', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1021017', n: 'Maharajapuram', m: 'Vijayapuram', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1046011', n: 'Domodaramaharaja puram', m: 'Karvetinagar', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1045005', n: 'Mangadu', m: 'Nagari', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1045018', n: 'Nagarajakuppam', m: 'Nagari', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1061008', n: 'Lakkanapalli', m: 'Baireddipalle', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1061020', n: 'Chappidipalli', m: 'Baireddipalle', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1061001', n: 'Peddachellaragunta', m: 'Baireddipalle', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1061002', n: 'Gollachimmanapalli', m: 'Baireddipalle', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1058014', n: 'Kolamasanapalle', m: 'Palamaner', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1059015', n: 'Keelapatla', m: 'Gangavaram', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1059013', n: 'Kothapalle', m: 'Gangavaram', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1066048', n: 'Vasanadu', m: 'Kuppam', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1066061', n: 'Chinnaobba', m: 'Kuppam', s: 'Village Revenue Officer Login (VRO)' },
  // Vec
  { c: '1049023', n: 'Tugundram', m: 'G.D.Nellore', s: 'Vectorization' },
  { c: '1049001', n: 'Vezzupalle', m: 'G.D.Nellore', s: 'Vectorization' },
  { c: '1050015', n: 'Kalvagunta', m: 'Penumuru', s: 'Vectorization' },
  { c: '1050001', n: 'Chinthapenta', m: 'Penumuru', s: 'Vectorization' },
  { c: '1030004', n: 'Rompicherla', m: 'Rompicherla', s: 'Vectorization' }
];

console.log('Testing Phase 5 matching...');
let p5Fail = 0;
p5Expected.forEach(item => {
  const v = findVillage(item.c, item.n, item.m, 'Phase V');
  if (!v) {
    console.log('FAILED TO MATCH P5:', item);
    p5Fail++;
  } else {
    // console.log('OK P5:', v.village_code, v.village_name, '(' + v.mandal + ') Phase=' + v.phase);
  }
});
console.log('Phase 5 matching complete. Failures: ' + p5Fail + ' / ' + p5Expected.length);

// Test Phase 6
const p6Expected = [
  // Tah
  { c: '1047028', n: '52 Kanikapuram', m: 'S.R.Puram', s: 'Tahsildar Login (Tah)' },
  { c: '1047027', n: 'Jangalapalle', m: 'S.R.Puram', s: 'Tahsildar Login (Tah)' },
  { c: '1064051', n: 'Jeedimani palli', m: 'Santhipuram', s: 'Tahsildar Login (Tah)' },
  // VS
  { c: '1065015', n: 'Malavanikothuru', m: 'Gudupalli', s: 'Village Surveyor Login (VS)' },
  // VRO
  { c: '1063010', n: 'Pamanaboyanapalli', m: 'Ramakuppam', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1066005', n: 'Urinayanikothuru', m: 'Kuppam', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1065005', n: 'Lingapuramdinne', m: 'Gudupalli', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1060033', n: 'Muthukur Karasanapalli', m: 'Peddapanjani', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1060031', n: 'Battamdoddi Dasaralapalli', m: 'Peddapanjani', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1045029', n: 'Taduku', m: 'Nagari', s: 'Village Revenue Officer Login (VRO)' },
  { c: '1047019', n: 'Chillamakula Palli', m: 'S.R.Puram', s: 'Village Revenue Officer Login (VRO)' },
  // Vec
  { c: '1054015', n: 'B.N.R. Peta', m: 'Chittoor', s: 'Vectorization' },
  { c: '1043007', n: 'Inamkothuru', m: 'Vedurukuppam', s: 'Vectorization' },
  { c: '1021014', n: 'Illathuru', m: 'Vijayapuram', s: 'Vectorization' },
  { c: '1062007', n: 'Patrapalli', m: 'Venkatagirikota', s: 'Vectorization' },
  { c: '1055005', n: 'Adhilakshmambapuram', m: 'Gudipala', s: 'Vectorization' },
  { c: '1064013', n: 'Chinnagandlapalli', m: 'Santhipuram', s: 'Vectorization' },
  { c: '1065009', n: 'Kotachembagiri', m: 'Gudupalle', s: 'Vectorization' }
];

console.log('\nTesting Phase 6 matching...');
let p6Fail = 0;
p6Expected.forEach(item => {
  const v = findVillage(item.c, item.n, item.m, 'Phase VI');
  if (!v) {
    console.log('FAILED TO MATCH P6:', item);
    p6Fail++;
  } else {
    // console.log('OK P6:', v.village_code, v.village_name, '(' + v.mandal + ') Phase=' + v.phase);
  }
});
console.log('Phase 6 matching complete. Failures: ' + p6Fail + ' / ' + p6Expected.length);
