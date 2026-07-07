import Anthropic from '@anthropic-ai/sdk'

// AI Hub gateway support (see C:\...\Projects\ai-hub): when ANTHROPIC_BASE_URL
// points at the hub and ANTHROPIC_API_KEY is a gateway token (gw_…), summary
// calls go through the hub, which serves them from the Claude subscription
// while it's running and toggled on. When the hub/tunnel is unreachable,
// callers retry against api.anthropic.com with the real fallback key.
const HUB_BASE = process.env.ANTHROPIC_BASE_URL?.replace(/\/$/, '')

export const hubConfigured = Boolean(
  HUB_BASE && process.env.ANTHROPIC_API_KEY?.startsWith('gw_')
)

// Primary client: the hub when configured, otherwise plain Anthropic with
// ANTHROPIC_API_KEY (both read automatically by the SDK). The generous
// timeout covers the hub's CLI route on very long transcripts.
export const anthropic = new Anthropic(
  hubConfigured ? { baseURL: HUB_BASE, timeout: 240_000 } : {}
)

// Direct-to-Anthropic client for the fallback path. Null when there's no hub
// (the primary already goes direct) or no fallback key to use.
export const anthropicFallback =
  hubConfigured && process.env.ANTHROPIC_FALLBACK_API_KEY
    ? new Anthropic({
        baseURL: 'https://api.anthropic.com',
        apiKey: process.env.ANTHROPIC_FALLBACK_API_KEY,
      })
    : null

/** Gateway down = network error or a 5xx (Cloudflare 530 when tunnel is off). */
export function isGatewayFailure(err: unknown): boolean {
  if (!hubConfigured) return false
  if (err instanceof Anthropic.APIConnectionError) return true
  if (err instanceof Anthropic.APIError) {
    const status = Number(err.status)
    return Number.isFinite(status) && status >= 500
  }
  return false
}

/**
 * Is the hub reachable right now? Drives the generation rate limit (5/day on
 * subscription usage vs 3/day on API credits) — a cheap pre-check, not a
 * guarantee the actual call lands on the subscription.
 */
export async function hubIsLive(): Promise<boolean> {
  if (!HUB_BASE || !hubConfigured) return false
  try {
    const res = await fetch(`${HUB_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

// Sonnet 5: outscores Opus 4.8 on knowledge-work/summarization benchmarks
// (GDPval-AA v2) at ~40% of the price, and is faster (safer for the 60s
// Vercel Hobby limit). Replaces the earlier Opus 4.8 lock. (The hub's
// subscription route pins Sonnet anyway.)
export const SUMMARY_MODEL = 'claude-sonnet-5'
