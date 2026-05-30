import { useMemo } from 'react'

import type { FriendRating, UserMediaEntry } from '../lib/recommendations'
import { loadCache } from '../store/friendCache'
import { useIdentity } from '../store/identity'
import { useRecommendationsStore } from '../store/recommendationsStore'
import { loadUserListCache } from '../store/userListCache'

export interface FriendInsightsData {
    animeRatings: readonly FriendRating[]
    animeUserEntries: readonly UserMediaEntry[]
    /** Earliest of the two media-type cache timestamps, or null when nothing cached. */
    lastSyncedAt: null | number
    mangaRatings: readonly FriendRating[]
    mangaUserEntries: readonly UserMediaEntry[]
}

/**
 * Reads raw friend ratings + the user's own lists straight out of the
 * recommendations store. The store is the source of truth — it is populated
 * by `useRecommendationSync` (mounted in `RootLayout`) and stays reactive
 * across navigations.
 *
 * Falls back to the persisted caches only when the store is still empty
 * (e.g. the orchestrator hasn't run yet on this tab), so the insight pages
 * have *something* to show on a cold mount before the sync hook finishes
 * hydrating.
 */
export const useFriendInsightsData = (): FriendInsightsData => {
    const identity = useIdentity()
    const userId = identity?.userId
    const animeFriendRatings = useRecommendationsStore((s) => s.animeFriendRatings)
    const mangaFriendRatings = useRecommendationsStore((s) => s.mangaFriendRatings)
    const animeUserEntries = useRecommendationsStore((s) => s.animeUserEntries)
    const mangaUserEntries = useRecommendationsStore((s) => s.mangaUserEntries)
    const lastSyncedAt = useRecommendationsStore((s) => s.lastSyncedAt)

    return useMemo<FriendInsightsData>(() => {
        if (!userId) {
            return {
                animeRatings: [],
                animeUserEntries: [],
                lastSyncedAt: null,
                mangaRatings: [],
                mangaUserEntries: [],
            }
        }
        // Cold-mount fallback: store empty but persisted cache may have data.
        const animeRatings =
            animeFriendRatings.length > 0 ? animeFriendRatings : (loadCache(userId, 'ANIME')?.entries ?? [])
        const mangaRatings =
            mangaFriendRatings.length > 0 ? mangaFriendRatings : (loadCache(userId, 'MANGA')?.entries ?? [])
        const animeUser =
            animeUserEntries.length > 0 ? animeUserEntries : (loadUserListCache(userId, 'ANIME')?.entries ?? [])
        const mangaUser =
            mangaUserEntries.length > 0 ? mangaUserEntries : (loadUserListCache(userId, 'MANGA')?.entries ?? [])
        return {
            animeRatings,
            animeUserEntries: animeUser,
            lastSyncedAt,
            mangaRatings,
            mangaUserEntries: mangaUser,
        }
    }, [userId, animeFriendRatings, mangaFriendRatings, animeUserEntries, mangaUserEntries, lastSyncedAt])
}
