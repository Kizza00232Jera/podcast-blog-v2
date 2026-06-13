import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Anonymous visitors get the read-only public gallery (handled in the pages by
// querying is_public rows). Only these routes require a signed-in user:
//  - /upload          (the generate UI / private library writes)
//  - /api/generate    (enqueues a generation)
//  - /library         (a signed-in user's private collection)
// The QStash worker (/api/worker) is NOT protected here — it verifies the
// QStash signature itself.
const isProtectedRoute = createRouteMatcher([
  '/upload(.*)',
  '/api/generate(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = await auth()
    if (!userId) {
      // For API routes return 401; for pages send to Clerk sign-in.
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return (await auth()).redirectToSignIn()
    }
  }
})

export const config = {
  matcher: [
    // Skip Next internals and static files, but always run for clerk handshake
    // and API routes.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|webp|ico|woff2?|ttf|map)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
