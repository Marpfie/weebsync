import { useApolloClient } from '@apollo/client/react'
import { useEffect, useState } from 'react'

import { FriendMediaListsDocument } from '../documents'
import type { FriendMediaListsQuery, MediaType } from '../gql/graphql'
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
 * syncKey: increment to force a re-fetch regardless of cache freshness.
 * userId: needed to scope the cache. Pass null/undefined to skip fetching.
 */
export const useFriendLists = (
    friendIds: number[],
    type: MediaType,
    userId: null | number | undefined,
    syncKey: number
): FriendListsState => {
    const client = useApolloClient()
    const [state, setState] = useState<FriendListsState>(() => {
        // Hydrate from cache immediately so the first render has data
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

        // Use cache if fresh and this is not a forced resync (syncKey === 0 means initial)
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

        const allEntries: FriendCacheEntry[] = []

        const fetchAll = async () => {
            for (const [index, friendId] of friendIds.entries()) {
                if (cancelled) return

                try {
                    const result = await enqueue(() =>
                        client.query<FriendMediaListsQuery>({
                            // Only bypass Apollo cache on a manual resync
                            fetchPolicy: syncKey > 0 ? 'network-only' : 'cache-first',
                            query: FriendMediaListsDocument,
                            variables: { type, userId: friendId },
                        })
                    )

                    const lists = result.data?.MediaListCollection?.lists ?? []
                    for (const list of lists) {
                        for (const entry of list?.entries ?? []) {
                            if (!entry?.media) continue
                            allEntries.push({
                                averageScore: entry.media.averageScore ?? null,
                                chapters: entry.media.chapters ?? null,
                                episodes: entry.media.episodes ?? null,
                                friendId,
                                genres: entry.media.genres ?? null,
                                mediaCover: entry.media.coverImage?.medium ?? null,
                                mediaFormat: entry.media.format ?? null,
                                mediaId: entry.media.id,
                                mediaStatus: entry.media.status ?? null,
                                mediaTitle:
                                    entry.media.title?.english ??
                                    entry.media.title?.romaji ??
                                    entry.media.title?.native ??
                                    'Unknown',
                                mediaType: entry.media.type ?? type,
                                score: entry.score ?? 0, // 0 = watched but not rated
                                siteUrl: entry.media.siteUrl ?? null,
                                status: entry.status ?? '',
                            })
                        }
                    }
                } catch {
                    // Skip failed friends, continue fetching others
                }

                setState((previous) => ({
                    ...previous,
                    data: [...allEntries],
                    progress: index + 1,
                }))
            }

            if (!cancelled) {
                saveCache(userId, type, allEntries)
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
