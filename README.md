# Vadapav Nuvio Provider

Searches these two hosts:
- `https://vadapav.mov`
- `https://a.111477.xyz`

## Setup

1. Add this repository in Nuvio's **Plugins** section using the raw manifest URL:
   `https://raw.githubusercontent.com/RetroidPocketFive/Nuvio_Cine_Sources/main/manifest.json`
2. Refresh the repository and enable the Vadapav provider.
3. Test a movie or episode you are authorized to access.

## Metadata

The provider no longer requires a TMDB API key. It attempts to read the title from the public TMDB web page for the ID passed by Nuvio, then searches both hosts. This is a keyless workaround, not an official TMDB API integration, and may fail if TMDB changes its page markup or blocks the request.

## Limitations

The two hostnames are configured with the same assumed API routes (`/api/s/{query}` and `/f/{id}`), but their live response schemas and playback behavior have not yet been verified in Nuvio. If a host uses different routes or response fields, the provider may return no results. The `/f/{id}` URL may be a download endpoint rather than a direct stream. Test on your device.

Use only content you have the right to access. Some app-store builds of Nuvio may not support plugins; check for a Plugins section in your installed build.
