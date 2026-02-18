'use client'

import Link from 'next/link'
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
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900">
          🎙️ Podcast Blog
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/upload" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Upload
          </Link>
          <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}