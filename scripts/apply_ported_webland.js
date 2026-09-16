/**
 * scripts/apply_ported_webland.js
 *
 * Grounded in official sheet "Ported" (Resurvey Progress Details as on 11-09-2026.xlsx):
 * 72 villages ported to Webland 2.0 (Phase 1: 27, Phase 2: 34, Phase 3: 11).
 *
 * User Directive:
 * "All the villages ported to webland-2 shall be considered as all activiities of resurvey are completed."
 *
 * Sets:
 *  - ported_to_webland: true
 *  - webland_2_status: 'Ported'
 *  - gt_status: 'Completed'
 *  - vectorization_status: 'Completed'
 *  - vs_status: 'Completed'
 *  - vro_status: 'Completed'
 *  - tahsildar_status: 'Completed'
 *  - rdo_status: 'Completed'
 *  - jc_status: 'Completed'
 *  - section13_status: 'Completed'
 *  - draft_ror_status: 'Completed'
 *  - final_ror_status: 'Completed'
 *  - ppb_status: 'Completed'
 *  - current_stage: 'Completed'
 *  - status: 'Completed'
 *  - days_delayed: 0
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');
const PORTED_PATH = path.join(__dirname, '..', 'scratch', 'ported_villages.json');

const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8').replace(/^\uFEFF/, ''));
const portedList = JSON.parse(fs.readFileSync(PORTED_PATH, 'utf8').replace(/^\uFEFF/, ''));

console.log(`Loaded store with ${store.villages.length} villages.`);
console.log(`Loaded ported list with ${portedList.length} villages.`);

const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const MANDAL_NORM = {
  bangarupalyam: 'bangarupalem',
  gdnellore: 'gdnellore',
  palmaner: 'palamaner',
  palamaneru: 'palamaner',
  vkota: 'venkatagirikota',
  vankatagirikota: 'venkatagirikota',
  srpuram: 'srirangarajapuram',
  thavanampalli: 'thavanampalle',
  gudupalle: 'gudipalle'
};

function normMandal(m) {
  let n = normalize(m);
  if (MANDAL_NORM[n]) return MANDAL_NORM[n];
  if (n.includes('nellore')) return 'gdnellore';
  if (n.includes('bangar')) return 'bangarupalem';
  if (n.includes('palaman') || n.includes('palman')) return 'palamaner';
  if (n.includes('venkat') || n.includes('vkota')) return 'venkatagirikota';
  if (n.includes('srpuram') || n.includes('srirang')) return 'srirangarajapuram';
  if (n.includes('gudipala')) return 'gudipala';
  if (n.includes('veduru')) return 'vedurukuppam';
  if (n.includes('thavan')) return 'thavanampalle';
  if (n.includes('gudup') || n.includes('gudip')) return 'gudipalle';
  return n;
}

// Explicit overrides for the specific phonetic variations identified in verification
const EXPLICIT_MATCHES = {
  // SNo: Village -> Village Code
  '11': '1055022', // Gudipala: Ragimanupetteda -> Ragimanupatteda
  '12': '1055011', // Gudipala: Sreerangampalle -> Srirangampalle
  '15': '1052007', // Irala: V.S. Agraharam -> Venkatasamudra Agraharam
  '17': '1050011', // Penumuru: Samireddy palli -> Samireddipalle
  '25': '1047013', // S.R.Puram: 50.Basivireddy palli -> 50.Basivireddipalle
  '29': '1053005', // Thavanampalle: Govindhareddypalle -> Govindareddipalle
  '36': '1056017', // Yadamari: Siddareddypalli -> Siddareddipalle
  '37': '1065007', // Gudupalle: Anganamalkottur -> Anganamalakothur
  '47': '1045028', // Nagari: Saraswati vilasa puram -> Saraswathvilasapuram
  '48': '1045027', // Nagari: Venkatanarashimha Rajuvaripeta -> Venkatanarasimharajupet
  '58': '1022009', // Nindra: Kunamaraju palem -> Kunamaraju palem(1-70,149-199)
  '51': '1048003', // Palasamudram: K J Puram -> Krishnajmmapuram
  '59': '1061018', // Baireddipalle: Mulatimmepalle -> Mulathimmepalli
  '61': '1059010', // Gangavaram: Kalagaturu -> Kalagatoor
  '62': '1059012', // Gangavaram: Melumoi -> Melumoy
  '64': '1058007', // Palamaner: Kurmaoi -> Kurmoi
  '65': '1058002', // Palamaner: Raginayanapalle -> Ranginayanapalle
  '67': '1060030', // Peddapanjani: Muthukur - Panjani -> Muthukur - Panjani (P2)
  '68': '1060028', // Peddapanjani: Muthukuru (Kondepalli) -> Muthukur (Kondepalle) (P3)
  '69': '1060024', // Peddapanjani: Thurlapalli-kothakota -> Thurlapalle -  Kothakota (P2)
  '71': '1062009', // V.Kota: TPG Palli -> Tirumala pichigundlapalle
};

const cleanVill = (v) => {
  return normalize(v)
    .replace(/^\d+/, '')
    .replace(/palli$/, 'palle')
    .replace(/palem$/, 'palyam')
    .replace(/puram$/, 'pura');
};

let matchedCount = 0;
const matchedCodes = new Set();
const phaseCounts = { P1: 0, P2: 0, P3: 0, other: 0 };

for (const p of portedList) {
  let targetCode = EXPLICIT_MATCHES[p.SNo];
  let target = null;

  if (targetCode) {
    target = store.villages.find(v => String(v.village_code) === targetCode);
  }

  if (!target) {
    const pm = normMandal(p.Mandal);
    const pv = cleanVill(p.Village);

    target = store.villages.find(v => {
      const vm = normMandal(v.mandal_name || v.mandal);
      if (vm !== pm) return false;
      const vv = cleanVill(v.village_name);
      if (vv === pv) return true;
      if (vv.includes(pv) || pv.includes(vv)) return true;
      return false;
    });
  }

  if (!target) {
    // Unique fallback by name
    const pv = cleanVill(p.Village);
    const cand = store.villages.filter(v => cleanVill(v.village_name) === pv);
    if (cand.length === 1) target = cand[0];
  }

  if (!target) {
    console.error(`FAILED TO MATCH: SNo ${p.SNo}: ${p.Village} (${p.Mandal})`);
    continue;
  }

  matchedCount++;
  matchedCodes.add(String(target.village_code));

  const pPhase = (p.Phase || '').toUpperCase();
  if (pPhase.includes('1') || pPhase === 'P1') phaseCounts.P1++;
  else if (pPhase.includes('2') || pPhase === 'P2') phaseCounts.P2++;
  else if (pPhase.includes('3') || pPhase === 'P3') phaseCounts.P3++;
  else phaseCounts.other++;

  // Apply completion of all resurvey activities as directed:
  target.ported_to_webland = true;
  target.webland_2_status = 'Ported';
  target.webland_phase = p.Phase || 'Ported';
  target.gt_status = 'Completed';
  target.vectorization_status = 'Completed';
  target.vs_status = 'Completed';
  target.vro_status = 'Completed';
  target.tahsildar_status = 'Completed';
  target.rdo_status = 'Completed';
  target.jc_status = 'Completed';
  target.section13_status = 'Completed';
  target.draft_ror_status = 'Completed';
  target.final_ror_status = 'Completed';
  target.ppb_status = 'Completed';
  target.current_stage = 'Completed';
  target.status = 'Completed';
  target.days_delayed = 0;
  target.last_modified = new Date().toISOString();
}

// First reset ported_to_webland on any village that was previously set
for (const v of store.villages) {
  if (v.ported_to_webland && !matchedCodes.has(String(v.village_code))) {
    delete v.ported_to_webland;
    delete v.webland_2_status;
    delete v.webland_phase;
  }
}

console.log(`\nSuccessfully matched and marked ${matchedCount} / ${portedList.length} ported villages.`);
console.log(`Unique village codes marked: ${matchedCodes.size}`);
console.log(`Ported breakdown by Phase: Phase 1: ${phaseCounts.P1}, Phase 2: ${phaseCounts.P2}, Phase 3: ${phaseCounts.P3}`);

store.webland2_ported_count = matchedCodes.size;
store.webland2_ported_codes = Array.from(matchedCodes);

fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
console.log(`Saved updated store to ${STORE_PATH}`);
