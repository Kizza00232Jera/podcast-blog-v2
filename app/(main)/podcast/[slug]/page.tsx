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

  return (
    <div className="max-w-3xl mx-auto">

      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        &larr; Back
      </Link>

      {/* Header card */}
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white mb-6">
        <div className="h-64 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
          {podcast.thumbnail_url && (
            <img src={podcast.thumbnail_url} alt={podcast.title} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{podcast.title}</h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
            <span>{podcast.podcast_name}</span>
            <span>&middot;</span>
            <span>{podcast.creator}</span>
            <span>&middot;</span>
            <span>{podcast.duration_minutes} min</span>
            <span>&middot;</span>
            <span className="text-yellow-400">{'★'.repeat(podcast.rating)}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {podcast.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <a
              href={podcast.source_link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Watch on YouTube
            </a>
            <DeleteButton podcastId={podcast.id} />
          </div>
        </div>
      </div>

      {/* Overview */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 leading-relaxed">{podcast.summary?.overview}</p>
      </section>

      {/* Sections */}
      {podcast.summary?.sections?.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="space-y-5">
            {podcast.summary.sections.map((section: Section, i: number) => (
              <div key={i}>
                <h3 className="font-medium text-gray-900 mb-1">{section.heading}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quotes */}
      {podcast.summary?.quotes?.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quotes</h2>
          <div className="space-y-3">
            {podcast.summary.quotes.map((quote: string, i: number) => (
              <blockquote key={i} className="border-l-4 border-indigo-500 pl-4 text-gray-700 italic text-sm leading-relaxed">
                {quote}
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Takeaways + Advice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Takeaways</h2>
          <ul className="space-y-2">
            {podcast.key_takeaways.map((item: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-indigo-500 mt-0.5 shrink-0">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Actionable Advice</h2>
          <ul className="space-y-2">
            {podcast.actionable_advice.map((item: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-indigo-500 mt-0.5 shrink-0">&rarr;</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Resources */}
      {podcast.resources.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Resources</h2>
          <ul className="space-y-1">
            {podcast.resources.map((item: string, i: number) => (
              <li key={i} className="text-sm text-gray-700">&bull; {item}</li>
            ))}
          </ul>
        </section>
      )}

    </div>
  )
}