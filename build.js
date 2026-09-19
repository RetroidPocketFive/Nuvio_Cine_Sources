const fs = require("fs");
const path = require("path");
const ids = ["cinejoy", "cinewave"];
for (const id of ids) {
  const src = path.join(__dirname, "src", id, "index.js");
  const out = path.join(__dirname, "providers", id + ".js");
  if (!fs.existsSync(src)) throw new Error("Missing " + src);
  const code = fs.readFileSync(src, "utf8");
  if (!code.includes("module.exports") || !code.includes("getStreams"))
    throw new Error(id + ": getStreams export missing");
  fs.writeFileSync(out, code + "\n", "utf8");
  console.log("Built providers/" + id + ".js");
}
console.log("Build complete.");
