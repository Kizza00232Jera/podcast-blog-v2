'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import {
  getGoogleAccessToken,
  fetchSubscriptions,
  uploadsPlaylistId,
} from '@/app/lib/youtube'
import { syncChannels, setChannelToggle } from '@/app/lib/db/channel-queries'

/** Pull the user's YouTube subscriptions into the channels table. */
export async function syncSubscriptionsAction(): Promise<{
  synced: number
  error?: string
}> {
  const { userId } = await auth()
  if (!userId) return { synced: 0, error: 'Not signed in' }

  const token = await getGoogleAccessToken(userId)
  if (!token) {
    return { synced: 0, error: 'No Google account connected.' }
  }

  try {
    const subs = await fetchSubscriptions(token)
    await syncChannels(
      userId,
      subs.map((s) => ({
        channel_id: s.channelId,
        title: s.title,
        thumbnail_url: s.thumbnailUrl,
        uploads_playlist_id: uploadsPlaylistId(s.channelId),
      }))
    )
    revalidatePath('/channels')
    return { synced: subs.length }
  } catch {
    return { synced: 0, error: 'YouTube sync failed. Try again.' }
  }
}

export async function toggleChannelAction(
  ytChannelId: string,
  toggled: boolean
): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not signed in')
  await setChannelToggle(userId, ytChannelId, toggled)
  revalidatePath('/channels')
  revalidatePath('/feed')
}
