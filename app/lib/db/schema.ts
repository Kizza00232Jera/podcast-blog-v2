import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
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
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type PodcastRow = typeof podcastPosts.$inferSelect
export type NewPodcastRow = typeof podcastPosts.$inferInsert
