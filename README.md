# RetroidPocketFive Cine Sources 3.0.0

Direct-scraper Nuvio providers for CineJoy and CineWave.

## Important
The manifest uses Nuvio's current `scrapers` registry format. Each scraper points to a generated file under `providers/`.

The providers use Promise-based JavaScript for compatibility with Nuvio's dynamically loaded runtime.

## Android diagnostic mode
When no playable media URL is found, the provider returns visible `Debug` entries. These are diagnostic only and use `https://example.com/` as a non-playable placeholder.

For CineWave, the known working candidate from prior testing is `https://cinewave.org.lk/movies/<TMDB ID>` among the generated candidates.

The scraper performs two stages:
1. fetch title page and detect directly exposed media or player/embed URLs;
2. fetch discovered player/embed URLs and scan for directly exposed media URLs.

It does not attempt DRM, CAPTCHA, authentication, or anti-bot bypasses.
