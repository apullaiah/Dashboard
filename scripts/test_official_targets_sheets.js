const https = require('https');

const sheets = [
  { name: 'Phase 4', id: '17M7sj_XzRKkiM9C-GpHernk_EEQnctOD8MOB0fnVr0A' },
  { name: 'Phase 5', id: '1bjvwI7f-heRZxahA7JmL8ZweJWGAu5e1sQPztSergBU' },
  { name: 'Phase 6', id: '18kcvSTkGP1Vlc5LVGeotVG-3jLr2jx4sLajrouH8dEQ' },
  { name: 'Phase 7', id: '16RIo0Z4KPCFMDBG67qKB7nF8ztlUT6DQ5nMIbXYh9KA' }
];

function fetchGviz(id) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const match = data.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
          if (match) {
            resolve(JSON.parse(match[1]));
          } else {
            resolve({ raw: data.slice(0, 300), status: res.statusCode });
          }
        } catch (e) {
          resolve({ error: e.message, raw: data.slice(0, 300) });
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  for (const s of sheets) {
    try {
      const res = await fetchGviz(s.id);
      if (res.table) {
        console.log(`\n=== ${s.name} (${s.id}) ===`);
        console.log(`Cols: ${res.table.cols.length}, Rows: ${res.table.rows.length}`);
        console.log('Col labels:', res.table.cols.map(c => c.label).filter(Boolean));
        if (res.table.rows.length > 0) {
          console.log('Row 0:', res.table.rows[0].c.map(c => c ? c.v : ''));
          console.log('Row 1:', res.table.rows[1]?.c.map(c => c ? c.v : ''));
        }
      } else {
        console.log(`\n=== ${s.name} (${s.id}) === FAILED:`, res);
      }
    } catch (e) {
      console.log(`Error on ${s.name}:`, e.message);
    }
  }
})();
