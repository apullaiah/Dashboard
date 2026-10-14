const https = require('https');

const sheets = [
  { name: 'Phase 4 Official', id: '17M7sj_XzRKkiM9C-GpHernk_EEQnctOD8MOB0fnVr0A' },
  { name: 'Phase 5 Official', id: '1bjvwI7f-heRZxahA7JmL8ZweJWGAu5e1sQPztSergBU' },
  { name: 'Phase 6 Official', id: '18kcvSTkGP1Vlc5LVGeotVG-3jLr2jx4sLajrouH8dEQ' },
  { name: 'Phase 7 Official', id: '16RIo0Z4KPCFMDBG67qKB7nF8ztlUT6DQ5nMIbXYh9KA' }
];

function fetchGviz(id, gid) {
  return new Promise((resolve, reject) => {
    let url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    if (gid) url += `&gid=${gid}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
          if (match) resolve(JSON.parse(match[1]));
          else resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function parseGvizDate(v) {
  if (!v) return '';
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
  return String(v);
}

(async () => {
  for (const s of sheets) {
    const gviz = await fetchGviz(s.id);
    if (!gviz || !gviz.table) {
      console.log(`Failed to fetch ${s.name}`);
      continue;
    }
    const cols = gviz.table.cols.map(c => (c.label || '').replace(/\r|\n/g, ' ').trim());
    console.log(`\n======================================================`);
    console.log(`=== ${s.name} (${cols.length} cols, ${gviz.table.rows.length} rows) ===`);
    console.log('Columns:', cols);
    
    gviz.table.rows.forEach((r, idx) => {
      const vals = r.c.map(c => {
        if (!c) return '';
        if (c.f) return c.f;
        return parseGvizDate(c.v);
      });
      console.log(`[Row ${idx + 1}] ` + vals.join(' | '));
    });
  }
})();
