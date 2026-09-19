// Promise-only implementation for Nuvio/Hermes compatibility.
var UA = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36';
var HEADERS = { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.8' };

function abs(value, base) {
  if (!value) return null;
  var v = String(value).replace(/&amp;/g,'&').replace(/\\u0026/g,'&').replace(/\\\//g,'/').trim();
  try { return new URL(v, base).toString(); } catch (_) { return null; }
}
function clean(s){ return String(s||'').replace(/\\s+/g,' ').trim(); }
function quality(s){ var x=String(s||'').toLowerCase(); if(/2160|4k|uhd/.test(x))return '4K'; if(/1440/.test(x))return '1440p'; if(/1080/.test(x))return '1080p'; if(/720/.test(x))return '720p'; if(/480/.test(x))return '480p'; return 'Unknown'; }
function fetchText(url, ref){
  var h={}; Object.keys(HEADERS).forEach(function(k){h[k]=HEADERS[k];}); if(ref) h.Referer=ref;
  return fetch(url,{headers:h,redirect:'follow'}).then(function(r){
    var status=r&&r.status!=null?r.status:0;
    if(!r.ok) return Promise.reject(new Error('HTTP '+status));
    return r.text().then(function(text){ return {status:status,text:text,url:url}; });
  });
}
function attr(tag,name){ var m=tag.match(new RegExp(name+"\\s*=\\s*[\"\']([^\"\']+)[\"\']","i")); return m?m[1]:null; }
function isMedia(u){ return /\.(?:m3u8|mp4|mkv|webm)(?:[?#]|$)/i.test(u||''); }
function addMedia(out,url,label,pageUrl){
  var u=abs(url,pageUrl); if(!u || !/^https?:\/\//i.test(u) || !isMedia(u)) return;
  if(out.some(function(x){return x.url===u;})) return;
  var q=quality((label||'')+' '+u);
  out.push({name:'cinewave Direct',title:label||q,url:u,quality:q,headers:{'Referer':pageUrl,'User-Agent':UA}});
}
function extractMedia(html,pageUrl,provider,out){
  var stats={video:0,source:0,mediaAttrs:0,jsMedia:0,jsonLd:0,absoluteMedia:0,iframes:0,embedAttrs:0,scripts:0};
  var m, tag, src;
  var tags=/<(video|source)\b[^>]*>/gi;
  while((m=tags.exec(html))){ tag=m[0]; if(m[1].toLowerCase()==='video')stats.video++;else stats.source++; src=attr(tag,'src')||attr(tag,'data-src')||attr(tag,'data-video')||attr(tag,'data-url')||attr(tag,'data-file'); if(src){stats.mediaAttrs++;addMedia(out,src,attr(tag,'data-quality')||attr(tag,'label')||attr(tag,'title'),pageUrl);} }
  var re=/(?:file|src|source|url|stream|playbackUrl|videoUrl|hls|dash)\s*[:=]\s*["\']([^"\']+\.(?:m3u8|mp4|mkv|webm)(?:\?[^"\']*)?)["\']/gi;
  while((m=re.exec(html))){stats.jsMedia++;addMedia(out,m[1],null,pageUrl);}
  var ld=/["\']contentUrl["\']\s*:\s*["\']([^"\']+)["\']/gi; while((m=ld.exec(html))){stats.jsonLd++;addMedia(out,m[1],null,pageUrl);}
  var ar=/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s"'<>]*)?/gi; while((m=ar.exec(html))){stats.absoluteMedia++;addMedia(out,m[0],null,pageUrl);}
  var ifr=/<iframe\b[^>]*>/gi; while((m=ifr.exec(html))){stats.iframes++;src=attr(m[0],'src')||attr(m[0],'data-src')||attr(m[0],'data-url');if(src)out._players.push(abs(src,pageUrl));}
  var emb=/(?:data-(?:embed|player|iframe|video|url)|embed|player(?:Url|URL)|iframe(?:Url|URL))\s*=\s*["\']([^"\']+)["\']/gi; while((m=emb.exec(html))){stats.embedAttrs++;out._players.push(abs(m[1],pageUrl));}
  stats.scripts=(html.match(/<script\b/gi)||[]).length;
  return stats;
}
function visible(provider,entries){ return entries.map(function(x,i){ var s=clean(x); if(s.length>190)s=s.slice(0,187)+'...'; return {name:provider+' ['+(i+1)+'] '+s,title:'Diagnostic',url:'https://example.com/',quality:'Debug'}; }); }
function unique(a){var o=[],s={}; (a||[]).forEach(function(x){if(x&&!s[x]){s[x]=1;o.push(x);}});return o;}
function candidateUrls(base,id,type,season,episode){
  var b=base.replace(/\/$/,''); var x=encodeURIComponent(String(id));
  if(type==='movie') return [b+'/movie/'+x,b+'/movies/'+x,b+'/watch/movie/'+x,b+'/watch/'+x];
  var s=Number(season),e=Number(episode); return [b+'/tv/'+x+'/'+s+'/'+e,b+'/tv/'+x+'?season='+s+'&episode='+e,b+'/watch/tv/'+x+'/'+s+'/'+e,b+'/watch/'+x+'/'+s+'/'+e];
}
function runProvider(provider,base,tmdbId,type,season,episode){
  var report=['BASE='+base];
  if(!tmdbId)return Promise.resolve(visible(provider,['ERROR=missing TMDB id']));
  var urls=candidateUrls(base,tmdbId,type,season,episode); report.push('CANDIDATES='+urls.length);
  var media=[]; var pages=[]; var playerUrls=[];
  function tryCandidate(i){
    if(i>=urls.length) return Promise.resolve();
    var u=urls[i];
    return fetchText(u,base+'/').then(function(r){
      pages.push(r); var tmp=[]; tmp._players=[]; var st=extractMedia(r.text,r.url,provider,tmp); media=media.concat(tmp); playerUrls=playerUrls.concat(tmp._players||[]); report.push('C'+(i+1)+'=HTTP '+r.status+' HTML='+r.text.length+' IFRAME='+st.iframes+' EMBED='+st.embedAttrs+' MEDIA='+media.length); return media.length?Promise.resolve():tryCandidate(i+1);
    }).catch(function(e){report.push('C'+(i+1)+'='+e.message);return tryCandidate(i+1);});
  }
  return tryCandidate(0).then(function(){
    if(media.length) return media;
    playerUrls=unique(playerUrls).filter(function(u){return /^https?:\/\//i.test(u);});
    report.push('PLAYER_URLS='+playerUrls.length);
    // Follow up to three discovered player/embed pages. This does not bypass access controls; it only follows URLs exposed in the page.
    return playerUrls.slice(0,3).reduce(function(chain,purl,idx){
      return chain.then(function(){ return fetchText(purl,pages.length?pages[pages.length-1].url:base+'/').then(function(r){ var tmp=[]; tmp._players=[]; var st=extractMedia(r.text,r.url,provider,tmp); report.push('P'+(idx+1)+'=HTTP '+r.status+' HTML='+r.text.length+' IFRAME='+st.iframes+' EMBED='+st.embedAttrs+' MEDIA='+tmp.length); if(tmp.length) media=media.concat(tmp); return null; }).catch(function(e){report.push('P'+(idx+1)+'='+e.message);}); });
    },Promise.resolve()).then(function(){return media;});
  }).then(function(){
    media=media.filter(function(x,i,a){return a.findIndex(function(y){return y.url===x.url;})===i;});
    if(media.length){report.push('RESULT=STREAMS '+media.length); return {streams:media,report:report};}
    report.push('RESULT=ZERO_STREAMS'); report.push('NO_DIRECT_MEDIA_AFTER_PLAYER_FOLLOW'); return {streams:[],report:report};
  });
}

function getStreams(tmdbId,mediaType,season,episode) {
  return runProvider('cinewave','https://cinewave.org.lk',tmdbId,mediaType,season,episode).then(function(r){
    if(r.streams.length) return r.streams;
    return visible('cinewave',r.report);
  }).catch(function(e){return visible('cinewave',['FATAL='+e.message]);});
}
module.exports={getStreams:getStreams};
