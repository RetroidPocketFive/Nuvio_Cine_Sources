/* Nuvio provider template. Returns no streams until connected to an authorised/public media API or direct media endpoint. */
function getStreams(tmdbId, mediaType, season, episode) {
  console.log("[cinejoy] Request", mediaType, tmdbId, season, episode);
  return Promise.resolve([]);
}
module.exports = { getStreams };
