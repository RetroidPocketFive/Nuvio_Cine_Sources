const fs = require('fs');
const path = require('path');
for (const name of ['cinejoy','cinewave']) {
  const src = path.join('src', name, 'index.js');
  const dst = path.join('providers', name + '.js');
  fs.mkdirSync('providers', {recursive:true});
  fs.copyFileSync(src, dst);
  console.log('built ' + dst);
}
