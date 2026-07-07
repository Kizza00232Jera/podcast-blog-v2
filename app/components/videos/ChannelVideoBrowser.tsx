'use client'

import { useEffect, useState } from 'react'
import VideoCard, {
  type VideoItem,
  type VideoStatusItem,
} from './VideoCard'
import GeneratingPoller from '@/app/components/podcast/GeneratingPoller'

// Client half of the channel page: renders the server-fetched first page and
// appends more via /api/channels/[id]/videos. The status map covers the
// user's whole library, so newly loaded pages get badges for free.
export default function ChannelVideoBrowser({
  channelId,
  initialVideos,
  initialNextPageToken,
  statuses,
}: {
  channelId: string
  initialVideos: VideoItem[]
  initialNextPageToken: string | null
  statuses: Record<string, VideoStatusItem>
}) {
  const [videos, setVideos] = useState(initialVideos)
  const [nextPageToken, setNextPageToken] = useState(initialNextPageToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Same click-to-poll handoff as FeedList: a local kick starts the poller,
  // the server-reported 'generating' status takes over on the next refresh.
  const [localKick, setLocalKick] = useState(0)
  const serverGenerating = Object.values(statuses).some(
    (s) => s.status === 'generating'
  )
  useEffect(() => {
    if (serverGenerating) setLocalKick(0)
  }, [serverGenerating])

  async function loadMore() {
    if (!nextPageToken) return
    setLoading(true)
    setError('')
    const res = await fetch(
      `/api/channels/${channelId}/videos?pageToken=${encodeURIComponent(nextPageToken)}`
    )
    setLoading(false)
    if (!res.ok) {
      setError('Could not load more videos.')
      return
    }
    const data = await res.json()
    setVideos((v) => {
      const seen = new Set(v.map((x) => x.videoId))
      return [...v, ...data.videos.filter((x: VideoItem) => !seen.has(x.videoId))]
    })
    setNextPageToken(data.nextPageToken)
  }

  return (
    <div>
      <GeneratingPoller active={serverGenerating || localKick > 0} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <VideoCard
            key={v.videoId}
            video={v}
            status={statuses[v.videoId]}
            onGenerated={() => setLocalKick((k) => k + 1)}
          />
        ))}
      </div>

      {error && (
        <p className="mt-6 text-center text-sm text-red-400/90">{error}</p>
      )}

      {nextPageToken && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-medium text-ink-soft hover:border-line-strong hover:text-ink disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
