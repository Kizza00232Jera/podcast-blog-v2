import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getToggledChannels } from '@/app/lib/db/channel-queries'
import { getFeedVideos } from '@/app/lib/db/feed-queries'
import { getVideoStatuses } from '@/app/lib/db/video-status'
import { refreshFeed } from '@/app/lib/feed-refresh'
import FeedList from '@/app/components/videos/FeedList'
import GeneratingPoller from '@/app/components/podcast/GeneratingPoller'

export const dynamic = 'force-dynamic'

// Latest full-length uploads from the user's toggled channels, refreshed on
// open via YouTube RSS (skipped when refreshed <15 min ago).
export default async function FeedPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const toggled = await getToggledChannels(userId)

  if (toggled.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-ui text-3xl font-bold tracking-tight text-ink">
          Your feed is empty
        </h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Toggle a few podcast channels and their new episodes will land here,
          ready to summarize with one click.
        </p>
        <Link
          href="/channels"
          className="mt-6 inline-block rounded-full bg-amber px-6 py-3 text-sm font-semibold text-canvas hover:bg-amber-strong transition-colors"
        >
          Pick your channels
        </Link>
      </div>
    )
  }

  // Refresh failures (YouTube down, Redis hiccup) must never take the page
  // down — show what's cached.
  try {
    await refreshFeed(userId, toggled)
  } catch {}

  const [videos, statuses] = await Promise.all([
    getFeedVideos(userId),
    getVideoStatuses(userId),
  ])
  const anyGenerating = Object.values(statuses).some(
    (s) => s.status === 'generating'
  )

  return (
    <div>
      <GeneratingPoller active={anyGenerating} />

      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-ui text-3xl font-bold tracking-tight text-ink">
            Feed
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            New episodes from {toggled.length} podcast{' '}
            {toggled.length === 1 ? 'source' : 'sources'} · shorts and clips
            hidden
          </p>
        </div>
        <Link
          href="/channels"
          className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-ink-soft hover:border-line-strong hover:text-ink transition-colors"
        >
          Manage channels
        </Link>
      </div>

      <FeedList
        videos={videos.map((v) => ({
          videoId: v.video_id,
          channelId: v.channel_id,
          title: v.title,
          thumbnailUrl: v.thumbnail_url,
          publishedAt: v.published_at.toISOString(),
          durationSeconds: v.duration_seconds,
          channelTitle: v.channel_title,
        }))}
        statuses={statuses}
      />
    </div>
  )
}
