import PQueue from 'p-queue'

/**
 * Rate limiter for the AniList API.
 *
 * AniList enforces ~30 req/min (degraded; normally 90). We run the queue at
 * `concurrency: 1` with no p-queue interval throttle — instead the fetch
 * interceptor owns all pause logic as a single source of truth:
 *
 *   1. On every AniList response, mirror `X-RateLimit-Limit / Remaining /
 *      Reset` onto the snapshot so the UI can display live quota state.
 *   2. When `remaining === 0`, explicitly pause the queue until the estimated
 *      window reset so the UI shows a countdown instead of going silent.
 *   3. On any 429 (or CORS-stripped 429 surfacing as TypeError), pause for
 *      70s — a buffer past the 60s window to clear AniList's penalty box.
 *   4. `withRetry` only waits for the active pause; the interceptor is the
 *      single source of truth for when to stop and when to resume.
 */

const RESUME_BUFFER_MS = 500
const MAX_RETRIES = 5

const queue = new PQueue({ concurrency: 1 })

export const PRIORITY = {
    FOLLOWING: 80,
    FRIEND_ANIME: 50,
    FRIEND_MANGA: 40,
    USER_LISTS: 90,
    VIEWER: 100,
} as const

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]

export interface RateLimitState {
    /** Observed AniList window cap from `X-RateLimit-Limit` (e.g. 30 or 90). */
    observedLimit: null | number
    /** Observed `X-RateLimit-Remaining` from the last response. */
    observedRemaining: null | number
    /** Unix-ms when the observed window resets (from `X-RateLimit-Reset`). */
    observedResetAt: null | number
    paused: boolean
    /** Pending + running tasks. Drives ETA + progress UI. */
    queueSize: number
    resumesAt: null | number
}

const state = {
    listeners: new Set<() => void>(),
    observedLimit: null as null | number,
    observedRemaining: null as null | number,
    observedResetAt: null as null | number,
    paused: false,
    queueSize: 0,
    resumesAt: null as null | number,
}

// Cached immutable snapshot — `useSyncExternalStore` compares with `Object.is`,
// so handing out a new object on every read causes an infinite render loop.
// Rebuilt only when the underlying values change.
let cachedSnapshot: RateLimitState = {
    observedLimit: null,
    observedRemaining: null,
    observedResetAt: null,
    paused: false,
    queueSize: 0,
    resumesAt: null,
}

const rebuildSnapshot = (): void => {
    cachedSnapshot = {
        observedLimit: state.observedLimit,
        observedRemaining: state.observedRemaining,
        observedResetAt: state.observedResetAt,
        paused: state.paused,
        queueSize: state.queueSize,
        resumesAt: state.resumesAt,
    }
}

const notify = (): void => {
    for (const l of state.listeners) l()
}

const refreshQueueSize = (): void => {
    const next = queue.size + queue.pending
    if (state.queueSize === next) return
    state.queueSize = next
    rebuildSnapshot()
    notify()
}

queue.on('add', refreshQueueSize)
queue.on('next', refreshQueueSize)
queue.on('active', refreshQueueSize)
queue.on('idle', refreshQueueSize)

export const getRateLimitState = (): RateLimitState => cachedSnapshot

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
    rebuildSnapshot()
    notify()
}

let resumeTimer: null | ReturnType<typeof setTimeout> = null

/**
 * Pause the queue until the given wall-clock timestamp. Used by the fetch
 * interceptor on every 429 / CORS-throw, and idempotent against shorter
 * pauses so back-to-back failures can't accidentally shrink an in-flight
 * pause window.
 */
const ts = () => new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm

const pauseUntil = (resumesAt: number): void => {
    if (state.paused && state.resumesAt !== null && state.resumesAt >= resumesAt) return

    const delay = Math.max(0, resumesAt - Date.now())

    queue.pause()
    setPausedState(true, resumesAt)

    if (resumeTimer) clearTimeout(resumeTimer)
    resumeTimer = setTimeout(() => {
        console.info(`[rate-limiter ${ts()}] resumed`)
        queue.start()
        setPausedState(false, null)
        resumeTimer = null
    }, delay)
}

/** Length of one AniList rate-limit window. */
const WINDOW_MS = 60_000
/**
 * How long we pause after any 429 / CORS-throw. A small buffer past the
 * 60s window avoids retrying right at the reset boundary, which empirically
 * still triggers a second CORS hit.
 */
const FULL_WINDOW_MS = WINDOW_MS + 10_000 // 70s

const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
    })

/**
 * Inspect rate-limit headers from any AniList response. Stores the observed
 * window state on the snapshot so the UI can display it; pause policy is
 * driven exclusively from the fetch interceptor (see below) so there is one
 * unambiguous source of truth.
 */
const readRateLimitHeaders = (headers: Headers): void => {
    const limitRaw = headers.get('x-ratelimit-limit')
    const remainingRaw = headers.get('x-ratelimit-remaining')
    const resetRaw = headers.get('x-ratelimit-reset')

    let changed = false

    if (limitRaw) {
        const limit = Number.parseInt(limitRaw, 10)
        if (Number.isFinite(limit) && state.observedLimit !== limit) {
            state.observedLimit = limit
            changed = true
        }
    }

    if (remainingRaw) {
        const parsed = Number.parseInt(remainingRaw, 10)
        if (Number.isFinite(parsed) && state.observedRemaining !== parsed) {
            // Detect new window: remaining went up (p-queue interval expired and a
            // fresh window started) or this is the very first request of a window
            // (remaining === limit - 1). AniList only sends X-RateLimit-Reset on
            // 429 responses, so we derive an estimated reset from window-start time.
            const prev = state.observedRemaining
            const isNewWindow =
                (prev !== null && parsed > prev) ||
                (state.observedLimit !== null && parsed === state.observedLimit - 1)
            if (isNewWindow && !resetRaw) {
                state.observedResetAt = Date.now() + WINDOW_MS
                changed = true
            }
            state.observedRemaining = parsed
            changed = true
        }
    }

    if (resetRaw) {
        const parsed = Number.parseInt(resetRaw, 10)
        if (Number.isFinite(parsed)) {
            const resetMs = parsed * 1000
            if (state.observedResetAt !== resetMs) {
                state.observedResetAt = resetMs
                changed = true
            }
        }
    }

    if (changed) {
        rebuildSnapshot()
        notify()
    }
}

/**
 * Apollo's `client.query()` resolves with the parsed payload, so we lose the
 * raw Response and its headers. We intercept `globalThis.fetch` once on first
 * use to mirror rate-limit headers into the limiter and — critically — to
 * enforce a single pause policy: on any AniList 429 or thrown error
 * (CORS-stripped 429s surface as TypeError), pause the entire queue for one
 * full window measured *from now*. Trusting `X-RateLimit-Reset` for retry
 * timing turned out to be a footgun because AniList keeps throttling past
 * the advertised reset when you're in their burst-limit penalty box.
 */
const installFetchInterceptor = (() => {
    let installed = false
    return () => {
        if (installed || typeof globalThis.fetch !== 'function') return
        installed = true
        const original = globalThis.fetch.bind(globalThis)
        globalThis.fetch = async (...arguments_) => {
            const first = arguments_[0]
            let url = ''
            if (typeof first === 'string') url = first
            else if (first instanceof URL) url = first.href
            else if (first instanceof Request) url = first.url
            const isAnilist = url.includes('graphql.anilist.co')

            try {
                const response = await original(...arguments_)
                if (isAnilist) {
                    readRateLimitHeaders(response.headers)
                    const limit = response.headers.get('x-ratelimit-limit')
                    const remaining = response.headers.get('x-ratelimit-remaining')
                    const reset = response.headers.get('x-ratelimit-reset')
                    const resetIn = reset
                        ? Math.max(0, Math.ceil((Number(reset) * 1000 - Date.now()) / 1000))
                        : null
                    if (response.status === 429) {
                        console.warn(
                            `[rate-limiter ${ts()}] 429 — limit=${limit} remaining=${remaining} reset=${resetIn}s — pausing ${FULL_WINDOW_MS}ms`,
                        )
                        pauseUntil(Date.now() + FULL_WINDOW_MS)
                    } else {
                        console.debug(
                            `[rate-limiter ${ts()}] ${response.status} — limit=${limit} remaining=${remaining} reset=${resetIn}s`,
                        )
                        // When the last slot is consumed (remaining === 0) and there is
                        // still work queued, explicitly pause so the UI shows a countdown.
                        // Without p-queue's own interval throttle this fires cleanly right
                        // after the 30th request; no silent stall to work around.
                        if (remaining === '0' && !state.paused) {
                            const until = state.observedResetAt ?? Date.now() + WINDOW_MS
                            console.info(
                                `[rate-limiter ${ts()}] quota exhausted — pausing until window reset (~${Math.ceil((until - Date.now()) / 1000)}s)`,
                            )
                            pauseUntil(until)
                        }
                    }
                }
                return response
            } catch (error) {
                if (isAnilist) {
                    console.warn(`[rate-limiter ${ts()}] fetch threw (CORS/network) — pausing ${FULL_WINDOW_MS}ms`)
                    pauseUntil(Date.now() + FULL_WINDOW_MS)
                }
                throw error
            }
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

            // The fetch interceptor is the single source of truth for pause
            // policy: it already set a 60s pause if this was a 429 or a
            // CORS-stripped 429 (TypeError). If we aren't paused, this is a
            // genuine error — propagate it instead of swallowing.
            const { paused, resumesAt } = state
            if (!paused || resumesAt === null) throw error

            const waitMs = Math.max(0, resumesAt - Date.now()) + RESUME_BUFFER_MS
            console.warn(`[rate-limiter ${ts()}] paused — retrying in ${waitMs}ms (attempt ${attempt + 1})`)
            await sleep(waitMs)
        }
    }

    throw new Error('[rate-limiter] exceeded max retries')
}
