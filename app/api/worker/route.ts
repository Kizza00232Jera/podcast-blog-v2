import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { getTranscript } from '@/app/lib/transcript'
import { summarizeFromTranscript, toStoredSummary } from '@/app/lib/summarize'
import { getPostById, markPostReady, markPostError } from '@/app/lib/db/queries'

// Summaries can run long; give the function room. (Vercel Pro allows up to 300s;
// on Hobby this is capped at 60s, which the medium-effort summary fits within.)
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// QStash delivers {postId, youtubeUrl}. verifySignatureAppRouter checks the
// request signature so only QStash can trigger generation. Captions-only:
// fetch existing captions (multi-provider, budget-guarded), run Opus, save.
async function handler(request: Request) {
  const { postId, youtubeUrl } = await request.json()

  if (!postId || !youtubeUrl) {
    return NextResponse.json({ error: 'Missing postId or youtubeUrl' }, { status: 400 })
  }

  const post = await getPostById(postId)
  if (!post) {
    return NextResponse.json({ ok: true, skipped: 'post not found' })
  }

  try {
    const { content, lang } = await getTranscript(youtubeUrl)

    const generated = await summarizeFromTranscript(content, {
      title: post.title,
      author: post.creator ?? '',
      lang,
    })

    await markPostReady(postId, {
      title: generated.title || post.title,
      podcast_name: generated.podcast_name || post.podcast_name,
      creator: generated.creator || post.creator,
      tags: generated.tags,
      summary: toStoredSummary(generated),
      key_takeaways: generated.summary.key_takeaways,
      resources: generated.resources,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed.'
    await markPostError(postId, message)
    // 200 so QStash does not retry a deterministic failure; the row shows it.
    return NextResponse.json({ ok: false, error: message })
  }
}

export const POST = verifySignatureAppRouter(handler)
