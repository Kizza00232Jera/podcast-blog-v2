'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// While at least one card on the page is still "generating", refresh the
// server component every few seconds so the card flips to its finished
// (or error) state once the QStash worker writes the summary.
export default function GeneratingPoller({ active }: { active: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(id)
  }, [active, router])

  return null
}
