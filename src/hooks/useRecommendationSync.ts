import { useApolloClient } from '@apollo/client/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { UserMediaListsQuery } from '../gql/graphql'
import { UserMediaListsDocument } from '../gql/graphql'
import { enqueue, PRIORITY } from '../lib/rate-limiter'
import { buildRecommendations, type FriendInfo, type UserMediaEntry } from '../lib/recommendations'
import { clearCache } from '../store/friendCache'
import { useIdentity } from '../store/identity'
import { recordSync, usePreferences } from '../store/preferences'
import { resetRecommendations, useRecommendationsStore } from '../store/recommendationsStore'
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
export const useRecommendationSync = (enabled = true): void => {
    const identity = useIdentity()
    const prefs = usePreferences()
    const client = useApolloClient()
    const { t } = useTranslation()
    const [syncKey, setSyncKey] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)

    const userId = enabled ? identity?.userId : undefined

    // Apollo cache is shared across users (single persisted blob). Whenever the
    // logged-in user actually changes, wipe normalized data so a previous
    // account's entries don't bleed into the new one.
    const lastSeenUserId = useRef<null | number | undefined>(userId)
    useEffect(() => {
        if (lastSeenUserId.current !== userId) {
            if (lastSeenUserId.current != null) {
                void client.clearStore()
                resetRecommendations()
            }
            lastSeenUserId.current = userId
        }
    }, [userId, client])

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
            console.debug(
                `[userLists] both caches hit (anime age ${Math.round((Date.now() - animeCache.cachedAt) / 1000)}s, manga age ${Math.round((Date.now() - mangaCache.cachedAt) / 1000)}s)`
            )
            // eslint-disable-next-line @eslint-react/set-state-in-effect
            setAnimeUserEntries(animeCache.entries)
            // eslint-disable-next-line @eslint-react/set-state-in-effect
            setMangaUserEntries(mangaCache.entries)
            return
        }
        console.debug(
            `[userLists] cache MISS — force=${force}, animeNeedsFetch=${animeNeedsFetch}, mangaNeedsFetch=${mangaNeedsFetch}`
        )

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

    const eligibleFriendIds = useMemo(() => following.map((f) => f.id), [following])

    const animeFriendIds = prefs.syncAnime ? eligibleFriendIds : []
    const mangaFriendIds = prefs.syncManga ? eligibleFriendIds : []

    const animeFriendLists = useFriendLists(animeFriendIds, 'ANIME', userId, syncKey)
    const mangaFriendLists = useFriendLists(mangaFriendIds, 'MANGA', userId, syncKey)

    const isLoadingBase = userListsLoading || followingResult.loading
    const isLoadingFriends = animeFriendLists.loading || mangaFriendLists.loading
    // Single source of truth for "a network sync just finished":
    // any true→false transition of `isLoadingFriends`. Fires on manual
    // resync, on toggling syncAnime/syncManga (which kicks off a fetch for
    // the newly-enabled type) and on initial fetch when cache was missing.
    //
    // Toast policy: only surface a toast when the user actively initiated
    // the sync (`isSyncing === true`). Implicit background fetches (cold
    // cache, format toggle) update `lastSyncedAt` silently — popping a
    // "Friends resynced" toast on every fresh page load would be noise.
    const wasLoadingFriendsRef = useRef(false)
    const wasSyncingRef = useRef(false)
    useEffect(() => {
        if (isSyncing) wasSyncingRef.current = true
        const settling = wasLoadingFriendsRef.current && !isLoadingFriends
        wasLoadingFriendsRef.current = isLoadingFriends
        if (!settling) return

        recordSync(Date.now())
        const wasManual = wasSyncingRef.current
        wasSyncingRef.current = false
        // Reset the manual-sync flag so the header spinner can stop.
        setIsSyncing(false)

        if (!wasManual) return

        const failedCount = animeFriendLists.failedIds.length + mangaFriendLists.failedIds.length
        if (failedCount > 0) {
            toast.warning(t('sync.completeWithFailuresToast', { count: failedCount }))
        } else {
            toast.success(t('sync.completeToast'))
        }
    }, [isLoadingFriends, isSyncing, animeFriendLists.failedIds.length, mangaFriendLists.failedIds.length, t])

    // Build the actual recommendation lists.
    const anime = useMemo(
        () =>
            prefs.syncAnime
                ? buildRecommendations({
                      additionalStatuses: prefs.additionalAnimeStatuses,
                      dismissedIds: prefs.dismissedAnimeIds,
                      excludedFriendIds: [...new Set([...prefs.excludedFriendIds, ...prefs.friendAnimeExclusions])],
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
                      additionalStatuses: prefs.additionalMangaStatuses,
                      dismissedIds: prefs.dismissedMangaIds,
                      excludedFriendIds: [...new Set([...prefs.excludedFriendIds, ...prefs.friendMangaExclusions])],
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

    // Per-friend rating counts, used by the friends page to render
    // "142 anime rated / 4 manga rated" badges without extra requests.
    const friendRatingCounts = useMemo(() => {
        const counts = new Map<
            number,
            { animeRated: number; animeWatched: number; mangaRated: number; mangaWatched: number }
        >()
        const ensure = (id: number) => {
            let row = counts.get(id)
            if (!row) {
                row = { animeRated: 0, animeWatched: 0, mangaRated: 0, mangaWatched: 0 }
                counts.set(id, row)
            }
            return row
        }
        const seen = new Set<string>()
        for (const entry of animeFriendLists.data) {
            const key = `a-${entry.friendId}-${entry.mediaId}`
            if (seen.has(key)) continue
            seen.add(key)
            const row = ensure(entry.friendId)
            row.animeWatched++
            if (entry.score > 0) row.animeRated++
        }
        for (const entry of mangaFriendLists.data) {
            const key = `m-${entry.friendId}-${entry.mediaId}`
            if (seen.has(key)) continue
            seen.add(key)
            const row = ensure(entry.friendId)
            row.mangaWatched++
            if (entry.score > 0) row.mangaRated++
        }
        return counts
    }, [animeFriendLists.data, mangaFriendLists.data])

    const resync = useCallback(() => {
        if (userId) {
            clearCache(userId)
            clearUserListCache(userId)
        }
        setIsSyncing(true)
        setSyncKey((k) => k + 1)
    }, [userId])

    const retryFailed = useCallback(() => {
        if (animeFriendLists.failedIds.length > 0) animeFriendLists.retry(animeFriendLists.failedIds)
        if (mangaFriendLists.failedIds.length > 0) mangaFriendLists.retry(mangaFriendLists.failedIds)
    }, [animeFriendLists, mangaFriendLists])

    // Push the latest computed values into the global store.
    useEffect(() => {
        useRecommendationsStore.setState(
            {
                anime,
                animeFriendRatings: animeFriendLists.data,
                animeUserEntries,
                failedFriendIds: {
                    anime: animeFriendLists.failedIds,
                    manga: mangaFriendLists.failedIds,
                },
                following,
                friendProgress: {
                    anime: { current: animeFriendLists.progress, total: animeFriendLists.total },
                    manga: { current: mangaFriendLists.progress, total: mangaFriendLists.total },
                },
                friendRatingCounts,
                isLoadingBase,
                isLoadingFriends,
                isSyncing,
                lastSyncedAt: prefs.lastSyncedAt,
                manga,
                mangaFriendRatings: mangaFriendLists.data,
                mangaUserEntries,
                resync,
                retryFailed,
                userId,
            },
            true
        )
    }, [
        anime,
        manga,
        following,
        animeFriendLists.data,
        mangaFriendLists.data,
        animeUserEntries,
        mangaUserEntries,
        animeFriendLists.failedIds,
        mangaFriendLists.failedIds,
        animeFriendLists.progress,
        animeFriendLists.total,
        mangaFriendLists.progress,
        mangaFriendLists.total,
        friendRatingCounts,
        isLoadingBase,
        isLoadingFriends,
        isSyncing,
        prefs.lastSyncedAt,
        resync,
        retryFailed,
        userId,
    ])
}
