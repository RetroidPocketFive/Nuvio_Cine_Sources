# Nuvio Cine Sources — Android diagnostic direct-scraper build

This package contains direct-scraper Nuvio providers for CineJoy and CineWave.

## Android diagnostic mode

Normal Android Nuvio builds do not necessarily expose provider `console.log()` output. This build therefore returns a **DEBUG stream entry** when no playable stream is found. The diagnostic text is shown in the stream result title instead of relying on Android logs.

Test with a known movie such as TMDB `550` (Fight Club), then send the exact `DEBUG — ...` title back for analysis.

The DEBUG entry points to `https://example.com/` and is intentionally non-playable. It exists only to surface diagnostics in the Nuvio stream list.

## Important

The extractor only returns media URLs that are directly exposed by the fetched page HTML (for example `.m3u8`, `.mp4`, `.mkv`, or `.webm`). It does not bypass DRM, CAPTCHA, authentication, paywalls, or anti-bot controls.

The site-specific URL patterns are intentionally modular because public CineJoy/CineWave pages may change their routes or use third-party embeds.
