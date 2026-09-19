const fs = require('fs');

async function testOne() {
  const id = '1hsYJXp32Zfw7N01e_oZLgplHX3yj51xy3k7B-I-2b5k';
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/htmlview`);
  const text = await res.text();
  fs.writeFileSync('scratch/htmlview_sample.html', text);
  console.log('Saved scratch/htmlview_sample.html, length:', text.length);

  // Also check if gviz works without gid
  const gvizRes = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`);
  const gvizText = await gvizRes.text();
  console.log('gviz default response length:', gvizText.length);
}

testOne();
