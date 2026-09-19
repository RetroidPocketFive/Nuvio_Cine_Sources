const assert = require("assert");
for (const id of ["cinejoy", "cinewave"]) {
  const p = require("./providers/" + id + ".js");
  assert.strictEqual(typeof p.getStreams, "function");
}
Promise.all([
  require("./providers/cinejoy.js").getStreams("550", "movie"),
  require("./providers/cinewave.js").getStreams("550", "movie")
]).then(r => {
  assert.deepStrictEqual(r, [[], []]);
  console.log("Provider smoke tests passed.");
}).catch(e => { console.error(e); process.exit(1); });
