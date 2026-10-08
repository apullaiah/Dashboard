const http = require('http');
const { execFile } = require('child_process');
const path = require('path');

const postData = JSON.stringify({ pin: 'APCTR2026' });

const req = http.request({
  hostname: 'localhost',
  port: 4173,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const data = JSON.parse(body);
    const token = data.token;
    console.log('Obtained token:', token.slice(0, 16) + '...');

    const stagesToTest = [
      { key: 'vectorization', file: 'screenshot_stage_vectorization.png' },
      { key: 'tah_login', file: 'screenshot_stage_tahsildar.png' },
      { key: 'jc_login', file: 'screenshot_stage_jc.png' },
      { key: 'final_ror', file: 'screenshot_stage_final_ror.png' }
    ];

    let i = 0;
    function captureNext() {
      if (i >= stagesToTest.length) {
        console.log('All stage screenshots captured successfully!');
        process.exit(0);
      }
      const st = stagesToTest[i++];
      const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      const outputPath = path.resolve(__dirname, `../${st.file}`);
      // In the frontend, state.selectedPpbStage can be set via URL param or click
      const url = `http://localhost:4173/?token=${token}&view=overview&stage=${st.key}`;

      const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--window-size=1440,3200',
        `--screenshot=${outputPath}`,
        '--virtual-time-budget=3500',
        url
      ];

      console.log(`Capturing stage [${st.key}] screenshot...`);
      execFile(chromePath, args, (err) => {
        if (err) console.error(`Error capturing ${st.key}:`, err.message);
        else console.log(`Captured ${st.file}`);
        captureNext();
      });
    }

    captureNext();
  });
});

req.write(postData);
req.end();
