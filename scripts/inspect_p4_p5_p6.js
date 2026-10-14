const https = require('https');

function fetchGviz(id) {
  return new Promise((resolve, reject) => {
    let url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (match) resolve(JSON.parse(match[1]));
        else resolve(null);
      });
    }).on('error', reject);
  });
}

function parseVal(c) {
  if (!c) return '';
  if (c.f) return c.f;
  const v = c.v;
  if (typeof v === 'string') {
    const m = v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = String(parseInt(m[2], 10) + 1).padStart(2, '0');
      const day = String(parseInt(m[3], 10)).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return v.trim();
  }
  return String(v ?? '');
}

(async () => {
  const p4 = await fetchGviz('17M7sj_XzRKkiM9C-GpHernk_EEQnctOD8MOB0fnVr0A');
  console.log('=== PHASE 4 OFFICIAL ===');
  console.log(p4.table.cols.map(c => c.label.replace(/\s+/g, ' ')));
  p4.table.rows.slice(0, 5).forEach((r, i) => console.log(i, r.c.map(parseVal).join(' | ')));

  const p5 = await fetchGviz('1bjvwI7f-heRZxahA7JmL8ZweJWGAu5e1sQPztSergBU');
  console.log('\n=== PHASE 5 OFFICIAL ===');
  console.log(p5.table.cols.map(c => c.label.replace(/\s+/g, ' ')));
  p5.table.rows.slice(0, 5).forEach((i, r) => console.log(r, i.c.map(parseVal).join(' | ')));

  const p6 = await fetchGviz('18kcvSTkGP1Vlc5LVGeotVG-3jLr2jx4sLajrouH8dEQ');
  console.log('\n=== PHASE 6 OFFICIAL ===');
  console.log(p6.table.cols.map(c => c.label.replace(/\s+/g, ' ')));
  p6.table.rows.slice(0, 5).forEach((i, r) => console.log(r, i.c.map(parseVal).join(' | ')));
})();
