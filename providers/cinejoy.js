const PROVIDER = 'cinejoy';
const BASE_URL = 'https://cinejoy.stream';
const DIAGNOSTIC = true;
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.8"
};

function log(stage, message, extra) {
  if (!DIAGNOSTIC) return;
  var line = "[" + PROVIDER + "][" + stage + "] " + message;
  if (extra !== undefined) {
    try { line += " | " + JSON.stringify(extra); } catch (_) {}
  }
  console.log(line);
}

function fetchText(url, extra) {
  var headers = Object.assign({}, DEFAULT_HEADERS, extra || {});
  log("HTTP", "GET", { url: url });
  return fetch(url, { headers: headers, redirect: "follow" }).then(function(r) {
    var status = r && r.status !== undefined ? r.status : "unknown";
    var ok = r && r.ok !== undefined ? r.ok : (status >= 200 && status < 300);
    log("HTTP", "response", { status: status, ok: ok });
    if (!ok) throw new Error("HTTP " + status);
    return r.text().then(function(text) {
      log("HTTP", "body received", { chars: text.length });
      return text;
    });
  });
}

function absoluteUrl(value, base) {
  if (!value) return null;
  try { return new URL(String(value).replace(/&amp;/g, "&").replace(/\\u0026/g, "&").trim(), base).toString(); } catch (_) { return null; }
}

function qualityFrom(text) {
  var s = String(text || "").toLowerCase();
  if (/2160|4k|uhd/.test(s)) return "4K";
  if (/1440/.test(s)) return "1440p";
  if (/1080/.test(s)) return "1080p";
  if (/720/.test(s)) return "720p";
  if (/480/.test(s)) return "480p";
  return "Unknown";
}

function addStream(out, url, label, pageUrl, stats) {
  stats.candidatesSeen++;
  var u = absoluteUrl(url, pageUrl);
  if (!u) { stats.invalidUrls++; return; }
  if (!/^https?:\/\//i.test(u)) { stats.nonHttpUrls++; return; }
  if (!/\.(?:m3u8|mp4|mkv|webm)(?:[?#]|$)/i.test(u)) { stats.unsupportedUrls++; return; }
  if (out.some(function(s) { return s.url === u; })) { stats.duplicates++; return; }
  var q = qualityFrom((label || "") + " " + u);
  out.push({
    name: PROVIDER + " Direct",
    title: label || q,
    url: u,
    quality: q,
    headers: { "Referer": pageUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] }
  });
  log("EXTRACT", "playable stream found", { quality: q, type: /\.m3u8(?:[?#]|$)/i.test(u) ? "m3u8" : "file" });
}

function attr(tag, name) {
  var re = new RegExp(name + "\\s*=\\s*[\"']([^\"']+)[\"']", "i");
  var m = tag.match(re);
  return m ? m[1] : null;
}

function extractStreams(html, pageUrl) {
  var out = [];
  var stats = { videoTags: 0, sourceTags: 0, directAttributeHits: 0, jsUrlHits: 0, jsonLdHits: 0, absoluteUrlHits: 0, candidatesSeen: 0, invalidUrls: 0, nonHttpUrls: 0, unsupportedUrls: 0, duplicates: 0 };
  var m;
  var tagRe = /<(video|source)\b[^>]*>/gi;
  while ((m = tagRe.exec(html))) {
    if (m[1].toLowerCase() === "video") stats.videoTags++; else stats.sourceTags++;
    var tag = m[0];
    var src = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-video") || attr(tag, "data-url");
    if (src) { stats.directAttributeHits++; addStream(out, src, attr(tag,"title") || attr(tag,"label") || attr(tag,"data-quality"), pageUrl, stats); }
  }

  var urlRe = /(?:file|src|source|url|stream|playbackUrl|videoUrl|hls|dash)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mkv|webm)(?:\?[^"']*)?)["']/gi;
  while ((m = urlRe.exec(html))) { stats.jsUrlHits++; addStream(out, m[1], null, pageUrl, stats); }

  var ldRe = /["']contentUrl["']\s*:\s*["']([^"']+)["']/gi;
  while ((m = ldRe.exec(html))) { stats.jsonLdHits++; addStream(out, m[1], null, pageUrl, stats); }

  var absRe = /https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s"'<>]*)?/gi;
  while ((m = absRe.exec(html))) { stats.absoluteUrlHits++; addStream(out, m[0], null, pageUrl, stats); }

  log("EXTRACT", "scan complete", { htmlChars: html.length, stats: stats, streams: out.length });
  return out;
}

function candidates(tmdbId, mediaType, season, episode) {
  var b = BASE_URL.replace(/\/$/, "");
  var id = encodeURIComponent(String(tmdbId));
  if (mediaType === "movie") return [b+"/movie/"+id, b+"/movies/"+id, b+"/watch/movie/"+id, b+"/watch/"+id];
  var s = Number(season), e = Number(episode);
  return [b+"/tv/"+id+"/"+s+"/"+e, b+"/tv/"+id+"?season="+s+"&episode="+e, b+"/watch/tv/"+id+"/"+s+"/"+e, b+"/watch/"+id+"/"+s+"/"+e];
}

function getStreams(tmdbId, mediaType, season, episode) {
  log("START", "getStreams called", { tmdbId: tmdbId, mediaType: mediaType, season: season, episode: episode, baseUrl: BASE_URL });
  if (!tmdbId) { log("VALIDATE", "missing TMDB id"); return Promise.resolve([]); }
  if (mediaType !== "movie" && mediaType !== "tv") { log("VALIDATE", "unsupported media type", mediaType); return Promise.resolve([]); }
  if (mediaType === "tv" && (!Number.isFinite(Number(season)) || !Number.isFinite(Number(episode)))) { log("VALIDATE", "TV requires numeric season and episode"); return Promise.resolve([]); }

  var urls = candidates(tmdbId, mediaType, season, episode);
  log("CANDIDATES", "generated", urls);

  return urls.reduce(function(chain, url, index) {
    return chain.then(function(streams) {
      if (streams.length) { log("DONE", "stopping after streams found", { count: streams.length, candidate: index + 1 }); return streams; }
      log("CANDIDATE", "trying " + (index + 1) + "/" + urls.length, url);
      return fetchText(url, { Referer: BASE_URL + "/" }).then(function(html) {
        var found = extractStreams(html, url);
        log("CANDIDATE", "result", { candidate: index + 1, streams: found.length });
        return found;
      }).catch(function(err) {
        log("ERROR", "candidate failed", { candidate: index + 1, url: url, error: String(err && err.message || err) });
        return [];
      });
    });
  }, Promise.resolve([])).then(function(streams) {
    log("DONE", "getStreams complete", { streams: streams.length });
    if (!streams.length) log("DONE", "ZERO STREAMS - send the full Plugin Tester Logs to ChatGPT");
    return streams;
  }).catch(function(err) {
    log("FATAL", String(err && err.message || err));
    return [];
  });
}

module.exports = { getStreams: getStreams };
