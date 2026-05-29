import { useSyncExternalStore } from 'react'

import type { MediaType, RecommendationMode } from '../lib/recommendations'
import { STORAGE_KEYS } from '../lib/storage-keys'

/**
 * Single localStorage-backed source of truth for user-tunable settings.
 *
 * All writes go through `mutate()` so they're atomic (read → modify → write
 * in one call) and notify subscribers, so any `usePreferences()` consumer
 * re-renders automatically when prefs change anywhere in the app.
 */

const STORAGE_KEY = STORAGE_KEYS.PREFERENCES

/**
 * When 18+ content is globally enabled, this finer-grained filter is applied
 * on top: include everything, only show adult, or hide it entirely. Has no
 * effect when `includeAdultContent` is false.
 */
export type AdultFilterMode = 'exclude' | 'include' | 'only'

export interface Preferences {
    additionalAnimeStatuses: string[]
    additionalMangaStatuses: string[]
    adultFilter: AdultFilterMode
    dismissedAnimeIds: number[]
    dismissedMangaIds: number[]
    /** Format codes (or synthetic codes like MANHWA/DOUJIN) to keep. Empty = no filter. */
    enabledAnimeFormats: string[]
    enabledMangaFormats: string[]
    excludedFriendIds: number[]
    /** Friend IDs whose entries are skipped only for anime recommendations. */
    friendAnimeExclusions: number[]
    /** Friend IDs whose entries are skipped only for manga recommendations. */
    friendMangaExclusions: number[]
    includeAdultContent: boolean
    includeCurrentlyReading: boolean
    includeCurrentlyWatching: boolean
    lastSyncedAt: null | number
    recommendationMode: RecommendationMode
    syncAnime: boolean
    syncManga: boolean
}

const DEFAULTS: Readonly<Preferences> = Object.freeze({
    additionalAnimeStatuses: [],
    additionalMangaStatuses: [],
    adultFilter: 'include',
    dismissedAnimeIds: [],
    dismissedMangaIds: [],
    enabledAnimeFormats: [],
    enabledMangaFormats: [],
    excludedFriendIds: [],
    friendAnimeExclusions: [],
    friendMangaExclusions: [],
    includeAdultContent: false,
    includeCurrentlyReading: false,
    includeCurrentlyWatching: false,
    lastSyncedAt: null,
    recommendationMode: 'friend-favourites',
    syncAnime: true,
    syncManga: false,
})

const cloneDefaults = (): Preferences => ({
    ...DEFAULTS,
    additionalAnimeStatuses: [],
    additionalMangaStatuses: [],
    dismissedAnimeIds: [],
    dismissedMangaIds: [],
    enabledAnimeFormats: [],
    enabledMangaFormats: [],
    excludedFriendIds: [],
    friendAnimeExclusions: [],
    friendMangaExclusions: [],
})

const readFromStorage = (): Preferences => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return { ...cloneDefaults(), ...(JSON.parse(raw) as Partial<Preferences>) }
    } catch {
        // Corrupt JSON — fall back to defaults.
    }
    return cloneDefaults()
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

const toggleId = (list: number[], id: number): number[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

/**
 * Triple-exclusion logic for the friends page.
 *  - `'full'` cascades: adds the friend to `excludedFriendIds` and to both
 *    rec-exclusion lists. Removing full-exclude does NOT auto-restore the
 *    rec toggles (matches the documented behaviour in the plan).
 *  - `'anime'` / `'manga'` toggle only that specific rec list.
 */
export const toggleFriendExclusion = (friendId: number, scope: 'anime' | 'full' | 'manga'): void => {
    mutate((draft) => {
        if (scope === 'anime') {
            draft.friendAnimeExclusions = toggleId(draft.friendAnimeExclusions, friendId)
        } else if (scope === 'manga') {
            draft.friendMangaExclusions = toggleId(draft.friendMangaExclusions, friendId)
        } else {
            const wasFull = draft.excludedFriendIds.includes(friendId)
            draft.excludedFriendIds = toggleId(draft.excludedFriendIds, friendId)
            if (!wasFull) {
                if (!draft.friendAnimeExclusions.includes(friendId)) {
                    draft.friendAnimeExclusions = [...draft.friendAnimeExclusions, friendId]
                }
                if (!draft.friendMangaExclusions.includes(friendId)) {
                    draft.friendMangaExclusions = [...draft.friendMangaExclusions, friendId]
                }
            }
        }
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
