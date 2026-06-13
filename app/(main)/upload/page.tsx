'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// New flow: paste a YouTube link, click Generate. The server inserts a
// "generating" placeholder and hands the heavy work to the QStash worker.
// We send the user back to their library where the card fills itself in.
export default function UploadPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
      setSubmitting(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-ui text-3xl font-bold tracking-tight text-ink">
        Generate a summary
      </h1>
      <p className="mt-2 text-ink-soft">
        Paste a YouTube podcast link. Claude reads the captions and writes a full
        summary in the background. It appears in your library when it is ready.
      </p>

      <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            required
            className="flex-1 rounded-full border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-line-strong"
          />
          <button
            type="submit"
            disabled={submitting}
            className="whitespace-nowrap rounded-full bg-amber px-6 py-2.5 text-sm font-semibold text-canvas hover:bg-amber-strong disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Starting…' : 'Generate'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <p className="mt-4 text-xs text-ink-muted">
          3 generations per day. Best results on podcasts with captions.
        </p>
      </div>
    </div>
  )
}
