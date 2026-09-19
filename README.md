# Nuvio Cine Sources — Android Diagnostic Build

Direct-scraper providers for authorized/public CineJoy and CineWave sources.

## Android debugging

This build has diagnostic logging enabled by default. It does **not** require Node.js on Android.

In Nuvio's Plugin Tester, run `providers/cinejoy.js` or `providers/cinewave.js` and open the **Logs** tab. Look for lines beginning with:

- `[cinejoy][START]` / `[cinewave][START]` — confirms `getStreams()` was called.
- `[...][CANDIDATES]` — shows the URLs the provider will try.
- `[...][HTTP]` — shows request and HTTP status.
- `[...][EXTRACT]` — shows what the HTML parser found.
- `[...][CANDIDATE]` — shows per-page results.
- `[...][DONE] ZERO STREAMS` — confirms the provider completed without a playable URL.
- `[...][FATAL]` — unexpected runtime failure.

The logs intentionally do not print the full HTML response or full stream URLs.

## What to send back

If you get zero streams, copy the complete Logs output for one provider and send it back. The most useful test is a known movie such as TMDB `550` (Fight Club). For TV, test with a known TMDB ID plus season/episode.

## Build

`node build.js` copies the source providers into `providers/`.

No Node.js installation is required on the Android device itself; Node is only needed if you build/test the repository on a computer.

## Scope

The extractors only parse directly exposed HTTP(S) media URLs and ordinary page markup. They do not attempt to bypass DRM, CAPTCHA, authentication, paywalls, or anti-bot protections.
