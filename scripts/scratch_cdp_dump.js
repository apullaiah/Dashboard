// scripts/scratch_cdp_dump.js
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://village-monitor-live.preview.emergentagent.com/';

console.log('Launching Chrome with remote debugging...');
const chrome = cp.spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9223',
  '--window-size=1440,2500',
  '--disable-web-security',
  targetUrl
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const tabs = await listRes.json();
    const targetTab = tabs.find(t => t.url.includes('emergent') || t.url.includes('village-monitor'));
    if (!targetTab) {
      console.log('Tab not found');
      return;
    }

    console.log('Connecting to WebSocket:', targetTab.webSocketDebuggerUrl);
    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
    
    ws.onopen = () => {
      // Send Runtime.evaluate to get inner iframe HTML or document
      let msgId = 1;
      
      function send(method, params = {}) {
        const id = msgId++;
        ws.send(JSON.stringify({ id, method, params }));
        return id;
      }

      // First wake up servers if button exists!
      const wakeScript = `
        (function() {
          const iframe = document.querySelector('iframe');
          const doc = iframe ? (iframe.contentDocument || iframe.contentWindow.document) : document;
          const wakeBtn = doc.querySelector('button, .wake-btn, [class*="wake"]');
          return {
            hasIframe: Boolean(iframe),
            docTitle: doc ? doc.title : null,
            bodyText: doc && doc.body ? doc.body.innerText.slice(0, 500) : null
          };
        })()
      `;

      send('Runtime.evaluate', { expression: wakeScript, returnByValue: true });

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('CDP message:', JSON.stringify(data).slice(0, 300));
        
        // Dump all frame trees
        if (data.id === 1) {
          send('Page.getResourceTree');
        } else if (data.id === 2) {
          console.log('Resources found:', data.result?.frameTree?.resources?.map(r => r.url));
          // Evaluate full innerHTML of iframe
          const dumpScript = `
            (function() {
              const ifr = document.getElementById('contentFrame') || document.querySelector('iframe');
              if (ifr && ifr.contentDocument) {
                return ifr.contentDocument.documentElement.outerHTML;
              }
              return document.documentElement.outerHTML;
            })()
          `;
          send('Runtime.evaluate', { expression: dumpScript, returnByValue: true });
        } else if (data.id === 3) {
          const html = data.result?.result?.value;
          if (html) {
            console.log('Captured HTML length:', html.length);
            fs.writeFileSync(path.join(__dirname, '../reference_site_full.html'), html);
            console.log('Saved to reference_site_full.html');
          }
          ws.close();
          chrome.kill();
          process.exit(0);
        }
      };
    };
  } catch (err) {
    console.error('Error in CDP:', err);
    chrome.kill();
  }
}, 4000);
