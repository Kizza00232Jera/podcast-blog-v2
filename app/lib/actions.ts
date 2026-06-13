'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { deletePost } from '@/app/lib/db/queries'

export async function deletePodcastAction(id: string) {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Not signed in')
  }
  // deletePost only removes the row if it belongs to this user.
  await deletePost(id, userId)
  revalidatePath('/')
  redirect('/')
}
