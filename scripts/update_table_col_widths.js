const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');
const isCrlf = app.includes('\r\n');
let content = app.replace(/\r\n/g, '\n');

// 1. Update home-village-table thead
content = content.replace(
  `<thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>CODE</th>
              <th>VILLAGE NAME</th>
              <th>MANDAL</th>
              <th>DIVISION</th>
              <th>TARGET MONTH</th>
              <th>PHASE</th>
              <th class="mono">EXTENT (AC)</th>
              <th class="mono">TARGET PPBS</th>
              <th>CURRENT RESURVEY STAGE</th>
              <th>OVERALL STATUS</th>
              <th style="text-align:center;">ACTION</th>
            </tr>
          </thead>`,
  `<thead>
            <tr>
              <th style="width:3%;">#</th>
              <th style="width:7%;">CODE</th>
              <th style="width:18%;">VILLAGE NAME</th>
              <th style="width:11%;">MANDAL</th>
              <th style="width:9%;">DIVISION</th>
              <th style="width:9%;">TARGET MONTH</th>
              <th style="width:7%;">PHASE</th>
              <th style="width:8%;" class="mono">EXTENT (AC)</th>
              <th style="width:8%;" class="mono">TARGET PPBS</th>
              <th style="width:12%;">CURRENT RESURVEY STAGE</th>
              <th style="width:5%;">OVERALL STATUS</th>
              <th style="width:3%;text-align:center;">ACTION</th>
            </tr>
          </thead>`
);

// 2. Update PPB Distribution table thead
content = content.replace(
  `<thead>
            <tr>
              <th>CODE</th>
              <th>VILLAGE NAME</th>
              <th>MANDAL</th>
              <th>DIVISION</th>
              <th>PHASE</th>
              <th>RESURVEY STAGE</th>
              <th>PPB TARGET</th>
              <th>PRINTED</th>
              <th>DISTRIBUTED</th>
              <th>BALANCE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>`,
  `<thead>
            <tr>
              <th style="width:7%;">CODE</th>
              <th style="width:16%;">VILLAGE NAME</th>
              <th style="width:10%;">MANDAL</th>
              <th style="width:9%;">DIVISION</th>
              <th style="width:6%;">PHASE</th>
              <th style="width:13%;">RESURVEY STAGE</th>
              <th style="width:8%;">PPB TARGET</th>
              <th style="width:7%;">PRINTED</th>
              <th style="width:8%;">DISTRIBUTED</th>
              <th style="width:7%;">BALANCE</th>
              <th style="width:5%;">STATUS</th>
              <th style="width:4%;text-align:center;">ACTION</th>
            </tr>
          </thead>`
);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('app.js', content, 'utf8');
fs.writeFileSync('public/app.js', content, 'utf8');
console.log('Updated column widths in app.js and public/app.js');
