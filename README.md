# RetroidPocketFive — Nuvio Cine Sources (Direct Scraper)

This repository uses Nuvio's multi-file provider architecture. Providers fetch public/authorized HTML pages directly and extract already-exposed media URLs. Nuvio providers run locally in Hermes and must export `getStreams(tmdbId, mediaType, season, episode)`.

## Build

```bash
npm install
npm run build
node test.js
```

The build writes `providers/cinejoy.js` and `providers/cinewave.js`.

## Important

The default base URLs are the public domains currently identified for CineJoy and CineWave. Site URL structures can change, and a crawlable page is not proof that a playable media URL is exposed to the Nuvio runtime. The extractor intentionally handles direct HTML/JSON media URLs only; it does not bypass DRM, CAPTCHA, login, paywalls, or anti-bot controls.

If your authorized CineJoy/CineWave instance uses different paths, edit only the `buildCandidateUrls()` logic or the provider `BASE_URL`.
