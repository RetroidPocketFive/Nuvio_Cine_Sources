# Nuvio Cine Sources 2.2.0

Direct-scraper architecture for CineJoy and CineWave.

## What changed
- Promise-only runtime for Hermes/Nuvio compatibility.
- Candidate page discovery.
- Detects `<iframe>`, embed/player data attributes, and direct media URLs.
- Follows up to three player/embed URLs that are explicitly exposed by the fetched page.
- Scans those player pages for directly exposed `.m3u8`, `.mp4`, `.mkv`, and `.webm` URLs.
- Android-visible diagnostic cards when no playable URL is found.

## Test
For the CineWave test shown during development, use TMDB 278 (The Shawshank Redemption), movie. The known successful candidate observed previously was `https://cinewave.org.lk/movies/278`.

If the result is still DEBUG, send the complete visible cards. The `P1`, `P2`, etc. entries show whether an exposed player/embed page was found and whether it contained a direct media URL.

The provider does not attempt to bypass authentication, CAPTCHA, DRM, paywalls, or anti-bot controls.
