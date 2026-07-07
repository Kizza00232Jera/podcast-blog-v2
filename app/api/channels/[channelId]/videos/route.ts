import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getChannel } from '@/app/lib/db/channel-queries'
import { fetchUploadsPage, fetchDurations, uploadsPlaylistId } from '@/app/lib/youtube'

// "Load more" for a channel's video list: one uploads-playlist page (50
// videos, 1 quota unit) + their durations (1 unit). Channel must belong to
// the signed-in user.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { channelId } = await params
  const channel = await getChannel(userId, channelId)
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const pageToken = request.nextUrl.searchParams.get('pageToken') ?? undefined

  try {
    const page = await fetchUploadsPage(
      channel.uploads_playlist_id ?? uploadsPlaylistId(channelId),
      pageToken
    )
    const durations = await fetchDurations(page.videos.map((v) => v.videoId))
    return NextResponse.json({
      videos: page.videos.map((v) => ({
        ...v,
        publishedAt: v.publishedAt.toISOString(),
        durationSeconds: durations.get(v.videoId) ?? null,
        channelTitle: channel.title,
      })),
      nextPageToken: page.nextPageToken,
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not load videos from YouTube.' },
      { status: 502 }
    )
  }
}
