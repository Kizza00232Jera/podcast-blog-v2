import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// IMPORTANT: this Redis is SHARED with the Recipe App. The prefix
// `pcast:ratelimit:gen` namespaces our keys so they never collide.
// 3 generations/day per logged-in user.
const redis = Redis.fromEnv()

export const generationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 d'),
  prefix: 'pcast:ratelimit:gen',
  analytics: false,
})
