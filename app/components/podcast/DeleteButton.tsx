'use client'

import { useTransition } from 'react'
import { deletePodcastAction } from '@/app/lib/actions'

export default function DeleteButton({ podcastId }: { podcastId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    const confirmed = confirm('Are you sure you want to delete this podcast?')
    if (!confirmed) return
    startTransition(() => deletePodcastAction(podcastId))
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted hover:border-red-500/40 hover:text-red-300 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
