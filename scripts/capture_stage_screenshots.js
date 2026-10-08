const http = require('http');
const { execFile } = require('child_process');
const path = require('path');

const stagesToTest = [
  { key: 'jc_login', file: 'screenshot_stage_jc_login.png' },
  { key: 'final_ror', file: 'screenshot_stage_final_ror.png' },
  { key: 'blockchain_stage', file: 'screenshot_stage_blockchain.png' }
];

async function captureNext(idx) {
  if (idx >= stagesToTest.length) {
    console.log('All stage screenshots captured successfully.');
    process.exit(0);
    return;
  }

  const { key, file } = stagesToTest[idx];
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const outputPath = path.resolve(__dirname, '..', file);
  const url = `http://localhost:4173/?stage=${key}`;

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1440,3200',
    `--screenshot=${outputPath}`,
    url,
    '--virtual-time-budget=4000'
  ];

  console.log(`Capturing screenshot for stage ${key} -> ${file}...`);
  execFile(chromePath, args, (err) => {
    if (err) {
      console.error(`Failed to capture ${key}:`, err);
    } else {
      console.log(`Saved: ${outputPath}`);
    }
    captureNext(idx + 1);
  });
}

captureNext(0);
