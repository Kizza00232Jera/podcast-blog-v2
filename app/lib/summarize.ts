import type Anthropic from '@anthropic-ai/sdk'
import { anthropic, SUMMARY_MODEL } from './anthropic'
import type { PodcastSummary } from '@/app/types/podcast'

export interface SummaryMeta {
  title: string
  author: string
  /** BCP-47-ish language code of the transcript (e.g. "en", "hr"). */
  lang: string
}

// What the model returns. A superset of the legacy summary shape: dynamic
// sections, one woven verbatim quote per major topic, a skimmable takeaways
// list, and a one-line-able overview/lede.
export interface GeneratedSummary {
  title: string
  podcast_name: string
  creator: string
  tags: string[]
  summary: {
    overview: string
    sections: { heading: string; content: string; quote: string }[]
    key_takeaways: string[]
  }
  resources: string[]
}

// JSON Schema for structured output. Every object sets additionalProperties:false;
// no min/maxLength (structured-output constraints).
const SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    podcast_name: { type: 'string' },
    creator: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    summary: {
      type: 'object',
      additionalProperties: false,
      properties: {
        overview: { type: 'string' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              heading: { type: 'string' },
              content: { type: 'string' },
              quote: { type: 'string' },
            },
            required: ['heading', 'content', 'quote'],
          },
        },
        key_takeaways: { type: 'array', items: { type: 'string' } },
      },
      required: ['overview', 'sections', 'key_takeaways'],
    },
    resources: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'podcast_name', 'creator', 'tags', 'summary', 'resources'],
} as const

// Calibrated against the 32,403-char Gen Alpha summary (8 sections, woven
// quotes, deep narrative). Match or beat that depth; never thin output.
function systemPrompt(): string {
  return `You are a writer producing a long-form, magazine-quality written summary of a single podcast episode, working from its transcript. Your job is to let a reader who never heard the episode come away understanding it as well as someone who listened.

LANGUAGE: Write the ENTIRE output (overview, every section heading and body, every quote, the key takeaways, and the tags) in the SAME LANGUAGE as the transcript. If the transcript is in Croatian, write in Croatian; if Spanish, Spanish; and so on. Do not translate to English. Quotes must stay in the original spoken language, verbatim.

Depth bar (calibration): aim for 1,500 to 2,200 words of body prose across the sections. Write rich, flowing narrative paragraphs (4 to 6 sentences each, 3 to 4 paragraphs per section). Use the specific facts, names, numbers, studies, stories, and arguments from the transcript. Do not pad, do not get vague, do not write a thin 2-3 paragraph recap.

Structure rules:
- Produce a DYNAMIC number of sections, 3 to 8, that follow the episode's real thematic arc, inferred from the transcript.
- Each section "heading" must be specific and descriptive of that section's actual content, like a strong magazine subheading. FORBIDDEN generic headings: "Overview", "Summary", "Introduction", "Conclusion", "Key Takeaways", "Background", "Main Points" (and their equivalents in the transcript's language).
- Each section "content": multiple full paragraphs of narrative prose. Separate paragraphs with a blank line. No bullet points inside content.
- Each section "quote": one short verbatim quote drawn from that section's part of the transcript, capturing its most striking line, in the original language. If that section genuinely has no quotable line, use an empty string.
- "overview": one rich paragraph that works as a lede and orients the reader to the episode, who is on it, and the stakes.
- "key_takeaways": 4 to 6 crisp, skimmable takeaway sentences.
- "tags": 3 to 5 specific topic tags.
- "resources": only real resources the episode explicitly names (books, tools, sites, people to follow). Empty array if none.
- "title", "podcast_name", "creator": fill from the metadata provided; correct obvious errors using the transcript.

Write in clear, engaging prose. No em dashes anywhere; use commas or rephrase. Use straight quotes only.`
}

function buildUserMessage(transcript: string, meta: SummaryMeta): string {
  return `Episode metadata:
- Title: ${meta.title || '(unknown)'}
- Channel/Author: ${meta.author || '(unknown)'}
- Transcript language code: ${meta.lang}

Transcript:
"""
${transcript}
"""

Write the structured summary now, in the transcript's language.`
}

// Fold the model's section-level quotes up into summary.quotes too, so both the
// new renderer (section.quote) and the legacy renderer (summary.quotes) display.
export function toStoredSummary(gen: GeneratedSummary): PodcastSummary {
  return {
    overview: gen.summary.overview,
    sections: gen.summary.sections.map((s) => ({
      heading: s.heading,
      content: s.content,
      quote: s.quote || undefined,
    })),
    quotes: gen.summary.sections.map((s) => s.quote).filter(Boolean),
    key_takeaways: gen.summary.key_takeaways,
    resources: gen.resources,
  }
}

// Structured output, streamed (the body can run long), adaptive thinking at high
// effort. Writes in the transcript's own language.
export async function summarizeFromTranscript(
  transcript: string,
  meta: SummaryMeta
): Promise<GeneratedSummary> {
  const stream = anthropic.messages.stream({
    model: SUMMARY_MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: SUMMARY_SCHEMA },
    },
    system: systemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(transcript, meta) }],
  })

  const message = await stream.finalMessage()
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return JSON.parse(text) as GeneratedSummary
}
