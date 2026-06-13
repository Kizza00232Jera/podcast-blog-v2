import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from '@/app/components/podcast/DeleteButton'
import { getPostBySlug } from '@/app/lib/db/queries'
import type { PodcastPost, Section } from '@/app/types/podcast'

function formatDuration(min: number): string {
  if (!min) return ''
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function PullQuote({ text }: { text: string }) {
  const clean = text.replace(/^["“”']+|["“”']+$/g, '').trim()
  return (
    <blockquote className="my-8 border-l-2 border-amber pl-5">
      <p className="font-reading text-xl italic leading-relaxed text-ink">
        &quot;{clean}&quot;
      </p>
    </blockquote>
  )
}

export default async function PodcastPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()

  const row = await getPostBySlug(slug)
  // Private posts are only visible to their owner; public ones to all.
  if (!row || (!row.is_public && row.user_id !== userId)) {
    notFound()
  }
  const podcast = row as unknown as PodcastPost
  const isOwner = podcast.user_id === userId

  const sections: Section[] = podcast.summary?.sections ?? []
  // Old shape stores quotes at summary.quotes; new shape stores one per section.
  const topQuotes: string[] = podcast.summary?.quotes ?? []
  const sectionsHaveQuotes = sections.some((s) => s.quote)

  // Takeaways / resources live either inside the summary (new) or in their own
  // legacy columns (old). Prefer whichever is populated.
  const takeaways =
    podcast.summary?.key_takeaways?.length
      ? podcast.summary.key_takeaways
      : podcast.key_takeaways ?? []
  const resources =
    podcast.summary?.resources?.length
      ? podcast.summary.resources
      : podcast.resources ?? []

  return (
    <article className="prose-measure mx-auto">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
      >
        ← Back
      </Link>

      {/* Eyebrow */}
      {podcast.podcast_name && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber">
          {podcast.podcast_name}
        </p>
      )}

      <h1 className="font-ui text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.5rem]">
        {podcast.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        {podcast.creator && <span>{podcast.creator}</span>}
        {podcast.duration_minutes > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>{formatDuration(podcast.duration_minutes)}</span>
          </>
        )}
      </div>

      {podcast.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {podcast.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {podcast.thumbnail_url && (
        <div className="mt-7 overflow-hidden rounded-[var(--radius-card)] border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={podcast.thumbnail_url}
            alt=""
            className="aspect-video w-full object-cover"
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {podcast.source_link && (
          <a
            href={podcast.source_link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-canvas hover:bg-amber-strong transition-colors"
          >
            Watch on YouTube
          </a>
        )}
        {isOwner && <DeleteButton podcastId={podcast.id} />}
      </div>

      {/* Lede */}
      {podcast.summary?.overview && (
        <p className="article-body mt-9 !text-[1.25rem] !leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:font-ui first-letter:text-5xl first-letter:font-bold first-letter:text-amber">
          {podcast.summary.overview}
        </p>
      )}

      {/* Body */}
      <div className="article-body mt-10">
        {sections.map((section, i) => (
          <section key={i} className="mt-10 first:mt-0">
            <h2 className="font-ui text-xl font-bold tracking-tight text-ink">
              {section.heading}
            </h2>
            <div className="mt-4">
              {section.content
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((para, j) => {
                  const trimmed = para.trim()
                  const looksQuote =
                    trimmed.startsWith('"') && trimmed.endsWith('"')
                  return looksQuote ? (
                    <PullQuote key={j} text={trimmed} />
                  ) : (
                    <p key={j}>{trimmed}</p>
                  )
                })}
            </div>

            {/* New shape: each section carries its own woven quote. */}
            {section.quote && <PullQuote text={section.quote} />}

            {/* Old shape: distribute the top-level quotes between sections. */}
            {!sectionsHaveQuotes &&
              topQuotes[i] &&
              i < topQuotes.length &&
              sections.length > 1 && <PullQuote text={topQuotes[i]} />}
          </section>
        ))}

        {/* Old shape with a single section: show remaining quotes in a block. */}
        {!sectionsHaveQuotes && sections.length <= 1 && topQuotes.length > 0 && (
          <div className="mt-8">
            {topQuotes.map((q, i) => (
              <PullQuote key={i} text={q} />
            ))}
          </div>
        )}
      </div>

      {/* Key takeaways */}
      {takeaways.length > 0 && (
        <div className="mt-12 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="font-ui text-sm font-semibold uppercase tracking-wider text-amber">
            Key takeaways
          </h2>
          <ul className="mt-4 space-y-3">
            {takeaways.map((t, i) => (
              <li key={i} className="flex gap-3 text-ink-soft">
                <span aria-hidden className="mt-1 text-amber">
                  ◗
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resources */}
      {resources.length > 0 && (
        <div className="mt-8">
          <h2 className="font-ui text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Resources mentioned
          </h2>
          <ul className="mt-3 space-y-2">
            {resources.map((r, i) => (
              <li key={i} className="text-sm text-ink-soft">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
