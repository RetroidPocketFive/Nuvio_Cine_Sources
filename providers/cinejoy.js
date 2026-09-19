const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.8"
};
function fetchText(url, extra) {
  const headers = Object.assign({}, DEFAULT_HEADERS, extra || {});
  return fetch(url, { headers }).then(function(r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  });
}
function absoluteUrl(value, base) {
  if (!value) return null;
  try { return new URL(value.replace(/&amp;/g, "&").trim(), base).toString(); } catch (_) { return null; }
}
function qualityFrom(text) {
  const s = String(text || "").toLowerCase();
  if (/2160|4k|uhd/.test(s)) return "4K";
  if (/1440/.test(s)) return "1440p";
  if (/1080/.test(s)) return "1080p";
  if (/720/.test(s)) return "720p";
  if (/480/.test(s)) return "480p";
  return "Unknown";
}
function addStream(out, url, provider, label, pageUrl) {
  const u = absoluteUrl(url, pageUrl);
  if (!u || !/^https?:\/\//i.test(u)) return;
  if (!/\.(?:m3u8|mp4|mkv|webm)(?:[?#]|$)/i.test(u)) return;
  if (out.some(function(s) { return s.url === u; })) return;
  out.push({ name: provider, title: label || qualityFrom(u), url: u, quality: qualityFrom((label || "") + " " + u), headers: { "Referer": pageUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] } });
}
function attr(tag, name) {
  const re = new RegExp(name + "\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']", "i");
  const m = tag.match(re); return m ? m[1] : null;
}
function extractStreams(html, pageUrl, provider) {
  const out = [];
  let m;
  const tagRe = /<(?:video|source)[^>]+>/gi;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    addStream(out, attr(tag,"src") || attr(tag,"data-src") || attr(tag,"data-video"), provider, attr(tag,"title") || attr(tag,"label") || attr(tag,"data-quality"), pageUrl);
  }
  const urlRe = /(?:file|src|source|url|stream|playbackUrl|videoUrl)\s*[:=]\s*[\"']([^\"']+\.(?:m3u8|mp4|mkv|webm)(?:\?[^\"']*)?)[\"']/gi;
  while ((m = urlRe.exec(html))) addStream(out,m[1],provider,null,pageUrl);
  const ldRe = /[\"']contentUrl[\"']\s*:\s*[\"']([^\"']+)[\"']/gi;
  while ((m = ldRe.exec(html))) addStream(out,m[1],provider,null,pageUrl);
  const absRe = /https?:\/\/[^\s\"'<>]+\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s\"'<>]*)?/gi;
  while ((m = absRe.exec(html))) addStream(out,m[0],provider,null,pageUrl);
  return out;
}
function candidates(base, tmdbId, mediaType, season, episode) {
  const b = base.replace(/\/$/, ""), id = encodeURIComponent(String(tmdbId));
  if (mediaType === "movie") return [b+"/movie/"+id,b+"/movies/"+id,b+"/watch/movie/"+id,b+"/watch/"+id];
  const s=Number(season), e=Number(episode);
  return [b+"/tv/"+id+"/"+s+"/"+e,b+"/tv/"+id+"?season="+s+"&episode="+e,b+"/watch/tv/"+id+"/"+s+"/"+e,b+"/watch/"+id+"/"+s+"/"+e];
}

const BASE_URL = "https://cinejoy.stream";
function getStreams(tmdbId, mediaType, season, episode) {
  if (!tmdbId || (mediaType !== "movie" && mediaType !== "tv")) return Promise.resolve([]);
  if (mediaType === "tv" && (!Number.isFinite(Number(season)) || !Number.isFinite(Number(episode)))) return Promise.resolve([]);
  return candidates(BASE_URL, tmdbId, mediaType, season, episode).reduce(function(chain,url) {
    return chain.then(function(streams) {
      if (streams.length) return streams;
      return fetchText(url, { Referer: BASE_URL + "/" }).then(function(html) {
        return extractStreams(html,url,"Cinejoy Direct");
      }).catch(function(err) { console.log("[cinejoy] candidate failed:",url,err.message); return []; });
    });
  }, Promise.resolve([]));
}
module.exports = { getStreams };
