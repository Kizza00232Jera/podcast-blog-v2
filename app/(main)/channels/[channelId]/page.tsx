import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getChannel } from '@/app/lib/db/channel-queries'
import { getVideoStatuses } from '@/app/lib/db/video-status'
import { fetchUploadsPage, fetchDurations, uploadsPlaylistId } from '@/app/lib/youtube'
import ChannelVideoBrowser from '@/app/components/videos/ChannelVideoBrowser'

export const dynamic = 'force-dynamic'

// A channel's uploads, YouTube-style: first 50 server-rendered, more via the
// paging API. Cards carry generate buttons + summarized/generating badges.
export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const { channelId } = await params
  const channel = await getChannel(userId, channelId)
  if (!channel) notFound()

  let videos: Awaited<ReturnType<typeof fetchUploadsPage>>['videos'] = []
  let nextPageToken: string | null = null
  let durations = new Map<string, number>()
  let loadError = false
  try {
    const page = await fetchUploadsPage(
      channel.uploads_playlist_id ?? uploadsPlaylistId(channelId)
    )
    videos = page.videos
    nextPageToken = page.nextPageToken
    durations = await fetchDurations(videos.map((v) => v.videoId))
  } catch {
    loadError = true
  }

  const statuses = await getVideoStatuses(userId)

  return (
    <div>
      <Link
        href="/channels"
        className="text-sm text-ink-muted hover:text-ink transition-colors"
      >
        ← Channels
      </Link>

      <div className="mb-8 mt-4 flex items-center gap-4">
        {channel.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnail_url}
            alt=""
            className="h-14 w-14 rounded-full object-cover bg-surface-2"
          />
        )}
        <div>
          <h1 className="font-ui text-3xl font-bold tracking-tight text-ink">
            {channel.title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Latest uploads · click ⚡ to summarize
          </p>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-16 text-center text-ink-muted">
          Could not load videos from YouTube. Refresh to try again.
        </p>
      ) : (
        <ChannelVideoBrowser
          channelId={channelId}
          initialVideos={videos.map((v) => ({
            ...v,
            publishedAt: v.publishedAt.toISOString(),
            durationSeconds: durations.get(v.videoId) ?? null,
          }))}
          initialNextPageToken={nextPageToken}
          statuses={statuses}
        />
      )}
    </div>
  )
}
