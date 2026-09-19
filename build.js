const fs=require('fs');
for(const n of ['cinejoy','cinewave']){
  const src='src/'+n+'/index.js', out='providers/'+n+'.js';
  if(!fs.existsSync(src)) throw new Error('Missing '+src);
  fs.copyFileSync(src,out);
  console.log('built '+out);
}
