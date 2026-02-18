import { createClient } from '@/app/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
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
    .from('podcast_posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!podcast) {
    notFound()
  }

  const sections: Section[] = podcast.summary?.sections ?? []
  const quotes: string[] = podcast.summary?.quotes ?? []

  return (
    <div className="max-w-2xl mx-auto px-4">

      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        &larr; Back
      </Link>

      {/* Header card */}
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white mb-8">
        <div className="h-64 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
          {podcast.thumbnail_url && (
            <img src={podcast.thumbnail_url} alt={podcast.title} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{podcast.title}</h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-4">
            <span>{podcast.podcast_name}</span>
            <span>&middot;</span>
            <span>{podcast.creator}</span>
            {podcast.duration_minutes && (
              <>
                <span>&middot;</span>
                <span>{podcast.duration_minutes} min</span>
              </>
            )}
            {podcast.rating && (
              <>
                <span>&middot;</span>
                <span className="text-yellow-400">{'★'.repeat(podcast.rating)}{'☆'.repeat(5 - podcast.rating)}</span>
              </>
            )}
          </div>

          {podcast.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {podcast.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {podcast.source_link && (
              <a
                href={podcast.source_link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Watch on YouTube
              </a>
            )}
            <DeleteButton podcastId={podcast.id} />
          </div>
        </div>
      </div>

      {/* Article body */}
      <article className="space-y-10">

        {/* Sections — flowing article, no labels */}
        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{section.heading}</h2>
            <div className="space-y-4">
              {section.content
                .split(/\n\n+/)
                .filter(p => p.trim())
                .map((paragraph, j) => {
                  // If a paragraph looks like a quote (starts/ends with "), render it as a pull quote
                  const isQuote = paragraph.trim().startsWith('"') && paragraph.trim().endsWith('"')
                  if (isQuote) {
                    return (
                      <blockquote
                        key={j}
                        className="border-l-4 border-indigo-500 pl-5 py-1 my-6 text-gray-700 italic text-base leading-relaxed"
                      >
                        {paragraph.trim()}
                      </blockquote>
                    )
                  }
                  return (
                    <p key={j} className="text-gray-700 leading-relaxed text-base">
                      {paragraph.trim()}
                    </p>
                  )
                })}
            </div>

            {/* Inject a quote after every 2nd section */}
            {quotes[Math.floor(i / 2)] && i % 2 === 1 && (
              <blockquote className="border-l-4 border-indigo-500 pl-5 py-1 my-6 text-gray-700 italic text-base leading-relaxed">
                &ldquo;{quotes[Math.floor(i / 2)]}&rdquo;
              </blockquote>
            )}
          </div>
        ))}

        {/* Any remaining quotes not injected inline */}
        {quotes.length > 0 && sections.length <= 1 && (
          <div className="space-y-4">
            {quotes.map((quote, i) => (
              <blockquote
                key={i}
                className="border-l-4 border-indigo-500 pl-5 py-1 text-gray-700 italic text-base leading-relaxed"
              >
                &ldquo;{quote}&rdquo;
              </blockquote>
            ))}
          </div>
        )}

      </article>

    </div>
  )
}
