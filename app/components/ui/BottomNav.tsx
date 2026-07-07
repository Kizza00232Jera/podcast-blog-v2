'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Mobile-only bottom navigation for signed-in users. Mirrors the desktop
// tabs plus Profile. Icons are inline SVGs to stay dependency-free.
const ITEMS = [
  {
    href: '/',
    label: 'Library',
    icon: (
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
    ),
  },
  {
    href: '/feed',
    label: 'Feed',
    icon: (
      <path d="M13 3 5 13.5h5L10.5 21l8-10.5h-5L13 3Z" />
    ),
  },
  {
    href: '/channels',
    label: 'Channels',
    icon: (
      <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-1.75 4.9c0-.77.84-1.24 1.5-.85l4.28 2.6a1 1 0 0 1 0 1.7l-4.28 2.6a1 1 0 0 1-1.5-.85V8.9Z" />
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10c3.9 0 7 2 7 4.5V20H5v-1.5C5 16 8.1 14 12 14Z" />
    ),
  },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/podcast')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-canvas/90 backdrop-blur-md sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-amber' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                {item.icon}
              </svg>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
