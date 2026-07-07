import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getGoogleAccessToken } from '@/app/lib/youtube'
import { getChannels } from '@/app/lib/db/channel-queries'
import ChannelList from '@/app/components/channels/ChannelList'
import SyncButton from '@/app/components/channels/SyncButton'

export const dynamic = 'force-dynamic'

// Subscription management: sync the user's YouTube subscriptions and toggle
// the ones that are podcast sources. Toggled channels drive /feed and open
// their own video list.
export default async function ChannelsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const [token, channels] = await Promise.all([
    getGoogleAccessToken(userId),
    getChannels(userId),
  ])

  // Not connected → prompt (connection itself lives on the profile page).
  if (!token && channels.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-ui text-3xl font-bold tracking-tight text-ink">
          Connect your YouTube
        </h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Link your Google account to pull in the channels you&apos;re subscribed
          to. Then toggle the ones that publish podcasts, and their new
          episodes show up in your feed.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-block rounded-full bg-amber px-6 py-3 text-sm font-semibold text-canvas hover:bg-amber-strong transition-colors"
        >
          Connect in your profile
        </Link>
      </div>
    )
  }

  const toggledCount = channels.filter((c) => c.toggled).length

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-ui text-3xl font-bold tracking-tight text-ink">
            Channels
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {channels.length > 0
              ? `${channels.length} subscriptions · ${toggledCount} podcast ${
                  toggledCount === 1 ? 'source' : 'sources'
                }`
              : 'Pull in your YouTube subscriptions to get started.'}
          </p>
        </div>
        {channels.length > 0 && <SyncButton />}
      </div>

      {channels.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong py-20">
          <SyncButton primary />
        </div>
      ) : (
        <ChannelList
          channels={channels.map((c) => ({
            channel_id: c.channel_id,
            title: c.title,
            thumbnail_url: c.thumbnail_url,
            toggled: c.toggled,
          }))}
        />
      )}
    </div>
  )
}
