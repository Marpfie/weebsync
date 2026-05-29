import { ServerError } from '@apollo/client'
import { useApolloClient } from '@apollo/client/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { FriendMediaListsQuery, MediaType } from '../gql/graphql'
import { FriendMediaListsDocument } from '../gql/graphql'
import { enqueue, PRIORITY } from '../lib/rate-limiter'
import { type FriendCacheEntry, isCacheFresh, loadCache, saveCache } from '../store/friendCache'

export interface UseFriendListsResult extends FriendListsState {
    /** Re-fetch only the given friend ids (used by the failure-retry affordance). */
    retry: (ids: number[]) => void
}

interface FriendListsState {
    data: FriendCacheEntry[]
    error: null | string
    failedIds: number[]
    loading: boolean
    progress: number
    total: number
}

const priorityForType = (type: MediaType) => (type === 'ANIME' ? PRIORITY.FRIEND_ANIME : PRIORITY.FRIEND_MANGA)

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
                score: entry.score ?? 0,
                siteUrl: media.siteUrl ?? null,
                status: entry.status ?? '',
            })
        }
    }
    return out
}

const isServerFailure = (error: unknown): boolean => {
    if (ServerError.is(error)) return error.statusCode >= 500
    if (error && typeof error === 'object' && 'networkError' in error) {
        const networkError = (error as { networkError?: unknown }).networkError
        return ServerError.is(networkError) && networkError.statusCode >= 500
    }
    return false
}

/**
 * Fetches every friend's media list, serially through the rate limiter,
 * persisting the combined result to a 24h localStorage cache.
 *
 * - `syncKey > 0` forces a network re-fetch (used by the manual resync button).
 * - When the cache is fresh and not being forced, the hook returns the cached
 *   slice immediately and skips the network entirely.
 * - Failed fetches (HTTP 5xx) are tracked in `failedIds`; their previous cache
 *   entries are preserved so stale data still feeds recommendations. The
 *   returned `retry()` re-fetches a specific subset surgically.
 */
export const useFriendLists = (
    friendIds: number[],
    type: MediaType,
    userId: null | number | undefined,
    syncKey: number
): UseFriendListsResult => {
    const client = useApolloClient()
    const [retryCounter, setRetryCounter] = useState(0)
    const retryIdsRef = useRef<number[]>([])

    const [state, setState] = useState<FriendListsState>(() => {
        if (userId) {
            const cached = loadCache(userId, type)
            if (cached && isCacheFresh(cached.cachedAt)) {
                return {
                    data: cached.entries,
                    error: null,
                    failedIds: [],
                    loading: false,
                    progress: cached.entries.length,
                    total: cached.entries.length,
                }
            }
        }
        return { data: [], error: null, failedIds: [], loading: false, progress: 0, total: 0 }
    })

    useEffect(() => {
        if (!userId || friendIds.length === 0) return

        const cached = loadCache(userId, type)

        if (syncKey === 0 && cached && isCacheFresh(cached.cachedAt)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
            setState({
                data: cached.entries,
                error: null,
                failedIds: [],
                loading: false,
                progress: cached.entries.length,
                total: cached.entries.length,
            })
            return
        }

        let cancelled = false
        // eslint-disable-next-line @eslint-react/set-state-in-effect
        setState({ data: [], error: null, failedIds: [], loading: true, progress: 0, total: friendIds.length })

        const aggregated: FriendCacheEntry[] = []
        const failed: number[] = []

        const fetchAll = async () => {
            for (const [index, friendId] of friendIds.entries()) {
                if (cancelled) return
                try {
                    const result = await enqueue(
                        () =>
                            client.query<FriendMediaListsQuery>({
                                fetchPolicy: syncKey > 0 ? 'network-only' : 'cache-first',
                                query: FriendMediaListsDocument,
                                variables: { type, userId: friendId },
                            }),
                        priorityForType(type)
                    )
                    aggregated.push(...extractFriendEntries(result.data, friendId, type))
                } catch (error) {
                    if (isServerFailure(error)) {
                        failed.push(friendId)
                        console.warn(`[useFriendLists] ${type} fetch failed for friend ${friendId}:`, error)
                    }
                }
                setState((previous) => ({
                    ...previous,
                    data: [...aggregated],
                    failedIds: [...failed],
                    progress: index + 1,
                }))
            }

            if (cancelled) return

            // Preserve previous cache entries for friends whose fetch failed so
            // stale data still flows into recommendations rather than vanishing.
            if (cached && failed.length > 0) {
                const failedSet = new Set(failed)
                for (const entry of cached.entries) {
                    if (failedSet.has(entry.friendId)) aggregated.push(entry)
                }
            }

            saveCache(userId, type, aggregated)
            setState((previous) => ({ ...previous, data: aggregated, loading: false }))
        }

        void fetchAll()

        return () => {
            cancelled = true
        }
    }, [friendIds, type, userId, syncKey, client])

    // Surgical retry: re-fetch only the ids handed to `retry()`. Successful
    // fetches drop from `failedIds`; still-failed ids remain until next attempt.
    useEffect(() => {
        if (retryCounter === 0 || !userId) return
        const targetIds = retryIdsRef.current
        if (targetIds.length === 0) return

        let cancelled = false

        const run = async () => {
            const stillFailed: number[] = []
            const freshEntries: FriendCacheEntry[] = []

            for (const friendId of targetIds) {
                if (cancelled) return
                try {
                    const result = await enqueue(
                        () =>
                            client.query<FriendMediaListsQuery>({
                                fetchPolicy: 'network-only',
                                query: FriendMediaListsDocument,
                                variables: { type, userId: friendId },
                            }),
                        priorityForType(type)
                    )
                    freshEntries.push(...extractFriendEntries(result.data, friendId, type))
                } catch (error) {
                    if (isServerFailure(error)) {
                        stillFailed.push(friendId)
                        console.warn(`[useFriendLists] retry failed for friend ${friendId}:`, error)
                    }
                }
            }

            if (cancelled) return

            setState((previous) => {
                const retried = new Set(targetIds)
                // Drop stale entries for friends we just refetched (success or
                // still-failed) and merge the fresh entries in.
                const carried = previous.data.filter((entry) => !retried.has(entry.friendId))
                const merged = [...carried, ...freshEntries]
                saveCache(userId, type, merged)
                return {
                    ...previous,
                    data: merged,
                    failedIds: [...previous.failedIds.filter((id) => !retried.has(id)), ...stillFailed],
                }
            })
        }

        void run()

        return () => {
            cancelled = true
        }
    }, [retryCounter, userId, type, client])

    const retry = useCallback((ids: number[]) => {
        if (ids.length === 0) return
        retryIdsRef.current = ids
        setRetryCounter((n) => n + 1)
    }, [])

    return { ...state, retry }
}
