# Nuvio Cine Sources

Nuvio providers for authorized/public playback sources.

## What was fixed

- Real `getStreams(tmdbId, mediaType, season, episode)` implementation.
- Movie and TV parameter validation.
- JSON API response parsing.
- Nuvio stream-object normalization.
- Quality normalization (4K/1080p/720p/etc.).
- Optional playback headers and size.
- Promise-based HTTP flow compatible with Hermes-style runtimes.
- Working build script.
- Provider smoke tests.
- Providers disabled by default until an authorized playback endpoint is configured.

## API contract

Set `API_BASE` in the provider source to an endpoint you operate or are authorized to use.

It receives:

`tmdbId`, `type`, and for TV `season` + `episode`.

It may return:

```json
{
  "streams": [
    {
      "name": "My Source",
      "title": "1080p",
      "url": "https://example.com/video.m3u8",
      "quality": "1080p",
      "headers": {
        "Referer": "https://example.com/"
      }
    }
  ]
}
```

or an array of stream objects.

## Build/test

```bash
npm test
npm run build
```

This repository intentionally does not implement DRM, CAPTCHA, authentication, paywall, or anti-bot bypasses. If you control the media source or have permission to use it, connect its documented/public playback API.
