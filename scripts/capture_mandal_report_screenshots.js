const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactsDir = 'C:\\Users\\SSLR\\.gemini\\antigravity-ide\\brain\\8f87bd6c-7ecb-49ae-b804-57d00825aa28';

function takeScreenshot(url, outputPath, width = 1440, height = 2200) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--screenshot=${outputPath}`,
      '--virtual-time-budget=5000',
      url
    ];

    console.log(`Capturing: ${url} -> ${outputPath}`);
    execFile(chromePath, args, (err, stdout, stderr) => {
      if (err) return reject(err);
      console.log(`Saved: ${outputPath}`);
      resolve(outputPath);
    });
  });
}

async function run() {
  try {
    // 1. Standalone Colourful Mandal Report (Bangarupalem)
    const out1 = path.join(artifactsDir, 'screenshot_mandal_report_bangarupalem.png');
    await takeScreenshot('http://localhost:4173/report/mandal-villages?mandal=Bangarupalem', out1, 1440, 2200);

    // 2. Standalone Colourful Mandal Report (Chittoor District top overview)
    const out2 = path.join(artifactsDir, 'screenshot_mandal_report_district_overview.png');
    await takeScreenshot('http://localhost:4173/report/mandal-villages', out2, 1440, 2400);

    console.log('All screenshots captured successfully.');
  } catch (e) {
    console.error('Error taking screenshots:', e);
  }
}

run();
