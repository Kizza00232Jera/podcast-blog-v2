import type Anthropic from '@anthropic-ai/sdk'
import { anthropic, SUMMARY_MODEL } from './anthropic'
import type { VideoMeta } from './captions'
import type { PodcastSummary } from '@/app/types/podcast'

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

// JSON Schema for structured output. Note the structured-output constraints:
// every object sets additionalProperties:false; no min/maxLength.
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
// quotes, deep narrative). Match or beat that depth — never the thin 2-3
// paragraph output.
function systemPrompt(): string {
  return `You are a writer producing a long-form, magazine-quality written summary of a single podcast episode, working from its transcript. Your job is to let a reader who never heard the episode come away understanding it as well as someone who listened.

Depth bar (calibration): aim for 1,500 to 2,200 words of body prose across the sections. Write rich, flowing narrative paragraphs (4 to 6 sentences each, 3 to 4 paragraphs per section). Use the specific facts, names, numbers, studies, stories, and arguments from the transcript. Do not pad, do not get vague, do not write a thin 2-3 paragraph recap.

Structure rules:
- Produce a DYNAMIC number of sections, 3 to 8, that follow the episode's real structure. Use the chapter list (if provided) to choose the section topics. If there is no chapter list, infer the natural thematic arc from the transcript.
- Each section "heading" must be specific and descriptive of that section's actual content, like a strong magazine subheading. FORBIDDEN generic headings: "Overview", "Summary", "Introduction", "Conclusion", "Key Takeaways", "Background", "Main Points".
- Each section "content": multiple full paragraphs of narrative prose. Separate paragraphs with a blank line. No bullet points inside content.
- Each section "quote": one short verbatim quote drawn from that section's part of the transcript, capturing its most striking line. Quote real words only. If that section genuinely has no quotable line, use an empty string.
- "overview": one rich paragraph that works as a lede and orients the reader to the episode, who is on it, and the stakes.
- "key_takeaways": 4 to 6 crisp, skimmable takeaway sentences.
- "tags": 3 to 5 specific topic tags.
- "resources": only real resources the episode explicitly names (books, tools, sites, people to follow). Empty array if none.
- "title", "podcast_name", "creator": fill from the metadata provided; correct obvious errors using the transcript.

Write in clear, engaging prose. No em dashes anywhere; use commas or rephrase. Use straight quotes only.`
}

function buildUserMessage(transcript: string, meta: VideoMeta): string {
  const chapterBlock =
    meta.chapters.length > 0
      ? `\n\nChapter list (use these to choose section topics):\n${meta.chapters
          .map((c, i) => `${i + 1}. ${c}`)
          .join('\n')}`
      : '\n\nNo chapter list available; infer the thematic structure from the transcript.'

  return `Episode metadata:
- Title: ${meta.title || '(unknown)'}
- Channel/Author: ${meta.author || '(unknown)'}
- Duration: ${meta.durationMinutes} minutes${chapterBlock}

Transcript:
"""
${transcript}
"""

Write the structured summary now.`
}

// Fold the model's section-level quotes up into summary.quotes too, so both
// the new renderer (section.quote) and the legacy renderer (summary.quotes)
// have something to show.
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

// Primary path: we have a transcript. Structured output, streamed (the body
// can run long), adaptive thinking at high effort.
export async function summarizeFromTranscript(
  transcript: string,
  meta: VideoMeta
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

// Fallback path: no captions. Let Claude research the episode with web_search,
// then return the same JSON shape. Server tools run a sampling loop, so we
// resume on pause_turn. Output is parsed tolerantly from the final text.
export async function summarizeWithWebSearch(
  url: string,
  meta: VideoMeta
): Promise<GeneratedSummary> {
  const userMsg = `I could not retrieve captions for this YouTube podcast episode. Research it with web_search (look for the transcript, show notes, official description, and discussion) and then write the summary.

Episode metadata:
- URL: ${url}
- Title: ${meta.title || '(unknown)'}
- Channel/Author: ${meta.author || '(unknown)'}
- Duration: ${meta.durationMinutes} minutes

After researching, output ONLY a single JSON object (no prose, no code fences) matching exactly this shape:
{"title": str, "podcast_name": str, "creator": str, "tags": [str], "summary": {"overview": str, "sections": [{"heading": str, "content": str, "quote": str}], "key_takeaways": [str]}, "resources": [str]}

Follow all the depth and structure rules from the system prompt.`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMsg }]
  const tools = [{ type: 'web_search_20260209', name: 'web_search' }] as const

  let message: Anthropic.Message | null = null
  for (let i = 0; i < 6; i++) {
    const stream = anthropic.messages.stream({
      model: SUMMARY_MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: systemPrompt(),
      tools: tools as unknown as Anthropic.ToolUnion[],
      messages,
    })
    message = await stream.finalMessage()
    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content })
      continue
    }
    break
  }

  const text = (message?.content ?? [])
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return parseSummaryJson(text)
}

function parseSummaryJson(text: string): GeneratedSummary {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Model did not return JSON for the summary.')
  return JSON.parse(match[0]) as GeneratedSummary
}
