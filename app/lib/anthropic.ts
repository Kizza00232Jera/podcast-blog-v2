import Anthropic from '@anthropic-ai/sdk'

// Single shared client. Reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic()

// Sonnet 5: outscores Opus 4.8 on knowledge-work/summarization benchmarks
// (GDPval-AA v2) at ~40% of the price, and is faster (safer for the 60s
// Vercel Hobby limit). Replaces the earlier Opus 4.8 lock.
export const SUMMARY_MODEL = 'claude-sonnet-5'
