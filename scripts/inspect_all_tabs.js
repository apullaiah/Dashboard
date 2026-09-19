const fs = require('fs');

const sheetIds = [
  { name: 'Master PPB Action Plan', id: '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k' },
  { name: 'Phase-VI GT Completed', id: '10HSEPoUWt61PUgC58TZiMsRa84O1NAyU06OU-l5pSVQ' },
  { name: 'Phase-V GT Completed', id: '1i8JU7Dc18TFvF2kPFkU2Z6rZRf0SukaYwaW9jNoZtT0' },
  { name: 'Phase-IV GT Completed', id: '1p3tJ-9sgTFM8Qrj3f0rLnbfWfc2zP8TnznJH-lAc-b4' },
  { name: 'Phase-V Daily Monitoring', id: '11GdOnP1wt0OrnwhRbn-MgbzuclsYuDfx7ocsUOrAUn8' },
  { name: 'Phase-VI Daily Monitoring', id: '1aSCPTr5O7YP-LgKKpRMJzuhGevfMd4QkBAkJ-AosAfY' },
  { name: 'Rover Allotment', id: '17YeaDn2_bjXCcoLiSM1wngJBlcqCqRtlFAI9ZXIpfYM' },
  // Also check if there were any others in seed scripts
  { name: 'Phase 7 targets from pdfs 1', id: '17M7sj_XzRKkiM9C-GpHernk_EEQnctOD8MOB0fnVr0A' },
  { name: 'Phase 7 targets from pdfs 2', id: '1bjvwI7f-heRZxahA7JmL8ZweJWGAu5e1sQPztSergBU' },
  { name: 'Phase 7 targets from pdfs 3', id: '18kcvSTkGP1Vlc5LVGeotVG-3jLr2jx4sLajrouH8dEQ' },
  { name: 'Phase 7 targets from pdfs 4', id: '16RIo0Z4KPCFMDBG67qKB7nF8ztlUT6DQ5nMIbXYh9KA' }
];

async function inspectAll() {
  for (const s of sheetIds) {
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${s.id}/htmlview`);
      const text = await res.text();
      console.log(`\n========================================`);
      console.log(`=== ${s.name} (${s.id}) ===`);
      
      // Match all items.push({name: "...", ... gid: "..."})
      const tabMatches = [...text.matchAll(/items\.push\(\{[^\}]*name:\s*"([^"]+)"[^\}]*gid:\s*"([^"]+)"/g)];
      if (tabMatches.length > 0) {
        for (const m of tabMatches) {
          console.log(`  Tab: "${m[1]}" (gid=${m[2]})`);
        }
      } else {
        // Also look for other items.push formats
        const m2 = [...text.matchAll(/name:\s*"([^"]+)",\s*pageUrl:[^}]+gid:\s*"([^"]+)"/g)];
        for (const m of m2) {
          console.log(`  Tab: "${m[1]}" (gid=${m[2]})`);
        }
        if (m2.length === 0) {
          console.log('  No tabs found via regex.');
        }
      }
    } catch (e) {
      console.error(`Error ${s.name}:`, e.message);
    }
  }
}

inspectAll();
