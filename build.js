const fs = require("fs");
const path = require("path");
const providers = ["cinejoy", "cinewave"];
for (const name of providers) {
  const src = path.join(__dirname, "src", name, "index.js");
  const out = path.join(__dirname, "providers", `${name}.js`);
  fs.copyFileSync(src, out);
  console.log(`Built ${path.relative(__dirname, out)}`);
}
