import { useMemo } from 'react'

import type { FriendRating, UserMediaEntry } from '../lib/recommendations'
import { useIdentity } from '../store/identity'
import { useRecommendationsStore } from '../store/recommendationsStore'

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
 * by `useRecommendationSync` (mounted in `RootLayout`) which hydrates from
 * the IndexedDB cache asynchronously on mount.
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
        return {
            animeRatings: animeFriendRatings,
            animeUserEntries,
            lastSyncedAt,
            mangaRatings: mangaFriendRatings,
            mangaUserEntries,
        }
    }, [userId, animeFriendRatings, mangaFriendRatings, animeUserEntries, mangaUserEntries, lastSyncedAt])
}
