import Link from 'next/link'
import type { PodcastPost } from '@/app/types/podcast'

function formatDuration(min: number): string {
  if (!min) return ''
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function PodcastCard({ podcast }: { podcast: PodcastPost }) {
  const generating = podcast.status === 'generating'
  const errored = podcast.status === 'error'

  const preview =
    podcast.summary?.overview ||
    podcast.summary?.sections?.[0]?.content ||
    (podcast.key_takeaways?.length ? podcast.key_takeaways[0] : '')

  const inner = (
    <article className="group h-full flex flex-col rounded-[var(--radius-card)] border border-line bg-surface overflow-hidden transition-all duration-300 hover:border-line-strong hover:-translate-y-0.5">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface-2 overflow-hidden">
        {podcast.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={podcast.thumbnail_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent" />
        {podcast.duration_minutes > 0 && !generating && (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-canvas/80 px-2.5 py-1 text-[11px] font-medium text-ink-soft backdrop-blur-sm">
            {formatDuration(podcast.duration_minutes)}
          </span>
        )}
        {generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/75 px-6 backdrop-blur-sm">
            {(() => {
              const steps = {
                queued: { label: 'Queued', pct: 12 },
                transcribing: { label: 'Fetching transcript', pct: 42 },
                summarizing: { label: 'Writing the summary', pct: 80 },
              } as const
              const s = steps[podcast.stage ?? 'queued'] ?? steps.queued
              return (
                <>
                  <span className="text-sm font-medium text-amber">{s.label}…</span>
                  <div className="h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="echonotes-bar h-full rounded-full bg-amber transition-[width] duration-700 ease-out"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {podcast.podcast_name && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber">
            {podcast.podcast_name}
          </p>
        )}
        <h3 className="font-ui text-[17px] font-semibold leading-snug text-ink line-clamp-2">
          {podcast.title}
        </h3>

        {errored ? (
          <p className="mt-3 text-sm text-red-400/90 line-clamp-3">
            Could not generate: {podcast.error_message || 'unknown error'}
          </p>
        ) : (
          preview && (
            <p className="mt-3 text-sm leading-relaxed text-ink-muted line-clamp-3">
              {preview}
            </p>
          )
        )}

        {podcast.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {podcast.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-soft"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 pt-1 text-sm font-medium text-amber/0 transition-colors group-hover:text-amber">
          <span className="text-ink-muted transition-colors group-hover:text-amber">
            {generating ? 'In progress' : errored ? 'View' : 'Read summary'}
          </span>
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </div>
    </article>
  )

  // Generating cards aren't clickable yet (no content); error + ready link out.
  if (generating) {
    return <div className="h-full">{inner}</div>
  }
  return (
    <Link href={`/podcast/${podcast.slug}`} className="block h-full">
      {inner}
    </Link>
  )
}
