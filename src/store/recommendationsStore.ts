import { create } from 'zustand'

import type { FriendInfo, Recommendation } from '../lib/recommendations'

/**
 * In-memory snapshot of the orchestrator's output. Derived data only.
 * The underlying caches (`friendCache`, `userListCache`, Apollo persisted
 * cache) handle durability; this store holds the *computed* result so every
 * route can read from one place without re-running the orchestrator pipeline.
 */

export interface FriendRatingCount {
    animeRated: number
    animeWatched: number
    mangaRated: number
    mangaWatched: number
}

export interface RecommendationsState {
    anime: Recommendation[]
    /**
     * Friends whose latest fetch failed (e.g. AniList HTTP 500). Stored per
     * media type so the UI can surface a retry affordance. Their previous
     * cache entries (if any) are preserved and still flow into recommendations.
     */
    failedFriendIds: {
        anime: number[]
        manga: number[]
    }
    following: FriendInfo[]
    friendProgress: {
        anime: { current: number; total: number }
        manga: { current: number; total: number }
    }
    /** Per-friend totals derived from cached friend lists. Empty before first sync. */
    friendRatingCounts: ReadonlyMap<number, FriendRatingCount>
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
    /** Surgical retry for friends in `failedFriendIds` only. */
    retryFailed: (() => void) | null
    userId: null | number | undefined
}

const initialState: RecommendationsState = {
    anime: [],
    failedFriendIds: { anime: [], manga: [] },
    following: [],
    friendProgress: {
        anime: { current: 0, total: 0 },
        manga: { current: 0, total: 0 },
    },
    friendRatingCounts: new Map(),
    isLoadingBase: false,
    isLoadingFriends: false,
    isSyncing: false,
    lastSyncedAt: null,
    manga: [],
    resync: null,
    retryFailed: null,
    userId: null,
}

export const useRecommendationsStore = create<RecommendationsState>()(() => initialState)

export const resetRecommendations = (): void => {
    useRecommendationsStore.setState(initialState, true)
}
