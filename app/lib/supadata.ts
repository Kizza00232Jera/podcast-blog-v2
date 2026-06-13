// Transcript source: Supadata (https://supadata.ai).
// Supadata handles YouTube's server-side blocking for us and, when a video has
// no captions, falls back to AI transcription of the audio. Two response modes:
//   - 200 { lang, availableLangs, content }  -> transcript ready (captioned video)
//   - 202 { jobId }                          -> async job (AI transcription); poll it
// The worker uses requestTranscript() first, then pollTranscript() via a delayed
// QStash re-queue so we never block a serverless function on a long ASR job.

const BASE = 'https://api.supadata.ai/v1'

function headers() {
  const key = process.env.SUPADATA_API_KEY
  if (!key) throw new Error('SUPADATA_API_KEY is not set.')
  return { 'x-api-key': key }
}

export interface TranscriptReady {
  kind: 'ready'
  content: string
  lang: string
}
export interface TranscriptJob {
  kind: 'job'
  jobId: string
}
export type TranscriptResult = TranscriptReady | TranscriptJob

export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

/** Kick off a transcript request. Returns the text immediately, or a jobId to poll. */
export async function requestTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  const u = `${BASE}/transcript?url=${encodeURIComponent(youtubeUrl)}&text=true`
  const res = await fetch(u, { headers: headers() })

  if (res.status === 202) {
    const { jobId } = await res.json()
    if (!jobId) throw new Error('Supadata accepted the job but returned no jobId.')
    return { kind: 'job', jobId }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Transcript request failed (${res.status}). ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  const content: string = typeof data.content === 'string' ? data.content : ''
  if (!content.trim()) {
    throw new Error('No transcript is available for this video.')
  }
  return { kind: 'ready', content, lang: data.lang || 'en' }
}

export type PollResult =
  | { kind: 'ready'; content: string; lang: string }
  | { kind: 'active' }
  | { kind: 'failed'; message: string }

/** Check an async transcription job. */
export async function pollTranscript(jobId: string): Promise<PollResult> {
  const res = await fetch(`${BASE}/transcript/${jobId}`, { headers: headers() })
  if (!res.ok) {
    return { kind: 'failed', message: `Job check failed (${res.status}).` }
  }
  const data = await res.json()
  const status: string = data.status || 'active'

  if (status === 'completed') {
    const content: string = typeof data.content === 'string' ? data.content : ''
    if (!content.trim()) {
      return { kind: 'failed', message: 'Transcription completed but was empty.' }
    }
    return { kind: 'ready', content, lang: data.lang || 'en' }
  }
  if (status === 'failed' || status === 'error') {
    return { kind: 'failed', message: data.error || 'Transcription failed.' }
  }
  // queued | active
  return { kind: 'active' }
}
