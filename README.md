# RetroidPocketFive Cine Sources — Android-visible diagnostics

This build keeps the direct-scraper architecture and changes the diagnostic output so it is visible in Nuvio's Android stream list.

## Test

Use a movie such as TMDB `550` (Fight Club). If no playable stream is found, the provider returns one or more diagnostic entries whose **name** contains the candidate result. The Android UI has been observed to display the provider name and quality, but not reliably display the stream title, so diagnostic text is deliberately placed in `name`.

Example entries:

- `cinejoy [1] candidates=4`
- `cinejoy [2] c1:ERROR=HTTP 404`
- `cinejoy [3] c2:HTTP=OK,chars=18432,streams=0`
- `cinejoy [4] RESULT=ZERO_STREAMS`

Do not play the DEBUG entries; their URL is a non-playable placeholder.

The provider uses Promise chains and the Nuvio stream object format for Hermes/React Native compatibility. Nuvio's current provider guide documents `getStreams(tmdbId, mediaType, season, episode)` and stream objects with `name`, `title`, `url`, and `quality`. 

The actual CineJoy/CineWave site-specific URL candidates remain modular and should be adjusted only after the visible diagnostic output shows the real response.
