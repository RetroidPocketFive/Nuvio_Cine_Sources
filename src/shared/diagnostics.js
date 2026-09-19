function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

// Nuvio's Android stream list may not display the stream title field.
// Put the diagnostic payload in `name`, which is visible in the provider card.
export function diagnosticStreams(provider, entries) {
  var list = Array.isArray(entries) ? entries : [entries];
  return list.map(function (entry, index) {
    var text = clean(entry);
    if (text.length > 180) text = text.slice(0, 177) + '...';
    return {
      name: provider + ' [' + (index + 1) + '] ' + text,
      title: 'Diagnostic',
      url: 'https://example.com/',
      quality: 'Debug'
    };
  });
}
