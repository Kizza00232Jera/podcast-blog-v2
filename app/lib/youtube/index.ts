export { getGoogleAccessToken } from './token'
export {
  fetchSubscriptions,
  fetchUploadsPage,
  fetchDurations,
  uploadsPlaylistId,
  parseIsoDuration,
  type YtSubscription,
  type YtVideo,
  type UploadsPage,
} from './api'
export { fetchChannelRss } from './rss'

// Feed policy: only full-length episodes belong in the podcast feed.
// Shorts are ≤3 min, clips/trailers are usually under 10 — one threshold
// covers both.
export const MIN_FEED_DURATION_SECONDS = 10 * 60
