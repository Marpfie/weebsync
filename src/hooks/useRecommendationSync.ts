import { useApolloClient } from '@apollo/client/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { UserMediaListsQuery } from '../gql/graphql'
import { UserMediaListsDocument } from '../gql/graphql'
import { enqueue, PRIORITY } from '../lib/rate-limiter'
import { buildRecommendations, type FriendInfo, type UserMediaEntry } from '../lib/recommendations'
import { clearCache } from '../store/friendCache'
import { useIdentity } from '../store/identity'
import { recordSync, usePreferences } from '../store/preferences'
import { mutateRecommendations, resetRecommendations } from '../store/recommendationsStore'
import { clearUserListCache, isUserListCacheFresh, loadUserListCache, saveUserListCache } from '../store/userListCache'
import { useFollowing } from './useFollowing'
import { useFriendLists } from './useFriendLists'
import { toUserEntries } from './useUserEntries'

/**
 * recommendation pipeline: viewer → following → user lists → friend lists →
 * scoring
 * runs at most once per session and lives in `recommendationsStore`
 *
 * Disabled formats (`prefs.syncAnime/syncManga`) short-circuit to an empty
 * `friendIds[]`, so no network work happens for them at all.
 */
export const useRecommendationSync = (): void => {
    const identity = useIdentity()
    const prefs = usePreferences()
    const client = useApolloClient()
    const [syncKey, setSyncKey] = useState(0)

    const userId = identity?.userId
    const followingResult = useFollowing(userId)

    // User's own lists (anime/manga) — drive via the persisted cache when
    // fresh, otherwise enqueue through the rate limiter at top priority.
    const [animeUserEntries, setAnimeUserEntries] = useState<UserMediaEntry[]>(() =>
        userId ? (loadUserListCache(userId, 'ANIME')?.entries ?? []) : []
    )
    const [mangaUserEntries, setMangaUserEntries] = useState<UserMediaEntry[]>(() =>
        userId ? (loadUserListCache(userId, 'MANGA')?.entries ?? []) : []
    )
    const [userListsLoading, setUserListsLoading] = useState(false)

    useEffect(() => {
        if (!userId) {
            resetRecommendations()
            return
        }

        let cancelled = false
        const force = syncKey > 0
        const animeCache = loadUserListCache(userId, 'ANIME')
        const mangaCache = loadUserListCache(userId, 'MANGA')

        const animeNeedsFetch = force || !animeCache || !isUserListCacheFresh(animeCache.cachedAt)
        const mangaNeedsFetch = force || !mangaCache || !isUserListCacheFresh(mangaCache.cachedAt)

        if (!animeNeedsFetch && !mangaNeedsFetch) {
            // eslint-disable-next-line @eslint-react/set-state-in-effect
            setAnimeUserEntries(animeCache.entries)
            // eslint-disable-next-line @eslint-react/set-state-in-effect
            setMangaUserEntries(mangaCache.entries)
            return
        }

        // eslint-disable-next-line @eslint-react/set-state-in-effect
        setUserListsLoading(true)

        const fetchOne = async (type: 'ANIME' | 'MANGA') => {
            const result = await enqueue(
                () =>
                    client.query<UserMediaListsQuery>({
                        fetchPolicy: force ? 'network-only' : 'cache-first',
                        query: UserMediaListsDocument,
                        variables: { type, userId },
                    }),
                PRIORITY.USER_LISTS
            )
            return toUserEntries(result.data)
        }

        const run = async () => {
            try {
                if (animeNeedsFetch) {
                    const entries = await fetchOne('ANIME')
                    if (cancelled) return
                    saveUserListCache(userId, 'ANIME', entries)
                    setAnimeUserEntries(entries)
                }
                if (mangaNeedsFetch) {
                    const entries = await fetchOne('MANGA')
                    if (cancelled) return
                    saveUserListCache(userId, 'MANGA', entries)
                    setMangaUserEntries(entries)
                }
            } finally {
                if (!cancelled) setUserListsLoading(false)
            }
        }

        void run()

        return () => {
            cancelled = true
        }
    }, [userId, syncKey, client])

    // Friends list (derived from `useFollowing`).
    const following = useMemo<FriendInfo[]>(
        () =>
            (followingResult.data?.Page?.following ?? [])
                .filter((f): f is NonNullable<typeof f> => f != null)
                .map((f) => ({ avatarUrl: f.avatar?.medium ?? null, id: f.id, name: f.name })),
        [followingResult.data]
    )

    const friendInfoById = useMemo(() => new Map(following.map((f) => [f.id, f])), [following])

    const eligibleFriendIds = useMemo(
        () => following.filter((f) => !prefs.excludedFriendIds.includes(f.id)).map((f) => f.id),
        [following, prefs.excludedFriendIds]
    )

    const animeFriendIds = prefs.syncAnime ? eligibleFriendIds : []
    const mangaFriendIds = prefs.syncManga ? eligibleFriendIds : []

    const animeFriendLists = useFriendLists(animeFriendIds, 'ANIME', userId, syncKey)
    const mangaFriendLists = useFriendLists(mangaFriendIds, 'MANGA', userId, syncKey)

    const isLoadingBase = userListsLoading || followingResult.loading
    const isLoadingFriends = animeFriendLists.loading || mangaFriendLists.loading

    // Record sync timestamp once a manual resync completes.
    useEffect(() => {
        if (syncKey > 0 && !isLoadingFriends && !userListsLoading) {
            recordSync(Date.now())
        }
    }, [syncKey, isLoadingFriends, userListsLoading])

    // Build the actual recommendation lists.
    const anime = useMemo(
        () =>
            prefs.syncAnime
                ? buildRecommendations({
                      dismissedIds: prefs.dismissedAnimeIds,
                      excludedFriendIds: prefs.excludedFriendIds,
                      friendInfoById,
                      friendRatings: animeFriendLists.data,
                      includeCurrentFriendEntries: prefs.includeCurrentlyWatching,
                      mediaType: 'ANIME',
                      mode: prefs.recommendationMode,
                      userEntries: animeUserEntries,
                  })
                : [],
        [animeUserEntries, animeFriendLists.data, friendInfoById, prefs]
    )

    const manga = useMemo(
        () =>
            prefs.syncManga
                ? buildRecommendations({
                      dismissedIds: prefs.dismissedMangaIds,
                      excludedFriendIds: prefs.excludedFriendIds,
                      friendInfoById,
                      friendRatings: mangaFriendLists.data,
                      includeCurrentFriendEntries: prefs.includeCurrentlyReading,
                      mediaType: 'MANGA',
                      mode: prefs.recommendationMode,
                      userEntries: mangaUserEntries,
                  })
                : [],
        [mangaUserEntries, mangaFriendLists.data, friendInfoById, prefs]
    )

    const resync = useCallback(() => {
        if (userId) {
            clearCache(userId)
            clearUserListCache(userId)
        }
        setSyncKey((k) => k + 1)
    }, [userId])

    // Push the latest computed values into the global store.
    useEffect(() => {
        mutateRecommendations(() => ({
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
        }))
    }, [
        anime,
        manga,
        following,
        animeFriendLists.progress,
        animeFriendLists.total,
        mangaFriendLists.progress,
        mangaFriendLists.total,
        isLoadingBase,
        isLoadingFriends,
        syncKey,
        prefs.lastSyncedAt,
        resync,
        userId,
    ])
}
