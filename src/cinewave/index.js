var PROVIDER = "cinewave";
var BASE_URL = "https://cinewave.org.lk";
var PLAY_HOST = "https://watch.cinewave.qzz.io";
var DEBUG_URL = "https://example.com/";
var UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36";

function diag(text, n) {
  var s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length > 180) s = s.slice(0, 177) + "...";
  return { name: PROVIDER + " [" + n + "] " + s, title: "Debug", url: DEBUG_URL, quality: "Debug" };
}
function playerDiag(url, n) {
  return {
    name: PROVIDER + " [PLAY " + n + "] " + url,
    title: "CineWave PLAY URL",
    url: url,
    quality: "Player",
    headers: { Referer: BASE_URL + "/", "User-Agent": UA }
  };
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
    return r.text().then(function (t) { return { status: r.status, text: t, url: r.url || url }; });
  });
}

function abs(v, base) {
  if (!v) return null;
  var s = norm(v).trim();
  try { return new URL(s, base).toString(); } catch (_) { return null; }
}

function norm(s) {
  var x = String(s || "");
  for (var i = 0; i < 2; i++) {
    x = x
      .replace(/\\u002f/gi, "/").replace(/\\u0026/gi, "&")
      .replace(/\\u003a/gi, ":").replace(/\\u003d/gi, "=")
      .replace(/\\u0022/gi, '"').replace(/\\u0027/gi, "'")
      .replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  }
  try { x = decodeURIComponent(x); } catch (_) {}
  return x;
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

function extractPlayUrls(text, base) {
  var out = [], s = norm(text), m;
  // Exact target requested: https://watch.cinewave.qzz.io/play/<token>
  var exact = /https?:\/\/watch\.cinewave\.qzz\.io\/play\/[A-Za-z0-9_-]+/gi;
  while ((m = exact.exec(s))) addUnique(out, m[0]);

  // Same target when written as //host/play/... or with the host/path URL-encoded.
  var protocolRelative = /(?:^|["'`(\s])\/\/watch\.cinewave\.qzz\.io\/play\/[A-Za-z0-9_-]+/gi;
  while ((m = protocolRelative.exec(s))) addUnique(out, "https:" + m[0].replace(/^[^\/]*\/?/, ""));

  // Relative /play/<token> is only accepted when the inspected document is the watch host.
  if (/^https?:\/\/watch\.cinewave\.qzz\.io\//i.test(base)) {
    var rel = /(?:^|["'`(\s])\/play\/[A-Za-z0-9_-]+/gi;
    while ((m = rel.exec(s))) addUnique(out, abs(m[0].trim(), base));
  }
  return out;
}

function inspect(html, pageUrl) {
  var media = [], players = [], scripts = [], externalScripts = [], endpoints = [], playUrls = [];
  var iframes = 0, embeds = 0, scriptMediaHits = 0, scriptPlayerHits = 0;
  var m, tag;

  extractPlayUrls(html, pageUrl).forEach(function (u) { addUnique(playUrls, u); addUnique(players, u); });

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
    extractPlayUrls(s, pageUrl).forEach(function (u) { addUnique(playUrls, u); addUnique(players, u); });

    var before = media.length, mm;
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

  var raw = norm(html);
  var rawMedia = /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s"'<>\\]*)?/gi;
  while ((m = rawMedia.exec(raw))) addMedia(media, m[0], null, pageUrl);

  // Next.js data and generic JSON blobs are scanned separately so the diagnostic
  // shows whether the play URL is present in serialized page data rather than JS.
  var jsonBlobs = 0;
  var nextData = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (nextData) {
    jsonBlobs++;
    extractPlayUrls(nextData[1], pageUrl).forEach(function (u) { addUnique(playUrls, u); addUnique(players, u); });
  }
  var nextFlight = /self\.__next_f\.push\(\[1,["']([\s\S]*?)["']\]\)/gi;
  while ((m = nextFlight.exec(html))) {
    jsonBlobs++;
    extractPlayUrls(m[1], pageUrl).forEach(function (u) { addUnique(playUrls, u); addUnique(players, u); });
  }

  return {
    media: media, players: players, playUrls: playUrls, scripts: scripts.length,
    externalScripts: externalScripts, endpoints: endpoints,
    scriptMediaHits: scriptMediaHits, scriptPlayerHits: scriptPlayerHits,
    iframes: iframes, embeds: embeds, jsonBlobs: jsonBlobs
  };
}

function candidates(id, type, season, episode) {
  var b = BASE_URL.replace(/\/$/, ""), x = encodeURIComponent(String(id));
  if (type === "movie") return [b + "/movie/" + x, b + "/movies/" + x, b + "/watch/movie/" + x, b + "/watch/" + x];
  var s = Number(season), e = Number(episode);
  return [b + "/tv/" + x + "/" + s + "/" + e, b + "/tv/" + x + "?season=" + s + "&episode=" + e, b + "/watch/tv/" + x + "/" + s + "/" + e, b + "/watch/" + x + "/" + s + "/" + e];
}

function fetchAndInspect(url, referer, report) {
  return fetchText(url, referer).then(function (r) {
    var x = inspect(r.text, r.url || url);
    return { response: r, info: x };
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  var report = [], foundPlay = [];
  if (!tmdbId) return Promise.resolve([diag("missing TMDB id", 1)]);
  var urls = candidates(tmdbId, mediaType, season, episode);
  report.push("V7_TARGET=watch.cinewave.qzz.io/play/<token>");
  report.push("BASE=" + BASE_URL);
  report.push("CANDIDATES=" + urls.length);

  return urls.reduce(function (p, url, i) {
    return p.then(function (state) {
      if (state.media.length || state.play.length) return state;
      return fetchAndInspect(url, BASE_URL + "/", report).then(function (z) {
        var r = z.response, x = z.info;
        report.push("C" + (i + 1) + " HTTP=" + r.status + " FINAL=" + (r.url || url));
        report.push("C" + (i + 1) + " HTML=" + r.text.length + " IFRAME=" + x.iframes +
          " EMBED=" + x.embeds + " SCRIPTS=" + x.scripts + " MEDIA=" + x.media.length +
          " PLAYERS=" + x.players.length + " PLAYURLS=" + x.playUrls.length + " JSON=" + x.jsonBlobs);
        report.push("C" + (i + 1) + " SCRIPT_MEDIA=" + x.scriptMediaHits +
          " SCRIPT_PLAYERS=" + x.scriptPlayerHits + " EXT_SCRIPTS=" + x.externalScripts.length +
          " ENDPOINTS=" + x.endpoints.length);

        x.playUrls.forEach(function (u) { addUnique(foundPlay, u); });
        if (x.media.length || foundPlay.length) return { media: x.media, play: foundPlay };

        var targets = [];
        x.externalScripts.slice(0, 20).forEach(function (u) { targets.push({ kind: "SCRIPT", url: u }); });
        x.players.slice(0, 12).forEach(function (u) {
          if (!/^https?:\/\/watch\.cinewave\.qzz\.io\/play\//i.test(u)) targets.push({ kind: "PLAYER", url: u });
        });
        x.endpoints.slice(0, 20).forEach(function (u) { targets.push({ kind: "API", url: u }); });
        report.push("C" + (i + 1) + " TRACE_TARGETS=" + targets.length);

        return targets.reduce(function (q, target, ti) {
          return q.then(function (st) {
            if (st.media.length || st.play.length) return st;
            return fetchAndInspect(target.url, url, report).then(function (tz) {
              var tx = tz.info;
              report.push(target.kind + (ti + 1) + " HTTP=" + tz.response.status +
                " LEN=" + tz.response.text.length + " PLAYURLS=" + tx.playUrls.length +
                " MEDIA=" + tx.media.length + " PLAYERS=" + tx.players.length +
                " EXT=" + tx.externalScripts.length + " API=" + tx.endpoints.length);
              tx.playUrls.forEach(function (u) { addUnique(foundPlay, u); });
              if (tx.media.length || foundPlay.length) return { media: tx.media, play: foundPlay };

              // One nested level for external scripts discovered inside chunks.
              var nested = tx.externalScripts.slice(0, 10);
              return nested.reduce(function (qq, nu) {
                return qq.then(function (ns) {
                  if (ns.media.length || ns.play.length) return ns;
                  return fetchAndInspect(nu, target.url, report).then(function (nz) {
                    var nx = nz.info;
                    report.push("NESTED HTTP=" + nz.response.status + " LEN=" + nz.response.text.length +
                      " PLAYURLS=" + nx.playUrls.length + " MEDIA=" + nx.media.length +
                      " PLAYERS=" + nx.players.length + " API=" + nx.endpoints.length);
                    nx.playUrls.forEach(function (u) { addUnique(foundPlay, u); });
                    return { media: nx.media, play: foundPlay.slice() };
                  }).catch(function () { return ns; });
                });
              }, Promise.resolve({ media: [], play: foundPlay.slice() }));
            }).catch(function (e) {
              report.push(target.kind + (ti + 1) + " ERROR=" + String(e && e.message || e));
              return st;
            });
          });
        }, Promise.resolve({ media: [], play: foundPlay.slice() }));
      }).catch(function (e) {
        report.push("C" + (i + 1) + " ERROR=" + String(e && e.message || e));
        return state;
      });
    });
  }, Promise.resolve({ media: [], play: [] })).then(function (state) {
    if (state.media.length) return state.media;
    if (foundPlay.length) {
      var out = foundPlay.map(function (u, i) { return playerDiag(u, i + 1); });
      report.push("RESULT=PLAY_URLS_FOUND " + foundPlay.length);
      report.push("PLAY0=" + foundPlay[0]);
      return out.concat(visible(report));
    }
    report.push("RESULT=ZERO_PLAY_URLS");
    return visible(report);
  }).catch(function (e) {
    report.push("FATAL=" + String(e && e.message || e));
    return visible(report);
  });
}

module.exports = { getStreams: getStreams };
