
var API_BASE = "";

function isHttpUrl(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}
function quality(v, title) {
  var s = String(v || title || "").toLowerCase();
  if (/\b2160p\b|\b4k\b/.test(s)) return "4K";
  if (/\b1440p\b/.test(s)) return "1440p";
  if (/\b1080p\b/.test(s)) return "1080p";
  if (/\b720p\b/.test(s)) return "720p";
  if (/\b480p\b/.test(s)) return "480p";
  return v ? String(v) : "Unknown";
}
function normalize(item, provider) {
  if (!item || !isHttpUrl(item.url)) return null;
  var headers = {};
  if (item.headers && typeof item.headers === "object") {
    Object.keys(item.headers).forEach(function(k) {
      if (typeof item.headers[k] === "string") headers[k] = item.headers[k];
    });
  }
  var out = {
    name: String(item.name || provider),
    title: String(item.title || quality(item.quality, item.title)),
    url: item.url,
    quality: quality(item.quality, item.title)
  };
  if (item.size != null) out.size = item.size;
  if (Object.keys(headers).length) out.headers = headers;
  return out;
}
function requestUrl(base, tmdbId, mediaType, season, episode) {
  var sep = base.indexOf("?") >= 0 ? "&" : "?";
  var u = base + sep + "tmdbId=" + encodeURIComponent(String(tmdbId)) +
    "&type=" + encodeURIComponent(String(mediaType));
  if (mediaType === "tv") {
    u += "&season=" + encodeURIComponent(String(season)) +
      "&episode=" + encodeURIComponent(String(episode));
  }
  return u;
}
function getStreamsFromApi(tmdbId, mediaType, season, episode, provider) {
  if (!API_BASE) {
    console.warn("[" + provider + "] API_BASE is not configured");
    return Promise.resolve([]);
  }
  if (!tmdbId || (mediaType !== "movie" && mediaType !== "tv")) return Promise.resolve([]);
  if (mediaType === "tv" && (!season || !episode)) return Promise.resolve([]);

  return fetch(requestUrl(API_BASE, tmdbId, mediaType, season, episode))
    .then(function(r) {
      if (!r || !r.ok) throw new Error("HTTP " + (r && r.status || "unknown"));
      return r.json();
    })
    .then(function(data) {
      var list = Array.isArray(data) ? data : data && data.streams;
      if (!Array.isArray(list)) return [];
      return list.map(function(x) { return normalize(x, provider); }).filter(Boolean);
    })
    .catch(function(e) {
      console.error("[" + provider + "] " + String(e && e.message || e));
      return [];
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return getStreamsFromApi(tmdbId, mediaType, season, episode, "CineJoy");
}
module.exports = { getStreams };
