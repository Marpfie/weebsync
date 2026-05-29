import { useSyncExternalStore } from 'react'

import type { MediaType, RecommendationMode } from '../lib/recommendations'

/**
 * Single localStorage-backed source of truth for user-tunable settings.
 *
 * All writes go through `mutate()` so they're atomic (read → modify → write
 * in one call) and notify subscribers, so any `usePreferences()` consumer
 * re-renders automatically when prefs change anywhere in the app.
 */

const STORAGE_KEY = 'weebsync_prefs'
const LEGACY_LAST_SYNC_KEY = 'weebsync_last_sync'

export interface Preferences {
    dismissedAnimeIds: number[]
    dismissedMangaIds: number[]
    excludedFriendIds: number[]
    includeAdultContent: boolean
    includeCurrentlyReading: boolean
    includeCurrentlyWatching: boolean
    lastSyncedAt: null | number
    recommendationMode: RecommendationMode
}

const DEFAULTS: Readonly<Preferences> = Object.freeze({
    dismissedAnimeIds: [],
    dismissedMangaIds: [],
    excludedFriendIds: [],
    includeAdultContent: false,
    includeCurrentlyReading: false,
    includeCurrentlyWatching: false,
    lastSyncedAt: null,
    recommendationMode: 'friend-favourites',
})

const cloneDefaults = (): Preferences => ({
    ...DEFAULTS,
    dismissedAnimeIds: [],
    dismissedMangaIds: [],
    excludedFriendIds: [],
})

const readFromStorage = (): Preferences => {
    let parsed: Partial<Preferences> = {}
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) parsed = JSON.parse(raw) as Partial<Preferences>
    } catch {
        // Corrupt JSON — fall back to defaults rather than throw at boot.
    }

    // One-time migration: fold the standalone last-sync key into prefs.
    if (parsed.lastSyncedAt == null) {
        try {
            const legacy = localStorage.getItem(LEGACY_LAST_SYNC_KEY)
            if (legacy) {
                parsed.lastSyncedAt = JSON.parse(legacy) as number
                localStorage.removeItem(LEGACY_LAST_SYNC_KEY)
            }
        } catch {
            // ignore
        }
    }

    return { ...cloneDefaults(), ...parsed }
}

let snapshot: Preferences = readFromStorage()
const listeners = new Set<() => void>()

const writeToStorage = (next: Preferences): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (error) {
        console.warn('[preferences] failed to persist:', error)
    }
}

const notify = (): void => {
    for (const l of listeners) l()
}

/**
 * Atomic read-modify-write. The producer receives a mutable draft and must
 * return the next state. Returning the same draft is fine — it's already a copy.
 */
export const mutate = (producer: (draft: Preferences) => Preferences): Preferences => {
    const next = producer({ ...snapshot })
    snapshot = next
    writeToStorage(next)
    notify()
    return next
}

export const getPreferences = (): Preferences => snapshot

export const setPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    mutate((draft) => {
        draft[key] = value
        return draft
    })
}

export const toggleExcludedFriend = (friendId: number): void => {
    mutate((draft) => {
        const index = draft.excludedFriendIds.indexOf(friendId)
        draft.excludedFriendIds =
            index === -1
                ? [...draft.excludedFriendIds, friendId]
                : draft.excludedFriendIds.filter((id) => id !== friendId)
        return draft
    })
}

const dismissedKey = (type: MediaType): 'dismissedAnimeIds' | 'dismissedMangaIds' =>
    type === 'ANIME' ? 'dismissedAnimeIds' : 'dismissedMangaIds'

export const dismissMedia = (mediaId: number, type: MediaType): void => {
    const key = dismissedKey(type)
    mutate((draft) => {
        if (!draft[key].includes(mediaId)) draft[key] = [...draft[key], mediaId]
        return draft
    })
}

export const undismissMedia = (mediaId: number, type: MediaType): void => {
    const key = dismissedKey(type)
    mutate((draft) => {
        draft[key] = draft[key].filter((id) => id !== mediaId)
        return draft
    })
}

export const recordSync = (timestamp: number): void => {
    mutate((draft) => {
        draft.lastSyncedAt = timestamp
        return draft
    })
}

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

/** Reactive read of the entire preferences object. Re-renders on any change. */
export const usePreferences = (): Preferences => useSyncExternalStore(subscribe, getPreferences, getPreferences)
