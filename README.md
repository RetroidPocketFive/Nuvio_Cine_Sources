# RetroidPocketFive Nuvio Cine Sources — v8.0.0

Adds **CineSrc Diagnostic** based on CineSrc's documented TMDB embed URLs.

Movie target:
`https://cinesrc.st/embed/movie/{tmdb_id}`

TV target:
`https://cinesrc.st/embed/tv/{tmdb_id}?s={season}&e={episode}`

The provider reports HTTP status, HTML size, iframe/embed counts, scripts, external scripts, direct media URLs, player URLs, endpoint-like URLs, and serialized JSON hints. It also exposes the documented CineSrc embed URL as a diagnostic stream so the Nuvio UI can confirm the target.

It does not bypass DRM, CAPTCHA, authentication, or other access controls.
