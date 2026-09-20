const fs = require('fs');

['app.js', 'public/app.js'].forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  let normalized = content.replace(/\r\n/g, '\n');

  // 1. Remove accidental tfoot from September PPB table
  const accidentalBlock = `          </tbody>
          <tfoot class="ivw-table-footer-grand-total">
            <tr class="grand-total-row">
              <td colspan="5" class="gt-label-cell">
                <strong>GRAND TOTAL (\${list.length} \${state.activeGtTodayOnly ? 'ACTIVE VILLAGES' : 'VILLAGES'})</strong>
              </td>
              \${isGtActive ? \`
                <td class="font-mono col-highlight-today num-bold text-emerald gt-val">
                  <strong>+\${formatExtent(grandTodayGt)} Ac</strong>
                </td>
                <td class="font-mono col-highlight-cum num-bold text-blue gt-val">
                  <strong>\${formatExtent(grandCompGt)} Ac</strong>
                </td>
                <td class="font-mono col-highlight-bal num-bold text-amber gt-val">
                  <strong>\${formatExtent(grandBalGt)} Ac</strong>
                </td>
                <td class="font-mono font-bold gt-val">
                  <strong>\${formatExtent(grandTotExtent)} Ac</strong>
                </td>
                <td class="gt-status-cell">
                  <span class="status-pill status-completed">Active Field Progress</span>
                </td>
              \` : \`
                <td class="font-mono col-highlight-today num-bold text-blue gt-val">
                  <strong>+\${grandTodayDlr.toLocaleString('en-IN')} Today</strong>
                </td>
                <td class="font-mono col-highlight-cum num-bold text-blue gt-val">
                  <strong>\${grandCumDlr.toLocaleString('en-IN')} Entries</strong>
                </td>
                <td class="font-mono col-highlight-bal num-bold text-amber gt-val">
                  <strong>\${grandBalDlr.toLocaleString('en-IN')} Pending</strong>
                </td>
                <td class="font-mono font-bold gt-val">
                  <strong>\${grandTotDlr.toLocaleString('en-IN')} Khatas</strong>
                </td>
                <td class="gt-status-cell">
                  <span class="status-pill status-completed">Multi-Tier Clearances</span>
                </td>
              \`}
              <td style="text-align:center;">
                <span class="badge-pill-green">SUM TOTAL</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>`;

  const cleanSeptemberClose = `          </tbody>
        </table>
      </div>`;

  if (normalized.includes(accidentalBlock)) {
    normalized = normalized.replace(accidentalBlock, cleanSeptemberClose);
    console.log(`[${filePath}] Removed accidental tfoot from September PPB table.`);
  }

  // 2. Insert Grand Total tfoot into renderInlineVillageWiseProgress
  const targetIvwClose = `            }).join('')}
          </tbody>
        </table>
      </div>`;

  const replacementIvwClose = `            }).join('')}
          </tbody>
          <tfoot class="ivw-table-footer-grand-total">
            <tr class="grand-total-row">
              <td colspan="5" class="gt-label-cell ivw-grand-total-label">
                <strong>GRAND TOTAL (\${list.length} \${state.activeGtTodayOnly ? 'ACTIVE VILLAGES' : 'VILLAGES'})</strong>
              </td>
              \${isGtActive ? \`
                <td class="font-mono col-highlight-today num-bold text-emerald gt-val">
                  <strong>+\${formatExtent(grandTodayGt)} Ac</strong>
                </td>
                <td class="font-mono col-highlight-cum num-bold text-blue gt-val">
                  <strong>\${formatExtent(grandCompGt)} Ac</strong>
                </td>
                <td class="font-mono col-highlight-bal num-bold text-amber gt-val">
                  <strong>\${formatExtent(grandBalGt)} Ac</strong>
                </td>
                <td class="font-mono font-bold gt-val">
                  <strong>\${formatExtent(grandTotExtent)} Ac</strong>
                </td>
                <td class="gt-status-cell">
                  <span class="status-pill status-completed">Active Field Progress</span>
                </td>
              \` : \`
                <td class="font-mono col-highlight-today num-bold text-blue gt-val">
                  <strong>+\${grandTodayDlr.toLocaleString('en-IN')} Today</strong>
                </td>
                <td class="font-mono col-highlight-cum num-bold text-blue gt-val">
                  <strong>\${grandCumDlr.toLocaleString('en-IN')} Entries</strong>
                </td>
                <td class="font-mono col-highlight-bal num-bold text-amber gt-val">
                  <strong>\${grandBalDlr.toLocaleString('en-IN')} Pending</strong>
                </td>
                <td class="font-mono font-bold gt-val">
                  <strong>\${grandTotDlr.toLocaleString('en-IN')} Khatas</strong>
                </td>
                <td class="gt-status-cell">
                  <span class="status-pill status-completed">Multi-Tier Clearances</span>
                </td>
              \`}
              <td style="text-align:center;">
                <span class="badge-pill-green">SUM TOTAL</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>`;

  if (normalized.includes(targetIvwClose)) {
    normalized = normalized.replace(targetIvwClose, replacementIvwClose);
    console.log(`[${filePath}] Successfully added Grand Total tfoot to IVW table.`);
  } else {
    console.log(`[${filePath}] targetIvwClose pattern not found.`);
  }

  const result = isCrlf ? normalized.replace(/\n/g, '\r\n') : normalized;
  fs.writeFileSync(filePath, result, 'utf8');
});
