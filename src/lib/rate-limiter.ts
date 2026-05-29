import { ServerError } from '@apollo/client'
import PQueue from 'p-queue'

/**
 * Rate limiter for the AniList API.
 *
 * AniList currently enforces a degraded ~30 req/min limit (normally 90); we
 * use a conservative static `intervalCap` of 29 that fits comfortably under
 * both, and rely on the headers from each response for the *important* gate:
 * proactively pausing when the server says we're about to be rate-limited.
 *
 * Three layers of defence against 429s:
 *   1. Conservative static `intervalCap` so we cap our own enqueue rate.
 *   2. Proactive pause when `X-RateLimit-Remaining` drops to ≤ 1, resuming
 *      at `X-RateLimit-Reset` (+ a small clock-skew buffer).
 *   3. 429 retry with backoff as a last-resort fallback if 1 and 2 both miss.
 *
 * NOTE: `intervalCap` is private, so it can't be mutated at
 * runtime.
 */

const INTERVAL_CAP = 29
const RESUME_BUFFER_MS = 500
const MAX_RETRIES = 5

const queue = new PQueue({ concurrency: 1, interval: 60_000, intervalCap: INTERVAL_CAP })

export const PRIORITY = {
    FOLLOWING: 80,
    FRIEND_ANIME: 50,
    FRIEND_MANGA: 40,
    USER_LISTS: 90,
    VIEWER: 100,
} as const

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]

/** Pause state exposed for UI (Phase 2 header badge). */
const state = {
    listeners: new Set<() => void>(),
    paused: false,
    resumesAt: null as null | number,
}

const notify = (): void => {
    for (const l of state.listeners) l()
}

export const getRateLimitState = (): { paused: boolean; resumesAt: null | number } => ({
    paused: state.paused,
    resumesAt: state.resumesAt,
})

export const subscribeRateLimit = (listener: () => void): (() => void) => {
    state.listeners.add(listener)
    return () => {
        state.listeners.delete(listener)
    }
}

const setPausedState = (paused: boolean, resumesAt: null | number): void => {
    if (state.paused === paused && state.resumesAt === resumesAt) return
    state.paused = paused
    state.resumesAt = resumesAt
    notify()
}

let resumeTimer: null | ReturnType<typeof setTimeout> = null

const scheduleResume = (resetUnixSeconds: number): void => {
    const resumesAt = resetUnixSeconds * 1000 + RESUME_BUFFER_MS
    const delay = Math.max(0, resumesAt - Date.now())

    queue.pause()
    setPausedState(true, resumesAt)

    if (resumeTimer) clearTimeout(resumeTimer)
    resumeTimer = setTimeout(() => {
        queue.start()
        setPausedState(false, null)
        resumeTimer = null
    }, delay)
}

const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
    })

/**
 * Inspect rate-limit headers from any AniList response (success or 429).
 * Triggers proactive pause when nearing the cap.
 */
const readRateLimitHeaders = (headers: Headers): void => {
    const remainingRaw = headers.get('x-ratelimit-remaining')
    const resetRaw = headers.get('x-ratelimit-reset')

    if (remainingRaw && resetRaw) {
        const remaining = Number.parseInt(remainingRaw, 10)
        const reset = Number.parseInt(resetRaw, 10)
        if (Number.isFinite(remaining) && Number.isFinite(reset) && remaining <= 1) {
            scheduleResume(reset)
        }
    }
}

/**
 * Apollo's `client.query()` resolves with the parsed payload, so we lose the
 * raw Response and its headers. We intercept `globalThis.fetch` once on first
 * use to mirror rate-limit headers into the limiter regardless of which
 * transport invokes them.
 */
const installFetchInterceptor = (() => {
    let installed = false
    return () => {
        if (installed || typeof globalThis.fetch !== 'function') return
        installed = true
        const original = globalThis.fetch.bind(globalThis)
        globalThis.fetch = async (...arguments_) => {
            const response = await original(...arguments_)
            const first = arguments_[0]
            let url = ''
            if (typeof first === 'string') url = first
            else if (first instanceof URL) url = first.href
            else if (first instanceof Request) url = first.url
            if (url.includes('graphql.anilist.co')) readRateLimitHeaders(response.headers)
            return response
        }
    }
})()

export function enqueue<T>(function_: () => Promise<T>, priority: Priority = PRIORITY.FRIEND_ANIME): Promise<T> {
    installFetchInterceptor()
    return queue.add(() => withRetry(function_), { priority })
}

async function withRetry<T>(function_: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await function_()
        } catch (error: unknown) {
            if (attempt >= MAX_RETRIES) throw error

            if (!ServerError.is(error) || error.statusCode !== 429) throw error

            readRateLimitHeaders(error.response.headers)

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
            await sleep(retryDelayMs + RESUME_BUFFER_MS)
        }
    }

    throw new Error('[rate-limiter] exceeded max retries')
}
