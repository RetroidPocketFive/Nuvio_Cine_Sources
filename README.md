# RetroidPocketFive Cine Sources v5.0.0

Nuvio providers for CineJoy and CineWave.

## v5 changes

- Parses the contents of inline `<script>...</script>` blocks instead of only counting script tags.
- Detects direct media URLs in JavaScript, including escaped slash/Unicode forms.
- Detects player/embed/video/stream/source URL configuration inside scripts.
- Detects external `<script src="...">` files and inspects a limited number of them.
- Inspects discovered player URLs and external scripts for further media/player URLs.
- Keeps visible diagnostic entries when no playable stream is found.
- Uses Promise chains for Hermes-compatible plugin execution.

## Install

Publish these files to the GitHub repository and add the raw `manifest.json` URL to Nuvio. Do not add the ZIP itself as the repository URL.

Example raw manifest URL:
`https://raw.githubusercontent.com/RetroidPocketFive/Nuvio_Cine_Sources/refs/heads/main/manifest.json`

## Diagnostics

For CineWave, a successful page fetch should now show entries such as:

- `SCRIPT_MEDIA=n`
- `SCRIPT_PLAYERS=n`
- `EXT_SCRIPTS=n`
- `SCAN_TARGETS=n`

If a script or player contains a directly exposed `.m3u8`, `.mp4`, `.mkv`, or `.webm` URL, the provider returns it as a Nuvio stream.

This scraper does not attempt to bypass DRM, CAPTCHA, login requirements, or anti-bot/access controls.
