import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { youtubeUrl } = await request.json()

  if (!youtubeUrl) {
    return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: `You are an expert podcast analyst. Analyze the given YouTube podcast and return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "title": "episode title",
  "podcast_name": "name of the podcast show",
  "creator": "host name",
  "duration_minutes": 45,
  "tags": ["tag1", "tag2"],
  "summary": {
    "overview": "2-3 sentence overview",
    "sections": [
      { "heading": "Section Title", "content": "Section paragraph" }
    ],
    "quotes": ["Notable quote 1", "Notable quote 2"]
  },
  "key_takeaways": ["Takeaway 1", "Takeaway 2"],
  "actionable_advice": ["Action 1", "Action 2"],
  "resources": ["Resource 1"]
}`
        },
        {
          role: 'user',
          content: `Analyze this podcast: ${youtubeUrl}`
        }
      ]
    })
  })

  const data = await response.json()
  const content = data.choices[0].message.content

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const podcastData = JSON.parse(cleaned)
    return NextResponse.json(podcastData)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
