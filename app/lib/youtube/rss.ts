import 'server-only'
import type { YtVideo } from './api'

// YouTube's per-channel RSS feed: latest ~15 uploads, zero API quota.
// The feed is a small, stable Atom document, so a few targeted regexes are
// enough — no XML parser dependency.

const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id='

export async function fetchChannelRss(channelId: string): Promise<YtVideo[]> {
  const res = await fetch(`${FEED}${channelId}`, {
    // Feed updates are not instant anyway; a short CDN cache is fine.
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const xml = await res.text()

  const videos: YtVideo[] = []
  const entries = xml.split('<entry>').slice(1)
  for (const entry of entries) {
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
    if (!videoId) continue
    const title = decodeXml(entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1]
    const thumb = entry.match(/<media:thumbnail url="([^"]+)"/)?.[1] ?? null
    videos.push({
      videoId,
      channelId,
      title,
      thumbnailUrl: thumb ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      publishedAt: published ? new Date(published) : new Date(),
    })
  }
  return videos
}

function decodeXml(s: string): string {
  return s
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
}
