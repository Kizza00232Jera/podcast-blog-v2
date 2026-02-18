'use client'

import { useState, SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

interface FormData {
  title: string
  podcast_name: string
  creator: string
  duration_minutes: number
  rating: number
  overview: string
  sections: { heading: string; content: string }[]
  quotes: string[]
  tags: string[]
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
  const [formData, setFormData] = useState<FormData | null>(null)

  const router = useRouter()
  const supabase = createClient()

  async function handleGenerate(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setFormData(null)

    // Fetch YouTube metadata so Perplexity can search by title/author
    let videoTitle = ''
    let videoAuthor = ''
    try {
      const oEmbed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
      )
      if (oEmbed.ok) {
        const meta = await oEmbed.json()
        videoTitle = meta.title || ''
        videoAuthor = meta.author_name || ''
      }
    } catch {
      // oEmbed failed — proceed without metadata
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl, videoTitle, videoAuthor }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Something went wrong')
      setGenerating(false)
      return
    }

    setFormData({
      title: data.title || videoTitle || '',
      podcast_name: data.podcast_name || '',
      creator: data.creator || videoAuthor || '',
      duration_minutes: data.duration_minutes || 0,
      rating: 5,
      overview: data.summary?.overview || '',
      sections: data.summary?.sections || [],
      quotes: data.summary?.quotes || [],
      tags: data.tags || [],
      key_takeaways: data.key_takeaways || [],
      actionable_advice: data.actionable_advice || [],
      resources: data.resources || [],
    })
    setGenerating(false)
  }

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData(prev => prev ? { ...prev, [key]: value } : prev)
  }

  type StringArrayKey = 'tags' | 'key_takeaways' | 'actionable_advice' | 'resources' | 'quotes'

  function updateArrayItem(key: StringArrayKey, index: number, value: string) {
    setFormData(prev => {
      if (!prev) return prev
      const arr = [...(prev[key] as string[])]
      arr[index] = value
      return { ...prev, [key]: arr }
    })
  }

  function addArrayItem(key: StringArrayKey) {
    setFormData(prev => prev ? { ...prev, [key]: [...(prev[key] as string[]), ''] } : prev)
  }

  function removeArrayItem(key: StringArrayKey, index: number) {
    setFormData(prev => {
      if (!prev) return prev
      return { ...prev, [key]: (prev[key] as string[]).filter((_, i) => i !== index) }
    })
  }

  function updateSection(index: number, field: 'heading' | 'content', value: string) {
    setFormData(prev => {
      if (!prev) return prev
      const sections = prev.sections.map((s, i) => i === index ? { ...s, [field]: value } : s)
      return { ...prev, sections }
    })
  }

  function addSection() {
    setFormData(prev => prev ? { ...prev, sections: [...prev.sections, { heading: '', content: '' }] } : prev)
  }

  function removeSection(index: number) {
    setFormData(prev => prev ? { ...prev, sections: prev.sections.filter((_, i) => i !== index) } : prev)
  }

  async function handleSave() {
    if (!formData) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const videoId = extractVideoId(youtubeUrl)
    const thumbnail_url = videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : ''

    const { error } = await supabase.from('podcast_posts').insert({
      title: formData.title,
      podcast_name: formData.podcast_name,
      creator: formData.creator,
      duration_minutes: formData.duration_minutes,
      tags: formData.tags.filter(t => t.trim()),
      summary: {
        overview: formData.overview,
        sections: formData.sections,
        quotes: formData.quotes.filter(q => q.trim()),
      },
      key_takeaways: formData.key_takeaways.filter(t => t.trim()),
      actionable_advice: formData.actionable_advice.filter(t => t.trim()),
      resources: formData.resources.filter(t => t.trim()),
      source_link: youtubeUrl,
      thumbnail_url,
      slug: createSlug(formData.title),
      rating: formData.rating,
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Upload Podcast</h1>

      {/* URL input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <form onSubmit={handleGenerate} className="flex gap-3">
          <input
            type="url"
            placeholder="Paste YouTube URL"
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            required
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={generating}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm mb-6">
          {error}
        </div>
      )}

      {formData && (
        <div className="space-y-4">

          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Basic Info</h2>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Podcast Name</label>
                <input
                  type="text"
                  value={formData.podcast_name}
                  onChange={e => updateField('podcast_name', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Creator</label>
                <input
                  type="text"
                  value={formData.creator}
                  onChange={e => updateField('creator', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={e => updateField('duration_minutes', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rating (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.rating}
                  onChange={e => updateField('rating', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <ArrayField
            label="Tags"
            items={formData.tags}
            onAdd={() => addArrayItem('tags')}
            onRemove={i => removeArrayItem('tags', i)}
            onChange={(i, v) => updateArrayItem('tags', i, v)}
            textarea={false}
          />

          {/* Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Overview</label>
            <textarea
              value={formData.overview}
              onChange={e => updateField('overview', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Sections */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Sections</h2>
              <button
                onClick={addSection}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add section
              </button>
            </div>
            <div className="space-y-4">
              {formData.sections.map((section, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Section heading"
                      value={section.heading}
                      onChange={e => updateSection(i, 'heading', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => removeSection(i)}
                      className="text-red-400 hover:text-red-600 text-xs shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    placeholder="Section content"
                    value={section.content}
                    onChange={e => updateSection(i, 'content', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-1.5 rounded border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quotes */}
          <ArrayField
            label="Quotes"
            items={formData.quotes}
            onAdd={() => addArrayItem('quotes')}
            onRemove={i => removeArrayItem('quotes', i)}
            onChange={(i, v) => updateArrayItem('quotes', i, v)}
            textarea={true}
          />

          {/* Key Takeaways */}
          <ArrayField
            label="Key Takeaways"
            items={formData.key_takeaways}
            onAdd={() => addArrayItem('key_takeaways')}
            onRemove={i => removeArrayItem('key_takeaways', i)}
            onChange={(i, v) => updateArrayItem('key_takeaways', i, v)}
            textarea={true}
          />

          {/* Actionable Advice */}
          <ArrayField
            label="Actionable Advice"
            items={formData.actionable_advice}
            onAdd={() => addArrayItem('actionable_advice')}
            onRemove={i => removeArrayItem('actionable_advice', i)}
            onChange={(i, v) => updateArrayItem('actionable_advice', i, v)}
            textarea={true}
          />

          {/* Resources */}
          <ArrayField
            label="Resources"
            items={formData.resources}
            onAdd={() => addArrayItem('resources')}
            onRemove={i => removeArrayItem('resources', i)}
            onChange={(i, v) => updateArrayItem('resources', i, v)}
            textarea={false}
          />

          {/* Save button */}
          <div className="flex justify-end pb-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Podcast'}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

function ArrayField({
  label, items, onAdd, onRemove, onChange, textarea,
}: {
  label: string
  items: string[]
  onAdd: () => void
  onRemove: (i: number) => void
  onChange: (i: number, v: string) => void
  textarea: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">{label}</h2>
        <button onClick={onAdd} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            {textarea ? (
              <textarea
                value={item}
                onChange={e => onChange(i, e.target.value)}
                rows={2}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 resize-none"
              />
            ) : (
              <input
                type="text"
                value={item}
                onChange={e => onChange(i, e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
              />
            )}
            <button
              onClick={() => onRemove(i)}
              className="text-red-400 hover:text-red-600 text-sm shrink-0 self-start mt-2"
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}