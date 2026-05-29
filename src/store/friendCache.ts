/**
 * Persists friend media-list data in localStorage so page reloads don't
 * re-queue every request. Keyed by userId + mediaType.
 *
 * Last-sync timestamp lives in `preferences.ts`, not here, to keep storage
 * concerns from drifting across multiple modules.
 */

import type { FriendRating, MediaType } from '../lib/recommendations'
import { CACHE_TTL_MS, STORAGE_KEYS } from '../lib/storage-keys'

/** What we store per (user, mediaType). Mirrors `FriendRating` plus the original mediaType. */
export interface FriendCacheEntry extends FriendRating {
    mediaType: string
}

interface CachePayload {
    cachedAt: number
    entries: FriendCacheEntry[]
}

const cacheKey = (userId: number, type: MediaType): string => `${STORAGE_KEYS.FRIEND_CACHE_PREFIX}${userId}_${type}`

export const loadCache = (userId: number, type: MediaType): CachePayload | undefined => {
    try {
        const raw = localStorage.getItem(cacheKey(userId, type))
        if (!raw) return undefined
        return JSON.parse(raw) as CachePayload
    } catch {
        return undefined
    }
}

export const saveCache = (userId: number, type: MediaType, entries: FriendCacheEntry[]): void => {
    try {
        const payload: CachePayload = { cachedAt: Date.now(), entries }
        localStorage.setItem(cacheKey(userId, type), JSON.stringify(payload))
    } catch {
        // Quota exceeded — degrade gracefully, the in-memory state still works.
    }
}

export const clearCache = (userId: number): void => {
    try {
        localStorage.removeItem(cacheKey(userId, 'ANIME'))
        localStorage.removeItem(cacheKey(userId, 'MANGA'))
    } catch {
        // ignore
    }
}

export const isCacheFresh = (cachedAt: number): boolean => Date.now() - cachedAt < CACHE_TTL_MS
