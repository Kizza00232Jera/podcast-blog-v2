import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserProfile } from '@clerk/nextjs'
import { getGoogleAccessToken } from '@/app/lib/youtube'

export const dynamic = 'force-dynamic'

// Account management. The YouTube link itself is Clerk's Google connected
// account (with the youtube.readonly scope) — users add/remove it in the
// Clerk profile below; the card on top shows the resulting status.
export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const token = await getGoogleAccessToken(userId)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-ui text-3xl font-bold tracking-tight text-ink">
        Profile
      </h1>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 place-items-center rounded-full text-lg ${
              token ? 'bg-amber-dim text-amber' : 'bg-surface-2 text-ink-muted'
            }`}
          >
            ▶
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              YouTube {token ? 'connected' : 'not connected'}
            </p>
            <p className="text-xs text-ink-muted">
              {token
                ? 'Your subscriptions can sync on the Channels page.'
                : 'Add your Google account under “Connected accounts” below, then sync on the Channels page.'}
            </p>
          </div>
        </div>
        <Link
          href="/channels"
          className="rounded-full bg-amber px-4 py-2 text-xs font-semibold text-canvas hover:bg-amber-strong transition-colors"
        >
          {token ? 'Manage channels' : 'Go to Channels'}
        </Link>
      </div>

      <UserProfile
        routing="hash"
        appearance={{
          elements: {
            rootBox: 'w-full',
            cardBox: 'w-full shadow-none border border-line rounded-[var(--radius-card)]',
          },
        }}
      />
    </div>
  )
}
