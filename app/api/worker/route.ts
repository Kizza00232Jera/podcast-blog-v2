import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { fetchCaptions } from '@/app/lib/captions'
import {
  summarizeFromTranscript,
  summarizeWithWebSearch,
  toStoredSummary,
} from '@/app/lib/summarize'
import { getPostById, markPostReady, markPostError } from '@/app/lib/db/queries'

// Summaries can run long; give the function room. (Vercel Pro allows up to 300s.)
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// QStash delivers {postId, youtubeUrl}. verifySignatureAppRouter checks the
// request signature against QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY
// so only QStash can trigger generation.
async function handler(request: Request) {
  const { postId, youtubeUrl } = await request.json()

  if (!postId || !youtubeUrl) {
    return NextResponse.json({ error: 'Missing postId or youtubeUrl' }, { status: 400 })
  }

  const post = await getPostById(postId)
  if (!post) {
    // Row was deleted before we got here — nothing to do, don't retry.
    return NextResponse.json({ ok: true, skipped: 'post not found' })
  }

  try {
    const captions = await fetchCaptions(youtubeUrl)

    const generated = captions.transcript
      ? await summarizeFromTranscript(captions.transcript, captions)
      : await summarizeWithWebSearch(youtubeUrl, captions)

    await markPostReady(postId, {
      title: generated.title || captions.title || post.title,
      podcast_name: generated.podcast_name || captions.author,
      creator: generated.creator || captions.author,
      duration_minutes: captions.durationMinutes || post.duration_minutes,
      thumbnail_url: captions.thumbnailUrl,
      tags: generated.tags,
      summary: toStoredSummary(generated),
      key_takeaways: generated.summary.key_takeaways,
      resources: generated.resources,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed.'
    await markPostError(postId, message)
    // Return 200 so QStash does not keep retrying a deterministic failure
    // (e.g. captions unavailable). The row already shows the error.
    return NextResponse.json({ ok: false, error: message })
  }
}

export const POST = verifySignatureAppRouter(handler)
