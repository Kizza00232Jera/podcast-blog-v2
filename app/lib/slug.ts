// Deterministic-ish slug: kebab the title, append a short random suffix so two
// episodes with the same title don't collide on the unique slug column.
export function createSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base || 'episode'}-${suffix}`
}
