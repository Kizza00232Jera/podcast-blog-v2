'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Library' },
  { href: '/feed', label: 'Feed' },
  { href: '/channels', label: 'Channels' },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/podcast')
  return pathname === href || pathname.startsWith(`${href}/`)
}

// Desktop header tabs (hidden on mobile — BottomNav takes over there).
export default function NavTabs() {
  const pathname = usePathname()
  return (
    <div className="hidden items-center gap-1 sm:flex">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            isActive(pathname, t.href)
              ? 'bg-amber-dim text-amber'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
