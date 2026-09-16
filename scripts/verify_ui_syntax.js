const fs = require('fs');
const path = require('path');

// Mock browser globals
global.document = {
  getElementById: (id) => ({
    id,
    textContent: '',
    className: '',
    append: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    innerHTML: ''
  }),
  addEventListener: () => {}
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Check public/app.js syntax by requiring/evaluating
const appJsCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

try {
  // Check syntax
  new Function(appJsCode);
  console.log('>>> SUCCESS: public/app.js syntax is 100% valid JavaScript! <<<');
} catch (e) {
  console.error('>>> ERROR: Syntax error in public/app.js:', e);
  process.exit(1);
}

// Check public/styles.css exists and is non-empty
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
if (css.includes('.phase-progress-dashboard-card') && css.includes('.phase-progress-grid')) {
  console.log('>>> SUCCESS: public/styles.css contains Phase Progress component styles! <<<');
} else {
  console.error('>>> ERROR: Missing Phase Progress styles in public/styles.css');
  process.exit(1);
}
