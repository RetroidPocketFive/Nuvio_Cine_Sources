/*
 * Nuvio provider template for an authorised media source.
 *
 * This deliberately leaves stream resolution unimplemented.
 * Add an official/public API or direct media endpoint that you
 * are authorised to use.
 */

function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve(getAuthorisedStreams(tmdbId, mediaType, season, episode))
    .catch(function (err) {
      console.error("[CineWave template] " + (err && err.message ? err.message : err));
      return [];
    });
}

function getAuthorisedStreams(tmdbId, mediaType, season, episode) {
  return [];
}

module.exports = { getStreams };
