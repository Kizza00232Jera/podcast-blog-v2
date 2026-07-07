import 'server-only'
import { db } from './index'
import { podcastPosts } from './schema'
import { eq } from 'drizzle-orm'
import { extractVideoId } from '@/app/lib/transcript'

export interface VideoStatus {
  status: 'generating' | 'ready' | 'error'
  slug: string
}

/**
 * Which of the user's summaries map to which YouTube video — drives the
 * "Summarized ✓" badges on feed/channel cards. New rows carry video_id;
 * legacy paste-a-link rows are matched by the id inside source_link.
 */
export async function getVideoStatuses(
  userId: string
): Promise<Record<string, VideoStatus>> {
  const rows = await db
    .select({
      video_id: podcastPosts.video_id,
      source_link: podcastPosts.source_link,
      status: podcastPosts.status,
      slug: podcastPosts.slug,
    })
    .from(podcastPosts)
    .where(eq(podcastPosts.user_id, userId))

  const map: Record<string, VideoStatus> = {}
  for (const row of rows) {
    const vid =
      row.video_id ?? (row.source_link ? extractVideoId(row.source_link) : null)
    if (!vid) continue
    // Prefer a ready summary over an errored retry of the same video.
    if (map[vid] && map[vid].status === 'ready') continue
    map[vid] = { status: row.status, slug: row.slug }
  }
  return map
}
