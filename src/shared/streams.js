import { absoluteUrl, cleanUrl } from "./http.js";

function qualityFrom(text) {
  const s = String(text || "").toLowerCase();
  if (/2160|4k|uhd/.test(s)) return "4K";
  if (/1440/.test(s)) return "1440p";
  if (/1080/.test(s)) return "1080p";
  if (/720/.test(s)) return "720p";
  if (/480/.test(s)) return "480p";
  return "Unknown";
}

export function streamFrom(url, provider, label, base, headers) {
  const u = absoluteUrl(cleanUrl(url), base);
  if (!u || !/^https?:\\/\\//i.test(u)) return null;
  const lower = u.toLowerCase();
  if (!(lower.includes(".m3u8") || lower.includes(".mp4") || lower.includes(".mkv") || lower.includes(".webm"))) return null;
  return { name: provider, title: label || qualityFrom(u), url: u, quality: qualityFrom(`${label || ""} ${u}`), headers: headers || undefined };
}

export function dedupe(streams) {
  const seen = {};
  return streams.filter(s => { if (!s || !s.url || seen[s.url]) return false; seen[s.url] = true; return true; });
}
