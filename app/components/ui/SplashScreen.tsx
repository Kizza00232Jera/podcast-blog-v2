'use client'

import { useEffect, useState } from 'react'

// A brief opening animation shown on a cold start of the app (once per tab
// session), before the gallery or sign-in appears. Pure CSS, respects
// prefers-reduced-motion, and never blocks interaction for long.
export default function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'leaving' | 'done'>('show')

  useEffect(() => {
    // Only on a genuine fresh open, not on every client-side navigation.
    if (sessionStorage.getItem('echonotes-splash')) {
      setPhase('done')
      return
    }
    sessionStorage.setItem('echonotes-splash', '1')

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = reduce ? 250 : 1300
    const t1 = setTimeout(() => setPhase('leaving'), hold)
    const t2 = setTimeout(() => setPhase('done'), hold + 500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] grid place-items-center bg-canvas transition-opacity duration-500 ${
        phase === 'leaving' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(50rem 30rem at 50% 40%, rgba(255,179,71,0.10), #0F0F12 70%)',
      }}
    >
      <div className="flex flex-col items-center gap-5">
        <span className="echonotes-splash-mark grid h-20 w-20 place-items-center rounded-2xl bg-amber-dim text-amber text-4xl ring-1 ring-line-strong">
          ◗
        </span>
        <span className="echonotes-splash-word font-ui text-xl font-semibold tracking-tight text-ink">
          Echonotes
        </span>
      </div>

      <style>{`
        @keyframes echonotes-pop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes echonotes-rise {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .echonotes-splash-mark { animation: echonotes-pop 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .echonotes-splash-word { animation: echonotes-rise 0.5s ease-out 0.25s both; }
        @media (prefers-reduced-motion: reduce) {
          .echonotes-splash-mark, .echonotes-splash-word { animation: none; }
        }
      `}</style>
    </div>
  )
}
