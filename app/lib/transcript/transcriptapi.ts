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
  const segments: Array<{ text?: unknown; start?: unknown; duration?: unknown }> =
    Array.isArray(data.transcript) ? data.transcript : []
  const content = segments
    .map((s) => (typeof s.text === 'string' ? s.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!content) throw new Error('no captions for this video')

  // Episode length: prefer a top-level duration, else the end of the last segment.
  let durationMinutes: number | undefined
  if (typeof data.duration === 'number') {
    durationMinutes = Math.round(data.duration / 60)
  } else if (segments.length) {
    const last = segments[segments.length - 1]
    const end = Number(last.start ?? 0) + Number(last.duration ?? 0)
    if (end > 0) durationMinutes = Math.round(end / 60)
  }

  return {
    content,
    lang: typeof data.language === 'string' ? data.language : 'auto',
    durationMinutes,
  }
}
