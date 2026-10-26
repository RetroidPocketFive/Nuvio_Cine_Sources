# Vadapav Nuvio Provider

Searches Vadapav using its documented search API:
- Search: `https://vadapav.mov/api/s/{query}`
- File endpoint: `https://vadapav.mov/f/{id}`

## Setup

1. Add this repository in Nuvio's **Plugins** section using the raw manifest URL:
   `https://raw.githubusercontent.com/RetroidPocketFive/Nuvio_Cine_Sources/main/manifest.json`
2. Refresh the repository and enable the Vadapav provider.
3. Test a movie or episode you are authorized to access.

## Metadata

The provider does not require a TMDB API key. It attempts to read the title from the public TMDB web page for the ID passed by Nuvio, then searches Vadapav. This is a keyless workaround, not an official TMDB API integration, and may fail if TMDB changes its page markup or blocks the request.

## Playback notes

Vadapav's developer documentation describes `/f/{id}` as the file endpoint and says it supports HTTP Range requests. The provider filters out folders returned by search so that only file results are offered to Nuvio. Playback still needs to be tested in the installed Nuvio build.

Use only content you have the right to access. Some app-store builds of Nuvio may not support plugins; check for a Plugins section in your installed build.
