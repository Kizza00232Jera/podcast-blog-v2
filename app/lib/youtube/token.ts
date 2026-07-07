import 'server-only'
import { clerkClient } from '@clerk/nextjs/server'

// Clerk manages the Google OAuth connection (added in the Clerk dashboard
// with the extra youtube.readonly scope) and refreshes tokens for us. We just
// ask it for a fresh access token when we need to call the YouTube API as
// the user. Returns null when the user has no Google account connected.
export async function getGoogleAccessToken(
  userId: string
): Promise<string | null> {
  try {
    const client = await clerkClient()
    const { data } = await client.users.getUserOauthAccessToken(
      userId,
      'google'
    )
    return data[0]?.token ?? null
  } catch {
    return null
  }
}
