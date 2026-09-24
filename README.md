# RetroidPocketFive Cine Sources v10.0.0

CineSrc-only diagnostic provider.

## v10 focus
Tests the documented CineSrc movie/TV embed URL with several ordinary HTTP request variants (browser-like headers, Referer/Origin, Sec-Fetch headers, and cache-busting), reports status/final URL/content type/body prefix for errors, then scans successful responses for media/player/API clues.

Movie test: https://cinesrc.st/embed/movie/550
TV pattern: https://cinesrc.st/embed/tv/{tmdb_id}?s={season}&e={episode}
