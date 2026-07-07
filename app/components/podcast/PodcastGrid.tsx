'use client'

import { useState, useMemo } from 'react'
import PodcastCard from './PodcastCard'
import type { PodcastPost } from '@/app/types/podcast'

type SortOption = 'newest' | 'oldest' | 'longest' | 'shortest'

// A post's channel identity: real YouTube channel id when the summary came
// from a feed/channel card, otherwise the free-text podcast_name (legacy).
function channelKey(p: PodcastPost): string | null {
  if (p.channel_id) return p.channel_id
  if (p.podcast_name) return `name:${p.podcast_name}`
  return null
}

export default function PodcastGrid({
  podcasts,
  channelAvatars = {},
  showChannelChips = false,
}: {
  podcasts: PodcastPost[]
  /** YouTube channel id → avatar url (from the synced channels table). */
  channelAvatars?: Record<string, string | null>
  showChannelChips?: boolean
}) {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [activeChannel, setActiveChannel] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    podcasts.forEach((p) => p.tags?.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [podcasts])

  const channels = useMemo(() => {
    const map = new Map<string, { label: string; avatar: string | null }>()
    for (const p of podcasts) {
      const key = channelKey(p)
      if (!key || map.has(key)) continue
      map.set(key, {
        label: p.podcast_name || p.creator || 'Unknown',
        avatar: p.channel_id ? (channelAvatars[p.channel_id] ?? null) : null,
      })
    }
    return Array.from(map, ([key, v]) => ({ key, ...v })).sort((a, b) =>
      a.label.localeCompare(b.label)
    )
  }, [podcasts, channelAvatars])

  const filtered = useMemo(() => {
    let result = [...podcasts]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.podcast_name?.toLowerCase().includes(q) ||
          p.creator?.toLowerCase().includes(q)
      )
    }
    if (activeTag) {
      result = result.filter((p) => p.tags?.includes(activeTag))
    }
    if (activeChannel) {
      result = result.filter((p) => channelKey(p) === activeChannel)
    }

    result.sort((a, b) => {
      if (sort === 'newest')
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'oldest')
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'longest')
        return (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0)
      if (sort === 'shortest')
        return (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0)
      return 0
    })
    return result
  }, [podcasts, search, activeTag, activeChannel, sort])

  const hasFilters = search || activeTag || activeChannel

  const selectClass =
    'rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink-soft focus:outline-none focus:border-line-strong'

  return (
    <div>
      {showChannelChips && channels.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveChannel('')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeChannel === ''
                ? 'bg-amber text-canvas'
                : 'border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
            }`}
          >
            All
          </button>
          {channels.map((c) => (
            <button
              key={c.key}
              onClick={() =>
                setActiveChannel((cur) => (cur === c.key ? '' : c.key))
              }
              className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-xs font-semibold transition-colors ${
                activeChannel === c.key
                  ? 'bg-amber text-canvas'
                  : 'border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
              }`}
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
                    activeChannel === c.key
                      ? 'bg-canvas/20'
                      : 'bg-surface-2 text-ink-muted'
                  }`}
                >
                  {c.label[0]}
                </span>
              )}
              <span className="max-w-40 truncate">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search summaries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-line-strong"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className={selectClass}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="longest">Longest</option>
          <option value="shortest">Shortest</option>
        </select>
        {allTags.length > 0 && (
          <select
            value={activeTag}
            onChange={(e) => setActiveTag(e.target.value)}
            className={selectClass}
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('')
              setActiveTag('')
              setActiveChannel('')
            }}
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-ink-muted">
          No summaries match your filters.
        </div>
      )}
    </div>
  )
}
