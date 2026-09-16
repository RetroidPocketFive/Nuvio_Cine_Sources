# Nuvio Cine Source Template

This is a safe starting point for a Nuvio provider repository.

## Current inspection

The public CineJoy pages expose movie/series metadata and episode listings. Search results also indicate that CineJoy uses a separate resolver/API infrastructure for playback. The public CineWave homepage exposes a catalogue UI.

This package intentionally does **not** implement extraction/decryption of protected third-party streams. It is designed to be completed with an official/public API or direct media URLs that you are authorised to access.

## Nuvio provider interface

A provider exports:

```js
getStreams(tmdbId, mediaType, season, episode)
```

and returns:

```js
[
  {
    name: "Provider",
    title: "1080p",
    url: "https://example.com/video.m3u8",
    quality: "1080p"
  }
]
```

## Build

Requires Node.js:

```bash
npm install
npm run build
```

The generated files appear in `providers/`.

## Nuvio

Nuvio provider repositories use a `manifest.json` that points to the bundled provider files. Test the generated provider in Nuvio's Plugin Tester before enabling it.

## Completing the adapters

For a legitimate source, the next information needed is one of:

* documented API endpoint and authentication method;
* direct HLS/MP4 URLs returned by the source's API;
* an API response example showing how a TMDB/IMDb ID maps to a media URL.

Do not add code intended to bypass DRM, authentication, paywalls, CAPTCHAs, anti-bot systems, or encrypted/protected playback.
