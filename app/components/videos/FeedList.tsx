'use client'

import { useState, useTransition } from 'react'
import VideoCard, {
  type VideoItem,
  type VideoStatusItem,
} from './VideoCard'
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
  const [, startTransition] = useTransition()

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
      {visible.map((v) => (
        <VideoCard
          key={v.videoId}
          video={v}
          status={statuses[v.videoId]}
          onHide={hide}
        />
      ))}
    </div>
  )
}
