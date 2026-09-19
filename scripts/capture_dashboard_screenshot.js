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
    const outputPath = path.resolve(__dirname, '../screenshot_unified_dashboard.png');
    const url = `http://localhost:4173/?token=${token}`;

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--window-size=1440,7200',
      `--screenshot=${outputPath}`,
      url
    ];

    console.log('Capturing full page screenshot with headless Chrome...');
    args.push('--virtual-time-budget=4000');

    execFile(chromePath, args, (err, stdout, stderr) => {
      if (err) {
        console.error('Chrome execution failed:', err);
        process.exit(1);
      }
      console.log('Screenshot captured successfully to:', outputPath);
      process.exit(0);
    });
  });
});

req.write(postData);
req.end();
