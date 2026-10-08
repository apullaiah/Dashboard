const store = require('../data/store.json');

const p5Codes = [
  // Tah (11)
  '1060021', '1060013', '1060020', '1046024', '1048015', '1048016', '1053012', '1055013', '1047023', '1049033', '1050004',
  // RDO (4)
  '1059016', '1060019', '1057020', '1047029',
  // JC (2)
  '1062008', '1062029',
  // Completed (1)
  '1045001',
  // VS (12)
  '1054034', '1022014', '1064030', '1063030', '1043014', '1041014', '1041010', '1041009', '1055029', '1057008', '1057026', '1053010',
  // VRO (19)
  '1054037', '1043005', '1051003', '1053016', '1056002', '1057016', '1021017', '1046011', '1045005', '1045018',
  '1061008', '1061020', '1061001', '1061002', '1058014', '1059015', '1059013', '1066048', '1066061',
  // Vec (5)
  '1049023', '1049001', '1050015', '1050001', '1030004'
];

console.log('--- PHASE 5 AUDIT ---');
p5Codes.forEach(c => {
  const v = store.villages.find(v => String(v.village_code) === c);
  if (!v) {
    console.log(c, 'NOT FOUND IN STORE');
  } else {
    console.log(c, v.village_name, `[${v.mandal}]`, `Phase=${v.phase}`, `current_stage="${v.current_stage}"`, `tah=${v.tahsildar_status}`, `rdo=${v.rdo_status}`, `jc=${v.jc_status}`, `vs=${v.vs_status}`, `vro=${v.vro_status}`);
  }
});

const p6Codes = [
  // Tah (3)
  '1047028', '1047027', '1064051',
  // VS (1)
  '1065015',
  // VRO (7)
  '1063010', '1066005', '1065005', '1060033', '1060031', '1045029', '1047019',
  // Vec (7)
  '1054015', '1043007', '1021014', '1062007', '1055005', '1064013', '1065009'
];

console.log('\n--- PHASE 6 AUDIT ---');
p6Codes.forEach(c => {
  let v = store.villages.find(v => String(v.village_code) === c);
  if (!v && (c === '1060033' || c === '1060031')) {
    v = store.villages.find(v => String(v.village_code) === '1060031' || String(v.village_code) === '1060033');
  }
  if (!v) {
    console.log(c, 'NOT FOUND IN STORE');
  } else {
    console.log(c, v.village_name, `[${v.mandal}]`, `Phase=${v.phase}`, `current_stage="${v.current_stage}"`, `tah=${v.tahsildar_status}`, `rdo=${v.rdo_status}`, `jc=${v.jc_status}`, `vs=${v.vs_status}`, `vro=${v.vro_status}`);
  }
});
