import Anthropic from '@anthropic-ai/sdk'

// Single shared client. Reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic()

// The summarizer model is locked to Opus 4.8 (see UPGRADE_PLAN locked decisions).
export const SUMMARY_MODEL = 'claude-opus-4-8'
