import 'server-only'
import { db } from './index'
import {
  channels,
  channelVideos,
  hiddenVideos,
  type NewChannelVideoRow,
} from './schema'
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { MIN_FEED_DURATION_SECONDS } from '@/app/lib/youtube'

/** Upsert cached video metadata (RSS discovery + duration backfill). */
export async function upsertVideos(rows: NewChannelVideoRow[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(channelVideos)
    .values(rows)
    .onConflictDoUpdate({
      target: channelVideos.video_id,
      set: {
        title: sql`excluded.title`,
        thumbnail_url: sql`excluded.thumbnail_url`,
        // Never wipe a known duration with an RSS row that lacks one.
        duration_seconds: sql`coalesce(excluded.duration_seconds, ${channelVideos.duration_seconds})`,
      },
    })
}

/** Which of these videos already have a cached duration. */
export async function getKnownDurations(
  videoIds: string[]
): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set()
  const rows = await db
    .select({ video_id: channelVideos.video_id })
    .from(channelVideos)
    .where(
      and(
        inArray(channelVideos.video_id, videoIds),
        sql`${channelVideos.duration_seconds} is not null`
      )
    )
  return new Set(rows.map((r) => r.video_id))
}

export interface FeedVideoRow {
  video_id: string
  channel_id: string
  title: string
  thumbnail_url: string | null
  duration_seconds: number | null
  published_at: Date
  channel_title: string
}

/**
 * The user's feed: uploads from toggled channels, newest first, minus
 * hidden videos, shorts and anything under the 10-minute policy (unknown
 * durations fail the >= comparison and stay out until backfilled).
 */
export async function getFeedVideos(
  userId: string,
  limit = 120
): Promise<FeedVideoRow[]> {
  return db
    .select({
      video_id: channelVideos.video_id,
      channel_id: channelVideos.channel_id,
      title: channelVideos.title,
      thumbnail_url: channelVideos.thumbnail_url,
      duration_seconds: channelVideos.duration_seconds,
      published_at: channelVideos.published_at,
      channel_title: channels.title,
    })
    .from(channelVideos)
    .innerJoin(
      channels,
      and(
        eq(channels.channel_id, channelVideos.channel_id),
        eq(channels.user_id, userId),
        eq(channels.toggled, true)
      )
    )
    .leftJoin(
      hiddenVideos,
      and(
        eq(hiddenVideos.video_id, channelVideos.video_id),
        eq(hiddenVideos.user_id, userId)
      )
    )
    .where(
      and(
        isNull(hiddenVideos.id),
        gte(channelVideos.duration_seconds, MIN_FEED_DURATION_SECONDS)
      )
    )
    .orderBy(desc(channelVideos.published_at))
    .limit(limit)
}

/**
 * Videos the user has hidden from their feed, newest first — fetched only
 * when the "show hidden" toggle is switched on, so the default feed query
 * and its 120-row cap stay untouched.
 */
export async function getHiddenFeedVideos(
  userId: string,
  limit = 120
): Promise<FeedVideoRow[]> {
  return db
    .select({
      video_id: channelVideos.video_id,
      channel_id: channelVideos.channel_id,
      title: channelVideos.title,
      thumbnail_url: channelVideos.thumbnail_url,
      duration_seconds: channelVideos.duration_seconds,
      published_at: channelVideos.published_at,
      channel_title: channels.title,
    })
    .from(channelVideos)
    .innerJoin(
      channels,
      and(
        eq(channels.channel_id, channelVideos.channel_id),
        eq(channels.user_id, userId),
        eq(channels.toggled, true)
      )
    )
    .innerJoin(
      hiddenVideos,
      and(
        eq(hiddenVideos.video_id, channelVideos.video_id),
        eq(hiddenVideos.user_id, userId)
      )
    )
    .where(gte(channelVideos.duration_seconds, MIN_FEED_DURATION_SECONDS))
    .orderBy(desc(channelVideos.published_at))
    .limit(limit)
}

/** Hide a video from the user's feed (idempotent). */
export async function hideVideo(
  userId: string,
  videoId: string
): Promise<void> {
  await db
    .insert(hiddenVideos)
    .values({ user_id: userId, video_id: videoId })
    .onConflictDoNothing()
}
