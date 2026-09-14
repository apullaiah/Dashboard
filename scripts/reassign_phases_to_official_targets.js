const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../data/store.json');
const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
const villages = store.villages;

console.log(`Starting Phase Realignment...`);
console.log(`Master Universe Village Count: ${villages.length}`);

// Build lookup maps
const codeToSl = {};
const slToVillage = {};
villages.forEach(v => {
  slToVillage[v.sl_no] = v;
  if (!codeToSl[v.village_code]) codeToSl[v.village_code] = [];
  codeToSl[v.village_code].push(v.sl_no);
});

// 1. PHASE 1: EXACT 27 VILLAGES (1 per Mandal across all 27 Mandals)
const p1Codes = [
  '1057011', // Bangarupalem - Mahasamudram
  '1054014', // Chittoor - Paluru
  '1049035', // G.D.Nellore - Garigalapalle
  '1055011', // Gudipala - Sreerangampalle
  '1052012', // Irala - Pullur
  '1050014', // Penumuru - Nanjarapalli
  '1041007', // Pulicherla - Vallivetivaripalli
  '1051019', // Puthalapattu - Oddepalle
  '1030005', // Rompicherla - Bandakindapalle
  '1047008', // S.R.Puram - 50 Kannikapuram
  '1053008', // Thavanampalli - Cherlopalle
  '1043029', // Vedurukuppam - Garampalle
  '1056017', // Yadamari - Siddareddypalli
  '1065028', // Gudipalle - Vengepalle
  '1066025', // Kuppam - Venkatesapuram
  '1063011', // Ramakuppam - Giddapalle
  '1064049', // Santhipuram - BM Gollapalli
  '1046006', // Karvetinagar - katherapalli
  '1045028', // Nagari - Saraswati vilasa puram
  '1022010', // Nindra - Netteri
  '1048003', // Palasamudram - K J Puram (Krishnajmmapuram)
  '1021001', // Vijayapuram - Alapakam
  '1061018', // Baireddipalle - Mulatimmepalle
  '1059010', // Gangavaram - Kalagaturu
  '1058002', // Palamaner - Ranginayanapalle
  '1060012', // Peddapanjani - Chalamangalam
  '1062009'  // Venkatagirikota - TPG Palli (Tirumala pichigundlapalle)
];
const p1Sl = new Set(p1Codes.map(c => codeToSl[c][0]));

// 2. PHASE 2: EXACT 34 COMPLETED VILLAGES
const p2Codes = [
  '1057002', // Bangarupalem - Gundlakattamanchi
  '1054005', // Chittoor - Anagallu
  '1054006', // Chittoor - Ananthapuram
  '1049024', // G.D.Nellore - Kadapagunta
  '1049027', // G.D.Nellore - Murthinayanipalle
  '1055002', // Gudipala - Cheelapalli
  '1052009', // Irala - Morampalle
  '1052007', // Irala - V.S. Agraharam (Venkatasamudra Agraharam)
  '1050011', // Penumuru - Samireddy palli
  '1041011', // Pulicherla - Bandaruvaripalle
  '1051017', // Puthalapattu - Peta Agraharam
  '1051021', // Puthalapattu - Muthirevula
  '1047013', // S.R.Puram - 50.Basivireddy palli
  '1047036', // S.R.Puram - Durgarajapuram
  '1047017', // S.R.Puram - Pillarikuppam
  '1043018', // Vedurukuppam - Marepalli
  '1056024', // Yadamari - Konapalle
  '1056003', // Yadamari - Patrapalle
  '1056019', // Yadamari - Periyambadi
  '1046014', // Karvetinagar - Kethumalmaharajapuram (Annurkasabagayat)
  '1046001', // Karvetinagar - Viratapuram
  '1045020', // Nagari - Kavetipuram
  '1045009', // Nagari - Venkatanarashimha Rajuvaripeta
  '1022002', // Nindra - Nindra
  '1048001', // Palasamudram - Vanadurgapuram
  '1021007', // Vijayapuram - Gangamambapuram
  '1021008', // Vijayapuram - Kalikapuram
  '1061009', // Baireddipalle - Settipalle
  '1059012', // Gangavaram - Melumoi
  '1058017', // Palamaner - Chethapenta
  '1058007', // Palamaner - Kurmaoi
  '1060030', // Peddapanjani - Muthukur - Panjani
  '1060024', // Peddapanjani - Thurlapalli-kothakota
  '1062010'  // Venkatagirikota - Bodiguttapalle
];
const p2Sl = new Set(p2Codes.map(c => codeToSl[c][0]));

// 3. PHASE 3: EXACT 14 VILLAGES (11 ported + 1 DLR Mothagunta + 2 pending)
const p3Codes = [
  '1055022', // Gudipala - Ragimanupatteda
  '1047030', // S.R.Puram - Ripunjayarajapuram
  '1053005', // Thavanampalli - Govindhareddypalle
  '1049025', // G.D.Nellore - Atmakur
  '1045026', // Nagari - Srinivasapuram
  '1046020', // Karvetinagar - Eduvaripalle
  '1022009', // Nindra - Kunamaraju palem
  '1060028', // Peddapanjani - Muthukur (Kondepalli)
  '1062006', // Venkatagirikota - Paipalle
  '1065007', // Gudipalle - Anganamalkottur
  '1064052', // Santhipuram - Chillimanipalli
  '1057018', // Bangarupalem - Mothagunta
  '1030006', // Rompicherla - Peddagottigallu
  '1043016'  // Vedurukuppam - Aggichenupalle
];
const p3Sl = new Set(p3Codes.map(c => codeToSl[c][0]));

// 4. PHASE 4: EXACT 101 VILLAGES (From Official Targets & Timelines / Action Plan)
const cp = require('child_process');
const prevStore = JSON.parse(cp.execSync('git show HEAD:data/store.json', { maxBuffer: 50 * 1024 * 1024 }).toString('utf8'));
const p4Sl = new Set(prevStore.villages.filter(v => v.phase === 'Phase IV').map(v => v.sl_no));

// 5. PHASE 5: EXACT 60 VILLAGES (From Phase-V Targets & Timelines)
const p5Codes = [
  '1049001', '1049023', '1049011', '1052017', '1052004', '1050015', '1050001',
  '1051015', '1051002', '1030004', '1021018', '1054037', '1057008', '1041014',
  '1041010', '1041009', '1043014', '1053010', '1045018', '1022014', '1062002',
  '1021017', '1045005', '1063030', '1055029', '1057016', '1057026', '1061002',
  '1058014', '1059015', '1059013', '1048015', '1048016', '1046011', '1066061',
  '1064030', '1051003', '1053016', '1055013', '1056002', '1049033', '1047023',
  '1050004', '1043005', '1053012', '1061008', '1061020', '1061001', '1066048',
  '1059016', '1060019', '1060021', '1060013', '1060020', '1046024', '1057020',
  '1047029', '1062008', '1062029', '1045001'
];
const p5Sl = new Set(p5Codes.map(c => codeToSl[c][0]));

// 6. PHASE 6: EXACT 92 VILLAGES (From Phase-VI Targets & Timelines / JC Live Sheet)
const p6Codes = [
  '1050006', '1051005', '1051020', '1051004', '1053015', '1055001', '1055017',
  '1055008', '1055009', '1054002', '1054010', '1052015', '1052001', '1043031',
  '1043010', '1043019', '1043021', '1043015', '1043007', '1043004', '1043001',
  '1056012', '1049004', '1047027', '1047028', '1047015', '1047009', '1047010',
  '1047012', '1047006', '1047007', '1047001', '1047019', '1047004', '1041013',
  '1041001', '1030007', '1057014', '1057022', '1057023', '1057025', '1048009',
  '1046021', '1046008', '1045029', '1045022', '1021013', '1021014', '1060017',
  '1059008', '1061005', '1061004', '1061010', '1062034', '1062007', '1062030',
  '1062005', '1062023', '1066001', '1066005', '1066023', '1066022', '1066051',
  '1066062', '1064021', '1064051', '1064037', '1064013', '1064048', '1064057',
  '1064003', '1065032', '1065031', '1065012', '1065005', '1065003', '1065009',
  '1065008', '1065013', '1065015', '1065011', '1065023', '1063010', '1063029',
  '1063007', '1063019', '1063018',
  '1060004', '1060027', '1060016'
];
const p6Sl = new Set(p6Codes.map(c => codeToSl[c][0]));
// Add the 2 specific Peddapanjani Phase VI villages by sl_no
p6Sl.add(468); // Muthukur-Karasanapalli (sl_no: 468)
p6Sl.add(469); // Battandoddi (Dasarlapalle) (sl_no: 469)

// 7. PHASE 7: EXACT 91 VILLAGES (From Phase 7 Targets & Timelines)
const p7Codes = [
  '1057007', '1057005', '1054024', '1054025', '1055003', '1055007', '1055004',
  '1055014', '1055020', '1050005', '1041005', '1041015', '1041006', '1051001',
  '1051018', '1051014', '1030001', '1030002', '1047003', '1047031', '1047026',
  '1047002', '1047005', '1047011', '1047034', '1047022', '1047025', '1047018',
  '1053007', '1053001', '1053002', '1043022', '1043013', '1043026', '1043024',
  '1043009', '1043012', '1043020', '1043032', '1043008', '1065043', '1065047',
  '1065046', '1065010', '1065004', '1065017', '1065048', '1065019', '1065045',
  '1066064', '1066003', '1066007', '1066006', '1066059', '1066024', '1066047',
  '1063037', '1063009', '1063036', '1063038', '1064012', '1064002', '1064001',
  '1064022', '1064042', '1064014', '1064007', '1064011', '1046009', '1046010',
  '1046007', '1046026', '1045003', '1021016', '1021015', '1061007', '1061006',
  '1061023', '1059014', '1058004', '1060001', '1060002', '1060014', '1060025',
  '1060022', '1060026', '1062003', '1062014', '1062001', '1062020', '1062013'
];
const p7Sl = new Set(p7Codes.map(c => {
  // For Peddapanjani 1060001 (sl_no: 452) and 1060002 (sl_no: 448)
  if (c === '1060001') return 452;
  if (c === '1060002') return 448;
  return codeToSl[c][0];
}));

// Apply assignments strictly and count
let cP1 = 0, cP2 = 0, cP3 = 0, cP4 = 0, cP5 = 0, cP6 = 0, cP7 = 0, cYet = 0;

villages.forEach(v => {
  const sl = v.sl_no;
  let newPhase = 'Yet to be Scheduled';

  if (p1Sl.has(sl)) {
    newPhase = 'Phase I';
    cP1++;
  } else if (p2Sl.has(sl)) {
    newPhase = 'Phase II';
    cP2++;
  } else if (p3Sl.has(sl)) {
    newPhase = 'Phase III';
    cP3++;
  } else if (p4Sl.has(sl)) {
    newPhase = 'Phase IV';
    cP4++;
  } else if (p5Sl.has(sl)) {
    newPhase = 'Phase V';
    cP5++;
  } else if (p6Sl.has(sl)) {
    newPhase = 'Phase VI';
    cP6++;
  } else if (p7Sl.has(sl)) {
    newPhase = 'Phase VII';
    cP7++;
  } else {
    cYet++;
  }

  v.phase = newPhase;
  v.last_modified = new Date().toISOString();
});

console.log('\n================ REALIGNED PHASE DISTRIBUTION ================');
console.log(`Phase I:   ${cP1} (Target: 27)`);
console.log(`Phase II:  ${cP2} (Target: 34 or 36)`);
console.log(`Phase III: ${cP3} (Target: 14)`);
console.log(`Phase IV:  ${cP4} (Target: 101)`);
console.log(`Phase V:   ${cP5} (Target: 60)`);
console.log(`Phase VI:  ${cP6} (Target: 92)`);
console.log(`Phase VII: ${cP7} (Target: 91)`);
console.log(`Yet to be Scheduled: ${cYet} (Future / Unassigned Universe)`);
console.log(`Total Villages Accounted For: ${cP1 + cP2 + cP3 + cP4 + cP5 + cP6 + cP7 + cYet} (Universe: 774)`);

// Save updated store.json
fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
console.log('\nSuccessfully saved realigned data to data/store.json');
