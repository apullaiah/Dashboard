const fs = require('fs');

['app.js', 'public/app.js'].forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  let normalized = content.replace(/\r\n/g, '\n');

  const oldGtHeaders = `                <th class="num">TOTAL TARGET EXTENT</th>
                <th class="num">COMPLETED VILLAGES</th>
                <th class="num">BALANCE VILLAGES</th>
                <th class="num">GT CLEARANCE %</th>`;

  const newGtHeaders = `                <th class="num">TOTAL TARGET EXTENT (IN ACRES)</th>
                <th class="num">DAILY BENCHMARK CAPACITY (IN ACRES / DAY)</th>
                <th class="num">TODAY PACING VS BENCHMARK</th>
                <th class="num">GT CLEARANCE %</th>`;

  const oldGtCells = `                <td class="num font-mono total-extent-cell">
                  <strong>\${formatExtent(gt.totalTargetExtent)}</strong> <small>Ac</small>
                  <div class="sub-progress-tag">Total Target Extent</div>
                </td>
                <td class="num font-mono text-emerald">
                  <strong>\${gt.gtCompletedVillages}</strong> <small>/ \${gt.gtTargetVillages}</small>
                </td>
                <td class="num font-mono text-amber">
                  <strong>\${gt.gtBalanceVillages}</strong>
                </td>`;

  const newGtCells = `                <td class="num font-mono total-extent-cell">
                  <strong>\${formatExtent(gt.totalTargetExtent)}</strong> <small>Ac</small>
                  <div class="sub-progress-tag">Total Target Extent</div>
                </td>
                <td class="num font-mono">
                  <strong>\${formatExtent(gt.dailyCapacityAc || 1775)}</strong> <small>Ac/day</small>
                  <div class="sub-progress-tag text-muted">71 Rovers · 25 Ac/day</div>
                </td>
                <td class="num font-mono \${parseFloat(gt.gtPacePct) >= 100 ? 'text-emerald' : 'text-amber'}">
                  <strong>\${gt.gtPacePct || '0.0'}%</strong>
                  <div class="sub-progress-tag">\${parseFloat(gt.gtPacePct) >= 100 ? 'Target Reached' : 'Behind Pace'}</div>
                </td>`;

  if (normalized.includes(oldGtHeaders)) {
    normalized = normalized.replace(oldGtHeaders, newGtHeaders);
    console.log(`[${filePath}] Updated home executive abstract GT headers.`);
  }

  if (normalized.includes(oldGtCells)) {
    normalized = normalized.replace(oldGtCells, newGtCells);
    console.log(`[${filePath}] Updated home executive abstract GT cells.`);
  }

  const result = isCrlf ? normalized.replace(/\n/g, '\r\n') : normalized;
  fs.writeFileSync(filePath, result, 'utf8');
});
