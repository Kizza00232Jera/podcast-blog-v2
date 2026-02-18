'use client'

import { useState, SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import type { PodcastSummary } from '@/app/types/podcast'

interface GeneratedPodcast {
  title: string
  podcast_name: string
  creator: string
  duration_minutes: number
  tags: string[]
  summary: PodcastSummary
  key_takeaways: string[]
  actionable_advice: string[]
  resources: string[]
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)/)
  return match ? match[1] : null
}

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).substring(2, 7)
}

export default function UploadPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<GeneratedPodcast | null>(null)
  const [rating, setRating] = useState(5)

  const router = useRouter()
  const supabase = createClient()

  async function handleGenerate(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setGenerated(null)

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Something went wrong')
      setGenerating(false)
      return
    }

    setGenerated(data)
    setGenerating(false)
  }

  async function handleSave() {
    if (!generated) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const videoId = extractVideoId(youtubeUrl)
    const thumbnail_url = videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : ''

    const { error } = await supabase.from('podcasts').insert({
      title: generated.title,
      podcast_name: generated.podcast_name,
      creator: generated.creator,
      duration_minutes: generated.duration_minutes,
      tags: generated.tags,
      summary: generated.summary,
      key_takeaways: generated.key_takeaways,
      actionable_advice: generated.actionable_advice,
      resources: generated.resources,
      source_link: youtubeUrl,
      thumbnail_url,
      slug: createSlug(generated.title),
      rating,
      user_id: user.id,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div>
      <h1>Upload Podcast</h1>

      <form onSubmit={handleGenerate}>
        <input
          type="url"
          placeholder="Paste YouTube URL"
          value={youtubeUrl}
          onChange={e => setYoutubeUrl(e.target.value)}
          required
        />
        <button type="submit" disabled={generating}>
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {error && <p>{error}</p>}

      {generated && (
        <div>
          <h2>{generated.title}</h2>
          <p>{generated.podcast_name} · {generated.creator}</p>
          <p>{generated.duration_minutes} min</p>
          <div>
            {generated.tags.map(tag => <span key={tag}>{tag}</span>)}
          </div>

          <h3>Overview</h3>
          <p>{generated.summary.overview}</p>

          <h3>Key Takeaways</h3>
          <ul>
            {generated.key_takeaways.map((item, i) => <li key={i}>{item}</li>)}
          </ul>

          <label>
            Your rating (1–5):
            <input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={e => setRating(Number(e.target.value))}
            />
          </label>

          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Podcast'}
          </button>
        </div>
      )}
    </div>
  )
}
