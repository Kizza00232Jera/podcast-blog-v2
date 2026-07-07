# YouTube integration setup

One-time setup for the subscriptions / feed features (Channels, Feed, one-click
generate). Everything here is on free tiers — the YouTube Data API's 10,000
units/day budget is never a concern (a heavy day here uses well under 100).

## 1. Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a
   project (e.g. `echonotes`).
2. **APIs & Services → Library** → search **YouTube Data API v3** → Enable.

### API key (public data: video lists, durations)

3. **APIs & Services → Credentials → Create credentials → API key.**
4. Restrict it (recommended): API restrictions → YouTube Data API v3 only.
5. Put it in `.env.local` **and** Vercel env:

   ```
   YOUTUBE_API_KEY=AIza...
   ```

### OAuth client (reading your subscriptions)

6. **APIs & Services → OAuth consent screen** → External → fill in app name +
   your email. **Do NOT submit for verification** — leave it in **Testing**
   mode.
7. Under **Test users**, add your Gmail address. ⚠️ Every user who wants to
   connect YouTube must be added here by email first (max 100). Users who only
   paste links don't need this.
8. **Credentials → Create credentials → OAuth client ID** → Web application.
   The redirect URI comes from Clerk in the next section — you'll paste it here.

## 2. Clerk: Google connection with the YouTube scope

1. [Clerk dashboard](https://dashboard.clerk.com) → your app → **SSO
   connections** (User & authentication) → **Google**.
2. Enable it and switch to **custom credentials**. Copy the **redirect URI**
   Clerk shows → add it to the Google OAuth client from step 8 above. Paste the
   Google **Client ID** and **Client secret** into Clerk.
3. In the Google connection settings, add to **Scopes**:

   ```
   https://www.googleapis.com/auth/youtube.readonly
   ```

4. Make sure the connection allows **linking to existing accounts**, so users
   who signed up with email can attach Google later from the Profile page.

That's it — the app asks Clerk for a fresh Google access token whenever it
calls the YouTube API (`app/lib/youtube/token.ts`); Clerk stores and refreshes
the token.

> **Note (existing sessions):** a user who connected Google *before* the scope
> was added must disconnect and reconnect the Google account (Profile →
> Connected accounts) to grant the YouTube permission.

## 3. AI Hub (Claude subscription routing)

Optional, from the [ai-hub](../../ai-hub) project. When the hub + tunnel are
running with the podcast-summarizer toggle ON, summary generation uses the
Claude subscription instead of API credits, and non-owner users get 5
generations/day instead of 3.

In the hub dashboard: **Add project** → paste this app's real Anthropic key →
copy the two env vars. Then set (locally and on Vercel):

```
ANTHROPIC_BASE_URL=https://gateway.<your-domain>   # the tunnel URL
ANTHROPIC_API_KEY=gw_...                           # the gateway token
ANTHROPIC_FALLBACK_API_KEY=sk-ant-...              # real key, used when hub is off
```

Without these (or with a plain `sk-ant-` key in `ANTHROPIC_API_KEY`), the app
calls Anthropic directly — nothing else changes.

## 4. Env var summary

| Variable | Where | Purpose |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | local + Vercel | Video lists + durations (public data) |
| `ANTHROPIC_BASE_URL` | local + Vercel | AI-hub gateway URL (optional) |
| `ANTHROPIC_API_KEY` | local + Vercel | Gateway token (`gw_…`) or real key |
| `ANTHROPIC_FALLBACK_API_KEY` | local + Vercel | Real key for when the hub is off |

Existing vars (`DATABASE_URL*`, Clerk, QStash, Upstash, transcript providers)
are unchanged.

## 5. How the free-tier math works

- **Feed refresh**: per-channel RSS (`videos.xml`) — zero quota, any number of
  opens. A 15-minute per-user Redis lock stops rapid re-fetches.
- **Durations**: `videos.list`, 1 unit per 50 videos, only for videos not yet
  cached.
- **Subscription sync**: `subscriptions.list`, 1 unit per 50 channels, only
  when you press Sync/Resync.
- **Channel browsing**: `playlistItems.list` + `videos.list`, 2 units per
  50-video page.
- Never used: `search.list` (100 units) — everything goes through uploads
  playlists instead.
