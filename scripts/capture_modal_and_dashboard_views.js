const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactsDir = 'C:\\Users\\SSLR\\.gemini\\antigravity-ide\\brain\\8f87bd6c-7ecb-49ae-b804-57d00825aa28';

function takeScreenshot(url, outputPath, width = 1440, height = 1200) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--screenshot=${outputPath}`,
      '--virtual-time-budget=6000',
      url
    ];

    execFile(chromePath, args, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

async function run() {
  try {
    // 1. Dashboard Reports View
    const out1 = path.join(artifactsDir, 'screenshot_dashboard_reports_view.png');
    await takeScreenshot('http://localhost:4173/?view=reports', out1, 1440, 1100);
    console.log('Saved:', out1);

    // 2. Dashboard Mandal Plan View
    const out2 = path.join(artifactsDir, 'screenshot_dashboard_mandal_plan.png');
    await takeScreenshot('http://localhost:4173/?view=mandal_plan', out2, 1440, 1100);
    // 3. Dashboard Modal Open View
    const out3 = path.join(artifactsDir, 'screenshot_modal_pdf_dialog.png');
    await takeScreenshot('http://localhost:4173/?view=reports&modal=mandal-pdf&mandal=Bangarupalem', out3, 1440, 1100);
    console.log('Saved:', out3);

    // 4. WhatsApp Webhook & Bot Integration View
    const out4 = path.join(artifactsDir, 'screenshot_whatsapp_webhook_view.png');
    await takeScreenshot('http://localhost:4173/?view=whatsapp', out4, 1440, 1250);
    console.log('Saved:', out4);
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
