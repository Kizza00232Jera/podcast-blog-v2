import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// App runtime queries go through the POOLED connection string. Drizzle
// migrations use the UNPOOLED url (see drizzle.config.ts) — keep them split.
const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
export { schema }
