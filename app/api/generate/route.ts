import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generationRatelimit } from '@/app/lib/ratelimit'
import { qstash, appUrl } from '@/app/lib/qstash'
import { extractVideoId } from '@/app/lib/supadata'
import { createSlug } from '@/app/lib/slug'
import { createPost } from '@/app/lib/db/queries'

// Antonio's own Clerk id is exempt from the daily limit; everyone else gets 3/day.
const UNLIMITED_USER_ID = 'user_3F5zsMzyw3nkanDkUCsdyO92TM4'

// Click "Generate" -> validate + rate-limit -> insert a "generating..."
// placeholder row -> enqueue the heavy work to QStash -> return immediately.
// The worker (/api/worker) fetches captions, runs Opus, and fills the row.
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { youtubeUrl } = await request.json().catch(() => ({}))
  if (!youtubeUrl || typeof youtubeUrl !== 'string') {
    return NextResponse.json({ error: 'A YouTube URL is required.' }, { status: 400 })
  }

  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) {
    return NextResponse.json(
      { error: 'That does not look like a YouTube link.' },
      { status: 400 }
    )
  }

  // 3 generations/day/user (shared Redis -> the pcast:ratelimit:gen prefix).
  // The owner account is exempt.
  if (userId !== UNLIMITED_USER_ID) {
    const { success } = await generationRatelimit.limit(userId)
    if (!success) {
      return NextResponse.json(
        { error: 'Daily limit reached (3 per day). Try again tomorrow.' },
        { status: 429 }
      )
    }
  }

  // Lightweight metadata for a presentable placeholder card.
  let title = 'Generating summary…'
  let creator = ''
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        youtubeUrl
      )}&format=json`
    )
    if (oembed.ok) {
      const meta = await oembed.json()
      title = meta.title || title
      creator = meta.author_name || ''
    }
  } catch {
    // non-fatal — the worker will set the real title.
  }

  const post = await createPost({
    slug: createSlug(title === 'Generating summary…' ? videoId : title),
    title,
    podcast_name: creator,
    creator,
    source_link: youtubeUrl,
    thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    duration_minutes: 0,
    rating: null,
    tags: [],
    summary: { overview: '', sections: [] },
    key_takeaways: [],
    actionable_advice: [],
    resources: [],
    user_id: userId,
    is_public: false,
    status: 'generating',
  })

  await qstash.publishJSON({
    url: `${appUrl()}/api/worker`,
    body: { postId: post.id, youtubeUrl },
    retries: 3,
  })

  return NextResponse.json({ postId: post.id, slug: post.slug })
}
