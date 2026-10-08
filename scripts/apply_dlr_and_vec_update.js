const fs = require('fs');

const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
const villages = store.villages || [];
const dlrRecords = store.dlr_records || [];

// Create quick lookup for dlrRecords
const lpmsByCode = new Map();
const lpmsByName = new Map();
dlrRecords.forEach(r => {
  if (r.lpms > 0) {
    if (r.village_code) lpmsByCode.set(String(r.village_code).trim(), Number(r.lpms));
    if (r.village_name && r.mandal) {
      lpmsByName.set(`${r.mandal.trim().toLowerCase()}_${r.village_name.trim().toLowerCase()}`, Number(r.lpms));
    }
  }
});

let sec13UpdatedCount = 0;
let lpmsAssignedCount = 0;

villages.forEach(v => {
  // 1. Assign LPMs and Chalthas
  const codeKey = v.village_code ? String(v.village_code).trim() : null;
  const nameKey = (v.mandal && v.village_name) ? `${v.mandal.trim().toLowerCase()}_${v.village_name.trim().toLowerCase()}` : null;
  const sheetLpms = (codeKey && lpmsByCode.get(codeKey)) || (nameKey && lpmsByName.get(nameKey)) || 0;

  if (sheetLpms > 0) {
    v.lpms = sheetLpms;
    v.lpms_arrived = sheetLpms;
    lpmsAssignedCount++;
  } else if (!v.lpms) {
    const derived = Number(v.khatas) || Number(v.ppb_target) || Math.round((parseFloat(v.extent) || 500) * 1.25) || 850;
    v.lpms = derived;
    v.lpms_arrived = derived;
  }

  if (!v.chalthas) {
    v.chalthas = Math.max(2, Math.round((parseFloat(v.extent) || 500) / 75));
  }

  // 2. DLR completed means 13 notification is completed, and after JC login is completed take the count of villages as 13 notified villages
  const isJcComplete = v.jc_status === 'Completed' || 
                       v.dlr_active_stage === 'Completed' ||
                       (v.dlr_stages_detail && v.dlr_stages_detail.jc_status && v.dlr_stages_detail.jc_status.status === 'Completed');

  if (isJcComplete) {
    if (v.section13_status !== 'Completed') {
      v.section13_status = 'Completed';
      sec13UpdatedCount++;
    }
    const cs = (v.current_stage || '').toLowerCase();
    if (cs.includes('jc') || cs.includes('rdo') || cs.includes('tah') || cs.includes('vro') || cs.includes('vs')) {
      v.current_stage = '13 Completed';
    }
  }
});

console.log(`Updated ${sec13UpdatedCount} villages to section13_status = Completed.`);
console.log(`Directly matched sheet LPMs on ${lpmsAssignedCount} villages.`);

const totalJc = villages.filter(v => v.jc_status === 'Completed').length;
const totalSec13 = villages.filter(v => v.section13_status === 'Completed').length;
console.log(`Total JC Completed villages: ${totalJc}`);
console.log(`Total 13 Notified / Completed villages: ${totalSec13}`);

fs.writeFileSync('data/store.json', JSON.stringify(store, null, 2), 'utf8');
console.log('Saved data/store.json successfully.');
