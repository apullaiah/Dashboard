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

    const tests = [
      {
        name: 'PPB View with Radio Bar',
        url: `http://localhost:4173/?token=${token}&view=ppb`,
        file: 'screenshot_ppb_default.png',
        size: '1440,5200'
      },
      {
        name: 'PPB View filtered to DLR Stage Radio with 56 Villages',
        url: `http://localhost:4173/?token=${token}&view=ppb&cycle=Dec-26&ppb_stage=dlr_stage`,
        file: 'screenshot_ppb_dlr_dec26.png',
        size: '1440,5200'
      },
      {
        name: 'PPB View filtered to Draft RoR Radio',
        url: `http://localhost:4173/?token=${token}&view=ppb&ppb_stage=draft_ror`,
        file: 'screenshot_ppb_draft_ror.png',
        size: '1440,5200'
      },
      {
        name: 'PPB View with Village Modal Stage Radio Buttons Prominent',
        url: `http://localhost:4173/?token=${token}&view=ppb&village=0421f4a6-560c-4789-a07c-86490c2dc79d`,
        file: 'screenshot_ppb_modal_capture.png',
        size: '1440,2400'
      }
    ];

    let i = 0;
    function captureNext() {
      if (i >= tests.length) {
        console.log('All screenshots captured successfully!');
        process.exit(0);
      }
      const t = tests[i++];
      const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      const outputPath = path.resolve(__dirname, `../${t.file}`);

      const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--window-size=${t.size}`,
        `--screenshot=${outputPath}`,
        '--virtual-time-budget=4000',
        t.url
      ];

      console.log(`[${i}/${tests.length}] Capturing ${t.name}...`);
      execFile(chromePath, args, (err) => {
        if (err) console.error(`Error capturing ${t.file}:`, err.message);
        else console.log(`✓ Saved ${t.file}`);
        captureNext();
      });
    }

    captureNext();
  });
});

req.write(postData);
req.end();
