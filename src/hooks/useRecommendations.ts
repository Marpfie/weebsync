import { useCallback, useEffect, useMemo, useState } from 'react'

import type { UserMediaEntry } from '../lib/recommendations'
import { buildRecommendations } from '../lib/recommendations'
import { clearCache, getLastSyncTime, saveLastSyncTime } from '../store/friendCache'
import { getPreferences } from '../store/preferences'
import { useAuth } from './useAuth'
import { useFollowing } from './useFollowing'
import { useFriendLists } from './useFriendLists'
import { useUserLists } from './useUserLists'
import { useViewer } from './useViewer'

const toUserEntries = (data: ReturnType<typeof useUserLists>['data']): UserMediaEntry[] => {
    const entries: UserMediaEntry[] = []
    for (const list of data?.MediaListCollection?.lists ?? []) {
        for (const entry of list?.entries ?? []) {
            if (!entry?.media) continue
            entries.push({
                averageScore: entry.media.averageScore ?? null,
                chapters: entry.media.chapters ?? null,
                coverColor: entry.media.coverImage?.color ?? null,
                coverLarge: entry.media.coverImage?.large ?? null,
                coverMedium: entry.media.coverImage?.medium ?? null,
                episodes: entry.media.episodes ?? null,
                format: entry.media.format ?? null,
                genres: entry.media.genres ?? null,
                mediaId: entry.media.id,
                mediaStatus: entry.media.status ?? null,
                score: entry.score ?? null,
                season: entry.media.season ?? null,
                seasonYear: entry.media.seasonYear ?? null,
                siteUrl: entry.media.siteUrl ?? null,
                status: entry.status,
                title:
                    entry.media.title?.english ?? entry.media.title?.romaji ?? entry.media.title?.native ?? 'Unknown',
                volumes: entry.media.volumes ?? null,
            })
        }
    }
    return entries
}

export const useRecommendations = () => {
    const { user } = useAuth()
    const [prefs] = useState(() => getPreferences())
    const [syncKey, setSyncKey] = useState(0)
    const [lastSyncedAt, setLastSyncedAt] = useState<null | number>(() => getLastSyncTime() ?? null)

    const viewerResult = useViewer()
    const userId = viewerResult.data?.Viewer?.id ?? user?.id

    const animeListResult = useUserLists(userId, 'ANIME')
    const mangaListResult = useUserLists(userId, 'MANGA')
    const followingResult = useFollowing(userId)

    const followingIds = useMemo(
        () =>
            (followingResult.data?.Page?.following ?? [])
                .filter((f): f is NonNullable<typeof f> => f != undefined)
                .map((f) => f.id)
                .filter((id) => !prefs.excludedFriendIds.includes(id)),
        [followingResult.data, prefs.excludedFriendIds]
    )

    const animeFriendLists = useFriendLists(followingIds, 'ANIME', userId, syncKey)
    const mangaFriendLists = useFriendLists(followingIds, 'MANGA', userId, syncKey)

    // When both friend syncs finish after a forced resync, record the timestamp
    const isLoadingFriends = animeFriendLists.loading || mangaFriendLists.loading

    useEffect(() => {
        if (syncKey > 0 && !isLoadingFriends && animeFriendLists.total > 0) {
            const now = Date.now()
            saveLastSyncTime(now)
            // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
            setLastSyncedAt(now)
        }
    }, [syncKey, isLoadingFriends, animeFriendLists.total])

    const resync = useCallback(() => {
        if (userId) clearCache(userId)
        setSyncKey((k) => k + 1)
    }, [userId])

    const animeUserEntries = useMemo(() => toUserEntries(animeListResult.data), [animeListResult.data])
    const mangaUserEntries = useMemo(() => toUserEntries(mangaListResult.data), [mangaListResult.data])

    const animeRecs = useMemo(
        () =>
            buildRecommendations(
                animeUserEntries,
                animeFriendLists.data,
                prefs.excludedFriendIds,
                prefs.dismissedAnimeIds,
                'ANIME',
                prefs.recommendationMode,
                prefs.includeCurrentlyWatching
            ),
        [animeUserEntries, animeFriendLists.data, prefs]
    )

    const mangaRecs = useMemo(
        () =>
            buildRecommendations(
                mangaUserEntries,
                mangaFriendLists.data,
                prefs.excludedFriendIds,
                prefs.dismissedMangaIds,
                'MANGA',
                prefs.recommendationMode,
                prefs.includeCurrentlyReading
            ),
        [mangaUserEntries, mangaFriendLists.data, prefs]
    )

    const isLoadingBase =
        viewerResult.loading || animeListResult.loading || mangaListResult.loading || followingResult.loading

    return {
        animeRecs,
        following: followingResult.data?.Page?.following ?? [],
        friendProgress: {
            anime: { current: animeFriendLists.progress, total: animeFriendLists.total },
            manga: { current: mangaFriendLists.progress, total: mangaFriendLists.total },
        },
        isLoadingBase,
        isLoadingFriends,
        // True only during a manual resync (syncKey > 0), not during initial cache load.
        // Used to decide whether to show the friend-progress label in SyncStatus.
        isSyncing: syncKey > 0,
        lastSyncedAt,
        mangaRecs,
        resync,
        userId,
    }
}
