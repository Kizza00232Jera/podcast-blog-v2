'use client'

import { useEffect, useState, useTransition } from 'react'
import VideoCard, {
  type VideoItem,
  type VideoStatusItem,
} from './VideoCard'
import GeneratingPoller from '@/app/components/podcast/GeneratingPoller'
import { hideVideoAction } from '@/app/lib/feed-actions'

// Feed grid with optimistic hide: the card disappears immediately, the
// server action records it, and a failure puts it back.
export default function FeedList({
  videos,
  statuses,
}: {
  videos: VideoItem[]
  statuses: Record<string, VideoStatusItem>
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  // Set when a generate is clicked here, so polling starts immediately;
  // once the server reports the row, its own status keeps the poller alive.
  const [localKick, setLocalKick] = useState(0)
  const [, startTransition] = useTransition()

  const serverGenerating = Object.values(statuses).some(
    (s) => s.status === 'generating'
  )
  // Once the server reports the new row, its status drives the poller and the
  // local kick retires — otherwise a finished batch would poll forever.
  useEffect(() => {
    if (serverGenerating) setLocalKick(0)
  }, [serverGenerating])
  const anyGenerating = serverGenerating || localKick > 0

  function hide(videoId: string) {
    setHidden((h) => new Set(h).add(videoId))
    startTransition(async () => {
      try {
        await hideVideoAction(videoId)
      } catch {
        setHidden((h) => {
          const next = new Set(h)
          next.delete(videoId)
          return next
        })
      }
    })
  }

  const visible = videos.filter((v) => !hidden.has(v.videoId))

  if (visible.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-20 text-center text-ink-muted">
        Nothing new right now. New uploads from your podcast sources show up
        here.
      </p>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <GeneratingPoller active={anyGenerating} />
      {visible.map((v) => (
        <VideoCard
          key={v.videoId}
          video={v}
          status={statuses[v.videoId]}
          onHide={hide}
          onGenerated={() => setLocalKick((k) => k + 1)}
        />
      ))}
    </div>
  )
}
