// scripts/scratch_inspect_emergent.js
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://village-monitor-live.preview.emergentagent.com/';
const screenshotPath = path.join(__dirname, '../screenshot_emergent.png');

console.log('Fetching', targetUrl, 'with headless Chrome...');

const args = [
  '--headless=new',
  '--disable-gpu',
  '--virtual-time-budget=15000',
  '--window-size=1440,900',
  `--screenshot=${screenshotPath}`,
  '--dump-dom',
  targetUrl
];

cp.execFile(chromePath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
  if (err) {
    console.error('Error:', err.message);
  }
  console.log('DOM length:', stdout ? stdout.length : 0);
  if (stdout) {
    fs.writeFileSync(path.join(__dirname, '../emergent_dom.html'), stdout);
    console.log('Saved DOM to emergent_dom.html');
  }
  if (fs.existsSync(screenshotPath)) {
    console.log('Screenshot saved to screenshot_emergent.png');
  }
});
