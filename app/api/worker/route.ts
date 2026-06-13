import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { requestTranscript, pollTranscript } from '@/app/lib/supadata'
import { summarizeFromTranscript, toStoredSummary } from '@/app/lib/summarize'
import { getPostById, markPostReady, markPostError } from '@/app/lib/db/queries'
import { qstash, appUrl } from '@/app/lib/qstash'

// Summaries can run long; give the function room. (Vercel Pro allows up to 300s.)
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// How many times we re-check an async transcription job before giving up.
// 24 polls x 30s delay ~= 12 minutes, enough for AI transcription of long audio.
const MAX_POLLS = 24
const POLL_DELAY_SECONDS = 30

type WorkerBody =
  | { postId: string; youtubeUrl: string } // initial request
  | { postId: string; jobId: string; attempt: number } // async poll

async function enqueuePoll(postId: string, jobId: string, attempt: number) {
  await qstash.publishJSON({
    url: `${appUrl()}/api/worker`,
    body: { postId, jobId, attempt },
    delay: POLL_DELAY_SECONDS,
    retries: 1,
  })
}

// Turn a finished transcript into a saved summary, written in its own language.
async function summarizeAndSave(
  postId: string,
  transcript: string,
  lang: string
) {
  const post = await getPostById(postId)
  if (!post) return // row deleted mid-flight

  const generated = await summarizeFromTranscript(transcript, {
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
}

// QStash delivers either the initial {postId, youtubeUrl} or a poll
// {postId, jobId, attempt}. verifySignatureAppRouter checks the request
// signature so only QStash can trigger this endpoint.
async function handler(request: Request) {
  const body = (await request.json()) as WorkerBody

  const post = await getPostById(body.postId)
  if (!post) {
    return NextResponse.json({ ok: true, skipped: 'post not found' })
  }

  try {
    // --- Async poll branch ---
    if ('jobId' in body) {
      const result = await pollTranscript(body.jobId)
      if (result.kind === 'ready') {
        await summarizeAndSave(body.postId, result.content, result.lang)
        return NextResponse.json({ ok: true })
      }
      if (result.kind === 'active') {
        if (body.attempt < MAX_POLLS) {
          await enqueuePoll(body.postId, body.jobId, body.attempt + 1)
          return NextResponse.json({ ok: true, status: 'still-transcribing' })
        }
        await markPostError(
          body.postId,
          'Transcription is taking too long. Try again in a few minutes.'
        )
        return NextResponse.json({ ok: false, error: 'transcription timeout' })
      }
      // failed
      await markPostError(body.postId, result.message)
      return NextResponse.json({ ok: false, error: result.message })
    }

    // --- Initial request branch ---
    const transcript = await requestTranscript(body.youtubeUrl)
    if (transcript.kind === 'ready') {
      await summarizeAndSave(body.postId, transcript.content, transcript.lang)
      return NextResponse.json({ ok: true })
    }
    // Async AI transcription started; poll it via a delayed re-queue.
    await enqueuePoll(body.postId, transcript.jobId, 1)
    return NextResponse.json({ ok: true, status: 'transcribing' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed.'
    await markPostError(body.postId, message)
    // 200 so QStash does not retry a deterministic failure; the row shows the error.
    return NextResponse.json({ ok: false, error: message })
  }
}

export const POST = verifySignatureAppRouter(handler)
