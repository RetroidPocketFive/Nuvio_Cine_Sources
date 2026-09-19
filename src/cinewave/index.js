var PROVIDER = "cinewave";
var BASE_URL = "https://cinewave.org.lk";
var DEBUG_URL = "https://example.com/";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36";

function diag(text, n) {
  var s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length > 180) s = s.slice(0, 177) + "...";
  return { name: PROVIDER + " [" + n + "] " + s, title: "Debug", url: DEBUG_URL, quality: "Debug" };
}

function visible(report) {
  return report.map(function (x, i) { return diag(x, i + 1); });
}

function fetchText(url, referer) {
  return fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.8", "Referer": referer || BASE_URL + "/" }, redirect: "follow" }).then(function (r) {
    if (!r || !r.ok) throw new Error("HTTP " + (r && r.status !== undefined ? r.status : "unknown"));
    return r.text().then(function (t) { return { status: r.status, text: t }; });
  });
}

function abs(v, base) {
  if (!v) return null;
  var s = String(v).replace(/&amp;/g, "&").replace(/\\u0026/g, "&").trim();
  try { return new URL(s, base).toString(); } catch (_) { return null; }
}

function quality(s) {
  s = String(s || "").toLowerCase();
  if (/2160|4k|uhd/.test(s)) return "4K";
  if (/1440/.test(s)) return "1440p";
  if (/1080/.test(s)) return "1080p";
  if (/720/.test(s)) return "720p";
  if (/480/.test(s)) return "480p";
  return "Unknown";
}

function addMedia(out, url, label, pageUrl) {
  var u = abs(url, pageUrl);
  if (!u || !/^https?:\/\//i.test(u)) return;
  if (!/\.(?:m3u8|mp4|mkv|webm)(?:[?#]|$)/i.test(u)) return;
  if (out.some(function (x) { return x.url === u; })) return;
  var q = quality((label || "") + " " + u);
  out.push({ name: "CineWave Direct", title: label || q, url: u, quality: q, headers: { Referer: pageUrl, "User-Agent": UA } });
}

function attr(tag, name) {
  var r = new RegExp(name + "\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']", "i").exec(tag);
  return r ? r[1] : null;
}

function inspect(html, pageUrl) {
  var media = [], players = [], iframes = 0, embeds = 0, scripts = 0, dataUrls = 0;
  var m, tag;
  var tagRe = /<(iframe|embed)\b[^>]*>/gi;
  while ((m = tagRe.exec(html))) {
    tag = m[0];
    var src = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-url") || attr(tag, "data-embed") || attr(tag, "data-video");
    if (m[1].toLowerCase() === "iframe") iframes++; else embeds++;
    if (src) { var u = abs(src, pageUrl); if (u && players.indexOf(u) < 0) players.push(u); }
  }
  var videoRe = /<(video|source)\b[^>]*>/gi;
  while ((m = videoRe.exec(html))) {
    tag = m[0];
    var v = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-video") || attr(tag, "data-url");
    if (v) addMedia(media, v, attr(tag, "title") || attr(tag, "label") || attr(tag, "data-quality"), pageUrl);
  }
  var scriptRe = /<script\b[^>]*>/gi; while (scriptRe.exec(html)) scripts++;
  var dataRe = /(?:data-(?:url|video|src|embed)|playerUrl|embedUrl|videoUrl|streamUrl)\s*[:=]\s*["']([^"']+)["']/gi;
  while ((m = dataRe.exec(html))) { dataUrls++; var du = abs(m[1], pageUrl); if (du && players.indexOf(du) < 0) players.push(du); }
  var mediaRe = /https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s"'<>]*)?/gi;
  while ((m = mediaRe.exec(html))) addMedia(media, m[0], null, pageUrl);
  return { media: media, players: players, iframes: iframes, embeds: embeds, scripts: scripts, dataUrls: dataUrls };
}

function candidates(id, type, season, episode) {
  var b = BASE_URL.replace(/\/$/, ""), x = encodeURIComponent(String(id));
  if (type === "movie") return [b + "/movie/" + x, b + "/movies/" + x, b + "/watch/movie/" + x, b + "/watch/" + x];
  var s = Number(season), e = Number(episode);
  return [b + "/tv/" + x + "/" + s + "/" + e, b + "/tv/" + x + "?season=" + s + "&episode=" + e, b + "/watch/tv/" + x + "/" + s + "/" + e, b + "/watch/" + x + "/" + s + "/" + e];
}

function getStreams(tmdbId, mediaType, season, episode) {
  var report = [];
  if (!tmdbId) return Promise.resolve([diag("missing TMDB id", 1)]);
  var urls = candidates(tmdbId, mediaType, season, episode);
  report.push("BASE=" + BASE_URL);
  report.push("CANDIDATES=" + urls.length);
  return urls.reduce(function (p, url, i) {
    return p.then(function (streams) {
      if (streams.length) return streams;
      return fetchText(url, BASE_URL + "/").then(function (r) {
        var x = inspect(r.text, url);
        report.push("C" + (i + 1) + " HTTP=" + r.status + " HTML=" + r.text.length + " IFRAME=" + x.iframes + " EMBED=" + x.embeds + " SCRIPTS=" + x.scripts + " DATAURL=" + x.dataUrls + " MEDIA=" + x.media.length + " PLAYERS=" + x.players.length);
        if (x.media.length) return x.media;
        if (!x.players.length) return [];
        report.push("C" + (i + 1) + " PLAYER_URLS=" + x.players.length);
        return x.players.slice(0, 4).reduce(function (q, playerUrl, pi) {
          return q.then(function (found) {
            if (found.length) return found;
            return fetchText(playerUrl, url).then(function (pr) {
              var px = inspect(pr.text, playerUrl);
              report.push("P" + (pi + 1) + " HTTP=" + pr.status + " HTML=" + pr.text.length + " IFRAME=" + px.iframes + " EMBED=" + px.embeds + " MEDIA=" + px.media.length);
              return px.media;
            }).catch(function (e) { report.push("P" + (pi + 1) + " ERROR=" + String(e && e.message || e)); return []; });
          });
        }, Promise.resolve([]));
      }).catch(function (e) { report.push("C" + (i + 1) + " ERROR=" + String(e && e.message || e)); return []; });
    });
  }, Promise.resolve([])).then(function (streams) {
    if (streams.length) return streams;
    report.push("RESULT=ZERO_STREAMS");
    return visible(report);
  }).catch(function (e) { report.push("FATAL=" + String(e && e.message || e)); return visible(report); });
}

module.exports = { getStreams: getStreams };
