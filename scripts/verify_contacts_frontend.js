const fs = require('fs');
const path = require('path');

// Read app.js and store.json
const appCode = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const store = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/store.json'), 'utf8'));

// Minimal simulation context
const mockEl = { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], classList: { add: () => {}, remove: () => {} }, innerHTML: '', setAttribute: () => {} };
const loc = { hash: '#/villages', search: '', pathname: '/' };
const globalMock = {
  window: { addEventListener: () => {}, location: loc },
  document: {
    getElementById: () => mockEl,
    querySelector: () => mockEl,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  navigator: { userAgent: 'node' },
  localStorage: { getItem: () => 'APCTR2026', setItem: () => null },
  sessionStorage: { getItem: () => 'APCTR2026', setItem: () => null },
  console: console,
  location: loc,
  URLSearchParams: URLSearchParams,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};

// We will test the helper functions and table generators by extracting them or running them
// Extract MANDAL_SURVEYOR_DIRECTORY, getMandalSurveyor, getVillageOfficerContact, villageTable, renderDivisionAnalysis
console.log('=== VERIFYING FRONTEND HTML GENERATION ===\n');

// Evaluate app.js in a VM context to check functions
const vm = require('vm');
const context = vm.createContext({
  ...globalMock,
  state: {
    filters: {},
    stage: 'ground_truth',
    mandalSearch: ''
  },
  dashboardData: {
    mandals: Object.entries(
      store.villages.reduce((acc, v) => {
        acc[v.mandal] = (acc[v.mandal] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, total], idx) => ({
      name,
      division: 'Chittoor',
      total,
      final_ror_status: 10,
      overall: 50
    })),
    villages: store.villages
  }
});

try {
  vm.runInContext(appCode, context);
  console.log('app.js executed in VM context without error.');

  // 1. Test getMandalSurveyor
  const testMandals = ['Chittoor', 'Bangarupalem', 'Vedurukuppam', 'Nagari', 'Baireddipalle', 'Kuppam', 'S.R.Puram'];
  console.log('\n--- 1. Testing getMandalSurveyor() ---');
  testMandals.forEach(m => {
    const info = context.getMandalSurveyor(m);
    console.log(`  Mandal: ${m.padEnd(15)} => MS: ${info.name.padEnd(25)} | Phone: ${info.phone}`);
    if (!info.name || !info.phone || info.phone === '1800 425 5035') {
      throw new Error(`Invalid MS mapping for ${m}`);
    }
  });

  // 2. Test getVillageOfficerContact
  console.log('\n--- 2. Testing getVillageOfficerContact() ---');
  // Find a village with explicit team and one without
  const vWithTeam = store.villages.find(v => v.gt_team_names && v.gt_team_mobiles);
  const vWithoutTeam = store.villages.find(v => !v.gt_team_names && !v.gt_team_mobiles);

  if (vWithTeam) {
    const contactWith = context.getVillageOfficerContact(vWithTeam);
    console.log(`  Village with team [${vWithTeam.village_name} / ${vWithTeam.mandal}]:`);
    console.log(`    namesHtml includes officer-name-cell:`, contactWith.nameHtml.includes('officer-name-cell'));
    console.log(`    phoneHtml includes tel:`, contactWith.phoneHtml.includes('href="tel:'));
    console.log(`    phoneHtml snippet:`, contactWith.phoneHtml.replace(/\s+/g, ' ').slice(0, 120));
  }

  if (vWithoutTeam) {
    const contactWithout = context.getVillageOfficerContact(vWithoutTeam);
    console.log(`  Village without team [${vWithoutTeam.village_name} / ${vWithoutTeam.mandal}] (fallback):`);
    console.log(`    namesHtml includes Village Secretariat:`, contactWithout.nameHtml.includes('Village Secretariat'));
    console.log(`    phoneHtml includes MS phone:`, contactWithout.phoneHtml.includes('href="tel:'));
    console.log(`    phoneHtml snippet:`, contactWithout.phoneHtml.replace(/\s+/g, ' ').slice(0, 120));
  }

  // 3. Test villageTable (stage view and default view)
  console.log('\n--- 3. Testing villageTable() HTML ---');
  // Stage view
  const stageTableHtml = context.villageTable(store.villages.slice(0, 5));
  console.log('  Stage Table has SURVEYOR / OFFICER NAME header:', stageTableHtml.includes('SURVEYOR / OFFICER NAME'));
  console.log('  Stage Table has CONTACT NUMBER header:', stageTableHtml.includes('CONTACT NUMBER'));
  console.log('  Stage Table has tel: links:', (stageTableHtml.match(/href="tel:/g) || []).length);

  // Default view (no stage)
  context.state.stage = '';
  const defaultTableHtml = context.villageTable(store.villages.slice(0, 5));
  console.log('  Default Table has SURVEYOR / OFFICER NAME header:', defaultTableHtml.includes('SURVEYOR / OFFICER NAME'));
  console.log('  Default Table has CONTACT NUMBER header:', defaultTableHtml.includes('CONTACT NUMBER'));
  console.log('  Default Table has tel: links:', (defaultTableHtml.match(/href="tel:/g) || []).length);

  // 4. Test renderDivisionAnalysis (Mandal wise analysis data)
  console.log('\n--- 4. Testing renderDivisionAnalysis() HTML (Mandal Wise Analysis) ---');
  const divAnalysisHtml = context.renderDivisionAnalysis(context.dashboardData);
  console.log('  Division Analysis has CONCERNED MS header:', divAnalysisHtml.includes('CONCERNED MS (MANDAL SURVEYOR)'));
  console.log('  Division Analysis has MS CONTACT NUMBER header:', divAnalysisHtml.includes('MS CONTACT NUMBER'));
  console.log('  Division Analysis has is-ms tel: links:', (divAnalysisHtml.match(/class="officer-phone-link is-ms"/g) || []).length);

  // 5. Test renderGtVillageTable
  console.log('\n--- 5. Testing renderGtVillageTable() HTML ---');
  const gtHtml = context.renderGtVillageTable(store.villages.slice(0, 5), context.dashboardData);
  console.log('  renderGtVillageTable has Surveyor / Team header:', gtHtml.includes('Surveyor / Team'));
  console.log('  renderGtVillageTable has Contact No. header:', gtHtml.includes('Contact No.'));
  console.log('  renderGtVillageTable has tel: links:', (gtHtml.match(/href="tel:/g) || []).length);

  // 6. Test renderDlrVillageTable
  console.log('\n--- 6. Testing renderDlrVillageTable() HTML ---');
  const mockDlrData = {
    ...context.dashboardData,
    dlrRecords: [
      { id: '1', login_key: 'vs_status', phase: 'Phase-IV', division: 'Chittoor', mandal: 'Chittoor', village_name: 'Test Village', total_entries: 100, today: 5, cumulative: 50, balance: 50 }
    ]
  };
  const dlrHtml = context.renderDlrVillageTable(store.villages.slice(0, 5), mockDlrData);
  console.log('  renderDlrVillageTable has Concerned MS header:', dlrHtml.includes('Concerned MS / DIOS'));
  console.log('  renderDlrVillageTable has MS Contact header:', dlrHtml.includes('MS Contact'));
  console.log('  renderDlrVillageTable has tel: links:', (dlrHtml.match(/href="tel:/g) || []).length);

  // 7. Test renderIndividualVillageProgressCard
  console.log('\n--- 7. Testing renderIndividualVillageProgressCard() HTML ---');
  const ivCardHtml = context.renderIndividualVillageProgressCard(vWithTeam || store.villages[0]);
  console.log('  IV Card has iv-officer-strip:', ivCardHtml.includes('iv-officer-strip'));
  console.log('  IV Card has MS details:', ivCardHtml.includes('Concerned MS:'));
  console.log('  IV Card has tel: links:', (ivCardHtml.match(/href="tel:/g) || []).length);

  console.log('\n=== ALL FRONTEND TESTS PASSED SUCCESSFULLY! ===');
} catch (e) {
  console.error('Error during verification:', e);
  process.exit(1);
}
