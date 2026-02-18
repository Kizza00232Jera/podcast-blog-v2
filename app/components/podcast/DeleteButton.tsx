'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

export default function DeleteButton({ podcastId }: { podcastId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    const confirmed = confirm('Are you sure you want to delete this podcast?')
    if (!confirmed) return

    await supabase.from('podcast_posts').delete().eq('id', podcastId)
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  )
}