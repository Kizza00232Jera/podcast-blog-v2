import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { youtubeUrl, videoTitle, videoAuthor } = await request.json()

  if (!youtubeUrl) {
    return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
  }

  const searchQuery = `Search for and analyze this YouTube podcast: ${youtubeUrl}`
    + (videoTitle ? ` titled "${videoTitle}"` : '')
    + (videoAuthor ? ` by ${videoAuthor}` : '')

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      temperature: 0.2,
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: `You are a professional podcast content analyzer. Search for the podcast by its title and author, then analyze its content. Return ONLY a valid JSON object with no markdown formatting, no code fences, no citation markers like [1][2][3], and no explanation text before or after the JSON.

Use exactly this structure:
{
  "title": "episode title",
  "podcast_name": "name of the podcast show",
  "creator": "host name",
  "duration_minutes": 45,
  "tags": ["tag1", "tag2", "tag3"],
  "summary": {
    "overview": "2-3 sentence overview of the episode",
    "sections": [
      { "heading": "Section Title", "content": "Detailed paragraph about this section" }
    ],
    "quotes": ["Notable quote from the episode", "Another quote"]
  },
  "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  "actionable_advice": ["Concrete action 1", "Concrete action 2"],
  "resources": ["Book or tool mentioned", "Website mentioned"]
}`
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
    // Override title/creator with accurate YouTube metadata if available
    if (videoTitle) podcastData.title = videoTitle
    if (videoAuthor) podcastData.creator = videoAuthor
    return NextResponse.json(podcastData)
  } catch {
    console.error('Raw AI response:', content)
    return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 })
  }
}