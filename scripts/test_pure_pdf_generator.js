const fs = require('fs');
const path = require('path');
const store = require('../data/store.json');

function escapePdfText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Keep printable ASCII
}

function formatExtent(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generatePurePdf(store, options = {}) {
  const selectedMandal = (options.mandal && options.mandal !== 'All' && options.mandal !== '__ALL__') ? options.mandal : null;
  const selectedDivision = (options.division && options.division !== 'All') ? options.division : null;

  // Filter villages
  let villages = store.villages || [];
  if (selectedMandal) {
    villages = villages.filter(v => (v.mandal || '').toLowerCase() === selectedMandal.toLowerCase());
  }
  if (selectedDivision) {
    villages = villages.filter(v => (v.division || '').toLowerCase() === selectedDivision.toLowerCase());
  }

  // Group by mandal
  const mandalGroups = {};
  villages.forEach(v => {
    const m = v.mandal || 'Chittoor';
    if (!mandalGroups[m]) {
      mandalGroups[m] = {
        name: m,
        division: v.division || 'Chittoor',
        villages: []
      };
    }
    mandalGroups[m].villages.push(v);
  });

  const mandalNames = Object.keys(mandalGroups).sort();

  // Page metrics (A4 Landscape)
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const marginLeft = 36;
  const marginRight = 36;
  const contentWidth = pageWidth - marginLeft - marginRight; // 769.89 pt
  const marginTop = 30;
  const marginBottom = 30;

  // Columns definition (Total = 770 pt)
  const cols = [
    { label: '#', width: 26, align: 'center' },
    { label: 'Village Code', width: 68, align: 'center' },
    { label: 'Village Name', width: 165, align: 'left' },
    { label: 'Phase', width: 56, align: 'center' },
    { label: 'Extent (Ac)', width: 78, align: 'right' },
    { label: 'Resurvey Stage', width: 165, align: 'left' },
    { label: 'Status', width: 72, align: 'center' },
    { label: 'PPB Target', width: 75, align: 'center' },
    { label: 'Target Date', width: 65, align: 'center' }
  ];

  // Global aggregates
  const totalVillages = villages.length;
  const totalExtent = villages.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
  const totalCompleted = villages.filter(v => (v.status || '').toLowerCase() === 'completed' || v.ported_to_webland).length;
  const totalDelayed = villages.filter(v => (v.status || '').toLowerCase() === 'delayed' || Number(v.days_delayed) > 0).length;
  const totalInProgress = villages.filter(v => (v.status || '').toLowerCase().includes('progress') || v.gt_status === 'In Progress').length;
  const totalDlr = villages.filter(v => (v.current_stage || '').toLowerCase().includes('dlr') || (v.dlr_entries_balance || 0) > 0).length;

  const pages = [];
  let currentPageOps = [];
  let curY = pageHeight - marginTop;

  function startNewPage() {
    if (currentPageOps.length > 0) {
      pages.push(currentPageOps.join('\n'));
    }
    currentPageOps = [];
    curY = pageHeight - marginTop;
  }

  function drawRect(x, y, w, h, r, g, b, strokeR, strokeG, strokeB) {
    let s = `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`;
    if (strokeR !== undefined) {
      s += ` ${strokeR.toFixed(3)} ${strokeG.toFixed(3)} ${strokeB.toFixed(3)} RG 0.5 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`;
    }
    currentPageOps.push(s);
  }

  function drawLine(x1, y1, x2, y2, r, g, b, w = 0.5) {
    currentPageOps.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${w.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  function drawText(text, x, y, font = '/F1', size = 8.5, r = 0, g = 0, b = 0) {
    const esc = escapePdfText(text);
    currentPageOps.push(`BT ${font} ${size.toFixed(1)} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc}) Tj ET`);
  }

  function drawHeaderBanner(pageNum, isFirstPage) {
    // Top banner
    drawRect(marginLeft, curY - 34, contentWidth, 34, 0.059, 0.090, 0.161); // #0f1729
    drawText('GOVERNMENT OF ANDHRA PRADESH', marginLeft + 12, curY - 14, '/F2', 11, 1, 1, 1);
    drawText('District Survey and Land Records Office · Chittoor District', marginLeft + 12, curY - 26, '/F1', 7.5, 0.7, 0.75, 0.85);

    const titleText = selectedMandal ? `MANDAL RESURVEY STATUS REPORT: ${selectedMandal.toUpperCase()} MANDAL` : 'DISTRICT MANDAL-WISE VILLAGE RESURVEY STATUS REPORT';
    drawText(titleText, marginLeft + 240, curY - 14, '/F2', 9.5, 0.98, 0.80, 0.20); // Gold
    const genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    drawText(`Generated: ${genDate} · Universe: ${totalVillages} Villages across ${mandalNames.length} Mandals`, marginLeft + 240, curY - 26, '/F1', 7.5, 0.8, 0.85, 0.9);

    curY -= 42;

    if (isFirstPage) {
      // Draw 6 KPI boxes
      const kpiW = (contentWidth - (5 * 8)) / 6;
      const kpiH = 34;
      const kpiY = curY - kpiH;

      const kpis = [
        { label: 'TOTAL MANDALS', val: String(mandalNames.length), sub: 'Chittoor District', r: 0.15, g: 0.39, b: 0.92 },
        { label: 'TOTAL VILLAGES', val: String(totalVillages), sub: 'Revenue Villages', r: 0.15, g: 0.39, b: 0.92 },
        { label: 'TOTAL EXTENT', val: `${formatExtent(totalExtent)} Ac`, sub: 'Target Acreage', r: 0.02, g: 0.58, b: 0.41 },
        { label: 'COMPLETED / PORTED', val: String(totalCompleted), sub: `${Math.round(totalCompleted / (totalVillages || 1) * 100)}% Milestone`, r: 0.02, g: 0.58, b: 0.41 },
        { label: 'DLR ENTRIES STAGE', val: String(totalDlr), sub: 'Khatas Verification', r: 0.85, g: 0.47, b: 0.02 },
        { label: 'DELAYED / LAGGING', val: String(totalDelayed), sub: 'Requires Review', r: 0.88, g: 0.11, b: 0.28 }
      ];

      kpis.forEach((k, idx) => {
        const kX = marginLeft + idx * (kpiW + 8);
        drawRect(kX, kpiY, kpiW, kpiH, 0.97, 0.98, 0.99, 0.85, 0.88, 0.92);
        drawRect(kX, kpiY + kpiH - 2.5, kpiW, 2.5, k.r, k.g, k.b); // Top accent stripe
        drawText(k.label, kX + 6, kpiY + kpiH - 10, '/F2', 6.5, 0.4, 0.45, 0.55);
        drawText(k.val, kX + 6, kpiY + kpiH - 22, '/F2', 9.5, 0.06, 0.09, 0.16);
        drawText(k.sub, kX + 6, kpiY + 4, '/F1', 6.5, 0.5, 0.55, 0.65);
      });

      curY = kpiY - 14;
    }
  }

  function drawTableHeader() {
    const thH = 17;
    const thY = curY - thH;
    drawRect(marginLeft, thY, contentWidth, thH, 0.12, 0.16, 0.23); // #1e293b dark header

    let curX = marginLeft;
    cols.forEach(c => {
      let tX = curX + 4;
      if (c.align === 'center') tX = curX + (c.width / 2) - (c.label.length * 2);
      else if (c.align === 'right') tX = curX + c.width - (c.label.length * 4.5) - 4;
      drawText(c.label, tX, thY + 5, '/F2', 7.5, 1, 1, 1);
      curX += c.width;
    });

    curY = thY;
  }

  function drawFooter(pageNum) {
    const footY = 16;
    drawLine(marginLeft, footY + 12, marginLeft + contentWidth, footY + 12, 0.8, 0.85, 0.9);
    drawText('District Survey and Land Records Office · Collectorate Complex, Chittoor District, Government of Andhra Pradesh', marginLeft, footY + 2, '/F1', 7, 0.4, 0.45, 0.55);
    drawText(`Page ${pageNum}`, marginLeft + contentWidth - 45, footY + 2, '/F2', 7.5, 0.2, 0.25, 0.35);
  }

  // --- RENDER PAGES ---
  startNewPage();
  drawHeaderBanner(1, true);
  drawTableHeader();

  let globalVIdx = 0;

  mandalNames.forEach(mName => {
    const mg = mandalGroups[mName];
    const mVillages = mg.villages;
    const mExtent = mVillages.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
    const mComp = mVillages.filter(v => (v.status || '').toLowerCase() === 'completed' || v.ported_to_webland).length;
    const mDel = mVillages.filter(v => (v.status || '').toLowerCase() === 'delayed' || Number(v.days_delayed) > 0).length;

    // Check if room for mandal header + at least 2 rows
    if (curY < 90) {
      startNewPage();
      drawHeaderBanner(pages.length + 1, false);
      drawTableHeader();
    }

    // Mandal subheader bar
    const mBannerH = 18;
    const mBannerY = curY - mBannerH;
    drawRect(marginLeft, mBannerY, contentWidth, mBannerH, 0.93, 0.95, 0.98, 0.75, 0.82, 0.92);
    drawText(`⭐ ${mName.toUpperCase()} MANDAL (${mg.division} Division)`, marginLeft + 8, mBannerY + 5.5, '/F2', 8.5, 0.07, 0.18, 0.42);
    const mStatsStr = `Villages: ${mVillages.length}  |  Completed: ${mComp}  |  Delayed: ${mDel}  |  Extent: ${formatExtent(mExtent)} Ac`;
    drawText(mStatsStr, marginLeft + contentWidth - 280, mBannerY + 5.5, '/F2', 7.5, 0.15, 0.25, 0.35);

    curY = mBannerY;

    // Rows
    mVillages.forEach((v, vIdx) => {
      const rowH = 15;
      if (curY - rowH < marginBottom + 20) {
        startNewPage();
        drawHeaderBanner(pages.length + 1, false);
        drawTableHeader();
      }

      const rowY = curY - rowH;
      const isAlt = (vIdx % 2 === 1);
      if (isAlt) {
        drawRect(marginLeft, rowY, contentWidth, rowH, 0.97, 0.98, 0.99); // Alternating light zebra
      }
      drawLine(marginLeft, rowY, marginLeft + contentWidth, rowY, 0.90, 0.92, 0.94);

      // Print cells
      globalVIdx++;
      let curX = marginLeft;

      // 1. #
      drawText(String(globalVIdx), curX + 6, rowY + 4, '/F1', 7.5, 0.4, 0.45, 0.5);
      curX += cols[0].width;

      // 2. Village Code
      drawText(String(v.village_code || '—'), curX + 10, rowY + 4, '/F3', 7.5, 0.1, 0.2, 0.4);
      curX += cols[1].width;

      // 3. Village Name
      const vName = (v.village_name || '—').slice(0, 28);
      drawText(vName, curX + 4, rowY + 4, '/F2', 8, 0.06, 0.09, 0.16);
      curX += cols[2].width;

      // 4. Phase
      const phase = String(v.phase || '—').replace('Phase ', 'P-');
      drawText(phase, curX + 12, rowY + 4, '/F1', 7.5, 0.3, 0.35, 0.4);
      curX += cols[3].width;

      // 5. Extent
      const extStr = formatExtent(v.extent);
      drawText(extStr, curX + cols[4].width - (extStr.length * 4.8) - 4, rowY + 4, '/F3', 7.5, 0.05, 0.15, 0.35);
      curX += cols[4].width;

      // 6. Resurvey Stage
      const stage = (v.current_stage || v.gt_status || 'Under Survey').slice(0, 26);
      drawText(stage, curX + 4, rowY + 4, '/F1', 7.5, 0.1, 0.3, 0.6);
      curX += cols[5].width;

      // 7. Status Pill
      const stat = String(v.status || (v.ported_to_webland ? 'Completed' : 'Pending'));
      let sR = 0.3, sG = 0.35, sB = 0.4;
      if (/comp/i.test(stat)) { sR = 0.05; sG = 0.55; sB = 0.2; }
      else if (/delay/i.test(stat)) { sR = 0.85; sG = 0.1; sB = 0.1; }
      else if (/prog/i.test(stat)) { sR = 0.8; sG = 0.45; sB = 0.02; }
      drawText(stat.slice(0, 12), curX + 10, rowY + 4, '/F2', 7.5, sR, sG, sB);
      curX += cols[6].width;

      // 8. PPB Target
      const ppb = String(v.ppb_target || v.target_ppbs || '—');
      drawText(ppb, curX + 18, rowY + 4, '/F3', 7.5, 0.3, 0.35, 0.4);
      curX += cols[7].width;

      // 9. Target Date
      const tDate = String(v.target_date || '—').slice(0, 10);
      drawText(tDate, curX + 8, rowY + 4, '/F1', 7, 0.45, 0.5, 0.55);

      curY = rowY;
    });

    // Mandal subtotal row
    const subH = 15;
    if (curY - subH < marginBottom + 20) {
      startNewPage();
      drawHeaderBanner(pages.length + 1, false);
      drawTableHeader();
    }
    const subY = curY - subH;
    drawRect(marginLeft, subY, contentWidth, subH, 0.94, 0.95, 0.97);
    drawLine(marginLeft, subY, marginLeft + contentWidth, subY, 0.75, 0.8, 0.85);
    drawText(`Subtotal ${mName} Mandal (${mVillages.length} Villages):`, marginLeft + 80, subY + 4, '/F2', 7.5, 0.1, 0.15, 0.25);
    const subExt = `${formatExtent(mExtent)} Ac`;
    drawText(subExt, marginLeft + 245 + 56 + cols[4].width - (subExt.length * 4.8) - 4, subY + 4, '/F3', 7.5, 0.05, 0.15, 0.35);
    drawText(`✓ ${mComp} Completed · ⏳ ${mVillages.length - mComp - mDel} In Progress · ⚠️ ${mDel} Delayed`, marginLeft + 420, subY + 4, '/F2', 7.5, 0.2, 0.3, 0.4);

    curY = subY - 6;
  });

  // Finish last page
  if (currentPageOps.length > 0) {
    pages.push(currentPageOps.join('\n'));
  }

  // BUILD FINAL BINARY PDF 1.4 OBJECTS
  const totalPages = pages.length;
  const pdfObjects = [];
  function addObj(str) {
    pdfObjects.push(str);
    return pdfObjects.length;
  }

  // 1: Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  // 2: Pages tree placeholder (updated after page objects)
  addObj('');

  // Fonts: F1 = Helvetica, F2 = Helvetica-Bold, F3 = Courier
  const fontF1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontF2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const fontF3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  const pageObjIds = [];

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    // Inject footer into page stream with real page numbers
    let streamContent = pages[pIdx];
    const footY = 16;
    const footLine = `${marginLeft.toFixed(2)} ${(footY + 12).toFixed(2)} m ${(marginLeft + contentWidth).toFixed(2)} ${(footY + 12).toFixed(2)} l 0.800 0.850 0.900 RG 0.50 w S`;
    const footText1 = `BT /F1 7.0 Tf 0.400 0.450 0.550 rg ${marginLeft.toFixed(2)} ${(footY + 2).toFixed(2)} Td (${escapePdfText('District Survey and Land Records Office · Collectorate Complex, Chittoor District, Government of Andhra Pradesh')}) Tj ET`;
    const footText2 = `BT /F2 7.5 Tf 0.200 0.250 0.350 rg ${(marginLeft + contentWidth - 60).toFixed(2)} ${(footY + 2).toFixed(2)} Td (${escapePdfText(`Page ${pIdx + 1} of ${totalPages}`)}) Tj ET`;
    streamContent += `\n${footLine}\n${footText1}\n${footText2}`;

    const streamObj = addObj(`<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream`);
    const pageObj = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents ${streamObj} 0 R /Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R /F3 ${fontF3} 0 R >> >> >>`);
    pageObjIds.push(pageObj);
  }

  // Update object 2: Pages
  pdfObjects[1] = `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>`;

  // Assemble PDF bytes with exact xref table
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < pdfObjects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${pdfObjects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${pdfObjects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= pdfObjects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}

const pdfBuf = generatePurePdf(store, {});
console.log('Generated pure PDF buffer successfully!');
console.log('Byte length:', pdfBuf.length);
console.log('Header:', pdfBuf.slice(0, 10).toString());
console.log('Trailer ends with:', pdfBuf.slice(-25).toString());
fs.writeFileSync(path.join(__dirname, 'test_output_chittoor.pdf'), pdfBuf);
console.log('Saved to test_output_chittoor.pdf');
