'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { hideVideo } from '@/app/lib/db/feed-queries'

export async function hideVideoAction(videoId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not signed in')
  await hideVideo(userId, videoId)
  revalidatePath('/feed')
}
