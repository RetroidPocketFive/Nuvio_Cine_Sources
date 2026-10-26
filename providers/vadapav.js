/*
 * Vadapav Nuvio provider.
 * Searches both hosts; both hosts' API routes still need live verification.
 * Resolves the TMDB ID by reading the public TMDB title page, so no API key
 * is embedded in this public repository.
 */
var BASES = ["https://vadapav.mov", "https://a.111477.xyz"];

function getJson(url) {
  return fetch(url, {headers: {"Accept": "application/json"}}).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  });
}
function getText(url) {
  return fetch(url, {headers: {"Accept": "text/html"}}).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  });
}
function decodeHtml(s) {
  return String(s || "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)); });
}
function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/\.(mkv|mp4|avi|mov|webm|m4v|m3u8)$/i, "")
    .replace(/[._]+/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function getTitle(id, mediaType) {
  var type = mediaType === "tv" ? "tv" : "movie";
  var url = "https://www.themoviedb.org/" + type + "/" + encodeURIComponent(String(id));
  return getText(url).then(function (html) {
    var title = "";
    var patterns = [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<title[^>]*>([^<]+)/i
    ];
    for (var i = 0; i < patterns.length && !title; i++) {
      var m = html.match(patterns[i]);
      if (m && m[1]) title = decodeHtml(m[1]).trim();
    }
    title = title.replace(/\s*[-|–—:]\s*The Movie Database\s*\(TMDB\).*$/i, "").trim();
    if (!title) throw new Error("Could not read title from TMDB page");
    var yearMatch = html.match(/(?:release_date|first_air_date|release-date|first-air-date)[^>]{0,100}?((?:19|20)\d{2})/i);
    if (!yearMatch) yearMatch = html.match(/\b((?:19|20)\d{2})\b/);
    return {title:title, original:title, year:yearMatch ? yearMatch[1] : ""};
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
function searchBase(base, meta, mediaType, season, episode) {
  return getJson(base+"/api/s/"+encodeURIComponent(meta.title)).then(function(data){
    var objects=[]; gather(data,objects,0);
    var found=[], seen={};
    objects.forEach(function(o){
      var id=pick(o,["id","uuid","fileId","file_id","fileUuid","file_uuid"]);
      var name=pick(o,["name","title","filename","fileName","file_name","path"]);
      if(!id || !name) return;
      var sc=score(name,meta,mediaType,season,episode);
      var key=id+"|"+name;
      if(sc<8 || seen[key]) return;
      seen[key]=true; found.push({id:id,name:name,score:sc,base:base});
    });
    return found;
  }).catch(function(e){
    console.warn("Vadapav host "+base+":",e && e.message || String(e));
    return [];
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType!=="movie" && mediaType!=="tv") return Promise.resolve([]);
  if (mediaType==="tv" && (season==null || episode==null)) return Promise.resolve([]);
  return getTitle(tmdbId,mediaType).then(function(meta){
    if (!meta.title) return [];
    return Promise.all(BASES.map(function(base){
      return searchBase(base,meta,mediaType,season,episode);
    })).then(function(groups){
      var all=[], seen={};
      groups.forEach(function(items){items.forEach(function(x){
        var key=x.base+"|"+x.id+"|"+x.name;
        if(!seen[key]) { seen[key]=true; all.push(x); }
      });});
      all.sort(function(a,b){return b.score-a.score;});
      return all.slice(0,8).map(function(x){
        var q=(x.name.match(/\b(2160p|4k|1080p|720p|480p)\b/i)||["Unknown"])[0];
        return {name:"Vadapav",title:x.name,url:x.base+"/f/"+encodeURIComponent(x.id),quality:q,
          headers:{"Referer":x.base+"/"}};
      });
    });
  }).catch(function(e){console.warn("Vadapav provider:",e && e.message || String(e));return [];});
}
if (typeof module!=="undefined" && module.exports) module.exports={getStreams:getStreams};
