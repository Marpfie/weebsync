import { useSyncExternalStore } from 'react'

import { clearCache } from './friendCache'

/**
 * - `guest`: user typed an AniList username on the landing page. The app reads
 *   their public lists; no token is involved.
 * - `authed`: user completed OAuth. A token exists in sessionStorage so we can
 *   also perform write actions in the future (e.g. Plan-to-Watch toggles)
 *
 * The identity persists in localStorage
 */

const STORAGE_KEY = 'weebsync_identity'

export interface Identity {
    avatarUrl: null | string
    mode: IdentityMode
    name: string
    userId: number
}

export type IdentityMode = 'authed' | 'guest'

const readFromStorage = (): Identity | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)

        if (!raw) {
            return null
        }

        return JSON.parse(raw) as Identity
    } catch {
        return null
    }
}

const writeToStorage = (next: Identity | null): void => {
    try {
        if (next) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    } catch (error) {
        console.warn('[identity] failed to persist:', error)
    }
}

let snapshot: Identity | null = readFromStorage()
const listeners = new Set<() => void>()

const notify = (): void => {
    for (const l of listeners) l()
}

const set = (next: Identity | null): void => {
    snapshot = next
    writeToStorage(next)
    notify()
}

export const getIdentity = (): Identity | null => snapshot

export const setGuestIdentity = (user: Omit<Identity, 'mode'>): void => {
    set({ ...user, mode: 'guest' })
}

export const setAuthedIdentity = (user: Omit<Identity, 'mode'>): void => {
    set({ ...user, mode: 'authed' })
}

export const clearIdentity = (): void => {
    // Friend-list cache is keyed by the previous user's id; drop it so a
    // different account doesn't see stale entries (and to avoid localStorage bloat).
    const previous = snapshot

    if (previous) {
        clearCache(previous.userId)
    }

    set(null)
}

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)

    return () => {
        listeners.delete(listener)
    }
}

/** Reactive read of the current identity. Re-renders on any change. */
export const useIdentity = (): Identity | null => useSyncExternalStore(subscribe, getIdentity, getIdentity)
