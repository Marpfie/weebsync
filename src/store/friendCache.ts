/**
 * Per-friend media-list cache. One IndexedDB entry per (friendId, mediaType)
 * so two viewers on the same device who follow the same friend share the
 * underlying snapshot instead of re-fetching it. Also lets a manual resync
 * target individual friends without throwing away everyone else's data.
 *
 * Last-sync timestamp lives in `preferences.ts`, not here, to keep storage
 * concerns from drifting across multiple modules.
 */

import { idbDelete, idbGet, idbSet } from '../lib/idb'
import type { FriendRating, MediaType } from '../lib/recommendations'
import { CACHE_TTL_MS, STORAGE_KEYS } from '../lib/storage-keys'

/** What we store per (friend, mediaType). Mirrors `FriendRating` plus the original mediaType. */
export interface FriendCacheEntry extends FriendRating {
    mediaType: string
}

export interface FriendListCachePayload {
    cachedAt: number
    entries: FriendCacheEntry[]
}

const friendKey = (friendId: number, type: MediaType): string =>
    `${STORAGE_KEYS.FRIEND_CACHE_PREFIX}${friendId}_${type}`

export const loadFriendListCache = (friendId: number, type: MediaType): Promise<FriendListCachePayload | undefined> =>
    idbGet<FriendListCachePayload>(friendKey(friendId, type))

/**
 * Bulk loader. Returns a Map keyed by friendId; missing entries are simply
 * absent from the map.
 */
export const loadFriendListCaches = async (
    friendIds: readonly number[],
    type: MediaType
): Promise<Map<number, FriendListCachePayload>> => {
    const map = new Map<number, FriendListCachePayload>()
    await Promise.all(
        friendIds.map(async (id) => {
            const payload = await loadFriendListCache(id, type)
            if (payload) map.set(id, payload)
        })
    )
    return map
}

export const saveFriendListCache = async (
    friendId: number,
    type: MediaType,
    entries: FriendCacheEntry[]
): Promise<void> => {
    const payload: FriendListCachePayload = { cachedAt: Date.now(), entries }
    await idbSet(friendKey(friendId, type), payload)
}

/**
 * Drop cached entries for a specific set of friends. When `type` is omitted
 * both ANIME and MANGA snapshots are removed.
 */
export const clearFriendListCaches = async (friendIds: readonly number[], type?: MediaType): Promise<void> => {
    const types: MediaType[] = type ? [type] : ['ANIME', 'MANGA']
    await Promise.all(friendIds.flatMap((id) => types.map((t) => idbDelete(friendKey(id, t)))))
}

export const isCacheFresh = (cachedAt: number): boolean => Date.now() - cachedAt < CACHE_TTL_MS
