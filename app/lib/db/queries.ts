import 'server-only'
import { db } from './index'
import { podcastPosts, type NewPodcastRow, type PodcastRow } from './schema'
import { and, desc, eq } from 'drizzle-orm'

// All reads/writes go through the pooled DATABASE_URL (db). Auth/ownership is
// enforced here in app code now that we're off Supabase RLS.

/** Public showcase gallery — what anonymous visitors and everyone else can see. */
export async function getPublicPosts(): Promise<PodcastRow[]> {
  return db
    .select()
    .from(podcastPosts)
    .where(eq(podcastPosts.is_public, true))
    .orderBy(desc(podcastPosts.created_at))
}

/** A signed-in user's own private library. */
export async function getUserPosts(userId: string): Promise<PodcastRow[]> {
  return db
    .select()
    .from(podcastPosts)
    .where(eq(podcastPosts.user_id, userId))
    .orderBy(desc(podcastPosts.created_at))
}

/** One post by slug. Returns it regardless of visibility — callers gate access. */
export async function getPostBySlug(slug: string): Promise<PodcastRow | null> {
  const rows = await db
    .select()
    .from(podcastPosts)
    .where(eq(podcastPosts.slug, slug))
    .limit(1)
  return rows[0] ?? null
}

export async function createPost(row: NewPodcastRow): Promise<PodcastRow> {
  const [inserted] = await db.insert(podcastPosts).values(row).returning()
  return inserted
}

export async function getPostById(id: string): Promise<PodcastRow | null> {
  const rows = await db
    .select()
    .from(podcastPosts)
    .where(eq(podcastPosts.id, id))
    .limit(1)
  return rows[0] ?? null
}

/** Update the generation sub-stage (drives the progress bar). */
export async function markStage(
  id: string,
  stage: 'queued' | 'transcribing' | 'summarizing'
): Promise<void> {
  await db.update(podcastPosts).set({ stage }).where(eq(podcastPosts.id, id))
}

/** Worker success: fill the placeholder row with the finished summary. */
export async function markPostReady(
  id: string,
  fields: Partial<NewPodcastRow>
): Promise<void> {
  await db
    .update(podcastPosts)
    .set({ ...fields, status: 'ready', error_message: null })
    .where(eq(podcastPosts.id, id))
}

/** Worker failure: flip the placeholder to an error state with a message. */
export async function markPostError(id: string, message: string): Promise<void> {
  await db
    .update(podcastPosts)
    .set({ status: 'error', error_message: message })
    .where(eq(podcastPosts.id, id))
}

/** Delete only if the row belongs to the caller. Returns true if a row was removed. */
export async function deletePost(id: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(podcastPosts)
    .where(and(eq(podcastPosts.id, id), eq(podcastPosts.user_id, userId)))
    .returning({ id: podcastPosts.id })
  return deleted.length > 0
}
