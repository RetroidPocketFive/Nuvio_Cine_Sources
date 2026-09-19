import { absoluteUrl, cleanUrl } from "../shared/http.js";
import { streamFrom, dedupe } from "../shared/streams.js";

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const m = tag.match(re); return m ? m[1] : null;
}

function extract(html, pageUrl, provider) {
  const out = [];
  const add = (u, label, headers) => { const s = streamFrom(u, provider, label, pageUrl, headers); if (s) out.push(s); };

  // Native media tags and source tags.
  const tagRe = /<(?:video|source|track)[^>]+>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    add(attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-video"), attr(tag, "title") || attr(tag, "label") || attr(tag, "data-quality"));
  }

  // Common JSON/config keys used by HTML players.
  const urlRe = /(?:file|src|source|url|stream|playbackUrl|videoUrl)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mkv|webm)(?:\?[^"']*)?)["']/gi;
  while ((m = urlRe.exec(html))) add(m[1]);

  // JSON-LD contentUrl.
  const ldRe = /"contentUrl"\s*:\s*"([^"']+)"/gi;
  while ((m = ldRe.exec(html))) add(m[1]);

  // Absolute media URLs in escaped JS/HTML.
  const absRe = /https?:\\/\\/[^\s"'<>\\]+\.(?:m3u8|mp4|mkv|webm)(?:\?[^\s"'<>\\]*)?/gi;
  while ((m = absRe.exec(html))) add(m[0]);

  return dedupe(out);
}

export function extractStreams(html, pageUrl, provider) { return extract(html, pageUrl, provider); }

export function buildCandidateUrls(baseUrl, tmdbId, mediaType, season, episode) {
  const base = baseUrl.replace(/\/$/, "");
  const id = encodeURIComponent(String(tmdbId));
  const list = [];
  if (mediaType === "movie") {
    list.push(`${base}/movie/${id}`, `${base}/movies/${id}`, `${base}/watch/movie/${id}`, `${base}/watch/${id}`);
  } else {
    const s = Number(season), e = Number(episode);
    list.push(`${base}/tv/${id}/${s}/${e}`, `${base}/tv/${id}?season=${s}&episode=${e}`, `${base}/watch/tv/${id}/${s}/${e}`, `${base}/watch/${id}/${s}/${e}`);
  }
  return list;
}
