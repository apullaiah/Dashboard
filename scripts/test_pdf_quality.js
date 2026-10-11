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

function getCleanStageName(v) {
  const stage = String(v.current_stage || '').trim();
  const lower = stage.toLowerCase();
  const isPorted = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');

  if (isPorted || lower.includes('webland') || lower.includes('ported')) return 'Webland 2.0 Ported';
  if (lower.includes('final ror') || v.final_ror_status === 'Completed') return 'Final RoR Completed';
  if (lower.includes('draft ror') || lower.includes('13 notification') || v.draft_ror_status === 'Completed') return 'Draft RoR & 13 Notice';
  if (lower.includes('jc login') || v.jc_status === 'Completed' || v.jc_status === 'In Progress') return 'DLR @ JC Login';
  if (lower.includes('rdo login') || lower.includes('rdo') || v.rdo_status === 'Completed' || v.rdo_status === 'In Progress') return 'DLR @ RDO Login';
  if (lower.includes('tah login') || lower.includes('tahsildar') || v.tahsildar_status === 'Completed' || v.tahsildar_status === 'In Progress') return 'DLR @ Tahsildar Login';
  if (lower.includes('vro login') || lower.includes('vro') || v.vro_status === 'Completed' || v.vro_status === 'In Progress') return 'DLR @ VRO Login';
  if (lower.includes('vs login') || lower.includes('surveyor') || v.vs_status === 'Completed' || v.vs_status === 'In Progress') return 'DLR @ VS Login';
  if (lower.includes('vectorization') || lower.includes('correlation') || v.vectorization_status === 'Completed') return 'Cadastral Vectorization';
  if (lower.includes('gt ongoing') || lower.includes('gt in progress') || v.gt_status === 'In Progress') return 'Ground Truthing Ongoing';
  if (lower.includes('gt not started') || lower.includes('not started')) return 'GT Not Started';
  if (v.gt_status === 'Completed') return 'GT Completed';
  return stage || 'Under Survey';
}

function generatePureMandalPdf(store, options = {}) {
  const selectedMandal = (options.mandal && options.mandal !== 'All' && options.mandal !== '__ALL__') ? options.mandal.trim() : null;
  const selectedDivision = (options.division && options.division !== 'All') ? options.division.trim() : null;
  const selectedStage = (options.stage && options.stage !== 'All') ? options.stage.trim() : null;

  // Filter villages
  let villages = store.villages || [];
  if (selectedMandal) {
    villages = villages.filter(v => (v.mandal || '').toLowerCase() === selectedMandal.toLowerCase());
  }
  if (selectedDivision) {
    villages = villages.filter(v => (v.division || '').toLowerCase() === selectedDivision.toLowerCase());
  }
  if (selectedStage) {
    villages = villages.filter(v => (v.current_stage || '').toLowerCase().includes(selectedStage.toLowerCase()));
  }

  // Group by mandal
  const mandalGroups = {};
  villages.forEach(v => {
    const m = (v.mandal || 'Chittoor').trim();
    if (!mandalGroups[m]) {
      mandalGroups[m] = {
        name: m,
        division: v.division || 'Chittoor',
        villages: []
      };
    }
    mandalGroups[m].villages.push(v);
  });

  const mandalNames = Object.keys(mandalGroups).sort((a, b) => a.localeCompare(b));

  // Page metrics (A4 Landscape = 841.89 pt x 595.28 pt)
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const marginLeft = 32;
  const marginRight = 32;
  const contentWidth = 777.89; // pageWidth - 64
  const marginTop = 26;
  const marginBottom = 26;

  // Exact column definitions (Sum = 778 pt)
  const cols = [
    { label: '#', width: 24, align: 'center' },
    { label: 'Village Code', width: 66, align: 'center' },
    { label: 'Village Name', width: 162, align: 'left' },
    { label: 'Phase', width: 52, align: 'center' },
    { label: 'Extent (Ac)', width: 75, align: 'right' },
    { label: 'Resurvey Stage', width: 164, align: 'left' },
    { label: 'Status', width: 74, align: 'center' },
    { label: 'PPB / LPMs', width: 84, align: 'center' },
    { label: 'Target Date', width: 77, align: 'center' }
  ];

  // Aggregates
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

  function drawText(text, x, y, font = '/F1', size = 8, r = 0, g = 0, b = 0) {
    const esc = escapePdfText(text);
    currentPageOps.push(`BT ${font} ${size.toFixed(1)} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc}) Tj ET`);
  }

  function drawHeaderBanner(pageNum, isFirstPage) {
    const nowStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (isFirstPage) {
      // Full executive top banner
      const bannerH = 36;
      drawRect(marginLeft, curY - bannerH, contentWidth, bannerH, 0.059, 0.090, 0.161); // #0f1729
      drawText('GOVERNMENT OF ANDHRA PRADESH', marginLeft + 12, curY - 14, '/F2', 11, 1, 1, 1);
      drawText('District Survey and Land Records Office · Chittoor District', marginLeft + 12, curY - 26, '/F1', 7.5, 0.70, 0.75, 0.85);

      const titleText = selectedMandal
        ? `MANDAL RESURVEY STATUS REPORT: ${selectedMandal.toUpperCase()} MANDAL`
        : 'DISTRICT MANDAL-WISE VILLAGE RESURVEY STATUS REPORT';
      drawText(titleText, marginLeft + 245, curY - 14, '/F2', 9.5, 0.984, 0.796, 0.196); // Gold #facc15
      drawText(`A.P. Resurvey Project 2.0 · Generated: ${nowStr} · Universe: ${totalVillages} Villages across ${mandalNames.length} Mandals`, marginLeft + 245, curY - 26, '/F1', 7.5, 0.8, 0.85, 0.92);

      curY -= (bannerH + 8);

      // 6 KPI Summary Cards on Page 1
      const kpiCount = 6;
      const kpiGap = 8;
      const kpiW = (contentWidth - ((kpiCount - 1) * kpiGap)) / kpiCount;
      const kpiH = 34;
      const kpiY = curY - kpiH;

      const kpiData = [
        { label: 'TOTAL MANDALS', val: String(mandalNames.length), sub: 'Chittoor District', r: 0.15, g: 0.39, b: 0.92 },
        { label: 'TOTAL VILLAGES', val: String(totalVillages), sub: 'Revenue Villages', r: 0.15, g: 0.39, b: 0.92 },
        { label: 'TOTAL EXTENT', val: `${formatExtent(totalExtent)} Ac`, sub: 'Target Acreage', r: 0.02, g: 0.58, b: 0.41 },
        { label: 'COMPLETED / PORTED', val: String(totalCompleted), sub: `${Math.round(totalCompleted / (totalVillages || 1) * 100)}% Milestone`, r: 0.02, g: 0.58, b: 0.41 },
        { label: 'DLR ENTRIES STAGE', val: String(totalDlr), sub: 'Khatas Verification', r: 0.85, g: 0.47, b: 0.02 },
        { label: 'DELAYED / LAGGING', val: String(totalDelayed), sub: 'Priority Attention', r: 0.88, g: 0.11, b: 0.28 }
      ];

      kpiData.forEach((k, idx) => {
        const kX = marginLeft + idx * (kpiW + kpiGap);
        drawRect(kX, kpiY, kpiW, kpiH, 0.975, 0.982, 0.992, 0.85, 0.88, 0.92);
        drawRect(kX, kpiY + kpiH - 2.5, kpiW, 2.5, k.r, k.g, k.b); // Color stripe
        drawText(k.label, kX + 6, kpiY + kpiH - 10, '/F2', 6.5, 0.40, 0.45, 0.55);
        drawText(k.val, kX + 6, kpiY + kpiH - 22, '/F2', 9.5, 0.06, 0.09, 0.16);
        drawText(k.sub, kX + 6, kpiY + 4, '/F1', 6.5, 0.50, 0.55, 0.65);
      });

      curY = kpiY - 12;
    } else {
      // Subsequent pages: compact elegant header banner
      const bannerH = 22;
      drawRect(marginLeft, curY - bannerH, contentWidth, bannerH, 0.059, 0.090, 0.161);
      drawText('GOVERNMENT OF ANDHRA PRADESH · District Survey and Land Records Office · Chittoor', marginLeft + 10, curY - 14, '/F2', 8.5, 1, 1, 1);
      const subTitle = selectedMandal ? `${selectedMandal.toUpperCase()} MANDAL REPORT` : 'DISTRICT MANDAL-WISE VILLAGE STATUS REPORT';
      drawText(`${subTitle} (Contd.)`, marginLeft + contentWidth - 280, curY - 14, '/F2', 8, 0.984, 0.796, 0.196);
      curY -= (bannerH + 6);
    }
  }

  function drawTableHeader() {
    const thH = 16;
    const thY = curY - thH;
    drawRect(marginLeft, thY, contentWidth, thH, 0.118, 0.161, 0.235); // #1e293b

    let curX = marginLeft;
    cols.forEach(c => {
      let tX = curX + 4;
      if (c.align === 'center') {
        tX = curX + (c.width / 2) - (c.label.length * 2.1);
      } else if (c.align === 'right') {
        tX = curX + c.width - (c.label.length * 4.4) - 4;
      }
      drawText(c.label, tX, thY + 4.5, '/F2', 7.5, 1, 1, 1);
      curX += c.width;
    });

    curY = thY;
  }

  // Initialize Page 1
  startNewPage();
  drawHeaderBanner(1, true);
  drawTableHeader();

  let globalVIdx = 0;

  if (villages.length === 0) {
    // Empty state fallback page
    const emptyH = 80;
    const emptyY = curY - emptyH - 20;
    drawRect(marginLeft, emptyY, contentWidth, emptyH, 0.98, 0.98, 0.99, 0.85, 0.88, 0.92);
    drawText('NO VILLAGE RECORDS FOUND MATCHING CURRENT FILTER CRITERIA', marginLeft + 180, emptyY + 46, '/F2', 10, 0.2, 0.25, 0.35);
    drawText('Please reset filter selections to view district villages.', marginLeft + 230, emptyY + 28, '/F1', 8.5, 0.5, 0.55, 0.65);
    curY = emptyY;
  } else {
    mandalNames.forEach((mName, mIdx) => {
      const mg = mandalGroups[mName];
      const mVillages = mg.villages;
      const mExtent = mVillages.reduce((sum, v) => sum + (parseFloat(v.extent) || 0), 0);
      const mComp = mVillages.filter(v => (v.status || '').toLowerCase() === 'completed' || v.ported_to_webland).length;
      const mDel = mVillages.filter(v => (v.status || '').toLowerCase() === 'delayed' || Number(v.days_delayed) > 0).length;

      // Check if room for Mandal Banner + at least 2 village rows (18 + 30 = 48 pt)
      if (curY < marginBottom + 60) {
        startNewPage();
        drawHeaderBanner(pages.length + 1, false);
        drawTableHeader();
      }

      // Mandal Section Banner Bar
      const mBannerH = 17;
      const mBannerY = curY - mBannerH;
      drawRect(marginLeft, mBannerY, contentWidth, mBannerH, 0.933, 0.949, 0.976, 0.78, 0.84, 0.92);
      drawRect(marginLeft, mBannerY, 3.5, mBannerH, 0.086, 0.231, 0.541); // Deep navy accent left stripe

      drawText(`MANDAL ${mIdx + 1}: ${mName.toUpperCase()} (${mg.division} Division)`, marginLeft + 9, mBannerY + 5, '/F2', 8.5, 0.06, 0.16, 0.38);
      const mStatsStr = `Villages: ${mVillages.length}  |  Completed: ${mComp}  |  Delayed: ${mDel}  |  Extent: ${formatExtent(mExtent)} Ac`;
      drawText(mStatsStr, marginLeft + contentWidth - 280, mBannerY + 5, '/F2', 7.5, 0.15, 0.25, 0.35);

      curY = mBannerY;

      // Village Rows
      mVillages.forEach((v, vIdx) => {
        const rowH = 15;
        if (curY - rowH < marginBottom + 16) {
          startNewPage();
          drawHeaderBanner(pages.length + 1, false);
          drawTableHeader();
        }

        const rowY = curY - rowH;
        const isAlt = (vIdx % 2 === 1);
        if (isAlt) {
          drawRect(marginLeft, rowY, contentWidth, rowH, 0.976, 0.984, 0.992); // Clean zebra
        }
        drawLine(marginLeft, rowY, marginLeft + contentWidth, rowY, 0.902, 0.922, 0.941);

        globalVIdx++;
        let curX = marginLeft;

        // 1. #
        drawText(String(globalVIdx), curX + 6, rowY + 4, '/F1', 7.5, 0.40, 0.45, 0.52);
        curX += cols[0].width;

        // 2. Village Code
        drawText(String(v.village_code || '—'), curX + 10, rowY + 4, '/F3', 7.5, 0.10, 0.20, 0.40);
        curX += cols[1].width;

        // 3. Village Name
        const vName = (v.village_name || '—').slice(0, 27);
        drawText(vName, curX + 4, rowY + 4, '/F2', 8, 0.06, 0.09, 0.16);
        curX += cols[2].width;

        // 4. Phase
        const phase = String(v.phase || '—').replace('Phase ', 'P-');
        drawText(phase, curX + 10, rowY + 4, '/F1', 7.5, 0.30, 0.35, 0.42);
        curX += cols[3].width;

        // 5. Extent (Ac)
        const extStr = formatExtent(v.extent);
        drawText(extStr, curX + cols[4].width - (extStr.length * 4.6) - 4, rowY + 4, '/F3', 7.5, 0.05, 0.12, 0.28);
        curX += cols[4].width;

        // 6. Resurvey Stage
        const stage = getCleanStageName(v).slice(0, 27);
        drawText(stage, curX + 4, rowY + 4, '/F1', 7.5, 0.12, 0.25, 0.55);
        curX += cols[5].width;

        // 7. Status Pill
        const stat = String(v.status || (v.ported_to_webland ? 'Completed' : 'Pending'));
        let sR = 0.3, sG = 0.35, sB = 0.4;
        let pR = 0.94, pG = 0.95, pB = 0.96;
        if (/comp|ported/i.test(stat)) {
          sR = 0.082; sG = 0.502; sB = 0.239; // Green
          pR = 0.863; pG = 0.988; pB = 0.906;
        } else if (/delay/i.test(stat)) {
          sR = 0.725; sG = 0.110; sB = 0.110; // Red
          pR = 0.996; pG = 0.886; pB = 0.886;
        } else if (/prog/i.test(stat)) {
          sR = 0.706; sG = 0.325; sB = 0.035; // Amber
          pR = 0.996; pG = 0.953; pB = 0.780;
        }
        // Pill background
        const pillW = cols[6].width - 12;
        drawRect(curX + 6, rowY + 2.5, pillW, 10, pR, pG, pB);
        const pillText = stat.slice(0, 11);
        const ptX = curX + 6 + (pillW / 2) - (pillText.length * 2.1);
        drawText(pillText, ptX, rowY + 3.8, '/F2', 6.8, sR, sG, sB);
        curX += cols[6].width;

        // 8. PPB / LPMs
        const ppbTarget = parseInt(v.ppb_target) || parseInt(v.target_ppbs) || 0;
        const isPort = Boolean(v.ported_to_webland || v.webland_2_status === 'Ported');
        const lpms = parseInt(v.lpms) || parseInt(v.lpms_arrived) || 0;
        let ppbStr = '—';
        if (isPort) ppbStr = 'Ported';
        else if (ppbTarget > 0) ppbStr = `${ppbTarget} PPBs`;
        else if (lpms > 0) ppbStr = `${lpms} LPMs`;
        drawText(ppbStr, curX + (cols[7].width / 2) - (ppbStr.length * 2.2), rowY + 4, '/F3', 7.2, 0.25, 0.30, 0.38);
        curX += cols[7].width;

        // 9. Target Date
        const tDate = String(v.target_date || '—').slice(0, 10);
        drawText(tDate, curX + 12, rowY + 4, '/F1', 7.2, 0.40, 0.45, 0.52);

        curY = rowY;
      });

      // Mandal Subtotal Row
      const subH = 15;
      if (curY - subH < marginBottom + 16) {
        startNewPage();
        drawHeaderBanner(pages.length + 1, false);
        drawTableHeader();
      }
      const subY = curY - subH;
      drawRect(marginLeft, subY, contentWidth, subH, 0.945, 0.957, 0.973);
      drawLine(marginLeft, subY, marginLeft + contentWidth, subY, 0.75, 0.80, 0.88);
      drawText(`Subtotal ${mName} Mandal (${mVillages.length} Villages):`, marginLeft + 70, subY + 4, '/F2', 7.5, 0.08, 0.12, 0.22);

      const subExt = `${formatExtent(mExtent)} Ac`;
      drawText(subExt, marginLeft + 242 + 52 + cols[4].width - (subExt.length * 4.6) - 4, subY + 4, '/F4', 7.5, 0.05, 0.12, 0.28);
      drawText(`Completed: ${mComp}  |  In Progress: ${mVillages.length - mComp - mDel}  |  Delayed: ${mDel}`, marginLeft + 420, subY + 4, '/F2', 7.5, 0.18, 0.25, 0.35);

      curY = subY - 6;
    });

    // Grand Total Bar at the very end of report
    const gtH = 18;
    if (curY - gtH < marginBottom + 16) {
      startNewPage();
      drawHeaderBanner(pages.length + 1, false);
      drawTableHeader();
    }
    const gtY = curY - gtH;
    drawRect(marginLeft, gtY, contentWidth, gtH, 0.059, 0.090, 0.161); // Deep navy grand total
    drawText(`CHITTOOR DISTRICT GRAND TOTAL (${totalVillages} Villages across ${mandalNames.length} Mandals):`, marginLeft + 12, gtY + 5.5, '/F2', 8.5, 1, 1, 1);
    const grandExt = `${formatExtent(totalExtent)} Ac`;
    drawText(`Extent: ${grandExt}`, marginLeft + contentWidth - 360, gtY + 5.5, '/F4', 8, 0.984, 0.796, 0.196);
    drawText(`Completed: ${totalCompleted}  |  Delayed: ${totalDelayed}`, marginLeft + contentWidth - 190, gtY + 5.5, '/F2', 8, 1, 1, 1);
    curY = gtY - 8;
  }

  // Push last page ops
  if (currentPageOps.length > 0) {
    pages.push(currentPageOps.join('\n'));
  }

  // BUILD PDF 1.4 OBJECT STRUCTURE
  const totalPages = pages.length;
  const pdfObjects = [];
  function addObj(str) {
    pdfObjects.push(str);
    return pdfObjects.length;
  }

  // Object 1: Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  // Object 2: Pages tree placeholder
  addObj('');

  // Objects 3, 4, 5, 6: Standard Type 1 Fonts
  const fontF1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontF2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const fontF3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const fontF4 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>');

  const pageObjIds = [];

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    let streamContent = pages[pIdx];

    // Page Footer (Rendered on every single page with dynamic total count)
    const footY = 14;
    const footLine = `${marginLeft.toFixed(2)} ${(footY + 12).toFixed(2)} m ${(marginLeft + contentWidth).toFixed(2)} ${(footY + 12).toFixed(2)} l 0.780 0.820 0.880 RG 0.50 w S`;
    const footText1 = `BT /F1 7.0 Tf 0.380 0.440 0.520 rg ${marginLeft.toFixed(2)} ${(footY + 2).toFixed(2)} Td (${escapePdfText('District Survey and Land Records Office · Collectorate Complex, Chittoor District, Government of Andhra Pradesh')}) Tj ET`;
    const footText2 = `BT /F2 7.5 Tf 0.150 0.220 0.350 rg ${(marginLeft + contentWidth - 62).toFixed(2)} ${(footY + 2).toFixed(2)} Td (${escapePdfText(`Page ${pIdx + 1} of ${totalPages}`)}) Tj ET`;
    streamContent += `\n${footLine}\n${footText1}\n${footText2}`;

    const streamObj = addObj(`<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream`);
    const pageObj = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents ${streamObj} 0 R /Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R /F3 ${fontF3} 0 R /F4 ${fontF4} 0 R >> >> >>`);
    pageObjIds.push(pageObj);
  }

  // Update Object 2: Pages tree
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

// TEST 1: Full District
const fullPdf = generatePureMandalPdf(store, {});
console.log('Test 1 (Full District) size:', fullPdf.length, 'bytes');
fs.writeFileSync(path.join(__dirname, 'test_full_district.pdf'), fullPdf);

// TEST 2: Filtered Mandal (Bangarupalem)
const mandalPdf = generatePureMandalPdf(store, { mandal: 'Bangarupalem' });
console.log('Test 2 (Bangarupalem) size:', mandalPdf.length, 'bytes');
fs.writeFileSync(path.join(__dirname, 'test_mandal_bangarupalem.pdf'), mandalPdf);

// TEST 3: Filtered Division (Chittoor)
const divPdf = generatePureMandalPdf(store, { division: 'Chittoor' });
console.log('Test 3 (Chittoor Division) size:', divPdf.length, 'bytes');
fs.writeFileSync(path.join(__dirname, 'test_div_chittoor.pdf'), divPdf);

console.log('All tests completed successfully!');
