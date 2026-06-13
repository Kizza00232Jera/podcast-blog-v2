import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

// Server component: gate on auth() rather than <SignedIn>/<SignedOut>, which
// this Clerk version no longer exports from the package root.
export default async function Header() {
  const { userId } = await auth()

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-canvas/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span
            aria-hidden
            className="grid place-items-center h-8 w-8 rounded-lg bg-amber-dim text-amber text-base ring-1 ring-line-strong transition-colors group-hover:bg-amber/20"
          >
            ◗
          </span>
          <span className="font-ui font-semibold tracking-tight text-ink text-[17px]">
            Echonotes
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {userId ? (
            <>
              <Link
                href="/upload"
                className="text-sm font-medium text-ink-soft hover:text-ink transition-colors"
              >
                Generate
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-ink-soft hover:text-ink transition-colors">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-sm font-semibold px-4 py-2 rounded-full bg-amber text-canvas hover:bg-amber-strong transition-colors">
                  Sign up
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
