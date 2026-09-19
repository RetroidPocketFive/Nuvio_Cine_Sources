export function diagnosticStream(provider, report) {
  var compact = String(report || "No diagnostic information available.").replace(/\s+/g, " ").trim();
  if (compact.length > 700) compact = compact.slice(0, 697) + "...";
  return {
    name: provider + " DEBUG",
    title: "DEBUG — " + compact,
    url: "https://example.com/",
    quality: "Debug",
    headers: { "User-Agent": "Nuvio" }
  };
}
