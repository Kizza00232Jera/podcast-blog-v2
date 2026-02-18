'use client'

import { useState, useMemo } from 'react'
import PodcastCard from './PodcastCard'
import type { PodcastPost } from '@/app/types/podcast'

type SortOption = 'newest' | 'oldest' | 'highest_rated' | 'longest' | 'shortest'

export default function PodcastGrid({ podcasts }: { podcasts: PodcastPost[] }) {
  const [search, setSearch] = useState('')
  const [activePodcast, setActivePodcast] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')

  const allPodcasts = useMemo(() => {
    const names = new Set<string>()
    podcasts.forEach(p => { if (p.podcast_name) names.add(p.podcast_name) })
    return Array.from(names).sort()
  }, [podcasts])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    podcasts.forEach(p => p.tags?.forEach((t: string) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [podcasts])

  const filtered = useMemo(() => {
    let result = [...podcasts]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.podcast_name?.toLowerCase().includes(q) ||
        p.creator?.toLowerCase().includes(q)
      )
    }

    if (activePodcast) {
      result = result.filter(p => p.podcast_name === activePodcast)
    }

    if (activeTag) {
      result = result.filter(p => p.tags?.includes(activeTag))
    }

    result.sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'highest_rated') return (b.rating ?? 0) - (a.rating ?? 0)
      if (sort === 'longest') return (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0)
      if (sort === 'shortest') return (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0)
      return 0
    })

    return result
  }, [podcasts, search, activePodcast, activeTag, sort])

  const hasActiveFilters = search || activePodcast || activeTag

  return (
    <div>
      {/* Row 1: Search + Sort */}
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          placeholder="Search by title, podcast or creator..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-indigo-400"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest_rated">Highest rated</option>
          <option value="longest">Longest</option>
          <option value="shortest">Shortest</option>
        </select>
      </div>

      {/* Row 2: Podcast + Tag dropdowns + clear */}
      <div className="flex gap-3 mb-6 items-center">
        <select
          value={activePodcast}
          onChange={e => setActivePodcast(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-indigo-400"
        >
          <option value="">All podcasts</option>
          {allPodcasts.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <select
          value={activeTag}
          onChange={e => setActiveTag(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-indigo-400"
        >
          <option value="">All tags</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setActivePodcast(''); setActiveTag('') }}
            className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-xs text-gray-400 mb-4">
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        </p>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(podcast => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400">No podcasts match your filters.</p>
        </div>
      )}
    </div>
  )
}