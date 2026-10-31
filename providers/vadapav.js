/*
 * Vadapav Nuvio provider v1.0.4
 * Uses Nuvio's built-in TMDB API key bridge for metadata.
 */
var BASE = "https://vadapav.mov";
function headers(accept, referer) {
  var h = {"Accept":accept,"Accept-Language":"en-US,en;q=0.9"};
  if (referer) h.Referer=referer;
  return h;
}
function getJson(url, referer) {
  return fetch(url,{headers:headers("application/json, text/plain, */*",referer)}).then(function(r){
    if(!r.ok) throw new Error("HTTP "+r.status+" "+url);
    return r.text().then(function(t){
      if(!t) throw new Error("Empty response from "+url);
      try{return JSON.parse(t);}catch(e){throw new Error("Expected JSON from "+url+": "+t.slice(0,100));}
    });
  });
}
function getMeta(id, type) {
  var apiKey = "";
  try { apiKey = typeof __get_tmdb_api_key==="function" ? __get_tmdb_api_key() : ""; } catch(e) {}
  if(!apiKey) throw new Error("Nuvio did not provide its TMDB API key");
  var kind = type==="tv" ? "tv" : "movie";
  var url="https://api.themoviedb.org/3/"+kind+"/"+encodeURIComponent(String(id))+"?api_key="+encodeURIComponent(apiKey);
  return getJson(url,"https://www.themoviedb.org/").then(function(d){
    var title=kind==="tv" ? (d.name||d.original_name) : (d.title||d.original_title);
    var original=kind==="tv" ? (d.original_name||title) : (d.original_title||title);
    var date=kind==="tv" ? d.first_air_date : d.release_date;
    if(!title) throw new Error("TMDB returned no title for "+id);
    return {title:String(title),original:String(original||title),year:date?String(date).slice(0,4):""};
  });
}
function norm(s){
  return String(s||"").toLowerCase().replace(/\.(mkv|mp4|avi|mov|webm|m4v|m3u8)$/i,"")
    .replace(/[._]+/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
function gather(v,out,depth){
  if(depth>7||v==null)return;
  if(Array.isArray(v)){v.forEach(function(x){gather(x,out,depth+1);});return;}
  if(typeof v!=="object")return;
  out.push(v);
  Object.keys(v).forEach(function(k){if(v[k]&&typeof v[k]==="object")gather(v[k],out,depth+1);});
}
function field(o,keys){
  for(var i=0;i<keys.length;i++){var v=o&&o[keys[i]];if((typeof v==="string"||typeof v==="number")&&String(v).trim())return String(v);}
  return "";
}
function score(name,meta,type,season,episode){
  var n=norm(name),t=norm(meta.title),o=norm(meta.original),s=0;
  if(!n||!t)return -1;
  if(n.indexOf(t)>=0)s+=10;
  if(o!==t&&n.indexOf(o)>=0)s+=8;
  if(meta.year&&n.indexOf(meta.year)>=0)s+=2;
  if(type==="tv"){
    var ss=("0"+season).slice(-2),ee=("0"+episode).slice(-2);
    if(new RegExp("\\bs"+ss+"e"+ee+"\\b","i").test(name)||new RegExp("\\b"+season+"x"+episode+"\\b","i").test(name))s+=12;
    else if(/\bs\d{1,2}e\d{1,2}\b/i.test(name))s-=8;
  }
  return s;
}
function search(title){
  var encoded=encodeURIComponent(title);
  return getJson(BASE+"/api/s/"+encoded,BASE+"/").catch(function(e){
    console.warn("Vadapav primary search failed: "+e.message);
    return getJson(BASE+"/api/s/?q="+encoded,BASE+"/");
  });
}
function getStreams(tmdbId,mediaType,season,episode){
  console.log("Vadapav v1.0.4 start id="+tmdbId+" type="+mediaType);
  if(mediaType!=="movie"&&mediaType!=="tv")return Promise.resolve([]);
  if(mediaType==="tv"&&(season==null||episode==null))return Promise.resolve([]);
  return getMeta(tmdbId,mediaType).then(function(meta){
    console.log("Vadapav TMDB title: "+meta.title+" ("+meta.year+")");
    return search(meta.title).then(function(data){
      var objects=[];gather(data,objects,0);
      var matches=[],seen={};
      objects.forEach(function(o){
        var kind=field(o,["type"]).toLowerCase(),mime=field(o,["mimeType","mime_type"]).toLowerCase();
        if(kind==="folder"||mime==="drive/folder"||(kind&&kind!=="file"))return;
        var id=field(o,["id","uuid","fileId","file_id"]),name=field(o,["name","title","filename","fileName","file_name"]);
        if(!id||!name)return;
        var sc=score(name,meta,mediaType,season,episode),key=id+"|"+name;
        if(sc<8||seen[key])return;
        seen[key]=true;matches.push({id:id,name:name,score:sc});
      });
      matches.sort(function(a,b){return b.score-a.score;});
      console.log("Vadapav matched "+matches.length+" files");
      return matches.slice(0,10).map(function(x){
        var q=(x.name.match(/\b(2160p|4k|1080p|720p|480p)\b/i)||["Unknown"])[0];
        return {name:"Vadapav",title:x.name,url:BASE+"/f/"+encodeURIComponent(x.id),quality:q,headers:{"Referer":BASE+"/"}};
      });
    });
  }).catch(function(e){console.error("Vadapav v1.0.4 error: "+(e&&e.message||String(e)));return [];});
}
if(typeof module!=="undefined"&&module.exports)module.exports={getStreams:getStreams};
