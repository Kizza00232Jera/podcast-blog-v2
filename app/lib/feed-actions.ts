'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getHiddenFeedVideos, hideVideo } from '@/app/lib/db/feed-queries'
import type { VideoItem } from '@/app/components/videos/VideoCard'

export async function hideVideoAction(videoId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not signed in')
  await hideVideo(userId, videoId)
  revalidatePath('/feed')
}

/** Fetched on demand when the "show hidden" toggle is switched on. */
export async function getHiddenVideosAction(): Promise<VideoItem[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not signed in')
  const rows = await getHiddenFeedVideos(userId)
  return rows.map((v) => ({
    videoId: v.video_id,
    channelId: v.channel_id,
    title: v.title,
    thumbnailUrl: v.thumbnail_url,
    publishedAt: v.published_at.toISOString(),
    durationSeconds: v.duration_seconds,
    channelTitle: v.channel_title,
  }))
}
