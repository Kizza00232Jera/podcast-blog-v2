'use client'

import { useMemo, useState, useTransition } from 'react'
import VideoCard, {
  type VideoItem,
  type VideoStatusItem,
} from './VideoCard'
import GeneratingPoller from '@/app/components/podcast/GeneratingPoller'
import { getHiddenVideosAction, hideVideoAction } from '@/app/lib/feed-actions'

type DateFilter = 'all' | 'today' | 'week' | 'month'

function withinDateFilter(publishedAt: string, filter: DateFilter): boolean {
  if (filter === 'all') return true
  const published = new Date(publishedAt).getTime()
  const now = new Date()
  const cutoff =
    filter === 'today'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      : filter === 'week'
        ? now.getTime() - 7 * 24 * 60 * 60 * 1000
        : now.getTime() - 30 * 24 * 60 * 60 * 1000
  return published >= cutoff
}

const pillClass = (active: boolean) =>
  `shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? 'bg-amber text-canvas'
      : 'border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
  }`

const selectClass =
  'rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink-soft focus:outline-none focus:border-line-strong'

// Feed grid with optimistic hide: the card disappears immediately, the
// server action records it, and a failure puts it back.
export default function FeedList({
  videos,
  statuses,
  channels,
}: {
  videos: VideoItem[]
  statuses: Record<string, VideoStatusItem>
  channels: { channelId: string; title: string; avatar: string | null }[]
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  // Set when a generate is clicked here, so polling starts immediately;
  // once the server reports the row, its own status keeps the poller alive.
  const [localKick, setLocalKick] = useState(0)
  const [, startTransition] = useTransition()

  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [showHidden, setShowHidden] = useState(false)
  const [hiddenVideos, setHiddenVideos] = useState<VideoItem[]>([])
  const [loadingHidden, setLoadingHidden] = useState(false)

  const serverGenerating = Object.values(statuses).some(
    (s) => s.status === 'generating'
  )
  // Once the server reports the new row, its status drives the poller and the
  // local kick retires — otherwise a finished batch would poll forever.
  // (Adjust-state-during-render pattern, not an effect.)
  if (serverGenerating && localKick > 0) setLocalKick(0)
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

  async function toggleShowHidden() {
    if (!showHidden && hiddenVideos.length === 0) {
      setLoadingHidden(true)
      try {
        setHiddenVideos(await getHiddenVideosAction())
      } finally {
        setLoadingHidden(false)
      }
    }
    setShowHidden((v) => !v)
  }

  function toggleChannel(channelId: string) {
    setActiveChannels((cur) => {
      const next = new Set(cur)
      if (next.has(channelId)) next.delete(channelId)
      else next.add(channelId)
      return next
    })
  }

  const hiddenVideoIds = useMemo(
    () => new Set(hiddenVideos.map((v) => v.videoId)),
    [hiddenVideos]
  )

  const filtered = useMemo(() => {
    const notLocallyHidden = videos.filter((v) => !hidden.has(v.videoId))
    const combined = showHidden
      ? [...notLocallyHidden, ...hiddenVideos]
      : notLocallyHidden
    return combined.filter(
      (v) =>
        (activeChannels.size === 0 || activeChannels.has(v.channelId)) &&
        withinDateFilter(v.publishedAt, dateFilter)
    )
  }, [videos, hidden, showHidden, hiddenVideos, activeChannels, dateFilter])

  const hasFilters = activeChannels.size > 0 || dateFilter !== 'all' || showHidden

  function clearFilters() {
    setActiveChannels(new Set())
    setDateFilter('all')
    setShowHidden(false)
  }

  if (videos.length === 0 && !showHidden) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-20 text-center text-ink-muted">
        Nothing new right now. New uploads from your podcast sources show up
        here.
      </p>
    )
  }

  return (
    <div>
      {channels.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveChannels(new Set())}
            className={pillClass(activeChannels.size === 0)}
          >
            All
          </button>
          {channels.map((c) => (
            <button
              key={c.channelId}
              type="button"
              onClick={() => toggleChannel(c.channelId)}
              className={`flex items-center gap-2 py-1 pl-1 pr-3.5 ${pillClass(
                activeChannels.has(c.channelId)
              )}`}
            >
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.avatar}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover bg-surface-2"
                />
              ) : (
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                    activeChannels.has(c.channelId)
                      ? 'bg-canvas/20'
                      : 'bg-surface-2 text-ink-muted'
                  }`}
                >
                  {c.title[0]}
                </span>
              )}
              <span className="max-w-40 truncate">{c.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className={selectClass}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <button
          type="button"
          onClick={toggleShowHidden}
          disabled={loadingHidden}
          className={pillClass(showHidden)}
        >
          {loadingHidden ? 'Loading…' : 'Show hidden'}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-20 text-center text-ink-muted">
          No episodes match your filters.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <GeneratingPoller active={anyGenerating} />
          {filtered.map((v) => (
            <VideoCard
              key={v.videoId}
              video={v}
              status={statuses[v.videoId]}
              onHide={hiddenVideoIds.has(v.videoId) ? undefined : hide}
              onGenerated={() => setLocalKick((k) => k + 1)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
