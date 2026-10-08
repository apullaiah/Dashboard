const fs = require('fs');
const path = require('path');

const targetFunction = `function getVillageSpreadsheetInfo(v, stageKey) {
  const p = (v?.phase || '').toLowerCase();
  const st = stageKey || getVillageResurveyStage(v);
  if (st === 'gt_not_started' || st === 'gt_ongoing') {
    if (p.includes('vi') || p.includes('6')) {
      return {
        name: 'Phase-VI GT Daily Status',
        shortName: 'Phase-VI GT Sheet',
        url: 'https://docs.google.com/spreadsheets/d/1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY/edit?gid=0#gid=0'
      };
    }
    return {
      name: 'Phase-V GT Daily Progress',
      shortName: 'Phase-V GT Sheet',
      url: 'https://docs.google.com/spreadsheets/d/11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8/edit?gid=0#gid=0'
    };
  }
  if (st === 'vectorization') {
    if (p.includes('vi') || p.includes('6')) {
      return {
        name: 'Phase-VI Vectorization & Correlation Status',
        shortName: 'Phase-VI Vectorization Sheet',
        url: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit?gid=563060141#gid=563060141'
      };
    }
    return {
      name: 'Phase-V Vectorization & Correlation Status',
      shortName: 'Phase-V Vectorization Sheet',
      url: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit?gid=2048120699#gid=2048120699'
    };
  }
  if (st === 'blockchain_stage' || st === 'webland_porting') {
    return {
      name: 'Master PPB Universe & Ported Records',
      shortName: 'Master Universe Sheet',
      url: 'https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k/edit?gid=1362414076#gid=1362414076'
    };
  }
  if (p.includes('v') && !p.includes('iv') && !p.includes('vi')) {
    if (st === 'vectorization') {
      return {
        name: 'Phase-V Vectorization & Correlation Status',
        shortName: 'Phase-V Vectorization Sheet',
        url: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit?gid=2048120699#gid=2048120699'
      };
    }
    if (st === 'vs_login' || st === 'vro_login') {
      return {
        name: 'Phase-V DLR VS/VRO Logins',
        shortName: 'Phase-V VS/VRO Sheet',
        url: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit?gid=1329023156#gid=1329023156'
      };
    }
    if (st === 'tah_login' || st === 'rdo_login' || st === 'jc_login') {
      return {
        name: 'Phase-V DLR Tah/RDO/JC Logins',
        shortName: 'Phase-V Tah/RDO/JC Sheet',
        url: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit?gid=1758823146#gid=1758823146'
      };
    }
    if (st === 'final_ror') {
      return {
        name: 'Phase-V DLR Completed & Final RoR',
        shortName: 'Phase-V DLR Completed Sheet',
        url: 'https://docs.google.com/spreadsheets/d/1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0/edit?gid=167154929#gid=167154929'
      };
    }
  }
  if (p.includes('vi') || p.includes('6')) {
    if (st === 'vectorization') {
      return {
        name: 'Phase-VI Vectorization & Correlation Status',
        shortName: 'Phase-VI Vectorization Sheet',
        url: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit?gid=563060141#gid=563060141'
      };
    }
    if (st === 'vs_login' || st === 'vro_login') {
      return {
        name: 'Phase-VI DLR VS/VRO Logins',
        shortName: 'Phase-VI VS/VRO Sheet',
        url: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit?gid=941359880#gid=941359880'
      };
    }
    if (st === 'tah_login' || st === 'rdo_login' || st === 'jc_login') {
      return {
        name: 'Phase-VI DLR Tah/RDO/JC Logins',
        shortName: 'Phase-VI Tah/RDO/JC Sheet',
        url: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit?gid=127310674#gid=127310674'
      };
    }
  }
  // Default to Phase-IV
  if (st === 'final_ror') {
    return {
      name: 'Phase-IV DLR Completed & Final RoR',
      shortName: 'Phase-IV DLR Completed Sheet',
      url: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=218111872#gid=218111872'
    };
  }
  if (st === 'vs_login' || st === 'vro_login') {
    return {
      name: 'Phase-IV DLR VS/VRO Logins',
      shortName: 'Phase-IV VS/VRO Sheet',
      url: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=1111910402#gid=1111910402'
    };
  }
  return {
    name: 'Phase-IV DLR Tah/RDO/JC Logins',
    shortName: 'Phase-IV Tah/RDO/JC Sheet',
    url: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=182095482#gid=182095482'
  };
}`;

const files = ['./public/app.js', './app.js'];

files.forEach(f => {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace getVillageSpreadsheetInfo
  const startIdx = content.indexOf('function getVillageSpreadsheetInfo(');
  if (startIdx !== -1) {
    const endIdx = content.indexOf('const RESURVEY_STAGES_CONFIG =', startIdx);
    if (endIdx !== -1) {
      content = content.slice(0, startIdx) + targetFunction + '\n\n' + content.slice(endIdx);
      console.log(`Updated getVillageSpreadsheetInfo in ${f}`);
    }
  }

  // Also replace getVillageResurveyStage in app.js if needed
  const stageStart = content.indexOf('function getVillageResurveyStage(');
  if (stageStart !== -1) {
    const stageEnd = content.indexOf('function getVillageSpreadsheetInfo(', stageStart);
    if (stageEnd !== -1) {
      const updatedStageFunc = `function getVillageResurveyStage(v) {
  if (!v) return 'gt_not_started';
  const s = (v.current_stage || '').toLowerCase().trim();

  if (s.includes('block chain') || s.includes('blockchain') || v.blockchain_status === 'Completed' || v.blockchain_tech_stage) {
    return 'blockchain_stage';
  }
  if (s.includes('webland') || s.includes('porting') || v.ported_to_webland || v.webland_2_status === 'Ported' || v.webland_2_status === 'Completed') {
    return 'webland_porting';
  }
  if (s.includes('final ror') || s.includes('final_ror')) {
    return 'final_ror';
  }
  if (s.includes('jc') || s.includes('joint collector')) {
    return 'jc_login';
  }
  if (s.includes('rdo') || s.includes('divisional')) {
    return 'rdo_login';
  }
  if (s.includes('tah') || s.includes('mro') || s.includes('tahsildar')) {
    return 'tah_login';
  }
  if (s.includes('vro') || s.includes('revenue officer')) {
    return 'vro_login';
  }
  if (s.includes('surveyor') || s.includes('vs login') || s === 'vs' || s === 'vs login') {
    return 'vs_login';
  }
  if (s.includes('vector') || s.includes('area') || s.includes('corr')) {
    return 'vectorization';
  }
  if (s.includes('not started') || s.includes('not yet') || v.gt_status === 'Not Started') {
    return 'gt_not_started';
  }
  if (s.includes('ongoing') || s.includes('gt') || v.gt_status === 'In Progress' || v.cumulative_gt_extent > 0) {
    return 'gt_ongoing';
  }

  // Fallbacks if current_stage was not explicitly set:
  if (v.final_ror_status === 'Completed') return 'final_ror';
  if (v.jc_status === 'In Progress' || v.jc_status === 'Completed') return 'jc_login';
  if (v.rdo_status === 'In Progress' || v.rdo_status === 'Completed') return 'rdo_login';
  if (v.tahsildar_status === 'In Progress' || v.tahsildar_status === 'Completed') return 'tah_login';
  if (v.vro_status === 'In Progress' || v.vro_status === 'Completed') return 'vro_login';
  if (v.vs_status === 'In Progress' || v.vs_status === 'Completed') return 'vs_login';
  if (v.vectorization_status === 'In Progress' || v.vectorization_status === 'Completed') return 'vectorization';
  if (v.gt_status === 'In Progress' || (parseFloat(v.cumulative_gt_extent) > 0)) return 'gt_ongoing';
  return 'gt_not_started';
}\n\n`;
      content = content.slice(0, stageStart) + updatedStageFunc + content.slice(stageEnd);
      console.log(`Updated getVillageResurveyStage in ${f}`);
    }
  }

  fs.writeFileSync(p, content, 'utf8');
});
console.log('Patch complete.');
