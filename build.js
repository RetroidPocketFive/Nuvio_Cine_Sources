const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const names = process.argv.slice(2);
const providers = names.length ? names : fs.readdirSync("src", {withFileTypes:true})
  .filter(x => x.isDirectory() && !x.name.startsWith("_")).map(x => x.name);

(async () => {
  for (const name of providers) {
    const entry = path.join("src", name, "index.js");
    const outfile = path.join("providers", `${name}.js`);
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: "neutral",
      format: "cjs",
      target: "es2018",
      outfile,
      minify: false
    });
    console.log(`Built ${outfile}`);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
