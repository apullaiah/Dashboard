// scripts/scratch_network_inspect.js
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://village-monitor-live.preview.emergentagent.com/';

console.log('Launching Chrome with remote debugging...');
const chrome = cp.spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9222',
  '--window-size=1440,2000',
  targetUrl
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    console.log('Open tabs/pages:', tabs.map(t => ({ title: t.title, url: t.url })));
    
    // Find preview tab
    const previewTab = tabs.find(t => t.url.includes('emergent') || t.url.includes('village-monitor'));
    if (previewTab) {
      console.log('Found preview tab:', previewTab.url);
    }
  } catch (err) {
    console.error('Error querying CDP:', err.message);
  } finally {
    chrome.kill();
  }
}, 5000);
