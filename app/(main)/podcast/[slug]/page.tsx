import { createClient } from '@/app/lib/supabase/server'
import { notFound } from 'next/navigation'
import DeleteButton from '@/app/components/podcast/DeleteButton'
import type { Section } from '@/app/types/podcast'

export default async function PodcastPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!podcast) {
    notFound()
  }

  return (
    <div>
      <img src={podcast.thumbnail_url} alt={podcast.title} />
      <h1>{podcast.title}</h1>
      <p>{podcast.podcast_name} · {podcast.creator}</p>
      <p>{podcast.duration_minutes} min · ★ {podcast.rating}</p>

      <div>
        {podcast.tags.map((tag: string) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <h2>Overview</h2>
      <p>{podcast.summary.overview}</p>

      {podcast.summary.sections.map((section: Section, i: number) => (
        <div key={i}>
          <h3>{section.heading}</h3>
          <p>{section.content}</p>
        </div>
      ))}

      {podcast.summary.quotes.length > 0 && (
        <div>
          <h2>Quotes</h2>
          {podcast.summary.quotes.map((quote: string, i: number) => (
            <blockquote key={i}>{quote}</blockquote>
          ))}
        </div>
      )}

      <h2>Key Takeaways</h2>
      <ul>
        {podcast.key_takeaways.map((item: string, i: number) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h2>Actionable Advice</h2>
      <ul>
        {podcast.actionable_advice.map((item: string, i: number) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <a href={podcast.source_link} target="_blank" rel="noopener noreferrer">
        Listen to original
      </a>

      <DeleteButton podcastId={podcast.id} />
    </div>
  )
}
