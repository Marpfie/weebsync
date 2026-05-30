/**
 * Persists friend media-list data so page reloads don't re-queue every
 * request. Keyed by userId + mediaType.
 *
 * Backed by IndexedDB
 * Last-sync timestamp lives in `preferences.ts`, not here, to keep storage
 * concerns from drifting across multiple modules.
 */

import { idbDelete, idbGet, idbSet } from '../lib/idb'
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

export const loadCache = async (userId: number, type: MediaType): Promise<CachePayload | undefined> =>
    idbGet<CachePayload>(cacheKey(userId, type))

export const saveCache = async (userId: number, type: MediaType, entries: FriendCacheEntry[]): Promise<void> => {
    const payload: CachePayload = { cachedAt: Date.now(), entries }
    const ok = await idbSet(cacheKey(userId, type), payload)
    if (ok) {
        console.debug(`[friendCache] saved ${type} (${entries.length} entries)`)
    } else {
        console.warn(`[friendCache] FAILED to save ${type} cache (${entries.length} entries)`)
    }
}

export const clearCache = async (userId: number): Promise<void> => {
    await Promise.all([idbDelete(cacheKey(userId, 'ANIME')), idbDelete(cacheKey(userId, 'MANGA'))])
}

export const isCacheFresh = (cachedAt: number): boolean => Date.now() - cachedAt < CACHE_TTL_MS
