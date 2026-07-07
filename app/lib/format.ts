// Shared display formatting for video cards (channel pages + feed).

/** Seconds → YouTube-style duration badge: 12:34 or 1:02:34. */
export function formatVideoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** "3 hours ago", "2 days ago", "1 month ago" — like YouTube. */
export function timeAgo(date: Date | string): string {
  const then = typeof date === 'string' ? new Date(date) : date
  const secs = Math.max(0, (Date.now() - then.getTime()) / 1000)
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.348, 'week'],
    [12, 'month'],
    [Infinity, 'year'],
  ]
  let value = secs
  for (const [size, unit] of units) {
    if (value < size) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'always' }).format(
        -Math.max(1, Math.floor(value)),
        unit
      )
    }
    value /= size
  }
  return ''
}
