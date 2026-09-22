const fs=require('fs');
for(const p of ['cinesrc','cinejoy','cinewave']){
 const s=`src/${p}/index.js`,d=`providers/${p}.js`;
 if(fs.existsSync(s)) fs.copyFileSync(s,d);
}
console.log('providers synced');
