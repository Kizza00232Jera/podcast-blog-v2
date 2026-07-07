'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatVideoDuration, timeAgo } from '@/app/lib/format'

export interface VideoItem {
  videoId: string
  channelId: string
  title: string
  thumbnailUrl: string | null
  publishedAt: string // ISO
  durationSeconds: number | null
  channelTitle?: string
}

export interface VideoStatusItem {
  status: 'generating' | 'ready' | 'error'
  slug: string
}

// YouTube-style video card with a one-click Generate action. Status comes
// from the user's library: ready → link to the summary, generating → live
// label (GeneratingPoller on the page keeps refreshing), none → Generate.
export default function VideoCard({
  video,
  status,
  onHide,
  onGenerated,
}: {
  video: VideoItem
  status?: VideoStatusItem
  onHide?: (videoId: string) => void
  /** Fired after a generate POST is accepted — lets the list start polling. */
  onGenerated?: () => void
}) {
  // Local override so the button flips to "Generating…" immediately. The
  // server status always wins once it exists (the poller refreshes it to
  // 'generating' and then 'ready'), so the local flag only bridges the gap
  // between the click and the next refresh.
  const [localGenerating, setLocalGenerating] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const effective: VideoStatusItem | undefined =
    status ?? (localGenerating ? { status: 'generating', slug: '' } : undefined)

  async function generate() {
    setPending(true)
    setError('')
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        channelId: video.channelId,
      }),
    })
    setPending(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Something went wrong.')
      return
    }
    setLocalGenerating(true)
    onGenerated?.()
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-all duration-300 hover:border-line-strong">
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        {video.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        {video.durationSeconds != null && (
          <span className="absolute bottom-2 right-2 rounded-md bg-canvas/85 px-1.5 py-0.5 text-[11px] font-medium text-ink-soft backdrop-blur-sm">
            {formatVideoDuration(video.durationSeconds)}
          </span>
        )}
        {onHide && (
          <button
            type="button"
            aria-label="Hide from feed"
            onClick={() => onHide(video.videoId)}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-canvas/70 text-ink-muted backdrop-blur-sm transition-colors hover:text-ink"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {video.channelTitle && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber">
            {video.channelTitle}
          </p>
        )}
        <h3 className="font-ui text-[15px] font-semibold leading-snug text-ink line-clamp-2">
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber transition-colors"
          >
            {video.title}
          </a>
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          {timeAgo(video.publishedAt)}
        </p>

        <div className="mt-auto pt-4">
          {effective?.status === 'ready' ? (
            <Link
              href={`/podcast/${effective.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber-dim/40 px-4 py-1.5 text-xs font-semibold text-amber hover:bg-amber-dim transition-colors"
            >
              Summarized ✓ · read
            </Link>
          ) : effective?.status === 'generating' ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-xs font-medium text-amber">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
              Generating…
            </span>
          ) : (
            <button
              type="button"
              onClick={generate}
              disabled={pending}
              className="rounded-full bg-amber px-4 py-1.5 text-xs font-semibold text-canvas hover:bg-amber-strong disabled:opacity-50 transition-colors"
            >
              {pending ? 'Starting…' : '⚡ Generate summary'}
            </button>
          )}
          {error && <p className="mt-2 text-xs text-red-400/90">{error}</p>}
        </div>
      </div>
    </article>
  )
}
