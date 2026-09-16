/**
 * Script to apply the sequential rule:
 * "All the villages started in VS login and above should be considered as GT and Vectorization are completed for such villages"
 */
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');
const raw = fs.readFileSync(STORE_PATH, 'utf8').replace(/^\uFEFF/, '');
const store = JSON.parse(raw);

const higherStages = [
  'vs_status', 'vro_status', 'tahsildar_status', 'rdo_status',
  'jc_status', 'section13_status', 'draft_ror_status', 'final_ror_status', 'ppb_status'
];

function isComplete(val) {
  return /^(completed|complete|done|yes|y)$/i.test(String(val || '').trim());
}

function isStarted(val) {
  const s = String(val || '').trim().toLowerCase();
  return isComplete(s) || /progress|ongoing|started|done|yes/.test(s);
}

function isVsOrAbove(v) {
  if (!v) return false;
  for (const stg of higherStages) {
    if (isStarted(v[stg])) return true;
  }
  const cs = String(v.current_stage || '').trim().toLowerCase();
  const higherStagePatterns = [
    /vs\s*login/i, /secretariat/i, /vro/i, /tah/i, /rdo/i, /jc/i,
    /joint\s*collector/i, /13\s*completed/i, /section\s*13/i,
    /draft\s*ror/i, /final\s*ror/i, /ppb/i, /completed/i
  ];
  if (higherStagePatterns.some(p => p.test(cs))) {
    if (!/gt/i.test(cs) && !/vector/i.test(cs) && !/area/i.test(cs)) {
      return true;
    }
  }
  return false;
}

let updatedGt = 0;
let updatedVec = 0;
let totalVsOrAbove = 0;

store.villages.forEach(v => {
  if (isVsOrAbove(v)) {
    totalVsOrAbove++;
    if (!isComplete(v.gt_status)) {
      v.gt_status = 'Completed';
      updatedGt++;
    }
    if (!isComplete(v.vectorization_status)) {
      v.vectorization_status = 'Completed';
      updatedVec++;
    }
    if (!v.source_meta) v.source_meta = {};
    if (!v.source_meta.gt_status) {
      v.source_meta.gt_status = {
        source: 'Revenue Administration Directive (VS Login & Above Prerequisite)',
        lastSynced: new Date().toISOString()
      };
    }
    if (!v.source_meta.vectorization_status) {
      v.source_meta.vectorization_status = {
        source: 'Revenue Administration Directive (VS Login & Above Prerequisite)',
        lastSynced: new Date().toISOString()
      };
    }
  }
});

console.log(`Total villages at VS Login and above: ${totalVsOrAbove}`);
console.log(`Updated GT to Completed for ${updatedGt} villages.`);
console.log(`Updated Vectorization to Completed for ${updatedVec} villages.`);

fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
console.log('Saved data/store.json successfully.');
