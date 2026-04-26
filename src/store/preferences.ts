import type { RecommendationMode } from '@/lib/recommendations'

const STORAGE_KEY = 'weebsync_prefs'

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

const DEFAULTS: Preferences = {
    dismissedAnimeIds: [],
    dismissedMangaIds: [],
    excludedFriendIds: [],
    includeAdultContent: false,
    includeCurrentlyReading: false,
    includeCurrentlyWatching: false,
    lastSyncedAt: null,
    recommendationMode: 'friend-favourites',
}

const read = (): Preferences => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...DEFAULTS }
        return { ...DEFAULTS, ...JSON.parse(raw) } as Preferences
    } catch {
        return { ...DEFAULTS }
    }
}

const write = (prefs: Preferences): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export const getPreferences = read

export const setPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    const prefs = read()
    prefs[key] = value
    write(prefs)
}

export const toggleExcludedFriend = (friendId: number): void => {
    const prefs = read()
    const index = prefs.excludedFriendIds.indexOf(friendId)
    if (index === -1) {
        prefs.excludedFriendIds.push(friendId)
    } else {
        prefs.excludedFriendIds.splice(index, 1)
    }
    write(prefs)
}

export const dismissMedia = (mediaId: number, type: 'ANIME' | 'MANGA'): void => {
    const prefs = read()
    if (type === 'ANIME') {
        if (!prefs.dismissedAnimeIds.includes(mediaId)) prefs.dismissedAnimeIds.push(mediaId)
    } else {
        if (!prefs.dismissedMangaIds.includes(mediaId)) prefs.dismissedMangaIds.push(mediaId)
    }
    write(prefs)
}

export const undismissMedia = (mediaId: number, type: 'ANIME' | 'MANGA'): void => {
    const prefs = read()
    if (type === 'ANIME') {
        prefs.dismissedAnimeIds = prefs.dismissedAnimeIds.filter((id) => id !== mediaId)
    } else {
        prefs.dismissedMangaIds = prefs.dismissedMangaIds.filter((id) => id !== mediaId)
    }
    write(prefs)
}
