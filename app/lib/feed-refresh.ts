import 'server-only'
import { Redis } from '@upstash/redis'
import { fetchChannelRss, fetchDurations } from '@/app/lib/youtube'
import type { ChannelRow } from '@/app/lib/db/schema'
import { upsertVideos, getKnownDurations } from '@/app/lib/db/feed-queries'

// Opening /feed refreshes it: quota-free RSS for every toggled channel in
// parallel, then one cheap videos.list call for durations we don't have yet.
// A short Redis lock keeps rapid revisits from re-fetching (shared Redis —
// prefix namespaces our keys, same convention as ratelimit.ts).
const redis = Redis.fromEnv()
const REFRESH_TTL_SECONDS = 15 * 60

export async function refreshFeed(
  userId: string,
  toggledChannels: ChannelRow[]
): Promise<void> {
  if (toggledChannels.length === 0) return

  const lockKey = `pcast:feedrefresh:${userId}`
  const fresh = await redis.set(lockKey, '1', {
    nx: true,
    ex: REFRESH_TTL_SECONDS,
  })
  // Key already existed → refreshed within the TTL, skip.
  if (fresh === null) return

  const results = await Promise.allSettled(
    toggledChannels.map((c) => fetchChannelRss(c.channel_id))
  )
  const videos = results.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : []
  )
  if (videos.length === 0) return

  // Durations: only fetch what the cache doesn't know yet.
  const known = await getKnownDurations(videos.map((v) => v.videoId))
  const missing = videos.filter((v) => !known.has(v.videoId))
  let durations = new Map<string, number>()
  if (missing.length > 0) {
    try {
      durations = await fetchDurations(missing.map((v) => v.videoId))
    } catch {
      // Backfill failure is non-fatal: videos stay out of the feed until a
      // later refresh fills their duration. Clear the lock so it retries.
      await redis.del(lockKey)
    }
  }

  await upsertVideos(
    videos.map((v) => ({
      video_id: v.videoId,
      channel_id: v.channelId,
      title: v.title,
      thumbnail_url: v.thumbnailUrl,
      duration_seconds: durations.get(v.videoId) ?? null,
      published_at: v.publishedAt,
    }))
  )
}
