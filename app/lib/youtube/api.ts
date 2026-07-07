import 'server-only'

// YouTube Data API v3 helpers. Two auth styles:
//  - subscriptions.list needs the user's OAuth token (mine=true)
//  - playlistItems/videos are public data and use the server API key
// Quota costs are 1 unit per call — the free 10k/day budget is never a concern
// as long as we stay away from search.list (100 units).

const API = 'https://www.googleapis.com/youtube/v3'

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY is not set')
  return key
}

export interface YtSubscription {
  channelId: string
  title: string
  thumbnailUrl: string | null
}

export interface YtVideo {
  videoId: string
  channelId: string
  title: string
  thumbnailUrl: string | null
  publishedAt: Date
}

/** The user's full subscription list (paginated, 1 unit per 50 channels). */
export async function fetchSubscriptions(
  accessToken: string
): Promise<YtSubscription[]> {
  const subs: YtSubscription[] = []
  let pageToken = ''
  do {
    const url = new URL(`${API}/subscriptions`)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('mine', 'true')
    url.searchParams.set('maxResults', '50')
    url.searchParams.set('order', 'alphabetical')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      throw new Error(`subscriptions.list failed (${res.status})`)
    }
    const json = await res.json()
    for (const item of json.items ?? []) {
      const s = item.snippet
      if (!s?.resourceId?.channelId) continue
      subs.push({
        channelId: s.resourceId.channelId,
        title: s.title ?? '',
        thumbnailUrl:
          s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url ?? null,
      })
    }
    pageToken = json.nextPageToken ?? ''
  } while (pageToken)
  return subs
}

/** Every channel's uploads playlist is its UC… id with a UU prefix. */
export function uploadsPlaylistId(channelId: string): string {
  return channelId.startsWith('UC') ? `UU${channelId.slice(2)}` : channelId
}

export interface UploadsPage {
  videos: YtVideo[]
  nextPageToken: string | null
}

/** One page (50) of a channel's uploads, oldest → use pageToken to go deeper. */
export async function fetchUploadsPage(
  playlistId: string,
  pageToken?: string
): Promise<UploadsPage> {
  const url = new URL(`${API}/playlistItems`)
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('playlistId', playlistId)
  url.searchParams.set('maxResults', '50')
  url.searchParams.set('key', apiKey())
  if (pageToken) url.searchParams.set('pageToken', pageToken)

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`playlistItems.list failed (${res.status})`)
  }
  const json = await res.json()
  const videos: YtVideo[] = []
  for (const item of json.items ?? []) {
    const videoId = item.contentDetails?.videoId
    const s = item.snippet
    if (!videoId || !s) continue
    videos.push({
      videoId,
      channelId: s.channelId ?? '',
      title: s.title ?? '',
      thumbnailUrl:
        s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url ?? null,
      publishedAt: new Date(
        item.contentDetails?.videoPublishedAt ?? s.publishedAt
      ),
    })
  }
  return { videos, nextPageToken: json.nextPageToken ?? null }
}

/** Durations (seconds) for up to 50 video ids per call. */
export async function fetchDurations(
  videoIds: string[]
): Promise<Map<string, number>> {
  const durations = new Map<string, number>()
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const url = new URL(`${API}/videos`)
    url.searchParams.set('part', 'contentDetails')
    url.searchParams.set('id', batch.join(','))
    url.searchParams.set('key', apiKey())

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      throw new Error(`videos.list failed (${res.status})`)
    }
    const json = await res.json()
    for (const item of json.items ?? []) {
      const seconds = parseIsoDuration(item.contentDetails?.duration ?? '')
      if (seconds !== null) durations.set(item.id, seconds)
    }
  }
  return durations
}

/** ISO 8601 duration (PT1H23M45S) → seconds. Null when unparseable. */
export function parseIsoDuration(iso: string): number | null {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return null
  const [, d, h, min, s] = m
  return (
    (Number(d) || 0) * 86400 +
    (Number(h) || 0) * 3600 +
    (Number(min) || 0) * 60 +
    (Number(s) || 0)
  )
}
