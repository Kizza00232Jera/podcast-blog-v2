import { Client } from '@upstash/qstash'

// QStash stays on the EU region. QSTASH_URL points the SDK at the EU endpoint;
// QSTASH_TOKEN authenticates publishes.
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
  baseUrl: process.env.QSTASH_URL,
})

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
