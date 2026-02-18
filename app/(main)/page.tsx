import { createClient } from '@/app/lib/supabase/server'
import PodcastCard from '@/app/components/podcast/PodcastCard'
import type { PodcastPost } from '@/app/types/podcast'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: podcasts } = await supabase
    .from('podcast_posts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Podcasts</h1>
        <Link
          href="/upload"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Upload
        </Link>
      </div>

      {podcasts && podcasts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {podcasts.map((podcast: PodcastPost) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
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
