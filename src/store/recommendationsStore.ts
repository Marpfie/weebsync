import { create } from 'zustand'

import type { FriendInfo, Recommendation } from '../lib/recommendations'

/**
 * In-memory snapshot of the orchestrator's output. Derived data only.
 * The underlying caches (`friendCache`, `userListCache`, Apollo persisted
 * cache) handle durability; this store holds the *computed* result so every
 * route can read from one place without re-running the orchestrator pipeline.
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

export const useRecommendationsStore = create<RecommendationsState>()(() => initialState)

export const resetRecommendations = (): void => {
    useRecommendationsStore.setState(initialState, true)
}
