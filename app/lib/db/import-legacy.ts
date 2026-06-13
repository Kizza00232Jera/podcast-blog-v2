/**
 * One-shot import of the 7 deduped legacy episodes into Neon.
 *
 *   CLERK_OWNER_ID=user_xxx npm run db:import
 *
 * Uses the UNPOOLED connection (direct), keeps each row's original id + slug +
 * created_at, sets user_id = Antonio's Clerk id and is_public = true so all 7
 * show up in the public showcase gallery. Idempotent: re-running skips rows
 * whose slug already exists. NO regeneration of summaries — data copied as-is.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { podcastPosts, type NewPodcastRow } from './schema'

const OWNER = process.env.CLERK_OWNER_ID
if (!OWNER) {
  console.error('Set CLERK_OWNER_ID (Antonio\'s Clerk user id) before importing.')
  process.exit(1)
}

const DATA_PATH = resolve(process.cwd(), '../_migration/podcast_posts.deduped.json')

type LegacyRow = {
  id: string
  slug: string
  title: string
  podcast_name: string | null
  creator: string | null
  source_link: string | null
  thumbnail_url: string | null
  duration_minutes: number | null
  rating: number | null
  tags: string[] | null
  summary: NewPodcastRow['summary']
  key_takeaways: string[] | null
  actionable_advice: string[] | null
  resources: string[] | null
  created_at: string
}

async function main() {
  const rows: LegacyRow[] = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!)
  const db = drizzle(sql)

  console.log(`Importing ${rows.length} episodes as owner ${OWNER} ...`)

  let inserted = 0
  for (const r of rows) {
    const record: NewPodcastRow = {
      id: r.id,
      slug: r.slug,
      title: r.title,
      podcast_name: r.podcast_name,
      creator: r.creator,
      source_link: r.source_link,
      thumbnail_url: r.thumbnail_url,
      duration_minutes: r.duration_minutes,
      rating: r.rating,
      tags: r.tags ?? [],
      summary: r.summary,
      key_takeaways: r.key_takeaways ?? [],
      actionable_advice: r.actionable_advice ?? [],
      resources: r.resources ?? [],
      user_id: OWNER!,
      is_public: true,
      created_at: new Date(r.created_at),
    }

    const res = await db
      .insert(podcastPosts)
      .values(record)
      .onConflictDoNothing({ target: podcastPosts.slug })
      .returning({ slug: podcastPosts.slug })

    if (res.length) {
      inserted++
      console.log(`  + ${r.slug}`)
    } else {
      console.log(`  = ${r.slug} (already present, skipped)`)
    }
  }

  console.log(`Done. ${inserted} inserted, ${rows.length - inserted} skipped.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
