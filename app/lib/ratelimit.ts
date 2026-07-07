import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { hubIsLive } from './anthropic'

// IMPORTANT: this Redis is SHARED with the Recipe App. The prefix
// `pcast:ratelimit:gen` namespaces our keys so they never collide.
const redis = Redis.fromEnv()

// Both limiters share the same prefix + window, so they increment ONE daily
// counter per user — only the allowed maximum differs. When the AI hub is
// live, generations ride the Claude subscription and users get 5/day;
// otherwise they burn API credits and get 3/day.
function makeLimiter(max: number) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(max, '1 d'),
    prefix: 'pcast:ratelimit:gen',
    analytics: false,
  })
}

const limit3 = makeLimiter(3)
const limit5 = makeLimiter(5)

export async function getGenerationRatelimit(): Promise<{
  ratelimit: Ratelimit
  max: number
}> {
  const live = await hubIsLive()
  return live ? { ratelimit: limit5, max: 5 } : { ratelimit: limit3, max: 3 }
}
