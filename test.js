const assert = require('assert');
const { getStreams: getCineJoy } = require('./providers/cinejoy.js');
const { getStreams: getCineWave } = require('./providers/cinewave.js');
assert.equal(typeof getCineJoy, 'function');
assert.equal(typeof getCineWave, 'function');
Promise.all([
  getCineJoy('', 'movie'),
  getCineJoy('550', 'music'),
  getCineJoy('1399', 'tv'),
  getCineWave('', 'movie'),
  getCineWave('550', 'music'),
  getCineWave('1399', 'tv')
]).then(results => {
  results.forEach(r => assert(Array.isArray(r)));
  console.log('Provider export/input smoke tests passed.');
}).catch(e => { console.error(e); process.exit(1); });
