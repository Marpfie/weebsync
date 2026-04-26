import { ServerError } from '@apollo/client'
import PQueue from 'p-queue'

/**
 * Rate limiter for the AniList API.
 *
 * AniList currently enforces ~30 req/min under heavy load. The queue runs one
 * request at a time.
 * On 429 the failing request is retried before
 * the next queued request is started. Retry delay comes from Retry-After or
 * X-RateLimit-Reset headers, falling back to simple backoff when absent.
 */
const queue = new PQueue({ concurrency: 1, interval: 60_000, intervalCap: 90 })

const MAX_RETRIES = 5

const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
    })

export function enqueue<T>(function_: () => Promise<T>): Promise<T> {
    return queue.add(() => withRetry(function_))
}

async function withRetry<T>(function_: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await function_()
        } catch (error: unknown) {
            if (attempt >= MAX_RETRIES) throw error

            if (!ServerError.is(error) || error.statusCode !== 429) throw error

            // AniList sends X-RateLimit-Reset (Unix timestamp, seconds) on 429.
            // Retry-After (seconds delay) is a fallback in case they ever switch.
            // Both headers may be absent if CORS does not expose them; exponential backoff is used then.
            const retryAfter = error.response.headers.get('retry-after')
            const resetAt = error.response.headers.get('x-ratelimit-reset')

            let retryDelayMs: number

            if (retryAfter) {
                retryDelayMs = Number.parseInt(retryAfter, 10) * 1000
            } else if (resetAt) {
                retryDelayMs = Math.max(1000, Number.parseInt(resetAt, 10) * 1000 - Date.now())
            } else {
                retryDelayMs = Math.min(attempt * 7500, 60_000)
            }

            console.warn(`[rate-limiter] 429 — retrying in ${retryDelayMs}ms (attempt ${attempt + 1})`)
            await sleep(retryDelayMs)
        }
    }

    throw new Error('[rate-limiter] exceeded max retries')
}
