const PROVIDER = 'cinewave';
const BASE_URL = 'https://cinewave.org.lk';
const DIAGNOSTIC = true;
const VISIBLE_DIAGNOSTIC = true;
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

function visibleDiagnostic(report) {
  if (!VISIBLE_DIAGNOSTIC) return [];
  var compact = String(report || "No diagnostic information available.").replace(/\s+/g, " ").trim();
  if (compact.length > 700) compact = compact.slice(0, 697) + "...";
  return [{
    name: PROVIDER + " DEBUG",
    title: "DEBUG — " + compact,
    url: "https://example.com/",
    quality: "Debug",
    headers: { "User-Agent": "Nuvio" }
  }];
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
  var report = [];
  log("START", "getStreams called", { tmdbId: tmdbId, mediaType: mediaType, season: season, episode: episode, baseUrl: BASE_URL });
  if (!tmdbId) return Promise.resolve(visibleDiagnostic("missing TMDB id"));
  if (mediaType !== "movie" && mediaType !== "tv") return Promise.resolve(visibleDiagnostic("unsupported media type: " + mediaType));
  if (mediaType === "tv" && (!Number.isFinite(Number(season)) || !Number.isFinite(Number(episode)))) {
    return Promise.resolve(visibleDiagnostic("TV requires numeric season and episode"));
  }

  var urls = candidates(tmdbId, mediaType, season, episode);
  report.push("candidates=" + urls.length);
  log("CANDIDATES", "generated", urls);

  return urls.reduce(function(chain, url, index) {
    return chain.then(function(streams) {
      if (streams.length) return streams;
      log("CANDIDATE", "trying " + (index + 1) + "/" + urls.length, url);
      return fetchText(url, { Referer: BASE_URL + "/" }).then(function(html) {
        var found = extractStreams(html, url);
        report.push("c" + (index + 1) + ":HTTP=OK,chars=" + html.length + ",streams=" + found.length);
        return found;
      }).catch(function(err) {
        var e = String(err && err.message || err);
        report.push("c" + (index + 1) + ":ERROR=" + e);
        log("ERROR", "candidate failed", { candidate: index + 1, url: url, error: e });
        return [];
      });
    });
  }, Promise.resolve([])).then(function(streams) {
    if (streams.length) {
      log("DONE", "getStreams complete", { streams: streams.length });
      return streams;
    }
    report.push("RESULT=ZERO_STREAMS");
    report.push("If all candidates are HTTP=OK but streams=0, the site likely uses a player/embed URL not exposed as a direct media URL in the page HTML.");
    return visibleDiagnostic(report.join(" | "));
  }).catch(function(err) {
    var e = String(err && err.message || err);
    return visibleDiagnostic("FATAL=" + e + " | " + report.join(" | "));
  });
}

module.exports = { getStreams: getStreams };
