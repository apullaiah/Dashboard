// scripts/scratch_full_emergent_inspect.js
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://village-monitor-live.preview.emergentagent.com/';
const fullScreenshotPath = path.join(__dirname, '../screenshot_emergent_full.png');

console.log('Capturing full page screenshot of', targetUrl);

// Using Chrome remote debugging or CDP or window size to see the rest of page
const args = [
  '--headless=new',
  '--disable-gpu',
  '--virtual-time-budget=10000',
  '--window-size=1440,2500',
  `--screenshot=${fullScreenshotPath}`,
  targetUrl
];

cp.execFile(chromePath, args, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
  if (err) console.error('Error:', err.message);
  if (fs.existsSync(fullScreenshotPath)) {
    console.log('Full screenshot saved to screenshot_emergent_full.png');
  }
});
