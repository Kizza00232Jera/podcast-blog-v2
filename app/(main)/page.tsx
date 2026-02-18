import { createClient } from '@/app/lib/supabase/server'
import PodcastCard from '@/app/components/podcast/PodcastCard'
import type { PodcastPost } from '@/app/types/podcast'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      {podcasts && podcasts.length > 0 ? (
        <div>
          {podcasts.map((podcast: PodcastPost) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      ) : (
        <p>No podcasts yet. Upload one!</p>
      )}
    </div>
  )
}
