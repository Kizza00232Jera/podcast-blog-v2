import { auth } from '@clerk/nextjs/server'
import { SignUpButton } from '@clerk/nextjs'
import Link from 'next/link'
import PodcastGrid from '@/app/components/podcast/PodcastGrid'
import GeneratingPoller from '@/app/components/podcast/GeneratingPoller'
import { getPublicPosts, getUserPosts } from '@/app/lib/db/queries'
import type { PodcastPost } from '@/app/types/podcast'

export default async function HomePage() {
  const { userId } = await auth()

  const list = (
    userId ? await getUserPosts(userId) : await getPublicPosts()
  ) as unknown as PodcastPost[]

  const anyGenerating = list.some((p) => p.status === 'generating')
  const ready = list.filter((p) => p.status === 'ready')
  const totalHours = Math.round(
    ready.reduce((s, p) => s + (p.duration_minutes ?? 0), 0) / 60
  )

  return (
    <div>
      <GeneratingPoller active={anyGenerating} />

      {/* Header / hero */}
      {userId ? (
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-ui text-3xl font-bold tracking-tight text-ink">
              Your library
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {ready.length} {ready.length === 1 ? 'summary' : 'summaries'}
              {totalHours > 0 && ` · ${totalHours}h of listening, read in minutes`}
            </p>
          </div>
          <Link
            href="/upload"
            className="shrink-0 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-amber-strong transition-colors"
          >
            + Generate
          </Link>
        </div>
      ) : (
        <div className="mb-12 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-amber">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            Summaries written by Claude
          </span>
          <h1 className="mt-5 font-ui text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Listen less. <span className="text-amber">Know more.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Paste a YouTube podcast link and get a rich, readable summary, the
            kind you can actually learn from. Browse the showcase below, or sign
            up to build your own private library.
          </p>
          <div className="mt-6">
            <SignUpButton mode="modal">
              <button className="rounded-full bg-amber px-6 py-3 text-sm font-semibold text-canvas hover:bg-amber-strong transition-colors">
                Start your library
              </button>
            </SignUpButton>
          </div>
        </div>
      )}

      {!userId && list.length > 0 && (
        <h2 className="mb-5 font-ui text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Showcase
        </h2>
      )}

      {list.length > 0 ? (
        <PodcastGrid podcasts={list} />
      ) : userId ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-20 text-center">
          <p className="text-ink-muted">Nothing here yet.</p>
          <Link
            href="/upload"
            className="mt-5 inline-block rounded-full bg-amber px-6 py-3 text-sm font-semibold text-canvas hover:bg-amber-strong transition-colors"
          >
            Generate your first summary
          </Link>
        </div>
      ) : (
        <p className="text-ink-muted">No public summaries yet.</p>
      )}
    </div>
  )
}
