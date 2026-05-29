import { useSyncExternalStore } from 'react'

import type { FriendInfo, Recommendation } from '../lib/recommendations'

/**
 * In-memory snapshot of the orchestrator's output. Derived data only.
 * The underlying caches (`friendCache`, `userListCache`, Apollo
 * persisted cache) handle durability; this store holds the *computed* result
 * and lets every route read from one place without re-running the
 * orchestrator pipeline.
 */

export interface RecommendationsState {
    anime: Recommendation[]
    following: FriendInfo[]
    friendProgress: {
        anime: { current: number; total: number }
        manga: { current: number; total: number }
    }
    isLoadingBase: boolean
    isLoadingFriends: boolean
    /** True while a manual resync is in flight (not initial cache load). */
    isSyncing: boolean
    lastSyncedAt: null | number
    manga: Recommendation[]
    /**
     * Triggers a fresh sync. Mounted by `useRecommendationSync`; null until
     * the orchestrator hook is alive. UI should hide / disable resync controls
     * when this is null.
     */
    resync: (() => void) | null
    userId: null | number | undefined
}

const initialState: RecommendationsState = {
    anime: [],
    following: [],
    friendProgress: {
        anime: { current: 0, total: 0 },
        manga: { current: 0, total: 0 },
    },
    isLoadingBase: false,
    isLoadingFriends: false,
    isSyncing: false,
    lastSyncedAt: null,
    manga: [],
    resync: null,
    userId: null,
}

let snapshot: RecommendationsState = initialState
const listeners = new Set<() => void>()

const notify = (): void => {
    for (const l of listeners) l()
}

/**
 * Atomic update. Producer receives a shallow copy and returns the next state.
 * Skips notify() if nothing actually changed (referential equality), so
 * useSyncExternalStore consumers don't re-render needlessly.
 */
export const mutateRecommendations = (
    producer: (draft: RecommendationsState) => RecommendationsState
): RecommendationsState => {
    const next = producer({ ...snapshot })
    if (next === snapshot) return snapshot
    snapshot = next
    notify()
    return next
}

export const getRecommendationsState = (): RecommendationsState => snapshot

export const resetRecommendations = (): void => {
    snapshot = initialState
    notify()
}

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export const useRecommendationsStore = (): RecommendationsState =>
    useSyncExternalStore(subscribe, getRecommendationsState, getRecommendationsState)
