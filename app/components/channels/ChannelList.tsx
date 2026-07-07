'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleChannelAction } from '@/app/lib/channel-actions'

export interface ChannelItem {
  channel_id: string
  title: string
  thumbnail_url: string | null
  toggled: boolean
}

// The full subscription list with a client-side search box and a
// podcast-source switch per channel. Toggles are optimistic: flip locally,
// fire the server action, roll back on failure.
export default function ChannelList({ channels }: { channels: ChannelItem[] }) {
  const [query, setQuery] = useState('')
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()

  const withState = useMemo(
    () =>
      channels.map((c) => ({
        ...c,
        toggled: overrides[c.channel_id] ?? c.toggled,
      })),
    [channels, overrides]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? withState.filter((c) => c.title.toLowerCase().includes(q))
      : withState
    // Toggled first, then alphabetical — mirrors the server ordering even
    // after optimistic flips.
    return [...list].sort(
      (a, b) =>
        Number(b.toggled) - Number(a.toggled) || a.title.localeCompare(b.title)
    )
  }, [withState, query])

  function flip(channelId: string, next: boolean) {
    setOverrides((o) => ({ ...o, [channelId]: next }))
    startTransition(async () => {
      try {
        await toggleChannelAction(channelId, next)
      } catch {
        setOverrides((o) => ({ ...o, [channelId]: !next }))
      }
    })
  }

  return (
    <div>
      <input
        type="search"
        placeholder="Search your subscriptions…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6 w-full max-w-md rounded-full border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-line-strong"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((c) => (
          <div
            key={c.channel_id}
            className={`flex items-center gap-3 rounded-[var(--radius-card)] border p-3.5 transition-colors ${
              c.toggled
                ? 'border-amber/40 bg-amber-dim/30'
                : 'border-line bg-surface'
            }`}
          >
            {c.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.thumbnail_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover bg-surface-2"
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-muted">
                {c.title[0] ?? '?'}
              </span>
            )}

            <div className="min-w-0 flex-1">
              {c.toggled ? (
                <Link
                  href={`/channels/${c.channel_id}`}
                  className="block truncate text-sm font-semibold text-ink hover:text-amber transition-colors"
                >
                  {c.title}
                </Link>
              ) : (
                <p className="truncate text-sm font-semibold text-ink">
                  {c.title}
                </p>
              )}
              <p className="text-xs text-ink-muted">
                {c.toggled ? 'Podcast source · view videos →' : 'Subscribed'}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={c.toggled}
              aria-label={`Use ${c.title} as a podcast source`}
              onClick={() => flip(c.channel_id, !c.toggled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                c.toggled ? 'bg-amber' : 'bg-surface-2 ring-1 ring-line-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-canvas transition-[left] ${
                  c.toggled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-muted">
          No channels match “{query}”.
        </p>
      )}
    </div>
  )
}
