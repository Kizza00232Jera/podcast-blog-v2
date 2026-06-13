import type { Transcript } from './index'

// TranscriptAPI.com fallback (used when Supadata is capped/out).
// GET /api/v2/youtube/transcript?video_url=...&format=json, Bearer auth.
// Returns { video_id, language, transcript: [{ text, start, duration }] }
// for existing captions; 1 credit per request.
export async function fetchTranscriptApi(url: string): Promise<Transcript> {
  const key = process.env.TRANSCRIPTAPI_API_KEY!
  const u =
    `https://transcriptapi.com/api/v2/youtube/transcript` +
    `?video_url=${encodeURIComponent(url)}&format=json`
  const res = await fetch(u, { headers: { Authorization: `Bearer ${key}` } })

  if (res.status === 402 || res.status === 429) {
    throw new Error('monthly limit exceeded')
  }
  if (res.status === 404) throw new Error('no captions for this video')
  if (!res.ok) throw new Error(`request failed (${res.status})`)

  const data = await res.json()
  const segments: Array<{ text?: unknown }> = Array.isArray(data.transcript)
    ? data.transcript
    : []
  const content = segments
    .map((s) => (typeof s.text === 'string' ? s.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!content) throw new Error('no captions for this video')
  return {
    content,
    lang: typeof data.language === 'string' ? data.language : 'auto',
  }
}
