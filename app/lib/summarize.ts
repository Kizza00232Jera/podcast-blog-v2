import type Anthropic from '@anthropic-ai/sdk'
import {
  anthropic,
  anthropicFallback,
  hubConfigured,
  isGatewayFailure,
  SUMMARY_MODEL,
} from './anthropic'
import type { PodcastSummary } from '@/app/types/podcast'

export interface SummaryMeta {
  title: string
  author: string
  /** BCP-47-ish language code of the transcript (e.g. "en", "hr"). */
  lang: string
}

// Cost + time guardrails (tuned to fit Vercel Hobby's 60s function limit and
// stay under the ~30c/summary ceiling). At ~4 chars/token, 170k chars is ~42k
// input tokens (~$0.13 on Sonnet 5); a 2-hour podcast is usually well under
// this. Longer transcripts are truncated so cost and runtime stay bounded.
const MAX_TRANSCRIPT_CHARS = 170_000

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

// Auto-captions duplicate overlapping lines and stutters ("if it if it if it
// starts saving"). Collapse immediate repeats before the model ever sees them,
// so artifacts can't leak into quotes: an immediately repeated multi-word
// phrase (2-8 words) collapses to one occurrence; a single word repeated 3+
// times collapses to one (doubles like "very very" are kept - they can be
// intentional).
function cleanTranscript(text: string): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const out: string[] = []
  let i = 0
  while (i < words.length) {
    let collapsed = false
    for (let n = Math.min(8, Math.floor((words.length - i) / 2)); n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(' ').toLowerCase()
      let repeats = 0
      while (
        i + (repeats + 2) * n <= words.length &&
        words.slice(i + (repeats + 1) * n, i + (repeats + 2) * n).join(' ').toLowerCase() === phrase
      ) {
        repeats++
      }
      if (repeats >= (n === 1 ? 2 : 1)) {
        out.push(...words.slice(i, i + n))
        i += (repeats + 1) * n
        collapsed = true
        break
      }
    }
    if (!collapsed) {
      out.push(words[i])
      i++
    }
  }
  return out.join(' ')
}

// The provider's language code is unreliable (auto-translated caption tracks,
// region defaults), and trusting it over the text is what produced wrong- and
// mixed-language summaries. Detect the dominant language from the transcript
// itself; the detected language always wins over the metadata code.
const STOPWORDS: Record<string, string[]> = {
  English: ['the', 'and', 'is', 'that', 'of', 'to', 'it', 'was', 'you', 'this', 'but', 'not', 'with', 'for', 'have', 'what', 'they', 'about'],
  // 'i' (Croatian "and") is deliberately excluded - it collides with English "I".
  Croatian: ['je', 'da', 'se', 'na', 'su', 'za', 'ali', 'kao', 'što', 'nije', 'smo', 'ovo', 'ili', 'kad', 'ako', 'samo', 'jer', 'nešto'],
}

const LANG_CODE_NAMES: Record<string, string> = { en: 'English', hr: 'Croatian' }

function scoreLanguages(sample: string): { name: string; score: number }[] {
  const lower = sample.toLowerCase()
  const words = lower.split(/[^\p{L}]+/u)
  return Object.entries(STOPWORDS)
    .map(([name, stops]) => {
      const set = new Set(stops)
      let score = words.reduce((acc, w) => acc + (set.has(w) ? 1 : 0), 0)
      if (name === 'Croatian') score += (lower.match(/[čćžšđ]/g) ?? []).length * 3
      return { name, score }
    })
    .sort((a, b) => b.score - a.score)
}

export function detectLanguage(transcript: string, langCode: string): string | null {
  const [best, second] = scoreLanguages(transcript.slice(0, 15_000))
  if (best.score >= 20 && best.score >= second.score * 2) return best.name
  // Inconclusive text: fall back to the provider's code when it maps cleanly.
  return LANG_CODE_NAMES[langCode.toLowerCase().split('-')[0]] ?? null
}

// Conclusive dominant language of a piece of generated output, or null.
function dominantLanguage(text: string, minHits: number): string | null {
  const [best, second] = scoreLanguages(text)
  return best.score >= minHits && best.score >= second.score * 2 ? best.name : null
}

// The caption-artifact shapes: a phrase of 2+ words repeated back-to-back, or a
// single word 3+ times in a row. Legitimate doubles ("very very") pass.
function findRepeatArtifact(text: string): string | null {
  const m =
    text.match(/\b(\p{L}+(?: \p{L}+){1,4}) \1\b/iu) ?? text.match(/\b(\p{L}+) \1 \1\b/iu)
  return m ? m[0] : null
}

// Post-generation guard: catches the two failure modes the prompt forbids
// (wrong/mixed output language, repeated-word artifacts) so a bad summary is
// regenerated instead of published. Runs in-process, costs nothing unless it
// actually finds a violation.
function validateSummary(gen: GeneratedSummary, targetLanguage: string | null): string[] {
  const problems: string[] = []
  const headings = gen.summary.sections.map((s) => s.heading).join(' ')
  const bodies = gen.summary.sections.map((s) => s.content).join('\n')
  const prose = [gen.summary.overview, headings, bodies, gen.summary.key_takeaways.join(' ')].join('\n')
  if (targetLanguage) {
    const got = dominantLanguage(prose, 12)
    if (got && got !== targetLanguage) {
      problems.push(`the output is written in ${got}, but it must be written entirely in ${targetLanguage}`)
    }
  }
  const headingLang = dominantLanguage(headings, 4)
  const bodyLang = dominantLanguage(bodies, 12)
  if (headingLang && bodyLang && headingLang !== bodyLang) {
    problems.push(`the section headings are in ${headingLang} but the body text is in ${bodyLang}; every field must use ONE language`)
  }
  const artifact = findRepeatArtifact(prose + ' ' + gen.summary.sections.map((s) => s.quote).join(' '))
  if (artifact) {
    problems.push(`the output contains a repeated-word artifact: "${artifact}" - rephrase so no word or phrase repeats back-to-back`)
  }
  return problems
}

// Calibrated against the 32,403-char Gen Alpha summary (8 sections, woven
// quotes, deep narrative). Match or beat that depth; never thin output.
function systemPrompt(targetLanguage: string | null): string {
  const langRule = targetLanguage
    ? `Write the ENTIRE output in ${targetLanguage}. This was verified from the transcript text itself; follow it even if the metadata or parts of the transcript suggest another language.`
    : `Write the ENTIRE output in the language the transcript text is actually written in. Determine it from the transcript body itself; ignore the metadata language code if it disagrees. Do not default to English.`
  return `You are a writer producing a long-form, magazine-quality written summary of a single podcast episode, working from its transcript. Your job is to let a reader who never heard the episode come away understanding it as well as someone who listened.

LANGUAGE (hard rule): ${langRule} Every field - the overview, every section heading and body, every quote, every key takeaway, every tag - must be in that ONE language. Never mix languages between fields or within a field (a heading in one language with body text in another is a hard failure).

TRANSCRIPT QUALITY: The transcript is auto-generated captions. Expect missing punctuation, wrong word boundaries, repeated fragments, and mis-transcribed words. All prose must be your own writing; never copy caption artifacts. Repeating a word or phrase twice in a row is forbidden everywhere in your output.

VOICE: Write like a feature writer at a serious magazine: strong verbs, concrete detail, controlled pacing, no throat-clearing. Specificity beats coverage: it is better to make the episode's strongest moments land, with the names, numbers, and stories attached, than to touch everything thinly. Cover as many moments as you can do full justice to, and not one more.

QUALITY EXEMPLAR (calibrate to this level of concreteness and flow; match its craft, NOT its topic, and NOT its language - your entire output stays in the target language stated above):
"Halfway through the episode, Chen drops the number that reframes everything: forty percent of the startups in their portfolio now spend more on inference than on salaries. He does not frame it as a crisis but as a filter, the companies that survive will be the ones that treat compute as a scarce resource rather than a growth hack. Rodriguez pushes back with the story of a two-person team that shipped a profitable legal-research tool in six weeks, arguing the real moat was never capital but the willingness to interview fifty lawyers before writing a line of code."

Depth bar (calibration): aim for 1,500 to 2,200 words of body prose across the sections. Write rich, flowing narrative paragraphs (4 to 6 sentences each, 3 to 4 paragraphs per section). Use the specific facts, names, numbers, studies, stories, and arguments from the transcript. Do not pad, do not get vague, do not write a thin 2-3 paragraph recap.

Structure rules:
- Produce a DYNAMIC number of sections, 3 to 8, that follow the episode's real thematic arc, inferred from the transcript.
- Each section "heading" must be specific and descriptive of that section's actual content, like a strong magazine subheading. FORBIDDEN generic headings: "Overview", "Summary", "Introduction", "Conclusion", "Key Takeaways", "Background", "Main Points" (and their equivalents in the transcript's language).
- Each section "content": multiple full paragraphs of narrative prose. Separate paragraphs with a blank line. No bullet points inside content.
- Each section "quote": one short quote of the speaker's actual words from that section's part of the transcript, capturing its most striking line, in the language the words were spoken in. Lightly clean it for print: drop stutters, duplicated words, false starts, and filler ("uh", "um", "you know"), keeping the speaker's wording and meaning intact. Never include a repeated-word artifact. If that section has no line that quotes cleanly, use an empty string.
- "overview": one rich paragraph that works as a lede and orients the reader to the episode, who is on it, and the stakes.
- "key_takeaways": 4 to 6 crisp, skimmable takeaway sentences.
- "tags": 3 to 5 specific topic tags.
- "resources": only real resources the episode explicitly names (books, tools, sites, people to follow). Empty array if none.
- "title", "podcast_name", "creator": fill from the metadata provided; correct obvious errors using the transcript.

Write in clear, engaging prose. No em dashes anywhere; use commas or rephrase. Use straight quotes only.`
}

function buildUserMessage(transcript: string, meta: SummaryMeta, targetLanguage: string | null): string {
  return `Episode metadata:
- Title: ${meta.title || '(unknown)'}
- Channel/Author: ${meta.author || '(unknown)'}
- Output language: ${targetLanguage ?? "the language the transcript text is written in (determine it yourself; there is no reliable metadata)"}

Transcript:
"""
${transcript}
"""

Write the structured summary now, entirely in the output language stated above.`
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
  // Bound input so a very long episode can't blow the cost ceiling or the
  // function timeout. Truncate at a word boundary near the cap.
  let input = cleanTranscript(transcript)
  if (input.length > MAX_TRANSCRIPT_CHARS) {
    const cut = input.lastIndexOf(' ', MAX_TRANSCRIPT_CHARS)
    input = input.slice(0, cut > 0 ? cut : MAX_TRANSCRIPT_CHARS)
  }
  const targetLanguage = detectLanguage(input, meta.lang)

  // At most one retry, and only when the guard finds a real violation, so the
  // amortized cost overhead is the violation rate (a few percent at worst).
  // If a retry pushes past the function timeout, the QStash queue redelivers
  // the job, so nothing is lost.
  // The hub's subscription route (claude CLI) doesn't enforce output_config,
  // so when routed through the hub the schema also rides along in the prompt
  // — the API-credits path still gets hard enforcement either way.
  const hubFormatNote = hubConfigured
    ? '\n\nOutput format (mandatory): respond with ONLY a raw JSON object — no markdown fences, no prose before or after — that validates against this JSON Schema:\n' +
      JSON.stringify(SUMMARY_SCHEMA)
    : ''

  let retryNote = ''
  for (let attempt = 0; ; attempt++) {
    const params: Anthropic.MessageStreamParams = {
      model: SUMMARY_MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      // Sonnet 5 is faster and ~40% the price of the old Opus setup, so high
      // effort still fits the 60s Hobby limit and stays under the old
      // per-summary cost while buying better writing.
      output_config: {
        effort: 'high',
        format: { type: 'json_schema', schema: SUMMARY_SCHEMA },
      },
      system: systemPrompt(targetLanguage),
      messages: [
        {
          role: 'user',
          content:
            buildUserMessage(input, meta, targetLanguage) +
            hubFormatNote +
            retryNote,
        },
      ],
    }

    // Hub first; if the gateway/tunnel is down, retry direct-to-Anthropic
    // with the fallback key (API credits).
    let message: Anthropic.Message
    try {
      message = await anthropic.messages.stream(params).finalMessage()
    } catch (err) {
      if (anthropicFallback && isGatewayFailure(err)) {
        message = await anthropicFallback.messages.stream(params).finalMessage()
      } else {
        throw err
      }
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    let gen: GeneratedSummary
    try {
      gen = JSON.parse(stripCodeFences(text)) as GeneratedSummary
    } catch {
      // Malformed JSON only really happens on the hub's CLI route. One retry
      // with an explicit complaint; after that, surface the failure.
      if (attempt > 0) throw new Error('The model returned malformed JSON.')
      retryNote =
        '\n\nYour previous attempt was rejected: it was not a single valid raw JSON object. Return ONLY the JSON object.'
      continue
    }
    const problems = attempt === 0 ? validateSummary(gen, targetLanguage) : []
    if (problems.length === 0) return gen
    retryNote =
      '\n\nYour previous attempt was rejected by an automated check for these violations:\n- ' +
      problems.join('\n- ') +
      '\nRegenerate the complete summary with every violation fixed.'
  }
}

/** CLI-route responses sometimes arrive wrapped in ```json fences. */
function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
}
