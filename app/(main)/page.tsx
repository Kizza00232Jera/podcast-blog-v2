import { createClient } from '@/app/lib/supabase/server'
import PodcastGrid from '@/app/components/podcast/PodcastGrid'
import type { PodcastPost } from '@/app/types/podcast'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: podcasts } = await supabase
    .from('podcast_posts')
    .select('*')
    .order('created_at', { ascending: false })

  const list: PodcastPost[] = podcasts ?? []

  const totalHours = Math.round(list.reduce((sum, p) => sum + (p.duration_minutes ?? 0), 0) / 60)
  const avgRating = list.length > 0
    ? (list.reduce((sum, p) => sum + (p.rating ?? 0), 0) / list.length).toFixed(1)
    : '—'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Podcasts</h1>
        <Link
          href="/upload"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Upload
        </Link>
      </div>

      {list.length > 0 ? (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{list.length}</p>
              <p className="text-xs text-gray-500 mt-1">Podcasts saved</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{totalHours}h</p>
              <p className="text-xs text-gray-500 mt-1">Total listened</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{avgRating}</p>
              <p className="text-xs text-gray-500 mt-1">Avg rating</p>
            </div>
          </div>

          <PodcastGrid podcasts={list} />
        </>
      ) : (
        <div className="text-center py-24">
          <p className="text-gray-400 text-lg mb-6">No podcasts yet.</p>
          <Link
            href="/upload"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Upload your first one
          </Link>
        </div>
      )}
    </div>
  )
}