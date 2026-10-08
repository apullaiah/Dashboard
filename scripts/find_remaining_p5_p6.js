const store = require('../data/store.json');

const p5CodesKnown = new Set([
  // Completed (1)
  '1045001',
  // JC (2)
  '1062008', '1062029',
  // RDO (4)
  '1059016', '1060019', '1057020', '1047029',
  // Tah (11)
  '1060021', '1060013', '1060020', '1046024', '1048015', '1048016', '1053012', '1055013', '1047023', '1049033', '1050004',
  // VRO (19)
  '1054037', '1043005', '1051003', '1053016', '1056002', '1057016', '1021017', '1046011', '1045005', '1045018',
  '1061008', '1061020', '1061001', '1061002', '1058014', '1059015', '1059013', '1066048', '1066061',
  // VS (12)
  '1054034', '1062002', '1022014', '1064030', '1063030', '1043014', '1041014', '1041010', '1041009', '1055029', '1057008', '1057026', '1053010',
  // Vec (5)
  '1049023', '1049001', '1050015', '1050001', '1030004'
]);

const p5 = store.villages.filter(v => v.phase === 'Phase V');
const p5Remaining = p5.filter(v => !p5CodesKnown.has(String(v.village_code)));
console.log('Phase 5 remaining (' + p5Remaining.length + '):');
p5Remaining.forEach(v => {
  console.log(v.village_code, v.village_name, v.mandal, 'cumGT=' + v.cumulative_gt_extent, 'gt_status=' + v.gt_status, 'current_stage=' + v.current_stage);
});

const p6CodesKnown = new Set([
  // Tah (3)
  '1047028', '1047027', '1064051',
  // VS (1)
  '1065015',
  // VRO (7)
  '1063010', '1066005', '1065005', '1060033', '1060031', '1045029', '1047019',
  // Vec (7)
  '1054015', '1043007', '1021014', '1062007', '1055005', '1064013', '1065009'
]);

const p6 = store.villages.filter(v => v.phase === 'Phase VI');
const p6Remaining = p6.filter(v => !p6CodesKnown.has(String(v.village_code)) && v.sl_no !== 468 && v.sl_no !== 469);
console.log('\nPhase 6 remaining (' + p6Remaining.length + '):');
console.log('Sample 10:');
p6Remaining.slice(0, 10).forEach(v => {
  console.log(v.village_code, v.village_name, v.mandal, 'cumGT=' + v.cumulative_gt_extent, 'gt_status=' + v.gt_status, 'current_stage=' + v.current_stage);
});
