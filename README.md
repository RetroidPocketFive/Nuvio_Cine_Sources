# RetroidPocketFive Cine Sources — v9.0.0

CineSrc-only Nuvio provider. CineJoy and CineWave have been removed.

Provider:
- CineSrc Diagnostic (`providers/cinesrc.js`)

Movie target:
- https://cinesrc.st/embed/movie/{tmdbId}

TV target:
- https://cinesrc.st/embed/tv/{tmdbId}?s={season}&e={episode}

The provider currently exposes the CineSrc embed as a diagnostic stream and scans the returned HTML for direct media URLs, player URLs, endpoints, JSON data, and source/server IDs.

Nuvio providers run locally in the app's JavaScript runtime; the manifest uses the `scrapers` registry format.
