// Transcript-first caption fetching from a YouTube URL.
//
// Strategy (no third-party key needed):
//   1. Fetch the watch page HTML and extract ytInitialPlayerResponse.
//   2. Read videoDetails (title, author, duration, description) and the
//      caption track list. Pick an English track (or the first available).
//   3. Fetch that track as json3 and flatten it to plain text.
//   4. Parse chapter headings out of the description (lines that start with a
//      timestamp) to guide the summary's section topics.
//
// Returns null transcript when no captions exist; the caller then falls back
// to Claude web_search.

export interface VideoMeta {
  videoId: string
  title: string
  author: string
  durationMinutes: number
  thumbnailUrl: string
  chapters: string[]
}

export interface CaptionResult extends VideoMeta {
  transcript: string | null
}

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

function parseChaptersFromDescription(description: string): string[] {
  if (!description) return []
  const chapters: string[] = []
  for (const rawLine of description.split('\n')) {
    const line = rawLine.trim()
    // Match "0:00 Title", "01:23 Title", "1:02:33 Title"
    const m = line.match(/^(\d{1,2}:)?\d{1,2}:\d{2}\s+(.+)$/)
    if (m && m[2]) {
      const heading = m[2].replace(/^[-–—:|]\s*/, '').trim()
      if (heading.length > 1) chapters.push(heading)
    }
  }
  return chapters.slice(0, 20)
}

function extractPlayerResponse(html: string): unknown | null {
  // ytInitialPlayerResponse = {...};   (followed by var/;)
  const marker = 'ytInitialPlayerResponse = '
  const idx = html.indexOf(marker)
  if (idx === -1) return null
  const start = idx + marker.length
  // Walk braces to find the matching close.
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
    } else {
      if (ch === '"') inStr = true
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1))
          } catch {
            return null
          }
        }
      }
    }
  }
  return null
}

// json3 caption format: { events: [ { segs: [ { utf8 } ] } ] }
function flattenJson3(json: unknown): string {
  const events = (json as { events?: Array<{ segs?: Array<{ utf8?: string }> }> })
    ?.events
  if (!events) return ''
  const parts: string[] = []
  for (const ev of events) {
    if (!ev.segs) continue
    for (const seg of ev.segs) {
      if (seg.utf8) parts.push(seg.utf8)
    }
  }
  return parts
    .join('')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36'

export async function fetchCaptions(url: string): Promise<CaptionResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('Could not parse a YouTube video id from that URL.')
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`
  const res = await fetch(watchUrl, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
  })
  if (!res.ok) {
    throw new Error(`YouTube returned ${res.status} for that video.`)
  }
  const html = await res.text()
  const player = extractPlayerResponse(html) as
    | {
        videoDetails?: {
          title?: string
          author?: string
          lengthSeconds?: string
          shortDescription?: string
        }
        captions?: {
          playerCaptionsTracklistRenderer?: {
            captionTracks?: Array<{
              baseUrl: string
              languageCode: string
              kind?: string
            }>
          }
        }
      }
    | null

  const details = player?.videoDetails
  const title = details?.title ?? ''
  const author = details?.author ?? ''
  const durationMinutes = details?.lengthSeconds
    ? Math.round(Number(details.lengthSeconds) / 60)
    : 0
  const chapters = parseChaptersFromDescription(details?.shortDescription ?? '')

  const meta: VideoMeta = {
    videoId,
    title,
    author,
    durationMinutes,
    thumbnailUrl,
    chapters,
  }

  const tracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
  if (tracks.length === 0) {
    return { ...meta, transcript: null }
  }

  // Prefer a manual English track, then any English, then the first track.
  const pick =
    tracks.find((t) => t.languageCode.startsWith('en') && t.kind !== 'asr') ??
    tracks.find((t) => t.languageCode.startsWith('en')) ??
    tracks[0]

  const trackUrl = pick.baseUrl + '&fmt=json3'
  const capRes = await fetch(trackUrl, { headers: { 'User-Agent': UA } })
  if (!capRes.ok) {
    return { ...meta, transcript: null }
  }
  const transcript = flattenJson3(await capRes.json())
  return { ...meta, transcript: transcript.length > 0 ? transcript : null }
}
