const fs = require('fs');
const path = require('path');

const store = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/store.json'), 'utf8'));

const MANDAL_MS = {
  'Baireddipalle': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '9491006942' },
  'Bangarupalem': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '9491006930' },
  'Chittoor': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '9491006921' },
  'G.D.Nellore': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '9491006925' },
  'Gangadhara Nellore': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '9491006925' },
  'Gangavaram': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '9491006940' },
  'Gudipala': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '9491006922' },
  'Gudipalle': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '9491006945' },
  'Irala': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '9491006924' },
  'Karvetinagar': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '9491006937' },
  'Kuppam': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '9491006944' },
  'Nagari': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '9491006934' },
  'Nindra': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '9491006935' },
  'Palamaner': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '9491006939' },
  'Palasamudram': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '9491006938' },
  'Peddapanjani': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '9491006941' },
  'Penumuru': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '9491006931' },
  'Pulicherla': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '9491006932' },
  'Puthalapattu': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '9491006933' },
  'Ramakuppam': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '9491006947' },
  'Rompicherla': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '9491006929' },
  'S.R.Puram': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '9491006927' },
  'Srirangarajapuram': { name: 'B. Prasada Rao', role: 'Mandal Surveyor (MS)', phone: '9491006927' },
  'Santhipuram': { name: 'S. Ravi Chandra', role: 'Mandal Surveyor (MS)', phone: '9491006946' },
  'Thavanampalli': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '9491006926' },
  'Vedurukuppam': { name: 'V. Ravi Sekhar', role: 'Mandal Surveyor (MS)', phone: '9491006928' },
  'Venkatagirikota': { name: 'G. Venkata Ramana Reddy', role: 'Mandal Surveyor (MS)', phone: '9491006943' },
  'Vijayapuram': { name: 'R.V. Prasad Rao', role: 'Mandal Surveyor (MS)', phone: '9491006936' },
  'Yadamari': { name: 'M. Krishna Moorthy', role: 'Mandal Surveyor (MS)', phone: '9491006923' }
};

function formatExtent(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n === 0) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isComplete(value) {
  return /^(completed|complete|done|yes|y|ported|true|1)$/i.test(String(value || '').trim());
}

function isGtPoorVillage(v) {
  if (!v) return false;
  if (v.ported_to_webland || isComplete(v.gt_status) || v.status === 'Completed' || isComplete(v.webland_2_status)) return false;
  const today = parseFloat(v.today_gt_extent) || 0;
  const tot = parseFloat(v.extent) || ((parseFloat(v.patta_extent) || 0) + (parseFloat(v.govt_extent) || 0));
  const cum = parseFloat(v.cumulative_gt_extent) || 0;
  const pct = tot > 0 ? (cum / tot) * 100 : 0;
  const isDelayed = v.status === 'Delayed' || Number(v.days_delayed) > 0;
  if (today === 0) {
    if (isDelayed) return true;
    if (v.gt_status === 'In Progress' && pct < 45) return true;
    if (pct < 30) return true;
    if (v.gt_start_date || v.current_stage === 'GT') return true;
  }
  return false;
}

function getSurveyorContacts(v) {
  const res = [];
  if (v.gt_team_mobiles) {
    const nLines = String(v.gt_team_names || '').split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
    const mLines = String(v.gt_team_mobiles || '').split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
    for (let i = 0; i < Math.max(nLines.length, mLines.length); i++) {
      const ph = (mLines[i] || '').replace(/[^0-9]/g, '');
      if (ph.length >= 10) {
        const nm = (nLines[i] || 'Village Surveyor').replace(/^\d+[\.\)]\s*/, '').trim();
        const isVro = /vro/i.test(nm);
        res.push({
          name: nm,
          phone: ph.slice(-10),
          role: isVro ? 'VRO' : 'Village Surveyor (VS)',
          isVS: !isVro
        });
      }
    }
  }
  const vsOnly = res.filter(x => x.isVS);
  if (vsOnly.length > 0) return vsOnly;
  const ms = MANDAL_MS[v.mandal] || { name: 'Mandal Surveyor', role: 'Mandal Surveyor (MS)', phone: '9491006942' };
  return [{ name: ms.name, phone: ms.phone, role: ms.role, isVS: true, isMS: true }];
}

function formatPoorNotice(v, contact, hostUrl = 'https://chittoor-resurvey.vercel.app', senderTitle = 'AD, Chittoor') {
  const extent = formatExtent(v.extent);
  const cumGt = formatExtent(v.cumulative_gt_extent || 0);
  const balGt = formatExtent(v.balance_gt_extent !== undefined ? v.balance_gt_extent : Math.max(0, (parseFloat(v.extent) || 0) - (parseFloat(v.cumulative_gt_extent) || 0)));
  const todayGt = formatExtent(v.today_gt_extent || 0);
  const stage = v.current_stage || 'Ground Truthing (GT)';
  const daysDelayed = Number(v.days_delayed) || 0;
  
  let dlrInfo = '';
  if (v.dlr_active_stage) {
    dlrInfo = `\n• DLR Active Stage: *${v.dlr_active_stage}*\n• DLR Balance: *${v.dlr_entries_balance || 0} Khatas*`;
  }
  const delayInfo = daysDelayed > 0 ? `\n⚠️ *Schedule Lag:* ${daysDelayed} Days Behind Target` : '';

  return `🚨 *RESURVEY PROGRESS MONITORING NOTICE*
🏛️ *OFFICE OF THE ASSISTANT DIRECTOR*
*Survey & Land Records, Chittoor District*
━━━━━━━━━━━━━━━━━━━━━━━━━
To: *${contact.name}* (${contact.role})
Village: *${v.village_name}* (Code: \`${v.village_code}\`)
Mandal: *${v.mandal}* · Division: *${v.division || 'Chittoor'}*

⚠️ *FLAGGED: POOR RESURVEY PROGRESS / PERFORMANCE LAG*
Resurvey progress in *${v.village_name}* is lagging behind the district action plan milestones.

📊 *PROGRESS SNAPSHOT AS ON DATE:*
• Total Revenue Extent: *${extent} Acres*
• Current Workflow Stage: *${stage}*
• Ground Truthing Completed: *${cumGt} Acres*
• Ground Truthing Pending: *${balGt} Acres*
• Today's GT Progress: *${todayGt} Acres (0.00 Ac / Lagging)*${dlrInfo}${delayInfo}
• Target Completion Date: *${v.target_date || '2027-03-31'}*

⚠️ *DIRECTIVE FOR IMMEDIATE ACTION:*
You are hereby instructed to immediately accelerate ground truthing / DLR verification, mobilize rovers, and eliminate field bottlenecks. Daily progress must be uploaded without delay.

🌐 *Live Village Dashboard:*
${hostUrl}/?village=${v.village_code || v.id}

━━━━━━━━━━━━━━━━━━━━━━━━━
*${senderTitle}*
Assistant Director of Survey & Land Records
Chittoor District, Government of Andhra Pradesh`;
}

const poorVillages = store.villages.filter(v => isGtPoorVillage(v));
console.log('Total poor GT villages identified:', poorVillages.length);

const sample = poorVillages[0];
const sampleContacts = getSurveyorContacts(sample);
console.log('\n--- Sample Village ---');
console.log('Village:', sample.village_name, 'Mandal:', sample.mandal);
console.log('Contacts:', sampleContacts);
console.log('\n--- Formatted Notice ---');
console.log(formatPoorNotice(sample, sampleContacts[0]));
