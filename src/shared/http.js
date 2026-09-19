export const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.8"
};

export function fetchText(url, extraHeaders = {}) {
  return fetch(url, { headers: { ...DEFAULT_HEADERS, ...extraHeaders } })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); });
}

export function absoluteUrl(value, base) {
  if (!value) return null;
  try { return new URL(value, base).toString(); } catch (_) { return null; }
}

export function cleanUrl(value) {
  if (!value) return null;
  return value.replace(/&amp;/g, "&").replace(/\\u0026/g, "&").replace(/\\\//g, "/").trim();
}
