const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
  console.log(`Updating ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  // 1. Update STAGES and STAGE_KEYS at top if present
  const oldStagesRegex = /const STAGES = \[\s*\[\s*'gt_status'[\s\S]*?\];\s*const STAGE_KEYS = \[\s*'gt_status'[\s\S]*?\];/;
  const newStagesCode = `const STAGES = [
  ['gt_status', 'GT'],
  ['vectorization_status', 'Vectorization/Correlation'],
  ['vs_status', 'Village Surveyor Login'],
  ['vro_status', 'DLR@VRO Login'],
  ['tahsildar_status', 'DLR@Tahsildar Login'],
  ['rdo_status', 'DLR@RDO Login'],
  ['jc_status', 'DLR@JC Login'],
  ['final_ror_status', 'Final RoR'],
  ['webland_2_status', 'Webland Porting'],
  ['blockchain_status', 'Block Chain Tech Stage']
];

const STAGE_KEYS = [
  'gt_status', 'vectorization_status', 'vs_status', 'vro_status',
  'tahsildar_status', 'rdo_status', 'jc_status', 'final_ror_status',
  'webland_2_status', 'blockchain_status'
];`;

  if (oldStagesRegex.test(content)) {
    content = content.replace(oldStagesRegex, newStagesCode);
    console.log(`[${filePath}] Updated STAGES & STAGE_KEYS.`);
  }

  // 2. Replace RESURVEY_STAGES_CONFIG and renderPpbCycleStageBreakdown
  const stagesBlockRegex = /const RESURVEY_STAGES_CONFIG = \[\s*\{[\s\S]*?function renderPpbDistribution\(\) \{/;

  const newStagesBlock = `function getVillageResurveyStage(v) {
  if (!v) return 'gt_not_started';
  const s = (v.current_stage || '').toLowerCase();
  if (s.includes('block chain') || s.includes('blockchain') || v.blockchain_status === 'Completed' || v.blockchain_tech_stage) {
    return 'blockchain_stage';
  }
  if (s.includes('webland') || s.includes('porting') || v.ported_to_webland || v.webland_2_status === 'Ported' || v.webland_2_status === 'Completed') {
    return 'webland_porting';
  }
  if (s.includes('final ror') || s.includes('final_ror') || (v.final_ror_status && v.final_ror_status !== 'Pending')) {
    return 'final_ror';
  }
  if (s.includes('jc') || s.includes('joint collector') || (v.jc_status && v.jc_status !== 'Pending')) {
    return 'jc_login';
  }
  if (s.includes('rdo') || (v.rdo_status && v.rdo_status !== 'Pending')) {
    return 'rdo_login';
  }
  if (s.includes('tah') || s.includes('mro') || (v.tahsildar_status && v.tahsildar_status !== 'Pending')) {
    return 'tah_login';
  }
  if (s.includes('vro') || (v.vro_status && v.vro_status !== 'Pending')) {
    return 'vro_login';
  }
  if (s.includes('surveyor') || s.includes('vs login') || s === 'vs login' || (v.vs_status && v.vs_status !== 'Pending')) {
    return 'vs_login';
  }
  if (s.includes('vector') || s.includes('area') || s.includes('corr') || (v.vectorization_status && v.vectorization_status !== 'Pending')) {
    return 'vectorization';
  }
  if (s.includes('not started') || s.includes('not yet') || v.gt_status === 'Not Started') {
    return 'gt_not_started';
  }
  if (s.includes('ongoing') || s.includes('gt') || v.gt_status === 'In Progress' || v.cumulative_gt_extent > 0) {
    return 'gt_ongoing';
  }
  return 'gt_not_started';
}

function getVillageSpreadsheetInfo(v, stageKey) {
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
  if (st === 'blockchain_stage' || st === 'webland_porting') {
    return {
      name: 'Master PPB Universe & Ported Records',
      shortName: 'Master Universe Sheet',
      url: 'https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k/edit?gid=1362414076#gid=1362414076'
    };
  }
  if (p.includes('v') && !p.includes('iv') && !p.includes('vi')) {
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
    if (st === 'vs_login' || st === 'vro_login') {
      return {
        name: 'Phase-VI DLR VS/VRO Logins',
        shortName: 'Phase-VI VS/VRO Sheet',
        url: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit?gid=941359880#gid=941359880'
      };
    }
    return {
      name: 'Phase-VI DLR Tah/RDO/JC Logins',
      shortName: 'Phase-VI Tah/RDO/JC Sheet',
      url: 'https://docs.google.com/spreadsheets/d/10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ/edit?gid=127310674#gid=127310674'
    };
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
}

const RESURVEY_STAGES_CONFIG = [
  {
    key: 'gt_not_started',
    filterVal: 'GT Not Started',
    step: 1,
    name: 'GT Not Started',
    short: 'GT Not Started',
    telugu: 'భూ సరిచూపు ప్రారంభం కానివి',
    authority: 'Survey Field Teams',
    icon: '⏳',
    color: '#64748b',
    spreadsheetName: 'Phase-V & VI GT Daily Progress Sheets',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8/edit?gid=0#gid=0',
    description: 'Villages where drone flying or boundary establishment is pending and ground truthing has not yet commenced in the field.',
    match: v => getVillageResurveyStage(v) === 'gt_not_started'
  },
  {
    key: 'gt_ongoing',
    filterVal: 'GT Ongoing',
    step: 2,
    name: 'GT Ongoing',
    short: 'GT Ongoing',
    telugu: 'భూ సరిచూపు జరుగుతున్నవి',
    authority: 'Survey Field Teams',
    icon: '🌾',
    color: '#f59e0b',
    spreadsheetName: 'Phase-V & VI GT Daily Progress Sheets',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8/edit?gid=0#gid=0',
    description: 'Active survey operations underway using GNSS Rovers, base stations, and field survey teams across patta and government parcels.',
    match: v => getVillageResurveyStage(v) === 'gt_ongoing'
  },
  {
    key: 'vectorization',
    filterVal: 'Vectorization',
    step: 3,
    name: 'Cadastral Vectorization',
    short: 'Vectorization',
    telugu: 'కడస్ట్రల్ వెక్టరైజేషన్ & కోరిలేషన్',
    authority: 'GIS Vectorization Unit',
    icon: '📐',
    color: '#8b5cf6',
    spreadsheetName: 'Phase-IV DLR & Vectorization Status',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=1111910402#gid=1111910402',
    description: 'Vector correlation, area computation, parcel digitization, and boundary reconciliation conducted by GIS teams.',
    match: v => getVillageResurveyStage(v) === 'vectorization'
  },
  {
    key: 'vs_login',
    filterVal: 'VS Login',
    step: 4,
    name: 'Village Surveyor Login',
    short: 'VS Login',
    telugu: 'గ్రామ సర్వేయర్ లాగిన్',
    authority: 'Village Surveyor',
    icon: '🔐',
    color: '#3b82f6',
    spreadsheetName: 'DLR VS/VRO Login Google Sheet',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=1111910402#gid=1111910402',
    description: 'Village Surveyor verification of digital land record (DLR), parcel boundaries, LPMs, and preliminary notices.',
    match: v => getVillageResurveyStage(v) === 'vs_login'
  },
  {
    key: 'vro_login',
    filterVal: 'VRO Login',
    step: 5,
    name: 'VRO Login',
    short: 'VRO Login',
    telugu: 'గ్రామ రెవెన్యూ అధికారి లాగిన్',
    authority: 'Village Revenue Officer',
    icon: '🔐',
    color: '#2563eb',
    spreadsheetName: 'DLR VS/VRO Login Google Sheet',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=1111910402#gid=1111910402',
    description: 'VRO title verification, khatha assignment, enjoyed extent validation, and land classification confirmation.',
    match: v => getVillageResurveyStage(v) === 'vro_login'
  },
  {
    key: 'tah_login',
    filterVal: 'Tah Login',
    step: 6,
    name: 'Tahsildar Login',
    short: 'Tah Login',
    telugu: 'తహసీల్దార్ లాగిన్ ఆమోదం',
    authority: 'Tahsildar / MRO',
    icon: '⭐',
    color: '#d97706',
    highlight: true,
    spreadsheetName: 'DLR Tah/RDO/JC Login Google Sheet',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=182095482#gid=182095482',
    description: 'Mandal Tahsildar statutory scrutiny, dispute disposal, adjudication approval, and digital signature sign-off.',
    match: v => getVillageResurveyStage(v) === 'tah_login'
  },
  {
    key: 'rdo_login',
    filterVal: 'RDO Login',
    step: 7,
    name: 'RDO Login',
    short: 'RDO Login',
    telugu: 'డివిజనల్ అధికారి (RDO) లాగిన్',
    authority: 'Revenue Divisional Officer',
    icon: '🔐',
    color: '#1d4ed8',
    spreadsheetName: 'DLR Tah/RDO/JC Login Google Sheet',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=182095482#gid=182095482',
    description: 'Divisional-level validation of resurvey records, appeals examination, and jurisdictional confirmation by RDO.',
    match: v => getVillageResurveyStage(v) === 'rdo_login'
  },
  {
    key: 'jc_login',
    filterVal: 'JC Login',
    step: 8,
    name: 'Joint Collector Login',
    short: 'JC Login',
    telugu: 'జాయింట్ కలెక్టర్ (JC) లాగిన్',
    authority: 'Joint Collector',
    icon: '🔐',
    color: '#4338ca',
    spreadsheetName: 'DLR Tah/RDO/JC Login Google Sheet',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=182095482#gid=182095482',
    description: 'District Joint Collector executive review and final administrative authorization for statutory DLR sealing.',
    match: v => getVillageResurveyStage(v) === 'jc_login'
  },
  {
    key: 'final_ror',
    filterVal: 'Final ROR Completed',
    step: 9,
    name: 'Final ROR Completed',
    short: 'Final ROR',
    telugu: 'తుది రికార్డ్ ఆఫ్ రైట్స్ (Final RoR)',
    authority: 'CCLA / Joint Collector',
    icon: '📜',
    color: '#059669',
    spreadsheetName: 'DLR Completed & Final RoR Sheet',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4/edit?gid=218111872#gid=218111872',
    description: 'Post JC-Login approval: Final Record of Rights (RoR) generated, gazetted, and published as legal title registry.',
    match: v => getVillageResurveyStage(v) === 'final_ror'
  },
  {
    key: 'webland_porting',
    filterVal: 'Webland Porting',
    step: 10,
    name: 'Webland Porting',
    short: 'Webland Porting',
    telugu: 'వెబ్‌ల్యాండ్ పోర్టింగ్ పూర్తి',
    authority: 'Webland State Center',
    icon: '🌐',
    color: '#0284c7',
    spreadsheetName: 'Master PPB Universe & Ported Records',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k/edit?gid=1362414076#gid=1362414076',
    description: 'Porting of digital land records into Webland portal for automated mutations, e-Panta, and revenue transactions.',
    match: v => getVillageResurveyStage(v) === 'webland_porting'
  },
  {
    key: 'blockchain_stage',
    filterVal: 'Block Chain Tech Stage',
    step: 11,
    name: 'Block Chain Tech Stage',
    short: 'Blockchain Stage',
    telugu: 'బ్లాక్‌చైన్ టెక్నాలజీ భద్రత (తుది దశ)',
    authority: 'Blockchain & Land Records Authority',
    icon: '⛓️',
    color: '#10b981',
    isLastStage: true,
    spreadsheetName: 'District Resurvey Blockchain & Master DB',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k/edit?gid=1362414076#gid=1362414076',
    description: 'Last Stage: Immutable cryptographic hash anchoring of land titles and geo-coordinates onto state Blockchain ledger.',
    match: v => getVillageResurveyStage(v) === 'blockchain_stage'
  }
];

function exportStageVillagesCsv(villages, stageName) {
  if (!villages || !villages.length) {
    toast('No villages to export in this stage.', 'warning');
    return;
  }
  const headers = [
    'S.No', 'Village Code', 'Village Name', 'Mandal', 'Division',
    'Phase', 'Resurvey Stage', 'Total Extent (Ac)', 'Cumulative GT (Ac)',
    'PPB Target', 'Printed PPBs', 'Distributed PPBs', 'Balance PPBs',
    'Status', 'Google Spreadsheet Source'
  ];
  const rows = villages.map((v, i) => {
    const stKey = getVillageResurveyStage(v);
    const sheetInfo = getVillageSpreadsheetInfo(v, stKey);
    return [
      i + 1,
      \`"\${clean(v.village_code)}"\`,
      \`"\${clean(v.village_name)}"\`,
      \`"\${clean(v.mandal)}"\`,
      \`"\${clean(v.division)}"\`,
      \`"\${clean(v.phase)}"\`,
      \`"\${clean(v.current_stage || stageName)}"\`,
      parseFloat(v.extent || 0).toFixed(2),
      parseFloat(v.cumulative_gt_extent || 0).toFixed(2),
      v.ppb_target || 0,
      v.printed_ppbs || 0,
      v.distributed_ppbs || 0,
      v.balance_ppbs || 0,
      \`"\${clean(v.status || 'Active')}"\`,
      \`"\${clean(sheetInfo.name)}"\`
    ].join(',');
  });
  const csvContent = [headers.join(','), ...rows].join('\\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = \`Resurvey_Stage_\${(stageName || 'Villages').replace(/[^a-zA-Z0-9]/g, '_')}_\${new Date().toISOString().slice(0, 10)}.csv\`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(\`Exported \${villages.length} villages to CSV.\`, 'success');
}

function renderPpbStageDetailsPanel(selectedStageObj, stageStats, allVillages, totalInCycle) {
  if (!selectedStageObj) {
    return \`
      <div class="ppb-stage-details-container no-stage-selected" id="ppb-stage-details-section">
        <div class="stage-details-empty-banner">
          <span class="empty-banner-icon">📋</span>
          <div class="empty-banner-text">
            <h4>Select Any Resurvey Stage Above to View Village-Level Details</h4>
            <p>Click on any of the 11 stage cards above to filter and inspect village records, surveyors, DLR approval dates, and direct links to the relevant Google Spreadsheet.</p>
          </div>
        </div>

        <div class="stage-overview-summary-table-wrap">
          <table class="stage-overview-summary-table">
            <thead>
              <tr>
                <th style="width:70px;">STEP</th>
                <th>RESURVEY STAGE (తెలుగు వివరాలు)</th>
                <th>RESPONSIBLE AUTHORITY</th>
                <th>GOOGLE SPREADSHEET SOURCE</th>
                <th style="text-align:right;">VILLAGES</th>
                <th style="text-align:right;">% DISTRICT</th>
                <th style="text-align:center;">ACTION</th>
              </tr>
            </thead>
            <tbody>
              \${stageStats.map(st => \`
                <tr>
                  <td>
                    <span class="stage-step-pill font-mono" style="background:\${st.color};">
                      STEP \${st.step}
                    </span>
                  </td>
                  <td>
                    <strong style="color:\${st.color};">\${h(st.name)}</strong>
                    <span style="font-size:12px;color:#64748b;margin-left:6px;">(\${h(st.telugu)})</span>
                    \${st.isLastStage ? \`<span class="last-stage-badge" style="background:#10b981;color:#fff;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:800;">LAST STAGE</span>\` : ''}
                  </td>
                  <td><span class="authority-badge">\${h(st.authority)}</span></td>
                  <td>
                    <a href="\${st.spreadsheetUrl}" target="_blank" rel="noopener" class="sheet-chip-link font-mono" title="Open source Google spreadsheet">
                      📂 \${h(st.spreadsheetName)} ↗
                    </a>
                  </td>
                  <td style="text-align:right;" class="stage-cnt-cell">
                    <strong style="color:\${st.count > 0 ? st.color : '#94a3b8'};">\${st.count}</strong>
                  </td>
                  <td style="text-align:right;" class="font-mono text-muted">
                    \${st.pct}%
                  </td>
                  <td style="text-align:center;">
                    <button type="button" class="stage-inspect-btn font-mono" data-ppb-stage="\${st.key}">
                      Inspect Stage →
                    </button>
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    \`;
  }

  const stageVillages = allVillages.filter(v => selectedStageObj.match(v));
  const totalExtent = stageVillages.reduce((sum, v) => sum + (parseFloat(v.extent) || ((parseFloat(v.patta_extent) || 0) + (parseFloat(v.govt_extent) || 0))), 0);
  const totalTargetPpbs = stageVillages.reduce((sum, v) => sum + (Number(v.ppb_target) || 0), 0);
  
  const divCounts = { Chittoor: 0, Nagari: 0, Palamaner: 0, Kuppam: 0 };
  stageVillages.forEach(v => {
    const div = clean(v.division);
    if (divCounts[div] !== undefined) divCounts[div]++;
    else if (div.includes('Chit')) divCounts.Chittoor++;
    else if (div.includes('Nag')) divCounts.Nagari++;
    else if (div.includes('Pal')) divCounts.Palamaner++;
    else if (div.includes('Kup')) divCounts.Kuppam++;
  });

  return \`
    <div class="ppb-stage-details-container active-stage-selected" id="ppb-stage-details-section">
      <div class="stage-details-hdr">
        <div class="stage-details-hdr-left">
          <div class="stage-detail-title-row">
            <span class="stage-step-pill font-mono" style="background:\${selectedStageObj.color};">
              STAGE \${selectedStageObj.step} OF 11
            </span>
            <h4 class="stage-detail-title">\${h(selectedStageObj.name)}</h4>
            <span class="stage-telugu-inline font-telugu">(\${h(selectedStageObj.telugu)})</span>
            <span class="authority-badge" title="Responsible Authority">\${h(selectedStageObj.authority)}</span>
            \${selectedStageObj.isLastStage ? \`<span style="background:#10b981;color:#fff;font-size:10.5px;padding:2px 8px;border-radius:4px;font-weight:800;">LAST RESURVEY STAGE</span>\` : ''}
          </div>
          <p class="stage-detail-desc">\${h(selectedStageObj.description)}</p>
        </div>
        <div class="stage-details-hdr-actions">
          <a href="\${selectedStageObj.spreadsheetUrl}" target="_blank" rel="noopener" class="stage-sheet-link-btn font-mono" title="Open source Google spreadsheet in a new tab">
            📂 Open \${h(selectedStageObj.spreadsheetName)} ↗
          </a>
          <button type="button" class="ppb-stage-reset-btn" data-action="reset-ppb-stage" title="Close details and show all stages">
            ✕ Show All Stages
          </button>
        </div>
      </div>

      <div class="stage-source-alert">
        <div class="source-alert-left">
          <span class="source-dot">●</span>
          <span class="source-live-tag">LIVE GOOGLE SPREADSHEET</span>
          <span>Source Sheet: <strong>\${h(selectedStageObj.spreadsheetName)}</strong></span>
        </div>
        <div class="source-alert-right font-mono">
          <span>URL:</span>
          <a href="\${selectedStageObj.spreadsheetUrl}" target="_blank" rel="noopener" class="sheet-url-short">\${selectedStageObj.spreadsheetUrl.slice(0, 42)}... ↗</a>
        </div>
      </div>

      <div class="stage-metric-pills-strip">
        <div class="stage-kpi-pill">
          <span>Villages in Stage:</span>
          <strong style="color:\${selectedStageObj.color};">\${stageVillages.length}</strong>
        </div>
        <div class="stage-kpi-pill">
          <span>Total Land Extent:</span>
          <strong>\${formatExtent(totalExtent)} Ac</strong>
        </div>
        \${totalTargetPpbs > 0 ? \`
          <div class="stage-kpi-pill">
            <span>PPB Target:</span>
            <strong>\${totalTargetPpbs.toLocaleString()} PPBs</strong>
          </div>
        \` : ''}
        <div class="stage-kpi-pill">
          <span>Division Distribution:</span>
          <span class="div-mini-chip">Chittoor: <strong>\${divCounts.Chittoor}</strong></span>
          <span class="div-mini-chip">Nagari: <strong>\${divCounts.Nagari}</strong></span>
          <span class="div-mini-chip">Palamaner: <strong>\${divCounts.Palamaner}</strong></span>
          <span class="div-mini-chip">Kuppam: <strong>\${divCounts.Kuppam}</strong></span>
        </div>
      </div>

      <div class="stage-table-toolbar">
        <input type="text" 
               id="stage-filter-input" 
               class="stage-filter-input" 
               placeholder="🔍 Instant filter villages in \${h(selectedStageObj.name)} by name, code, mandal..." 
               value="" 
               autocomplete="off" />
        <div class="stage-toolbar-right">
          <span class="stage-table-stats">
            Showing <strong id="stage-table-count-badge">\${stageVillages.length}</strong> of <strong>\${stageVillages.length}</strong> villages
          </span>
          <button type="button" class="btn-export-stage-csv" data-action="export-stage-csv" data-stage="\${selectedStageObj.key}">
            📥 Export CSV (\${stageVillages.length} Villages)
          </button>
        </div>
      </div>

      <div class="stage-detail-table-wrap">
        <table class="stage-detail-table">
          <thead>
            <tr>
              <th style="width:50px;">S.NO</th>
              <th>VILLAGE NAME</th>
              <th>CODE</th>
              <th>MANDAL</th>
              <th>DIVISION</th>
              <th>PHASE</th>
              <th style="text-align:right;">EXTENT (AC)</th>
              <th>STAGE STATUS / ACTIVITY</th>
              <th>SURVEYORS / OFFICERS</th>
              <th>GOOGLE SPREADSHEET SOURCE</th>
              <th style="text-align:center;">ACTION</th>
            </tr>
          </thead>
          <tbody id="stage-villages-tbody">
            \${stageVillages.length === 0 ? \`
              <tr>
                <td colspan="11" class="empty-table-cell">
                  No villages currently in this stage for the active cycle / filters.
                </td>
              </tr>
            \` : stageVillages.map((v, idx) => {
              const sheetInfo = getVillageSpreadsheetInfo(v, selectedStageObj.key);
              const ext = parseFloat(v.extent) || ((parseFloat(v.patta_extent) || 0) + (parseFloat(v.govt_extent) || 0));
              const searchString = \`\${(v.village_name || '').toLowerCase()} \${(v.village_code || '').toLowerCase()} \${(v.mandal || '').toLowerCase()} \${(v.division || '').toLowerCase()} \${(v.phase || '').toLowerCase()}\`;
              const officers = v.surveyor_name || v.vro_name || v.survey_team || (v.mandal ? \`\${v.mandal} Tahsildar Office\` : '—');
              const stageStatusTxt = v.current_stage || selectedStageObj.name;

              return \`
                <tr data-search-row="\${h(searchString)}">
                  <td class="font-mono text-muted">\${idx + 1}</td>
                  <td>
                    <button type="button" class="village-name-btn" data-village-id="\${v.id || v.village_code}" title="View detailed village profile">
                      \${h(v.village_name || '—')}
                    </button>
                  </td>
                  <td class="font-mono">\${h(v.village_code || '—')}</td>
                  <td><strong>\${h(v.mandal || '—')}</strong></td>
                  <td>\${h(v.division || '—')}</td>
                  <td><span class="phase-chip">\${h(v.phase || '—')}</span></td>
                  <td style="text-align:right;" class="font-mono font-bold">\${formatExtent(ext)}</td>
                  <td>
                    <span class="stage-status-tag font-mono" style="color:\${selectedStageObj.color};font-weight:700;">
                      \${h(stageStatusTxt)}
                    </span>
                  </td>
                  <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${h(officers)}">
                    \${h(officers)}
                  </td>
                  <td>
                    <a href="\${sheetInfo.url}" target="_blank" rel="noopener" class="sheet-chip-link font-mono" title="Open source Google Sheet: \${h(sheetInfo.name)}">
                      📂 \${h(sheetInfo.shortName)} ↗
                    </a>
                  </td>
                  <td style="text-align:center;">
                    <button type="button" class="table-action-pill font-mono" data-village-id="\${v.id || v.village_code}">
                      Inspect →
                    </button>
                  </td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  \`;
}

function renderPpbCycleStageBreakdown(villages, activeCycle, selectedStageKey, context = 'ppb') {
  const totalInCycle = villages.length;
  
  const stageStats = RESURVEY_STAGES_CONFIG.map(st => {
    const matching = villages.filter(v => st.match(v));
    const count = matching.length;
    const pct = totalInCycle > 0 ? ((count / totalInCycle) * 100).toFixed(1) : '0.0';
    return {
      ...st,
      count,
      pct,
      isSelected: selectedStageKey === st.key
    };
  });

  const selectedStageObj = stageStats.find(s => s.key === selectedStageKey);
  const activeCycleTitle = activeCycle === 'all' ? 'All PPB Cycles' : (activeCycle || 'Sep-26');

  return \`
    <section class="section-card ppb-stage-breakdown-card" id="ppb-stage-breakdown-section" data-context="\${context}">
      <div class="ppb-stage-section-hdr">
        <div>
          <div class="ppb-stage-super-title">
            <span class="live-pulse-badge"><span class="pulse-ring"></span> RESURVEY PROCESS STAGES</span>
            <span class="stage-cycle-badge font-mono">\${h(activeCycleTitle)}</span>
          </div>
          <h3 class="ppb-stage-main-title">
            Number of Villages in Various Stages of Resurvey Process (\${totalInCycle} Villages)
          </h3>
          <p class="ppb-stage-subtitle">
            Live statutory progression from Google Spreadsheets across 11 stages. Click any stage card to view details at the bottom.
          </p>
        </div>
        <div class="ppb-stage-header-actions">
          <button type="button" class="ppb-stage-sync-btn" id="btn-sync-google-sheets" data-action="sync-google-sheets" title="Fetch live updates directly from Google Spreadsheets">
            🔄 Update from Google Spreadsheets
          </button>
          <button type="button" class="ppb-stage-reset-btn \${!selectedStageKey ? 'active' : ''}" data-action="reset-ppb-stage" title="View all villages across all stages">
            Show All Stages (\${totalInCycle} Villages)
          </button>
        </div>
      </div>

      \${selectedStageObj ? \`
        <div class="ppb-active-stage-banner">
          <div class="active-stage-banner-left">
            <span class="active-stage-badge">STAGE \${selectedStageObj.step} ACTIVE</span>
            <span>Showing <strong>\${selectedStageObj.count}</strong> villages in <strong>\${h(selectedStageObj.name)}</strong> (\${h(selectedStageObj.telugu)})</span>
          </div>
          <button type="button" class="clear-stage-pill" data-action="reset-ppb-stage" title="Clear stage filter">
            ✕ Clear Stage Filter
          </button>
        </div>
      \` : ''}

      <div class="ppb-stages-cards-grid">
        \${stageStats.map(st => \`
          <button type="button" 
                  class="ppb-stage-card \${st.isSelected ? 'is-selected' : ''} \${st.count > 0 ? 'has-villages' : 'is-zero'}" 
                  data-ppb-stage="\${st.key}"
                  title="Click to view details of \${st.count} villages in \${st.name} at bottom">
            <div class="ppb-stage-top-strip">
              <span class="ppb-stage-step-tag font-mono">STAGE \${st.step}</span>
              <span class="ppb-stage-icon">\${st.icon}</span>
            </div>
            <div class="ppb-stage-name-block">
              <span class="ppb-stage-name">\${h(st.short)}</span>
              <small class="ppb-stage-telugu">\${st.telugu}</small>
            </div>
            <div class="ppb-stage-num-wrap">
              <strong class="ppb-stage-num-big \${st.count > 0 ? 'text-highlight' : 'text-zero'}" style="color:\${st.count > 0 ? st.color : '#94a3b8'};">
                \${st.count}
              </strong>
              <span class="ppb-stage-num-unit">VILLAGES</span>
            </div>
            <div class="ppb-stage-card-footer">
              <span class="ppb-stage-pct-pill \${st.count > 0 ? 'pct-active' : ''}">
                \${st.pct}% of cycle
              </span>
              \${st.count > 0 ? \`<span class="ppb-stage-drill-arrow">Details ↓</span>\` : \`<span class="ppb-stage-zero-note">None</span>\`}
            </div>
          </button>
        \`).join('')}
      </div>

      <!-- Details of Selected Stage (or Complete Pipeline Overview Table) Displayed at Bottom -->
      \${renderPpbStageDetailsPanel(selectedStageObj, stageStats, villages, totalInCycle)}
    </section>
  \`;
}

function renderPpbDistribution() {`;

  if (stagesBlockRegex.test(content)) {
    content = content.replace(stagesBlockRegex, newStagesBlock);
    console.log(`[${filePath}] Replaced RESURVEY_STAGES_CONFIG and renderPpbCycleStageBreakdown.`);
  } else {
    console.error(`[${filePath}] Could NOT find stagesBlockRegex!`);
  }

  // 3. Update getFilteredHomeVillages stage filter logic
  const oldStageFilterPattern = /if \(f\.stage && f\.stage !== 'All stages'\) \{[\s\S]*?if \(f\.zone && f\.zone !== 'All'\)/;
  const newStageFilterCode = `if (f.stage && f.stage !== 'All stages') {
      const stageConfig = RESURVEY_STAGES_CONFIG.find(s => s.filterVal === f.stage || s.key === f.stage || s.name === f.stage);
      if (stageConfig) {
        if (!stageConfig.match(v)) return false;
      } else {
        const curStage = (v.current_stage || '').toLowerCase();
        const stQuery = f.stage.toLowerCase();
        if (!curStage.includes(stQuery)) return false;
      }
    }
    if (f.zone && f.zone !== 'All')`;

  if (oldStageFilterPattern.test(content)) {
    content = content.replace(oldStageFilterPattern, newStageFilterCode);
    console.log(`[${filePath}] Updated getFilteredHomeVillages stage filter.`);
  }

  // 4. Update click event handlers for ppbStage, reset-ppb-stage, and add sync-google-sheets and export-stage-csv
  const oldClickHandlerPattern = /if \(el\.dataset\.ppbStage\) \{[\s\S]*?if \(el\.dataset\.ppbCycle\) \{/;
  const newClickHandlerCode = `if (el.dataset.ppbStage) {
    const st = el.dataset.ppbStage;
    state.selectedPpbStage = (state.selectedPpbStage === st) ? null : st;
    state.stageTableSearch = '';
    if (state.view === 'ppb') {
      renderPpbDistribution();
    } else if (state.view === 'villages') {
      const conf = RESURVEY_STAGES_CONFIG.find(s => s.key === state.selectedPpbStage);
      state.villageFilters.current_stage = conf ? conf.filterVal : '';
      loadVillages().then(renderVillageMonitoring);
    } else if (state.view === 'dashboard') {
      const conf = RESURVEY_STAGES_CONFIG.find(s => s.key === state.selectedPpbStage);
      state.homeFilters.stage = conf ? conf.filterVal : 'All stages';
      renderDashboard();
    }
    setTimeout(() => {
      const detSec = document.getElementById('ppb-stage-details-section');
      if (detSec) detSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return;
  }

  if (el.dataset.action === 'reset-ppb-stage') {
    state.selectedPpbStage = null;
    state.stageTableSearch = '';
    if (state.view === 'ppb') {
      renderPpbDistribution();
    } else if (state.view === 'villages') {
      delete state.villageFilters.current_stage;
      loadVillages().then(renderVillageMonitoring);
    } else if (state.view === 'dashboard') {
      state.homeFilters.stage = 'All stages';
      renderDashboard();
    }
    setTimeout(() => {
      const sec = document.getElementById('ppb-stage-breakdown-section');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return;
  }

  if (el.dataset.action === 'sync-google-sheets' || el.closest('[data-action="sync-google-sheets"]')) {
    const btn = el.dataset.action === 'sync-google-sheets' ? el : el.closest('[data-action="sync-google-sheets"]');
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '🔄 Syncing Google Sheets...';
    try {
      toast('Connecting to Google Spreadsheets to fetch latest resurvey progress...', 'info');
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast('✅ Updated successfully from Google Spreadsheets!', 'success');
        await Promise.all([loadDashboard(), loadVillages()]);
        if (state.view === 'dashboard') renderDashboard();
        else if (state.view === 'ppb') renderPpbDistribution();
        else if (state.view === 'villages') renderVillageMonitoring();
      } else {
        toast('⚠️ Synchronization issue: ' + (data.error || 'Server error'), 'error');
      }
    } catch (err) {
      toast('Error contacting server for Google Spreadsheets sync: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldText;
    }
    return;
  }

  if (el.dataset.action === 'export-stage-csv') {
    const stKey = el.dataset.stage || state.selectedPpbStage;
    const stageConf = RESURVEY_STAGES_CONFIG.find(s => s.key === stKey);
    const stageVillages = state.villages.filter(v => stageConf ? stageConf.match(v) : true);
    exportStageVillagesCsv(stageVillages, stageConf ? stageConf.name : 'All_Stages');
    return;
  }

  if (el.dataset.ppbCycle) {`;

  if (oldClickHandlerPattern.test(content)) {
    content = content.replace(oldClickHandlerPattern, newClickHandlerCode);
    console.log(`[${filePath}] Updated click event handlers.`);
  } else {
    console.error(`[${filePath}] Could NOT find oldClickHandlerPattern!`);
  }

  // 5. Add instant search filter listener if not present
  if (!content.includes("id === 'stage-filter-input'")) {
    const attachListenersPoint = "document.addEventListener('input', e => {";
    if (content.includes(attachListenersPoint)) {
      content = content.replace(attachListenersPoint, attachListenersPoint + `
  if (e.target && e.target.id === 'stage-filter-input') {
    const q = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#stage-villages-tbody tr[data-search-row]');
    let visibleCount = 0;
    rows.forEach(row => {
      const text = row.getAttribute('data-search-row') || '';
      const match = !q || text.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    const counter = document.getElementById('stage-table-count-badge');
    if (counter) counter.textContent = visibleCount;
  }
`);
      console.log(`[${filePath}] Added instant search listener.`);
    } else {
      // Append at bottom
      content += `
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'stage-filter-input') {
    const q = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#stage-villages-tbody tr[data-search-row]');
    let visibleCount = 0;
    rows.forEach(row => {
      const text = row.getAttribute('data-search-row') || '';
      const match = !q || text.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    const counter = document.getElementById('stage-table-count-badge');
    if (counter) counter.textContent = visibleCount;
  }
});
`;
      console.log(`[${filePath}] Appended instant search listener.`);
    }
  }

  const result = isCrlf ? content.replace(/\n/g, '\r\n') : content;
  fs.writeFileSync(filePath, result, 'utf8');
  console.log(`[${filePath}] Done.`);
}

['app.js', 'public/app.js'].forEach(updateFile);
console.log('Script execution complete.');
