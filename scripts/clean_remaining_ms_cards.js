const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');
const isCrlf = app.includes('\r\n');
let content = app.replace(/\r\n/g, '\n');

// 1. Remove ms-last-col-card td in dlr-village-section
content = content.replace(
  /\n\s*<td>\s*<div class="ms-last-col-card">[\s\S]*?<\/div>\s*<\/td>\s*<\/tr>/g,
  '\n                </tr>'
);

// 2. Remove ms-last-col-card td in renderMandalAnalysis
content = content.replace(
  /\n\s*<td>\s*<div class="ms-last-col-card">[\s\S]*?<\/div>\s*<\/td>\s*<\/tr>/g,
  '\n              </tr>'
);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('app.js', content, 'utf8');
fs.writeFileSync('public/app.js', content, 'utf8');
console.log('Cleaned remaining ms-last-col-card occurrences.');
