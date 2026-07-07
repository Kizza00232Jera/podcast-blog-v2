import 'server-only'
import { db } from './index'
import {
  channels,
  type ChannelRow,
  type NewChannelRow,
} from './schema'
import { and, asc, desc, eq, notInArray, sql } from 'drizzle-orm'

/** All synced subscriptions for a user — toggled first, then alphabetical. */
export async function getChannels(userId: string): Promise<ChannelRow[]> {
  return db
    .select()
    .from(channels)
    .where(eq(channels.user_id, userId))
    .orderBy(desc(channels.toggled), asc(channels.title))
}

/** Only the channels marked as podcast sources (drive the /feed page). */
export async function getToggledChannels(userId: string): Promise<ChannelRow[]> {
  return db
    .select()
    .from(channels)
    .where(and(eq(channels.user_id, userId), eq(channels.toggled, true)))
    .orderBy(asc(channels.title))
}

export async function getChannel(
  userId: string,
  ytChannelId: string
): Promise<ChannelRow | null> {
  const rows = await db
    .select()
    .from(channels)
    .where(
      and(eq(channels.user_id, userId), eq(channels.channel_id, ytChannelId))
    )
    .limit(1)
  return rows[0] ?? null
}

/**
 * Replace the user's subscription list with a fresh sync: upsert every
 * fetched channel (preserving its toggle) and drop rows the user has
 * unsubscribed from on YouTube.
 */
export async function syncChannels(
  userId: string,
  subs: Omit<NewChannelRow, 'user_id'>[]
): Promise<void> {
  if (subs.length === 0) return
  const now = new Date()
  await db
    .insert(channels)
    .values(subs.map((s) => ({ ...s, user_id: userId, synced_at: now })))
    .onConflictDoUpdate({
      target: [channels.user_id, channels.channel_id],
      set: {
        title: sql`excluded.title`,
        thumbnail_url: sql`excluded.thumbnail_url`,
        uploads_playlist_id: sql`excluded.uploads_playlist_id`,
        synced_at: now,
      },
    })
  await db.delete(channels).where(
    and(
      eq(channels.user_id, userId),
      notInArray(
        channels.channel_id,
        subs.map((s) => s.channel_id)
      )
    )
  )
}

/** Flip the podcast-source toggle. Scoped to the owner. */
export async function setChannelToggle(
  userId: string,
  ytChannelId: string,
  toggled: boolean
): Promise<void> {
  await db
    .update(channels)
    .set({ toggled })
    .where(
      and(eq(channels.user_id, userId), eq(channels.channel_id, ytChannelId))
    )
}
