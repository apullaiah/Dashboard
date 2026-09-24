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

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    // 1. Capture Villages tab
    const urlVillages = `http://localhost:4173/?token=${token}#/villages`;
    const outVillages = path.resolve(__dirname, '../screenshot_villages_contacts.png');
    const args1 = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--window-size=1440,3200',
      `--screenshot=${outVillages}`,
      '--virtual-time-budget=6000',
      urlVillages
    ];

    console.log('Capturing villages tab screenshot...');
    execFile(chromePath, args1, (err) => {
      if (err) console.error('Village screenshot failed:', err);
      else console.log('Village screenshot saved:', outVillages);

      // 2. Capture Performance (Mandal Analysis) tab
      const urlPerf = `http://localhost:4173/?token=${token}#/performance`;
      const outPerf = path.resolve(__dirname, '../screenshot_mandal_analysis_contacts.png');
      const args2 = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--window-size=1440,3600',
        `--screenshot=${outPerf}`,
        '--virtual-time-budget=6000',
        urlPerf
      ];

      console.log('Capturing mandal analysis tab screenshot...');
      execFile(chromePath, args2, (err2) => {
        if (err2) console.error('Mandal analysis screenshot failed:', err2);
        else console.log('Mandal analysis screenshot saved:', outPerf);
        process.exit(0);
      });
    });
  });
});

req.write(postData);
req.end();
