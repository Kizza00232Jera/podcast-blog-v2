'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

export default function DeleteButton({ podcastId }: { podcastId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    const confirmed = confirm('Are you sure you want to delete this podcast?')
    if (!confirmed) return

    await supabase.from('podcasts').delete().eq('id', podcastId)
    router.push('/')
    router.refresh()
  }

  return (
    <button onClick={handleDelete}>Delete</button>
  )
}
