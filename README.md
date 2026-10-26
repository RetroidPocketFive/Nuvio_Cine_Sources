# Vadapav Nuvio Provider

Uses Vadapav's published API endpoint list (https://vadapav.mov/developers):
- `GET /api/s/{query}` — search
- `GET /api/m/{id}` — metadata
- `GET /f/{id}` — file stream/download

## Setup
1. Add your own TMDB API v3 key to `TMDB_API_KEY` in `providers/vadapav.js`.
2. Host this folder in a Git repository.
3. Install the repository from Nuvio's **Plugins** section if your app build supports plugins.
4. Test an item you are authorized to access.

## Limitations
This is a first-pass implementation based on the published endpoint list. The live search JSON schema could not be verified during packaging, so the field mapping may need adjustment. The `/f/{id}` endpoint may serve a file download rather than a stream supported by every player. Movie/episode matching and actual playback must be tested on your Nuvio device. No streams will be returned until `TMDB_API_KEY` is configured.

Use only content you have the right to access. Some app-store builds of Nuvio may not support plugins; check for a Plugins section in your installed build.
