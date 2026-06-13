'use client'

import { useState, useMemo } from 'react'
import PodcastCard from './PodcastCard'
import type { PodcastPost } from '@/app/types/podcast'

type SortOption = 'newest' | 'oldest' | 'longest' | 'shortest'

export default function PodcastGrid({ podcasts }: { podcasts: PodcastPost[] }) {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    podcasts.forEach((p) => p.tags?.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [podcasts])

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
  }, [podcasts, search, activeTag, sort])

  const hasFilters = search || activeTag

  const selectClass =
    'rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink-soft focus:outline-none focus:border-line-strong'

  return (
    <div>
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
