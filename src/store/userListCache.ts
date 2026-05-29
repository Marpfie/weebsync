/**
 * Persists the current user's own media lists in localStorage so reloads
 * and tab switches don't re-fetch them. Mirrors `friendCache.ts` shape and
 * TTL so the two caches behave identically.
 */

import type { MediaType, UserMediaEntry } from '../lib/recommendations'

const CACHE_PREFIX = 'weebsync_ulcache_'
export const USER_LIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

interface UserListCachePayload {
    cachedAt: number
    entries: UserMediaEntry[]
}

const cacheKey = (userId: number, type: MediaType): string => `${CACHE_PREFIX}${userId}_${type}`

export const loadUserListCache = (userId: number, type: MediaType): undefined | UserListCachePayload => {
    try {
        const raw = localStorage.getItem(cacheKey(userId, type))
        if (!raw) return undefined
        return JSON.parse(raw) as UserListCachePayload
    } catch {
        return undefined
    }
}

export const saveUserListCache = (userId: number, type: MediaType, entries: UserMediaEntry[]): void => {
    try {
        const payload: UserListCachePayload = { cachedAt: Date.now(), entries }
        localStorage.setItem(cacheKey(userId, type), JSON.stringify(payload))
    } catch {
        // Quota exceeded — graceful degradation, in-memory state still works.
    }
}

export const clearUserListCache = (userId: number): void => {
    try {
        localStorage.removeItem(cacheKey(userId, 'ANIME'))
        localStorage.removeItem(cacheKey(userId, 'MANGA'))
    } catch {
        // ignore
    }
}

export const isUserListCacheFresh = (cachedAt: number): boolean => Date.now() - cachedAt < USER_LIST_CACHE_TTL_MS
