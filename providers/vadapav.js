/*
 * Vadapav Nuvio provider.
 * Public API documented at https://vadapav.mov/developers:
 *   GET /api/s/{query}
 *   GET /api/m/{id}
 *   GET /f/{id}
 *
 * Set TMDB_API_KEY to your own TMDB API v3 key before using.
 * API response schemas and in-app playback still require device testing.
 */
var BASE = "https://vadapav.mov";
var TMDB_API_KEY = ""; // Add your TMDB API v3 key.

function getJson(url) {
  return fetch(url, {headers: {"Accept": "application/json"}}).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  });
}
function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/\.(mkv|mp4|avi|mov|webm|m4v|m3u8)$/i, "")
    .replace(/[._]+/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function getTitle(id, mediaType) {
  if (!TMDB_API_KEY) return Promise.reject(new Error("Set TMDB_API_KEY in providers/vadapav.js"));
  var type = mediaType === "tv" ? "tv" : "movie";
  return getJson("https://api.themoviedb.org/3/" + type + "/" + encodeURIComponent(String(id)) +
    "?api_key=" + encodeURIComponent(TMDB_API_KEY)).then(function (d) {
      return {title:d.title || d.name || "", original:d.original_title || d.original_name || "",
        year:String((d.release_date || d.first_air_date || "").slice(0,4) || "")};
    });
}
function gather(v, out, depth) {
  if (depth > 7 || v == null) return;
  if (Array.isArray(v)) { v.forEach(function(x){gather(x,out,depth+1);}); return; }
  if (typeof v !== "object") return;
  out.push(v);
  Object.keys(v).forEach(function(k){if(v[k] && typeof v[k] === "object") gather(v[k],out,depth+1);});
}
function pick(o, keys) {
  for (var i=0;i<keys.length;i++) {
    var v=o && o[keys[i]];
    if ((typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v);
  }
  return "";
}
function score(name, meta, mediaType, season, episode) {
  var n=norm(name), t=norm(meta.title), o=norm(meta.original);
  if (!n || (!t && !o)) return -1;
  var s=0;
  if (t && n.indexOf(t)>=0) s+=10;
  if (o && o!==t && n.indexOf(o)>=0) s+=8;
  if (meta.year && n.indexOf(meta.year)>=0) s+=2;
  if (mediaType==="tv") {
    var ss=String(season).padStart(2,"0"), ee=String(episode).padStart(2,"0");
    if (new RegExp("\\bs"+ss+"e"+ee+"\\b","i").test(name) ||
        new RegExp("\\b"+season+"x"+episode+"\\b","i").test(name)) s+=8;
    else if (/\bs\d{1,2}e\d{1,2}\b/i.test(name)) s-=6;
  }
  return s;
}
function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType!=="movie" && mediaType!=="tv") return Promise.resolve([]);
  if (mediaType==="tv" && (season==null || episode==null)) return Promise.resolve([]);
  return getTitle(tmdbId,mediaType).then(function(meta){
    if (!meta.title) return [];
    return getJson(BASE+"/api/s/"+encodeURIComponent(meta.title)).then(function(data){
      var objects=[]; gather(data,objects,0);
      var seen={}, found=[];
      objects.forEach(function(o){
        var id=pick(o,["id","uuid","fileId","file_id","fileUuid","file_uuid"]);
        var name=pick(o,["name","title","filename","fileName","file_name","path"]);
        if(!id || !name) return;
        var sc=score(name,meta,mediaType,season,episode);
        var key=id+"|"+name;
        if(sc<8 || seen[key]) return;
        seen[key]=true; found.push({id:id,name:name,score:sc});
      });
      found.sort(function(a,b){return b.score-a.score;});
      return found.slice(0,8).map(function(x){
        var q=(x.name.match(/\b(2160p|4k|1080p|720p|480p)\b/i)||["Unknown"])[0];
        return {name:"Vadapav",title:x.name,url:BASE+"/f/"+encodeURIComponent(x.id),quality:q,
          headers:{"Referer":BASE+"/"}};
      });
    });
  }).catch(function(e){console.warn("Vadapav provider:",e && e.message || String(e));return [];});
}
if (typeof module!=="undefined" && module.exports) module.exports={getStreams:getStreams};
