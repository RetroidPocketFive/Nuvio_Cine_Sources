var PROVIDER="cinesrc", BASE="https://cinesrc.st", UA="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36", DEBUG="https://example.com/";
function diag(s,n){s=String(s||"").replace(/\s+/g," ").trim();if(s.length>180)s=s.slice(0,177)+"...";return{name:PROVIDER+" ["+n+"] "+s,title:"Debug",url:DEBUG,quality:"Debug"};}
function add(a,v){if(v&&a.indexOf(v)<0)a.push(v)}
function norm(s){var x=String(s||"");for(var i=0;i<2;i++)x=x.replace(/\\u002f/gi,"/").replace(/\\u0026/gi,"&").replace(/\\u003a/gi,":").replace(/\\u003d/gi,"=").replace(/\\\//g,"/").replace(/&amp;/g,"&").replace(/&quot;/g,'"');try{x=decodeURIComponent(x)}catch(_){}return x}
function abs(v,b){if(!v)return null;try{return new URL(norm(v).trim(),b).toString()}catch(_){return null}}
function attr(tag,n){var r=new RegExp(n+"\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']","i").exec(tag);return r?r[1]:null}
function fetchText(url,ref){return fetch(url,{headers:{"User-Agent":UA,"Accept":"text/html,application/xhtml+xml,application/javascript,text/javascript,application/json,*/*;q=0.8","Referer":ref||BASE+"/"},redirect:"follow"}).then(function(r){if(!r||!r.ok)throw new Error("HTTP "+(r&&r.status!==undefined?r.status:"unknown"));return r.text().then(function(t){return{status:r.status,text:t,url:r.url||url}})})}
function qual(s){s=String(s||"").toLowerCase();if(/2160|4k|uhd/.test(s))return"4K";if(/1080/.test(s))return"1080p";if(/720/.test(s))return"720p";if(/480/.test(s))return"480p";return"Unknown"}
function media(out,u,label,page){u=abs(u,page);if(!u||!/^(https?):\/\//i.test(u)||!/\.(m3u8|mp4|mkv|webm)([?#]|$)/i.test(u))return;if(out.some(function(x){return x.url===u}))return;out.push({name:"CineSrc Direct",title:label||qual(u),url:u,quality:qual((label||"")+" "+u),headers:{Referer:page,"User-Agent":UA}})}
function scan(text,page){
 var s=norm(text),m,ifr=0,emb=0,ext=[],players=[],endpoints=[],med=[],data=[];
 var tr=/<(iframe|embed)\b[^>]*>/gi;while((m=tr.exec(s))){var tag=m[0],src=attr(tag,"src")||attr(tag,"data-src")||attr(tag,"data-url")||attr(tag,"data-embed")||attr(tag,"data-video");if(m[1].toLowerCase()==="iframe")ifr++;else emb++;if(src){var u=abs(src,page);if(u)add(players,u)}}
 var vr=/<(?:video|source)\b[^>]*>/gi;while((m=vr.exec(s))){var vt=m[0],vv=attr(vt,"src")||attr(vt,"data-src")||attr(vt,"data-video")||attr(vt,"data-url");if(vv)media(med,vv,attr(vt,"label")||attr(vt,"title"),page)}
 var sr=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,sc=0;while((m=sr.exec(s))){sc++;var at=m[1]||"",body=norm(m[2]||""),su=attr("<script "+at+">","src");if(su){var eu=abs(su,page);if(eu)add(ext,eu)}
  var mm,rm=/https?:\/\/[^\s"'<>\\]+?\.(m3u8|mp4|mkv|webm)(?:\?[^\s"'<>\\]*)?/gi;while((mm=rm.exec(body)))media(med,mm[0],null,page);
  var ur=/["'`](https?:\/\/[^"'`\s<>]+)["'`]/gi;while((mm=ur.exec(body))){var qv=mm[1];if(/\.(m3u8|mp4|mkv|webm)([?#]|$)/i.test(qv))media(med,qv,null,page);else if(/(?:player|embed|iframe|video|stream|source|server|watch)/i.test(qv))add(players,qv)}
  var cr=/\b(?:fetch|axios\.(?:get|post)|XMLHttpRequest|open)\s*\(\s*["'`]([^"'`]+)["'`]/gi;while((mm=cr.exec(body))){var ep=abs(mm[1],page);if(ep)add(endpoints,ep)}
  var kr=/(?:player|embed|iframe|video|stream|source|server|servers|url|file|src)\s*(?:Url|URL)?\s*[:=]\s*["'`]([^"'`]+)["'`]/gi;while((mm=kr.exec(body))){var pv=abs(mm[1],page);if(pv)add(players,pv)}
  var srid=/(?:sourceId|serverId)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi;while((mm=srid.exec(body)))add(data,"SOURCE_ID="+mm[1]);
 }
 var rawMedia=/https?:\/\/[^\s"'<>\\]+?\.(m3u8|mp4|mkv|webm)(?:\?[^\s"'<>\\]*)?/gi;while((m=rawMedia.exec(s)))media(med,m[0],null,page);
 var nd=/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(s);if(nd){add(data,"NEXT_DATA=YES");var nt=norm(nd[1]),nm=/https?:\/\/[^\s"'<>]+/gi;while((m=nm.exec(nt)))if(/(?:player|embed|stream|source|server|watch)/i.test(m[0]))add(players,m[0])}
 var jsr=/<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;while((m=jsr.exec(s))){add(data,"JSON_SCRIPT");var jt=norm(m[1]),jm=/https?:\/\/[^\s"'<>]+/gi;while((mm=jm.exec(jt)))if(/(?:player|embed|stream|source|server|watch)/i.test(mm[0]))add(players,mm[0])}
 return{iframes:ifr,embeds:emb,scripts:sc,externalScripts:ext,players:players,endpoints:endpoints,media:med,data:data}
}
function targets(id,type,season,episode){var x=encodeURIComponent(String(id));if(type==="movie")return[BASE+"/embed/movie/"+x];var s=Number(season),e=Number(episode);return[BASE+"/embed/tv/"+x+"?s="+s+"&e="+e]}
function getStreams(tmdbId,mediaType,season,episode){
 if(!tmdbId)return Promise.resolve([diag("missing TMDB id",1)]);
 var report=[],out=[],pages=targets(tmdbId,mediaType,season,episode);
 report.push("V8_PROVIDER=CineSrc");report.push("TMDB="+tmdbId+" TYPE="+mediaType+(mediaType==="tv"?" S="+season+" E="+episode:""));report.push("TARGET="+pages[0]);
 out.push({name:"CineSrc Embed",title:"CineSrc player",url:pages[0],quality:"Embed",headers:{Referer:BASE+"/","User-Agent":UA}});
 var chain=Promise.resolve();pages.forEach(function(p,i){chain=chain.then(function(){return fetchText(p,BASE+"/").then(function(r){var x=scan(r.text,r.url||p);report.push("PAGE"+(i+1)+" HTTP="+r.status+" LEN="+r.text.length+" IFRAME="+x.iframes+" EMBED="+x.embeds+" SCRIPTS="+x.scripts+" MEDIA="+x.media.length+" PLAYERS="+x.players.length+" EXT="+x.externalScripts.length+" ENDPOINTS="+x.endpoints.length);x.media.forEach(function(v){out.push(v)});x.players.slice(0,15).forEach(function(v,j){report.push("PLAYER"+j+"="+v)});x.endpoints.slice(0,15).forEach(function(v,j){report.push("ENDPOINT"+j+"="+v)});x.data.slice(0,10).forEach(function(v){report.push(v)});return x}).catch(function(e){report.push("PAGE"+(i+1)+" ERROR="+e.message)})})});
 return chain.then(function(){report.push("RESULT=MEDIA_"+out.filter(function(v){return v.quality!=="Embed"}).length);return out.concat(report.map(function(x,i){return diag(x,i+1)}))})
}
exports.getStreams=getStreams;
