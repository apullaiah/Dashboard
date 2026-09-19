const fs = require('fs');

const cssSnippet = `
.vtp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #1e293b;
  text-transform: uppercase;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e2e8f0;
}

.vtp-icon {
  font-size: 14px;
}

.vtp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 10px;
}

@media (max-width: 640px) {
  .vtp-grid {
    grid-template-columns: 1fr;
  }
}

.vtp-col {
  border-radius: 8px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
}

.vtp-col.gt {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.vtp-col.dlr {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.vtp-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.vtp-val {
  display: block;
  font-size: 18px;
  font-weight: 900;
  margin-bottom: 4px;
}

.vtp-col small {
  display: block;
  font-size: 11px;
  color: #64748b;
}

.vtp-tiers {
  border-top: 1px dashed #cbd5e1;
  padding-top: 8px;
  margin-top: 8px;
}

.vtp-tier-title {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.vtp-tier-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vtp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-family: var(--font-mono, monospace);
}

.vtp-chip.highlight {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}
`;

['styles.css', 'public/styles.css'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('.vtp-grid')) {
    content += '\n' + cssSnippet;
    fs.writeFileSync(f, content, 'utf8');
    console.log('Appended .vtp-grid styles to', f);
  } else {
    console.log(f, 'already has .vtp-grid');
  }
});
