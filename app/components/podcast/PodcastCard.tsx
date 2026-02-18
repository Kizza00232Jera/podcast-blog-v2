import Link from 'next/link'
import type { PodcastPost } from '@/app/types/podcast'

export default function PodcastCard({ podcast }: { podcast: PodcastPost }) {
  return (
    <Link href={`/podcast/${podcast.slug}`}>
      <div>
        <img src={podcast.thumbnail_url} alt={podcast.title} />
        <h2>{podcast.title}</h2>
        <p>{podcast.podcast_name} · {podcast.creator}</p>
        <p>{podcast.duration_minutes} min · ★ {podcast.rating}</p>
        <div>
          {podcast.tags.map(tag => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}
