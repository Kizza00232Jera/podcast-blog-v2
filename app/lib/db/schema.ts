import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import type { PodcastSummary } from '@/app/types/podcast'

// One table: podcast_posts. Mirrors the legacy Supabase shape so the 7
// migrated episodes import cleanly, plus the two new columns the cloud app
// needs: user_id is now a Clerk id (text, not a Supabase uuid) and is_public
// drives the read-only public gallery for anonymous visitors.
export const podcastPosts = pgTable('podcast_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  podcast_name: text('podcast_name'),
  creator: text('creator'),
  source_link: text('source_link'),
  thumbnail_url: text('thumbnail_url'),
  duration_minutes: integer('duration_minutes'),
  rating: integer('rating'),
  // jsonb arrays/objects — kept as jsonb (not text[]) so both the old
  // Perplexity summary shape and the new richer Opus shape round-trip cleanly.
  tags: jsonb('tags').$type<string[]>().default([]),
  summary: jsonb('summary').$type<PodcastSummary>().notNull(),
  key_takeaways: jsonb('key_takeaways').$type<string[]>().default([]),
  actionable_advice: jsonb('actionable_advice').$type<string[]>().default([]),
  resources: jsonb('resources').$type<string[]>().default([]),
  // Clerk user id (text). Owner of the row.
  user_id: text('user_id').notNull(),
  // Anonymous visitors only see is_public rows (Antonio's showcase).
  is_public: boolean('is_public').notNull().default(false),
  // Background-generation lifecycle: a placeholder row is inserted as
  // 'generating', then the QStash worker flips it to 'ready' or 'error'.
  // Migrated/legacy rows default to 'ready'.
  status: text('status', { enum: ['generating', 'ready', 'error'] })
    .notNull()
    .default('ready'),
  // Sub-stage of a 'generating' row, drives the real progress bar on the card.
  stage: text('stage', { enum: ['queued', 'transcribing', 'summarizing'] }),
  error_message: text('error_message'),
  // YouTube linkage for summaries generated from the feed/channel pages.
  // Legacy paste-a-link rows keep these null and fall back to podcast_name
  // for the library channel filter.
  channel_id: text('channel_id'),
  video_id: text('video_id'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type PodcastRow = typeof podcastPosts.$inferSelect
export type NewPodcastRow = typeof podcastPosts.$inferInsert

// A YouTube subscription synced from the user's Google account. `toggled`
// marks it as a podcast source: toggled channels feed the /feed page and
// can be opened to browse their uploads.
export const channels = pgTable(
  'channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: text('user_id').notNull(),
    channel_id: text('channel_id').notNull(), // YouTube UC… id
    title: text('title').notNull(),
    thumbnail_url: text('thumbnail_url'),
    // UU… uploads playlist id — cheap full video listing (1 unit / 50).
    uploads_playlist_id: text('uploads_playlist_id'),
    toggled: boolean('toggled').notNull().default(false),
    synced_at: timestamp('synced_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('channels_user_channel_idx').on(t.user_id, t.channel_id)]
)

// Cache of video metadata from RSS + the videos.list duration backfill.
// Shared across users (keyed by video id alone) — a video is the same video
// no matter whose feed it appears in.
export const channelVideos = pgTable(
  'channel_videos',
  {
    video_id: text('video_id').primaryKey(),
    channel_id: text('channel_id').notNull(),
    title: text('title').notNull(),
    thumbnail_url: text('thumbnail_url'),
    // Null until the duration backfill runs; feed hides unknown durations.
    duration_seconds: integer('duration_seconds'),
    published_at: timestamp('published_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('channel_videos_channel_published_idx').on(t.channel_id, t.published_at)]
)

// Per-user "not interested" hides on feed items.
export const hiddenVideos = pgTable(
  'hidden_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: text('user_id').notNull(),
    video_id: text('video_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('hidden_videos_user_video_idx').on(t.user_id, t.video_id)]
)

export type ChannelRow = typeof channels.$inferSelect
export type NewChannelRow = typeof channels.$inferInsert
export type ChannelVideoRow = typeof channelVideos.$inferSelect
export type NewChannelVideoRow = typeof channelVideos.$inferInsert
