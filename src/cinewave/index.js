var PROVIDER = "cinewave";
var BASE_URL = "https://cinewave.org.lk";
var DEBUG_URL = "https://example.com/";
var UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36";

function diag(text, n) {
  var s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length > 180) s = s.slice(0, 177) + "...";
  return { name: PROVIDER + " [" + n + "] " + s, title: "Debug", url: DEBUG_URL, quality: "Debug" };
}
function visible(report) { return report.map(function (x, i) { return diag(x, i + 1); }); }

function fetchText(url, referer) {
  return fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/javascript,text/javascript,application/json,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.8",
      "Referer": referer || BASE_URL + "/"
    },
    redirect: "follow"
  }).then(function (r) {
    if (!r || !r.ok) throw new Error("HTTP " + (r && r.status !== undefined ? r.status : "unknown"));
    return r.text().then(function (t) { return { status: r.status, text: t, url: url }; });
  });
}

function abs(v, base) {
  if (!v) return null;
  var s = String(v)
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002f/gi, "/")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&quot;/g, "\"")
    .trim();
  try { return new URL(s, base).toString(); } catch (_) { return null; }
}

function norm(s) {
  return String(s || "")
    .replace(/\\u002f/gi, "/").replace(/\\u0026/gi, "&")
    .replace(/\\u003a/gi, ":").replace(/\\u003d/gi, "=")
    .replace(/\\u0022/gi, '"').replace(/\\u0027/gi, "'")
    .replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
}

function addUnique(arr, v) { if (v && arr.indexOf(v) < 0) arr.push(v); }

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
  out.push({
    name: "CineWave Direct",
    title: label || quality(u),
    url: u,
    quality: quality((label || "") + " " + u),
    headers: { Referer: pageUrl, "User-Agent": UA }
  });
}

function attr(tag, name) {
  var r = new RegExp(name + "\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']", "i").exec(tag);
  return r ? r[1] : null;
}

function inspect(html, pageUrl) {
  var media = [], players = [], scripts = [], externalScripts = [], endpoints = [];
  var iframes = 0, embeds = 0, scriptMediaHits = 0, scriptPlayerHits = 0;
  var m, tag;

  var tagRe = /<(iframe|embed)\b[^>]*>/gi;
  while ((m = tagRe.exec(html))) {
    tag = m[0];
    var src = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-url") ||
              attr(tag, "data-embed") || attr(tag, "data-video");
    if (m[1].toLowerCase() === "iframe") iframes++; else embeds++;
    if (src) { var u = abs(src, pageUrl); if (u) addUnique(players, u); }
  }

  var mediaTagRe = /<(video|source)\b[^>]*>/gi;
  while ((m = mediaTagRe.exec(html))) {
    tag = m[0];
    var v = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-video") || attr(tag, "data-url");
    if (v) addMedia(media, v, attr(tag, "title") || attr(tag, "label"), pageUrl);
  }

  var scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html))) {
    var attrs = m[1] || "", body = m[2] || "";
    scripts.push(body);
    var srcAttr = attr("<script " + attrs + ">", "src");
    if (srcAttr) {
      var su = abs(srcAttr, pageUrl);
      if (su) addUnique(externalScripts, su);
    }

    var s = norm(body);
    var before = media.length;
    var mm;
    var mediaRe = /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s"'<>\\]*)?/gi;
    while ((mm = mediaRe.exec(s))) addMedia(media, mm[0], null, pageUrl);
    if (media.length > before) scriptMediaHits += media.length - before;

    var keyRe = /(?:player(?:Url|URL)?|embed(?:Url|URL)?|iframe(?:Url|URL)?|video(?:Url|URL)?|stream(?:Url|URL)?|source(?:Url|URL)?)\s*[:=]\s*["']([^"']+)["']/gi;
    while ((mm = keyRe.exec(s))) {
      var pu = abs(mm[1], pageUrl);
      if (pu) { addUnique(players, pu); scriptPlayerHits++; }
    }

    var quoted = /["'](https?:\/\/[^"'\s<>]+)["']/gi;
    while ((mm = quoted.exec(s))) {
      var qu = mm[1];
      if (/\.(?:m3u8|mp4|mkv|webm)(?:[?#]|$)/i.test(qu)) addMedia(media, qu, null, pageUrl);
      else if (/(?:player|embed|iframe|video|stream|source|watch)/i.test(qu)) addUnique(players, qu);
    }

    // API/XHR/fetch/JSON endpoint discovery. This is ordinary page-data inspection,
    // not an attempt to bypass authentication, DRM, CAPTCHA, or access controls.
    var callRe = /(?:fetch|axios\.(?:get|post)|XMLHttpRequest|open)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((mm = callRe.exec(s))) {
      var eu = abs(mm[1], pageUrl);
      if (eu && /^(?:https?:\/\/|\/)/i.test(mm[1]) &&
          /(?:api|ajax|json|source|sources|server|servers|player|embed|stream|video|watch)/i.test(eu)) {
        addUnique(endpoints, eu);
      }
    }

    var endpointStringRe = /["'`](\/[^"'`]{1,220}(?:api|ajax|json|source|sources|server|servers|player|embed|stream|video|watch)[^"'`]*)["'`]/gi;
    while ((mm = endpointStringRe.exec(s))) {
      var eu2 = abs(mm[1], pageUrl);
      if (eu2) addUnique(endpoints, eu2);
    }
  }

  var rawMedia = /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s"'<>\\]*)?/gi;
  while ((m = rawMedia.exec(norm(html)))) addMedia(media, m[0], null, pageUrl);

  return {
    media: media, players: players, scripts: scripts.length,
    externalScripts: externalScripts, endpoints: endpoints,
    scriptMediaHits: scriptMediaHits, scriptPlayerHits: scriptPlayerHits,
    iframes: iframes, embeds: embeds
  };
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
        report.push("C" + (i + 1) + " HTTP=" + r.status + " HTML=" + r.text.length +
          " IFRAME=" + x.iframes + " EMBED=" + x.embeds + " SCRIPTS=" + x.scripts +
          " MEDIA=" + x.media.length + " PLAYERS=" + x.players.length);
        report.push("C" + (i + 1) + " SCRIPT_MEDIA=" + x.scriptMediaHits +
          " SCRIPT_PLAYERS=" + x.scriptPlayerHits + " EXT_SCRIPTS=" + x.externalScripts.length +
          " ENDPOINTS=" + x.endpoints.length);

        if (x.media.length) return x.media;

        // Inspect all discovered external scripts, not just the first six.
        var scriptTargets = x.externalScripts.slice(0, 12);
        var playerTargets = x.players.slice(0, 8);
        var endpointTargets = x.endpoints.slice(0, 12);
        report.push("C" + (i + 1) + " TARGETS=" +
          (scriptTargets.length + playerTargets.length + endpointTargets.length));

        var targets = [];
        scriptTargets.forEach(function (u) { targets.push({ kind: "SCRIPT", url: u }); });
        playerTargets.forEach(function (u) { targets.push({ kind: "PLAYER", url: u }); });
        endpointTargets.forEach(function (u) { targets.push({ kind: "API", url: u }); });

        return targets.reduce(function (q, target, ti) {
          return q.then(function (found) {
            if (found.length) return found;
            return fetchText(target.url, url).then(function (tr) {
              var tx = inspect(tr.text, target.url);
              report.push(target.kind + (ti + 1) + " HTTP=" + tr.status +
                " LEN=" + tr.text.length + " MEDIA=" + tx.media.length +
                " PLAYERS=" + tx.players.length + " SCRIPTS=" + tx.scripts +
                " EXT=" + tx.externalScripts.length + " API=" + tx.endpoints.length);
              // One level of nested-script recursion.
              var nested = tx.externalScripts.slice(0, 8);
              return nested.reduce(function (qq, nu) {
                return qq.then(function (f2) {
                  if (f2.length) return f2;
                  return fetchText(nu, target.url).then(function (nr) {
                    var nx = inspect(nr.text, nu);
                    report.push("NESTED HTTP=" + nr.status + " LEN=" + nr.text.length +
                      " MEDIA=" + nx.media.length + " PLAYERS=" + nx.players.length +
                      " API=" + nx.endpoints.length);
                    return nx.media;
                  }).catch(function () { return []; });
                });
              }, Promise.resolve(tx.media));
            }).catch(function (e) {
              report.push(target.kind + (ti + 1) + " ERROR=" + String(e && e.message || e));
              return [];
            });
          });
        }, Promise.resolve([]));
      }).catch(function (e) {
        report.push("C" + (i + 1) + " ERROR=" + String(e && e.message || e));
        return [];
      });
    });
  }, Promise.resolve([])).then(function (streams) {
    if (streams.length) return streams;
    report.push("RESULT=ZERO_STREAMS");
    return visible(report);
  }).catch(function (e) {
    report.push("FATAL=" + String(e && e.message || e));
    return visible(report);
  });
}

module.exports = { getStreams: getStreams };
