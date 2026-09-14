const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_PATH = path.join(__dirname, '..', 'data', 'store.json');
const store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const KNOWN_DIVISIONS = ['Chittoor', 'Nagari', 'Palamaner', 'Palmaner', 'Kuppam'];
const KNOWN_MANDALS = [
  'Baireddipalle', 'Gangavaram', 'Peddapanjani', 'Palamaner', 'Venkatagirikota', 'V.Kota', 'V Kota',
  'Gudupalle', 'Kuppam', 'Ramakuppam', 'Santhipuram',
  'Karvetinagar', 'Karvetinagaram', 'Nagari', 'Nindra', 'Vijayapuram',
  'Bangarupalem', 'Bangarupalyam', 'Chittoor', 'Chittoor Rural', 'Chittoor Urban',
  'G.D.Nellore', 'GD Nellore', 'Gudipala', 'Irala', 'Palasamudram', 'Penumuru', 'Penumur',
  'Pulicherla', 'Puthalapattu', 'Rompicherla', 'S.R.Puram', 'SR Puram', 'Thavanampalli', 'Thavanampalle',
  'Vedurukuppam', 'Yadamari'
];

function clean(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeTelugu(str) {
  let s = String(str || '').toLowerCase();
  s = s.replace(/[^a-z]/g, '');
  s = s.replace(/palli$|palle$|pally$/, 'palli');
  s = s.replace(/khandriga$|khandri$|khandrika$/, 'khandriga');
  s = s.replace(/puram$|pura$/, 'puram');
  s = s.replace(/kota$|kote$/, 'kota');
  s = s.replace(/giri$|gire$/, 'giri');
  s = s.replace(/bylu$|belu$/, 'belu');
  s = s.replace(/th/g, 't');
  s = s.replace(/dh/g, 'd');
  s = s.replace(/kh/g, 'k');
  s = s.replace(/ee/g, 'i');
  s = s.replace(/oo/g, 'u');
  s = s.replace(/w/g, 'v');
  s = s.replace(/i/g, 'a'); // vowels in transliterations often interchange (e.g. peddi vs pedda)
  s = s.replace(/e/g, 'a');
  return s;
}

function normalizePhase(val) {
  if (!val) return '';
  const str = String(val).trim();
  const m = str.match(/^(?:Phase[\s\-_]*)?(1|2|3|4|5|6|7|I|II|III|IV|V|VI|VII)$/i);
  if (m) {
    const p = m[1].toUpperCase();
    if (p === '1' || p === 'I') return 'Phase I';
    if (p === '2' || p === 'II') return 'Phase II';
    if (p === '3' || p === 'III') return 'Phase III';
    if (p === '4' || p === 'IV') return 'Phase IV';
    if (p === '5' || p === 'V') return 'Phase V';
    if (p === '6' || p === 'VI') return 'Phase VI';
    if (p === '7' || p === 'VII') return 'Phase VII';
  }
  return str;
}

function parseDates(str) {
  const dates = [];
  const regex = /(\d{2}-\d{2}-\d{4})|(Completed)/gi;
  let m;
  while ((m = regex.exec(str)) !== null) {
    dates.push(m[0]);
  }
  return dates;
}

function parsePdfRaw(filePath) {
  const buf = fs.readFileSync(filePath);
  const pdfStr = buf.toString('latin1');
  const cmap = {};
  const cmapRegex = /begincmap([\s\S]*?)endcmap/g;
  let cmMatch;
  while ((cmMatch = cmapRegex.exec(pdfStr)) !== null) {
    const body = cmMatch[1];
    const bfchar = body.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g);
    if (bfchar) {
      bfchar.forEach(pair => {
        const m = pair.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
        if (m) cmap[parseInt(m[1], 16)] = String.fromCharCode(parseInt(m[2], 16));
      });
    }
  }

  function decodeHex(hexStr) {
    let res = '';
    const cleanHex = hexStr.replace(/[^0-9a-fA-F]/g, '');
    for (let i = 0; i < cleanHex.length; i += 4) {
      res += cmap[parseInt(cleanHex.slice(i, i + 4), 16)] || '?';
    }
    return res;
  }

  const streamMatches = pdfStr.matchAll(/(\d+)\s+0\s+obj[\s\S]*?\/Length\s+(\d+)[\s\S]*?stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
  const pages = [];
  for (const match of streamMatches) {
    const len = Number(match[2]);
    if (len >= 2000 && len <= 9500) {
      try {
        const decomp = zlib.inflateSync(Buffer.from(match[3], 'latin1')).toString('latin1');
        pages.push(decomp);
      } catch (e) {}
    }
  }

  const allItems = [];
  pages.forEach((decomp, pageNum) => {
    const items = [];
    const btRegex = /BT[\s\S]*?ET/g;
    let btMatch;
    while ((btMatch = btRegex.exec(decomp)) !== null) {
      const block = btMatch[0];
      const lines = block.split('\n');
      let currentX = 0, currentY = 0;
      lines.forEach(l => {
        const tmM = l.match(/(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/);
        if (tmM) { currentX = parseFloat(tmM[5]); currentY = parseFloat(tmM[6]); }
        const tdM = l.match(/(-?[\d.]+)\s+(-?[\d.]+)\s+Td/);
        if (tdM) { currentX += parseFloat(tdM[1]); currentY += parseFloat(tdM[2]); }
        const tjArr = l.match(/\[(.*?)\]\s*TJ/);
        if (tjArr) {
          const hexMatches = tjArr[1].match(/<([0-9a-fA-F]+)>/g);
          if (hexMatches) {
            let combined = '';
            hexMatches.forEach(h => combined += decodeHex(h.slice(1, -1)));
            if (combined.trim()) items.push({ x: Math.round(currentX), y: Math.round(currentY), text: combined.trim() });
          }
        }
        const tjSingle = l.match(/<([0-9a-fA-F]+)>\s*Tj/);
        if (tjSingle) {
          const text = decodeHex(tjSingle[1]).trim();
          if (text) items.push({ x: Math.round(currentX), y: Math.round(currentY), text });
        }
      });
    }

    const byY = {};
    items.forEach(it => { (byY[it.y] ||= []).push(it); });
    const sortedY = Object.keys(byY).map(Number).sort((a,b) => a - b);

    sortedY.forEach(y => {
      const rowItems = byY[y].sort((a,b) => a.x - b.x);
      const rowText = rowItems.map(it => it.text).join(' ');
      if (/Division|Village Name|Timelines|Target Date|VS Login/i.test(rowText)) return;
      allItems.push({ page: pageNum + 1, y, items: rowItems });
    });
  });

  return allItems;
}

function parseLocationString(str) {
  let s = str.replace(/^\d+[\s.]*/, '').trim();
  let foundDiv = '';
  for (const d of KNOWN_DIVISIONS) {
    if (s.toLowerCase().startsWith(d.toLowerCase())) {
      foundDiv = d;
      s = s.slice(d.length).trim();
      break;
    }
  }
  let foundMandal = '';
  for (const m of KNOWN_MANDALS) {
    if (s.toLowerCase().startsWith(m.toLowerCase())) {
      foundMandal = m;
      s = s.slice(m.length).trim();
      break;
    }
  }
  const villageName = s.trim();
  return { division: foundDiv, mandal: foundMandal, villageName };
}

function matchMasterVillage(division, mandal, villageName, targetPhase) {
  const cleanM = clean(mandal);
  const cleanV = clean(villageName);
  const normM = normalizeTelugu(mandal);
  const normV = normalizeTelugu(villageName);
  if (!cleanV && !normV) return null;

  // 1. Exact mandal + village name match
  let v = store.villages.find(x => {
    const xm = clean(x.mandal);
    const xv = clean(x.village_name);
    return xm === cleanM && (xv === cleanV || xv.includes(cleanV) || cleanV.includes(xv));
  });

  // 2. Normalized Telugu transliteration match in same mandal
  if (!v && normM) {
    v = store.villages.find(x => {
      const xm = normalizeTelugu(x.mandal);
      const xv = normalizeTelugu(x.village_name);
      return (xm === normM || xm.includes(normM) || normM.includes(xm)) &&
             (xv === normV || xv.includes(normV) || normV.includes(xv));
    });
  }

  // 3. Match in target phase if specified
  if (!v && targetPhase) {
    v = store.villages.find(x => {
      const xp = normalizePhase(x.phase);
      const tp = normalizePhase(targetPhase);
      const xv = normalizeTelugu(x.village_name);
      return xp === tp && (xv === normV || xv.includes(normV) || normV.includes(xv));
    });
  }

  // 4. Fallback: match by normalized village name anywhere if long enough (>= 5 chars)
  if (!v && normV.length >= 5) {
    v = store.villages.find(x => {
      const xv = normalizeTelugu(x.village_name);
      return xv === normV || (xv.length >= 6 && (xv.includes(normV) || normV.includes(xv)));
    });
  }

  return v;
}

// 1. Phase IV
console.log('--- Processing Phase IV Targets ---');
const p4Rows = parsePdfRaw(path.join(__dirname, '..', 'Phase - IV – Resurvey Targets & Timelines.pdf'));
let p4Matched = 0;

p4Rows.forEach((row, idx) => {
  const nameItem = row.items.find(it => it.x < 300);
  const dataItem = row.items.find(it => it.x >= 400 && it.x < 900);
  const remarksItem = row.items.find(it => it.x >= 900);

  if (!nameItem) return;
  let loc = parseLocationString(nameItem.text);
  // Check if village name wrapped to next row
  if (!loc.villageName && p4Rows[idx + 1]) {
    const nextName = p4Rows[idx + 1].items.find(it => it.x < 300);
    if (nextName && !/\d/.test(nextName.text)) {
      loc.villageName = nextName.text.trim();
    }
  }

  const v = matchMasterVillage(loc.division, loc.mandal, loc.villageName, 'Phase-4');
  if (v) {
    p4Matched++;
    const extentMatch = (dataItem?.text || '').match(/^(\d+(?:\.\d+)?)/);
    if (extentMatch) v.extent = extentMatch[1];

    const dates = parseDates(dataItem?.text || '');
    if (dates.length) {
      v.stage_targets = { phase: 'Phase-4', dates, source: 'Phase IV Resurvey Targets & Timelines' };
      const lastDate = dates[dates.length - 1];
      if (lastDate && lastDate !== 'Completed') v.target_date = lastDate;
    }

    const stageText = dataItem?.text || '';
    if (stageText.includes('JC Login')) {
      v.current_stage = 'JC Login';
      v.gt_status = 'Completed';
      v.vectorization_status = 'Completed';
      v.vs_status = 'Completed';
      v.vro_status = 'Completed';
      v.tahsildar_status = 'Completed';
      v.rdo_status = 'Completed';
      v.jc_status = 'In Progress';
      v.status = 'In Progress';
    } else if (stageText.includes('RDO Login')) {
      v.current_stage = 'RDO Login';
      v.gt_status = 'Completed';
      v.vectorization_status = 'Completed';
      v.vs_status = 'Completed';
      v.vro_status = 'Completed';
      v.tahsildar_status = 'Completed';
      v.rdo_status = 'In Progress';
      v.status = 'In Progress';
    } else if (stageText.includes('Tah Login')) {
      v.current_stage = 'Tahsildar Login';
      v.gt_status = 'Completed';
      v.vectorization_status = 'Completed';
      v.vs_status = 'Completed';
      v.vro_status = 'Completed';
      v.tahsildar_status = 'In Progress';
      v.status = 'In Progress';
    } else if (stageText.includes('VRO Login')) {
      v.current_stage = 'VRO Login';
      v.gt_status = 'Completed';
      v.vectorization_status = 'Completed';
      v.vs_status = 'Completed';
      v.vro_status = 'In Progress';
      v.status = 'In Progress';
    }

    if (remarksItem?.text) v.remarks = remarksItem.text;
  }
});
console.log(`Phase IV matched: ${p4Matched}`);

// 2. Phase V
console.log('--- Processing Phase V Targets ---');
const p5Rows = parsePdfRaw(path.join(__dirname, '..', 'Phase-V – Resurvey Targets & Timelines.pdf'));
let p5Matched = 0;

p5Rows.forEach((row, idx) => {
  const nameItem = row.items.find(it => it.x < 350);
  const extentItem = row.items.find(it => it.x >= 400 && it.x < 600);
  const stageItem = row.items.find(it => it.x >= 600 && it.x < 720);
  const dateItem = row.items.find(it => it.x >= 720 && it.x < 1100);
  const remarksItem = row.items.find(it => it.x >= 1100);

  if (!nameItem) return;
  let loc = parseLocationString(nameItem.text);
  if (!loc.villageName && p5Rows[idx + 1]) {
    const nextName = p5Rows[idx + 1].items.find(it => it.x < 350);
    if (nextName && !/\d/.test(nextName.text)) loc.villageName = nextName.text.trim();
  }

  const v = matchMasterVillage(loc.division, loc.mandal, loc.villageName, 'Phase-5');
  if (v) {
    p5Matched++;
    const extentM = (extentItem?.text || '').match(/^(\d+(?:\.\d+)?)/);
    if (extentM) v.extent = extentM[1];

    const dates = parseDates(dateItem?.text || '');
    if (dates.length) {
      v.stage_targets = { phase: 'Phase-5', dates, source: 'Phase-V Resurvey Targets & Timelines' };
      const lastDate = dates[dates.length - 1];
      if (lastDate && lastDate !== 'Completed') v.target_date = lastDate;
    }

    const st = (stageItem?.text || '').trim();
    if (st.includes('Vs Login')) {
      v.current_stage = 'VS Login';
      v.gt_status = 'Completed';
      v.vectorization_status = 'Completed';
      v.vs_status = 'In Progress';
      v.status = 'In Progress';
    } else if (st.includes('GT')) {
      v.current_stage = 'GT';
      v.gt_status = 'In Progress';
      v.status = 'In Progress';
    }

    if (remarksItem?.text) v.remarks = remarksItem.text;
  }
});
console.log(`Phase V matched: ${p5Matched}`);

// 3. Phase VI
console.log('--- Processing Phase VI Targets ---');
const p6Rows = parsePdfRaw(path.join(__dirname, '..', 'Phase-VI– Resurvey Targets & Timelines.pdf'));
let p6Matched = 0;

p6Rows.forEach((row, idx) => {
  const nameItem = row.items.find(it => it.x < 350);
  const extentItem = row.items.find(it => it.x >= 400 && it.x < 580);
  const stageItem = row.items.find(it => it.x >= 580 && it.x < 650);
  const dateItem = row.items.find(it => it.x >= 650 && it.x < 1150);
  const remarksItem = row.items.find(it => it.x >= 1150);

  if (!nameItem) return;
  let loc = parseLocationString(nameItem.text);
  if (!loc.villageName && p6Rows[idx + 1]) {
    const nextName = p6Rows[idx + 1].items.find(it => it.x < 350);
    if (nextName && !/\d/.test(nextName.text)) loc.villageName = nextName.text.trim();
  }

  const v = matchMasterVillage(loc.division, loc.mandal, loc.villageName, 'Phase-6');
  if (v) {
    p6Matched++;
    const extentM = (extentItem?.text || '').match(/^(\d+(?:\.\d+)?)/);
    if (extentM) v.extent = extentM[1];

    const dates = parseDates(dateItem?.text || '');
    if (dates.length) {
      v.stage_targets = { phase: 'Phase-6', dates, source: 'Phase-VI Resurvey Targets & Timelines' };
      const lastDate = dates[dates.length - 1];
      if (lastDate && lastDate !== 'Completed') v.target_date = lastDate;
    }

    const st = (stageItem?.text || '').trim();
    if (st.includes('GT')) {
      v.current_stage = 'GT';
      if (!v.gt_status || v.gt_status === 'Not Updated') v.gt_status = 'In Progress';
      if (v.status === 'Not Updated') v.status = 'In Progress';
    }

    if (remarksItem?.text) v.remarks = remarksItem.text;
  }
});
console.log(`Phase VI matched: ${p6Matched}`);

// 4. Phase 7
console.log('--- Processing Phase 7 Targets ---');
const p7Rows = parsePdfRaw(path.join(__dirname, '..', 'Phase 7 - Resurvey Targets & Timelines.pdf'));
let p7Matched = 0;

p7Rows.forEach((row, idx) => {
  const nameItem = row.items.find(it => it.x < 350);
  const mandalItem = row.items.find(it => it.x >= 150 && it.x < 300);
  const dateItem = row.items.find(it => it.x >= 600);

  if (!nameItem) return;
  const txt = nameItem.text.replace(/^\d+[\s.]*/, '');
  const villageM = txt.match(/^([A-Za-z\s]+?)(?=\d)/);
  const villageName = villageM ? villageM[1].trim() : txt;
  const mandal = mandalItem?.text || '';

  const v = matchMasterVillage('', mandal, villageName, 'Phase-7');
  if (v) {
    p7Matched++;
    const dates = parseDates(txt + ' ' + (dateItem?.text || ''));
    if (dates.length) {
      v.stage_targets = { phase: 'Phase-7', dates, source: 'Phase 7 Resurvey Targets & Timelines' };
      const lastDate = dates[dates.length - 1];
      if (lastDate && lastDate !== 'Completed') v.target_date = lastDate;
    }
    if (v.status === 'Not Updated') {
      v.status = 'Pending';
      v.current_stage = 'GT';
      v.gt_status = 'Pending';
    }
  }
});
console.log(`Phase 7 matched: ${p7Matched}`);

// Register official sources
const officialSources = [
  {
    id: 'source-phase-4-targets',
    name: 'Phase IV Resurvey Targets & Timelines (Govt Official)',
    spreadsheetId: 'GOVT_PDF_PHASE_4',
    googleSheet: 'Phase - IV – Resurvey Targets & Timelines.pdf',
    tab: 'Targets & Timelines',
    purpose: 'Official Stage Targets, Timelines & Progress for Phase IV',
    direction: 'READ ONLY',
    accessMode: 'LOCAL',
    recordType: 'phase_targets',
    status: 'Connected',
    lastSync: new Date().toISOString()
  },
  {
    id: 'source-phase-5-targets',
    name: 'Phase V Resurvey Targets & Timelines (Govt Official)',
    spreadsheetId: 'GOVT_PDF_PHASE_5',
    googleSheet: 'Phase-V – Resurvey Targets & Timelines.pdf',
    tab: 'Targets & Timelines',
    purpose: 'Official Stage Targets, Timelines & Progress for Phase V',
    direction: 'READ ONLY',
    accessMode: 'LOCAL',
    recordType: 'phase_targets',
    status: 'Connected',
    lastSync: new Date().toISOString()
  },
  {
    id: 'source-phase-6-targets',
    name: 'Phase VI Resurvey Targets & Timelines (Govt Official)',
    spreadsheetId: 'GOVT_PDF_PHASE_6',
    googleSheet: 'Phase-VI– Resurvey Targets & Timelines.pdf',
    tab: 'Targets & Timelines',
    purpose: 'Official Stage Targets, Timelines & Progress for Phase VI',
    direction: 'READ ONLY',
    accessMode: 'LOCAL',
    recordType: 'phase_targets',
    status: 'Connected',
    lastSync: new Date().toISOString()
  },
  {
    id: 'source-phase-7-targets',
    name: 'Phase 7 Resurvey Targets & Timelines (Govt Official)',
    spreadsheetId: 'GOVT_PDF_PHASE_7',
    googleSheet: 'Phase 7 - Resurvey Targets & Timelines.pdf',
    tab: 'Targets & Timelines',
    purpose: 'Official Stage Targets, Timelines & Progress for Phase 7',
    direction: 'READ ONLY',
    accessMode: 'LOCAL',
    recordType: 'phase_targets',
    status: 'Connected',
    lastSync: new Date().toISOString()
  }
];

officialSources.forEach(s => {
  const existingIdx = store.sources.findIndex(x => x.id === s.id);
  if (existingIdx >= 0) store.sources[existingIdx] = { ...store.sources[existingIdx], ...s };
  else store.sources.push(s);
});

fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));

console.log('\n======================================================');
console.log('FINAL SYNC SUMMARY:');
console.log('======================================================');
console.log('Total Master Villages:', store.villages.length);
console.log('Not Updated remaining:', store.villages.filter(v => v.status === 'Not Updated').length);
console.log('In Progress:', store.villages.filter(v => v.status === 'In Progress').length);
console.log('Pending (with Target Dates):', store.villages.filter(v => v.status === 'Pending').length);
console.log('Completed:', store.villages.filter(v => v.status === 'Completed').length);
console.log('Villages with Official Target Dates:', store.villages.filter(v => Boolean(v.target_date)).length);
