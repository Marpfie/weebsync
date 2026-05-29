import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { buildRecommendations, type FriendInfo, type Recommendation } from '../lib/recommendations'
import { clearCache } from '../store/friendCache'
import { recordSync, usePreferences } from '../store/preferences'
import { useFollowing } from './useFollowing'
import { useFriendLists } from './useFriendLists'
import { useUserEntries } from './useUserEntries'
import { useUserLists } from './useUserLists'
import { useViewer } from './useViewer'

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
    resync: () => void
    userId: null | number | undefined
}

/**
 * Top-level orchestrator hook. Combines:
 *   - viewer (current user)
 *   - the user's own anime/manga lists
 *   - the friend list + each followed user's anime/manga history
 *   - persisted preferences
 *
 * and runs them through `buildRecommendations` to produce the final lists.
 *
 * Returning structured groups (`anime`, `manga`, `friendProgress`) keeps the call
 * sites trivial — pages destructure what they need without juggling 12 fields.
 */
export const useRecommendations = (): RecommendationsState => {
    const { user } = useAuth()
    const prefs = usePreferences()
    const [syncKey, setSyncKey] = useState(0)

    const viewerResult = useViewer()
    const userId = viewerResult.data?.Viewer?.id ?? user?.id

    const animeListResult = useUserLists(userId, 'ANIME')
    const mangaListResult = useUserLists(userId, 'MANGA')
    const followingResult = useFollowing(userId)

    const following = useMemo<FriendInfo[]>(
        () =>
            (followingResult.data?.Page?.following ?? [])
                .filter((f): f is NonNullable<typeof f> => f != null)
                .map((f) => ({ avatarUrl: f.avatar?.medium ?? null, id: f.id, name: f.name })),
        [followingResult.data]
    )

    const friendInfoById = useMemo(() => new Map(following.map((f) => [f.id, f])), [following])

    const friendIds = useMemo(
        () => following.filter((f) => !prefs.excludedFriendIds.includes(f.id)).map((f) => f.id),
        [following, prefs.excludedFriendIds]
    )

    const animeFriendLists = useFriendLists(friendIds, 'ANIME', userId, syncKey)
    const mangaFriendLists = useFriendLists(friendIds, 'MANGA', userId, syncKey)

    const animeUserEntries = useUserEntries(animeListResult.data)
    const mangaUserEntries = useUserEntries(mangaListResult.data)

    const isLoadingFriends = animeFriendLists.loading || mangaFriendLists.loading

    // Record the timestamp once a manual resync completes successfully.
    useEffect(() => {
        if (syncKey > 0 && !isLoadingFriends && animeFriendLists.total > 0) {
            recordSync(Date.now())
        }
    }, [syncKey, isLoadingFriends, animeFriendLists.total])

    const resync = useCallback(() => {
        if (userId) clearCache(userId)
        setSyncKey((k) => k + 1)
    }, [userId])

    const anime = useMemo(
        () =>
            buildRecommendations({
                dismissedIds: prefs.dismissedAnimeIds,
                excludedFriendIds: prefs.excludedFriendIds,
                friendInfoById,
                friendRatings: animeFriendLists.data,
                includeCurrentFriendEntries: prefs.includeCurrentlyWatching,
                mediaType: 'ANIME',
                mode: prefs.recommendationMode,
                userEntries: animeUserEntries,
            }),
        [animeUserEntries, animeFriendLists.data, friendInfoById, prefs]
    )

    const manga = useMemo(
        () =>
            buildRecommendations({
                dismissedIds: prefs.dismissedMangaIds,
                excludedFriendIds: prefs.excludedFriendIds,
                friendInfoById,
                friendRatings: mangaFriendLists.data,
                includeCurrentFriendEntries: prefs.includeCurrentlyReading,
                mediaType: 'MANGA',
                mode: prefs.recommendationMode,
                userEntries: mangaUserEntries,
            }),
        [mangaUserEntries, mangaFriendLists.data, friendInfoById, prefs]
    )

    const isLoadingBase =
        viewerResult.loading || animeListResult.loading || mangaListResult.loading || followingResult.loading

    return {
        anime,
        following,
        friendProgress: {
            anime: { current: animeFriendLists.progress, total: animeFriendLists.total },
            manga: { current: mangaFriendLists.progress, total: mangaFriendLists.total },
        },
        isLoadingBase,
        isLoadingFriends,
        isSyncing: syncKey > 0,
        lastSyncedAt: prefs.lastSyncedAt,
        manga,
        resync,
        userId,
    }
}
