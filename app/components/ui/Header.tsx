'use client';

import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav>
      <span>Podcast Blog</span>
      <span>{user.email}</span>
      <button onClick={handleSignOut}>Sign out</button>
    </nav>
  )
}
