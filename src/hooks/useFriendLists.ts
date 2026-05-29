import { useApolloClient } from '@apollo/client/react'
import { useEffect, useState } from 'react'

import type { FriendMediaListsQuery, MediaType } from '../gql/graphql'
import { FriendMediaListsDocument } from '../gql/graphql'
import { enqueue } from '../lib/rate-limiter'
import { type FriendCacheEntry, isCacheFresh, loadCache, saveCache } from '../store/friendCache'

interface FriendListsState {
    data: FriendCacheEntry[]
    error: null | string
    loading: boolean
    progress: number
    total: number
}

/**
 * Flattens a friend's `MediaListCollection` query result into our flat cache shape.
 */
const extractFriendEntries = (
    data: FriendMediaListsQuery | undefined,
    friendId: number,
    fallbackType: MediaType
): FriendCacheEntry[] => {
    const out: FriendCacheEntry[] = []
    for (const list of data?.MediaListCollection?.lists ?? []) {
        for (const entry of list?.entries ?? []) {
            const media = entry?.media
            if (!media) continue
            out.push({
                averageScore: media.averageScore ?? null,
                chapters: media.chapters ?? null,
                episodes: media.episodes ?? null,
                friendId,
                genres: media.genres ?? null,
                mediaCover: media.coverImage?.medium ?? null,
                mediaFormat: media.format ?? null,
                mediaId: media.id,
                mediaStatus: media.status ?? null,
                mediaTitle: media.title?.english ?? media.title?.romaji ?? media.title?.native ?? 'Unknown',
                mediaType: media.type ?? fallbackType,
                score: entry.score ?? 0, // 0 = watched but not rated
                siteUrl: media.siteUrl ?? null,
                status: entry.status ?? '',
            })
        }
    }
    return out
}

/**
 * Fetches every friend's media list, serially through the rate limiter,
 * persisting the combined result to a 24h localStorage cache.
 *
 * - `syncKey > 0` forces a network re-fetch (used by the manual resync button).
 * - When the cache is fresh and not being forced, the hook returns the cached
 *   slice immediately and skips the network entirely.
 */
export const useFriendLists = (
    friendIds: number[],
    type: MediaType,
    userId: null | number | undefined,
    syncKey: number
): FriendListsState => {
    const client = useApolloClient()

    const [state, setState] = useState<FriendListsState>(() => {
        if (userId) {
            const cached = loadCache(userId, type)
            if (cached && isCacheFresh(cached.cachedAt)) {
                return {
                    data: cached.entries,
                    error: null,
                    loading: false,
                    progress: cached.entries.length,
                    total: cached.entries.length,
                }
            }
        }
        return { data: [], error: null, loading: false, progress: 0, total: 0 }
    })

    useEffect(() => {
        if (!userId || friendIds.length === 0) return

        const cached = loadCache(userId, type)
        if (syncKey === 0 && cached && isCacheFresh(cached.cachedAt)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
            setState({
                data: cached.entries,
                error: null,
                loading: false,
                progress: cached.entries.length,
                total: cached.entries.length,
            })
            return
        }

        let cancelled = false
        // eslint-disable-next-line @eslint-react/set-state-in-effect
        setState({ data: [], error: null, loading: true, progress: 0, total: friendIds.length })

        const aggregated: FriendCacheEntry[] = []

        const fetchAll = async () => {
            for (const [index, friendId] of friendIds.entries()) {
                if (cancelled) return
                try {
                    const result = await enqueue(() =>
                        client.query<FriendMediaListsQuery>({
                            fetchPolicy: syncKey > 0 ? 'network-only' : 'cache-first',
                            query: FriendMediaListsDocument,
                            variables: { type, userId: friendId },
                        })
                    )
                    aggregated.push(...extractFriendEntries(result.data, friendId, type))
                } catch {
                    // Skip the failed friend, continue with the rest.
                }
                setState((previous) => ({ ...previous, data: [...aggregated], progress: index + 1 }))
            }

            if (!cancelled) {
                saveCache(userId, type, aggregated)
                setState((previous) => ({ ...previous, loading: false }))
            }
        }

        void fetchAll()

        return () => {
            cancelled = true
        }
    }, [friendIds, type, userId, syncKey, client])

    return state
}
