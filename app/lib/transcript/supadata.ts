import type { Transcript } from './index'

// Supadata, captions-only. We pass mode=native to ask for existing captions and
// NOT trigger AI audio transcription (the expensive path that drains the free
// tier). As a safety net, if Supadata still returns an async job (HTTP 202), we
// treat it as "no captions" and refuse to poll it, so a caption-less video can
// never run up the bill.
function normalizeContent(data: { content?: unknown; text?: unknown }): string {
  if (typeof data.content === 'string') return data.content.trim()
  if (Array.isArray(data.content)) {
    return data.content
      .map((seg) =>
        seg && typeof seg === 'object' && 'text' in seg
          ? String((seg as { text: unknown }).text ?? '')
          : ''
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  if (typeof data.text === 'string') return data.text.trim()
  return ''
}

export async function fetchSupadata(url: string): Promise<Transcript> {
  const key = process.env.SUPADATA_API_KEY!
  const u =
    `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}` +
    `&text=true&mode=native`
  const res = await fetch(u, { headers: { 'x-api-key': key } })

  if (res.status === 202) {
    // Async AI transcription would start here — refuse it (captions-only).
    throw new Error('no captions (AI transcription disabled)')
  }
  if (res.status === 429) throw new Error('monthly limit exceeded')
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (/limit/i.test(body)) throw new Error('monthly limit exceeded')
    throw new Error(`request failed (${res.status})`)
  }

  const data = await res.json()
  const content = normalizeContent(data)
  if (!content) throw new Error('no captions for this video')
  return { content, lang: typeof data.lang === 'string' ? data.lang : 'auto' }
}
