import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { youtubeUrl, videoTitle, videoAuthor } = await request.json()

  if (!youtubeUrl) {
    return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
  }

  const searchQuery = `Find and analyze this podcast episode: ${youtubeUrl}`
    + (videoTitle ? ` titled "${videoTitle}"` : '')
    + (videoAuthor ? ` by ${videoAuthor}` : '')

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-reasoning-pro',
      max_tokens: 5000,
      messages: [
        {
          role: 'system',
          content: `You are a professional journalist writing a long-form article about a podcast episode. Search for transcripts, show notes, reviews, and discussions. Write so the reader fully understands the episode — use specific facts, names, numbers, stories, and arguments.

Return ONLY a valid JSON object. No markdown, no code fences, no citation markers like [1][2][3], no text outside the JSON.

Use exactly this structure:
{
  "title": "episode title",
  "podcast_name": "name of the podcast show",
  "creator": "host name",
  "duration_minutes": 45,
  "tags": ["tag1", "tag2", "tag3"],
  "summary": {
    "sections": [
      {
        "heading": "A specific descriptive subheading about this section's topic",
        "content": "3-4 full paragraphs of rich narrative prose. Each paragraph 4-6 sentences. Include specific facts, examples, stories, statistics, and arguments from the episode. Write like a journalist — depth, clarity, narrative flow. Separate paragraphs with a blank line. No bullet points."
      }
    ],
    "quotes": ["Direct quote from the speaker", "Another notable quote"]
  }
}

STRICT RULES for section headings — these are FORBIDDEN:
- Do NOT use: "Overview", "Summary", "Introduction", "Conclusion", "Key Takeaways", "Actionable Advice", "Background", "Main Points"
- Every heading must be SPECIFIC and DESCRIPTIVE about the actual content, like a newspaper subheading
- Good examples: "Why Social Media Is Hitting Teenage Girls Hardest", "The Neuroscience Behind Dopamine and Addiction", "How Denmark Became the Blueprint for Reform"

Requirements:
- Write 4-5 sections — start directly with the most important topic, no generic intro section
- Each section: 3-4 full paragraphs of flowing prose, never fewer
- Total article: 1200-1600 words
- Quotes: real words from the episode when possible
- Tags: 3-5 specific topic tags`
        },
        {
          role: 'user',
          content: searchQuery,
        }
      ]
    })
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Perplexity API error:', data)
    return NextResponse.json({ error: data.error?.message || 'Perplexity API error' }, { status: 500 })
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    return NextResponse.json({ error: 'No content returned from AI' }, { status: 500 })
  }

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const podcastData = JSON.parse(jsonMatch[0])
    if (videoTitle) podcastData.title = videoTitle
    if (videoAuthor) podcastData.creator = videoAuthor
    return NextResponse.json(podcastData)
  } catch {
    console.error('Raw AI response:', content)
    return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 })
  }
}
