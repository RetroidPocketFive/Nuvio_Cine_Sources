/*
 * Nuvio provider template for an authorised media source.
 *
 * IMPORTANT:
 * This template intentionally does not bypass DRM, authentication,
 * paywalls, anti-bot controls, or protected/encrypted stream resolvers.
 *
 * Replace getAuthorisedStreams() with an API/direct-media integration
 * for content you are authorised to access.
 */

function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(getAuthorisedStreams(tmdbId, mediaType, season, episode))
    .catch(function (err) {
      console.error("[CineJoy template] " + (err && err.message ? err.message : err));
      return [];
    });
}

function getAuthorisedStreams(tmdbId, mediaType, season, episode) {
  // Return only media URLs your source/API explicitly makes available
  // to your account/application.
  //
  // Example:
  // return [{
  //   name: "My authorised source",
  //   title: "1080p",
  //   url: "https://example.com/video.m3u8",
  //   quality: "1080p"
  // }];
  return [];
}

module.exports = { getStreams };
