/**
 * Persists friend media list data in localStorage so page reloads don't
 * re-queue all requests. Cache is keyed by userId + mediaType.
 * A manual resync clears and re-fetches.
 */

const CACHE_PREFIX = 'weebsync_fcache_'
const LAST_SYNC_KEY = 'weebsync_last_sync'

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface FriendCacheEntry {
    averageScore: null | number
    chapters: null | number
    episodes: null | number
    friendId: number
    genres: (null | string)[] | null
    mediaCover: null | string
    mediaFormat: null | string
    mediaId: number
    mediaStatus: null | string
    mediaTitle: string
    mediaType: string
    score: number
    siteUrl: null | string
    status: string
}

interface CachePayload {
    cachedAt: number
    entries: FriendCacheEntry[]
}

const key = (userId: number, type: string) => `${CACHE_PREFIX}${userId}_${type}`

export const loadCache = (
    userId: number,
    type: string
): undefined | { cachedAt: number; entries: FriendCacheEntry[] } => {
    try {
        const raw = localStorage.getItem(key(userId, type))

        if (!raw) return

        return JSON.parse(raw) as CachePayload
    } catch {
        return
    }
}

export const saveCache = (userId: number, type: string, entries: FriendCacheEntry[]): void => {
    try {
        const payload: CachePayload = { cachedAt: Date.now(), entries }
        localStorage.setItem(key(userId, type), JSON.stringify(payload))
    } catch {
        // localStorage quota exceeded, silently skip caching
    }
}

export const clearCache = (userId: number): void => {
    try {
        localStorage.removeItem(key(userId, 'ANIME'))
        localStorage.removeItem(key(userId, 'MANGA'))
    } catch {
        // ignore
    }
}

export const getLastSyncTime = (): number | undefined => {
    try {
        const raw = localStorage.getItem(LAST_SYNC_KEY)
        return raw ? (JSON.parse(raw) as number) : undefined
    } catch {
        return
    }
}

export const saveLastSyncTime = (ts: number): void => {
    try {
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(ts))
    } catch {
        // ignore
    }
}

export const isCacheFresh = (cachedAt: number): boolean => Date.now() - cachedAt < CACHE_TTL_MS
