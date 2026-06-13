import 'server-only'
import { Redis } from '@upstash/redis'
import { fetchSupadata } from './supadata'
import { fetchTranscriptApi } from './transcriptapi'

// One transcript abstraction over multiple providers. Each provider is
// captions-only (we never trigger paid AI audio transcription), and each is
// guarded by a per-month usage cap stored in the shared Upstash Redis so a
// runaway can never burn through a provider's free tier and lock the user out.
// Providers are tried in order; when one is capped or fails, we fall through
// to the next.

export interface Transcript {
  content: string
  /** Language hint; "auto" means let the summarizer infer from the text. */
  lang: string
}

const redis = Redis.fromEnv()

// Stop a few requests short of each provider's 100/month free tier so the user
// never actually hits the hard limit (which triggers a lockout email).
const MONTHLY_CAP = 90

function monthKey(provider: string): string {
  const d = new Date()
  return `pcast:transcript:${provider}:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`
}

// Reserve one unit of this month's budget. Returns false once the cap is hit.
async function reserve(provider: string): Promise<boolean> {
  const key = monthKey(provider)
  const n = await redis.incr(key)
  if (n === 1) {
    await redis.expire(key, 60 * 60 * 24 * 40) // ~40 days, covers the month
  }
  return n <= MONTHLY_CAP
}

// If a provider reports its real free tier is exhausted, burn the rest of this
// month's local budget so we skip it (and don't keep hammering it) until reset.
async function markExhausted(provider: string): Promise<void> {
  const key = monthKey(provider)
  await redis.set(key, MONTHLY_CAP + 1, { ex: 60 * 60 * 24 * 40 })
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

interface Provider {
  name: string
  enabled: boolean
  fetch: (url: string) => Promise<Transcript>
}

function providers(): Provider[] {
  return [
    {
      name: 'supadata',
      enabled: !!process.env.SUPADATA_API_KEY,
      fetch: fetchSupadata,
    },
    {
      name: 'transcriptapi',
      enabled: !!process.env.TRANSCRIPTAPI_API_KEY,
      fetch: fetchTranscriptApi,
    },
  ]
}

export async function getTranscript(url: string): Promise<Transcript> {
  const notes: string[] = []

  for (const p of providers()) {
    if (!p.enabled) continue
    if (!(await reserve(p.name))) {
      notes.push(`${p.name}: monthly cap reached`)
      continue
    }
    try {
      return await p.fetch(url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      notes.push(`${p.name}: ${msg}`)
      if (/limit/i.test(msg)) await markExhausted(p.name)
    }
  }

  throw new Error(
    notes.length
      ? `No transcript available. ${notes.join('; ')}.`
      : 'No transcript provider is configured.'
  )
}
