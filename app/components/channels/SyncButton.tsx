'use client'

import { useState, useTransition } from 'react'
import { syncSubscriptionsAction } from '@/app/lib/channel-actions'

export default function SyncButton({ primary = false }: { primary?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function sync() {
    setError('')
    startTransition(async () => {
      const res = await syncSubscriptionsAction()
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className={primary ? 'text-center' : 'flex items-center gap-3'}>
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className={
          primary
            ? 'rounded-full bg-amber px-6 py-3 text-sm font-semibold text-canvas hover:bg-amber-strong disabled:opacity-50 transition-colors'
            : 'rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-ink-soft hover:border-line-strong hover:text-ink disabled:opacity-50 transition-colors'
        }
      >
        {pending
          ? 'Syncing…'
          : primary
            ? 'Sync my YouTube subscriptions'
            : '↻ Resync'}
      </button>
      {error && <p className="mt-3 text-sm text-red-400/90">{error}</p>}
    </div>
  )
}
