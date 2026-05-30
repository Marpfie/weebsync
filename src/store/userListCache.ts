/**
 * Persists the current user's own media lists so reloads and tab switches
 * don't re-fetch them. Mirrors `friendCache.ts` (now IndexedDB-backed) for
 * the same quota-headroom reasons.
 */

import { idbDelete, idbGet, idbSet } from '../lib/idb'
import type { MediaType, UserMediaEntry } from '../lib/recommendations'
import { CACHE_TTL_MS, STORAGE_KEYS } from '../lib/storage-keys'

interface UserListCachePayload {
    cachedAt: number
    entries: UserMediaEntry[]
}

const cacheKey = (userId: number, type: MediaType): string => `${STORAGE_KEYS.USER_LIST_CACHE_PREFIX}${userId}_${type}`

export const loadUserListCache = async (
    userId: number,
    type: MediaType
): Promise<undefined | UserListCachePayload> => idbGet<UserListCachePayload>(cacheKey(userId, type))

export const saveUserListCache = async (
    userId: number,
    type: MediaType,
    entries: UserMediaEntry[]
): Promise<void> => {
    const payload: UserListCachePayload = { cachedAt: Date.now(), entries }
    await idbSet(cacheKey(userId, type), payload)
}

export const clearUserListCache = async (userId: number): Promise<void> => {
    await Promise.all([idbDelete(cacheKey(userId, 'ANIME')), idbDelete(cacheKey(userId, 'MANGA'))])
}

export const isUserListCacheFresh = (cachedAt: number): boolean => Date.now() - cachedAt < CACHE_TTL_MS
