const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const appJsPath = path.join(rootDir, 'public', 'app.js');
const rootAppJsPath = path.join(rootDir, 'app.js');
const stylesPath = path.join(rootDir, 'public', 'styles.css');
const rootStylesPath = path.join(rootDir, 'styles.css');
const contactsJsPath = path.join(rootDir, 'src', 'officerContacts.js');
const contactsCssPath = path.join(rootDir, 'src', 'officerContacts.css');

const contactsJs = fs.readFileSync(contactsJsPath, 'utf8');
const contactsCss = fs.readFileSync(contactsCssPath, 'utf8');

// 1. Update public/app.js
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Update line 362 or navigateTo
if (!appJsContent.includes("view === 'contacts'")) {
  appJsContent = appJsContent.replace(
    "view === 'mandal_report' || !state.villages.length",
    "view === 'mandal_report' || view === 'contacts' || !state.villages.length"
  );
}

// Update render router
if (!appJsContent.includes("state.view === 'contacts'")) {
  appJsContent = appJsContent.replace(
    "else if (state.view === 'villages') renderVillageMonitoring();",
    "else if (state.view === 'villages') renderVillageMonitoring();\n  else if (state.view === 'contacts') renderOfficerContacts();"
  );
}

// Insert renderOfficerContacts function before async function renderWhatsApp()
if (!appJsContent.includes('async function renderOfficerContacts(')) {
  const target = 'async function renderWhatsApp()';
  if (appJsContent.includes(target)) {
    appJsContent = appJsContent.replace(target, contactsJs + '\n\n' + target);
  } else {
    throw new Error('Target async function renderWhatsApp() not found in public/app.js');
  }
}

fs.writeFileSync(appJsPath, appJsContent, 'utf8');
fs.writeFileSync(rootAppJsPath, appJsContent, 'utf8');
console.log('public/app.js and app.js updated successfully and synchronized.');

// 2. Update styles
let stylesContent = fs.readFileSync(stylesPath, 'utf8');
if (!stylesContent.includes('.contacts-login-grid')) {
  stylesContent += '\n\n' + contactsCss;
  fs.writeFileSync(stylesPath, stylesContent, 'utf8');
  fs.writeFileSync(rootStylesPath, stylesContent, 'utf8');
  console.log('public/styles.css and styles.css updated successfully and synchronized.');
} else {
  console.log('styles.css already contains contacts styles.');
}
