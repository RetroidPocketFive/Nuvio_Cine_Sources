var p=require("../providers/vadapav.js");
if(!p || typeof p.getStreams!=="function") throw new Error("Missing getStreams export");
p.getStreams("550","movie",null,null).then(function(s){if(!Array.isArray(s)) throw new Error("Expected array"); console.log("Smoke test passed; streams:",s.length,"(0 expected until TMDB_API_KEY is configured)");});
