import { ServerError } from '@apollo/client'
import { useApolloClient } from '@apollo/client/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { FriendMediaListsQuery, MediaType } from '../gql/graphql'
import { FriendMediaListsDocument } from '../gql/graphql'
import { enqueue, PRIORITY } from '../lib/rate-limiter'
import {
    type FriendCacheEntry,
    isCacheFresh,
    loadFriendListCache,
    loadFriendListCaches,
    saveFriendListCache,
} from '../store/friendCache'

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
                countryOfOrigin: media.countryOfOrigin ?? null,
                episodes: media.episodes ?? null,
                friendId,
                genres: media.genres ?? null,
                isAdult: media.isAdult ?? null,
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
 * persisting each friend's response as its own IndexedDB entry so the cache
 * survives across viewers and accounts.
 *
 * - `syncKey > 0` forces a network re-fetch for every friend (manual resync).
 * - Friends with a fresh per-friend cache are surfaced immediately and the
 *   network is hit only for the rest, in sequence through the rate limiter.
 * - Failed fetches (HTTP 5xx) are tracked in `failedIds`; their previous
 *   per-friend cache (if any) is preserved so stale data still feeds
 *   recommendations. `retry()` re-fetches a specific subset surgically.
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

    const [state, setState] = useState<FriendListsState>(() => ({
        data: [],
        error: null,
        failedIds: [],
        loading: false,
        progress: 0,
        total: 0,
    }))

    useEffect(() => {
        if (!userId || friendIds.length === 0) return

        let cancelled = false

        const run = async () => {
            const cachedByFriend = await loadFriendListCaches(friendIds, type)
            if (cancelled) return

            const force = syncKey > 0
            const isFresh = (id: number) => {
                const cached = cachedByFriend.get(id)
                return !!cached && !force && isCacheFresh(cached.cachedAt)
            }

            // Aggregate fresh-cached entries up-front so they're already on
            // screen while we fetch the stale ones.
            const aggregated: FriendCacheEntry[] = []
            for (const id of friendIds) {
                const cached = cachedByFriend.get(id)
                if (cached && isFresh(id)) aggregated.push(...cached.entries)
            }

            const toFetch = friendIds.filter((id) => !isFresh(id))
            const cachedCount = friendIds.length - toFetch.length

            console.debug(
                `[useFriendLists] ${type} ${cachedCount}/${friendIds.length} cached fresh, fetching ${toFetch.length} (force=${force})`
            )

            if (toFetch.length === 0) {
                setState({
                    data: aggregated,
                    error: null,
                    failedIds: [],
                    loading: false,
                    progress: friendIds.length,
                    total: friendIds.length,
                })
                return
            }

            setState({
                data: aggregated,
                error: null,
                failedIds: [],
                loading: true,
                progress: cachedCount,
                total: friendIds.length,
            })

            const failed: number[] = []
            let progress = cachedCount

            for (const friendId of toFetch) {
                if (cancelled) return
                try {
                    const result = await enqueue(
                        () =>
                            client.query<FriendMediaListsQuery>({
                                fetchPolicy: force ? 'network-only' : 'cache-first',
                                query: FriendMediaListsDocument,
                                variables: { type, userId: friendId },
                            }),
                        priorityForType(type)
                    )
                    const entries = extractFriendEntries(result.data, friendId, type)
                    aggregated.push(...entries)
                    void saveFriendListCache(friendId, type, entries)
                } catch (error) {
                    if (isServerFailure(error)) {
                        failed.push(friendId)
                        // Preserve stale snapshot for this friend so the
                        // aggregate doesn't suddenly shrink.
                        const stale = cachedByFriend.get(friendId)
                        if (stale) aggregated.push(...stale.entries)
                        console.warn(`[useFriendLists] ${type} fetch failed for friend ${friendId}:`, error)
                    }
                }
                progress++
                setState((previous) => ({
                    ...previous,
                    data: [...aggregated],
                    failedIds: [...failed],
                    progress,
                }))
            }

            if (cancelled) return
            setState((previous) => ({ ...previous, data: aggregated, loading: false }))
        }

        void run()

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
            const refreshedByFriend = new Map<number, FriendCacheEntry[]>()

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
                    const entries = extractFriendEntries(result.data, friendId, type)
                    refreshedByFriend.set(friendId, entries)
                    void saveFriendListCache(friendId, type, entries)
                } catch (error) {
                    if (isServerFailure(error)) {
                        stillFailed.push(friendId)
                        console.warn(`[useFriendLists] retry failed for friend ${friendId}:`, error)
                        // Carry stale cache forward if we still have it.
                        const stale = await loadFriendListCache(friendId, type)
                        if (stale) refreshedByFriend.set(friendId, stale.entries)
                    }
                }
            }

            if (cancelled) return

            setState((previous) => {
                const retried = new Set(targetIds)
                // Drop stale entries for friends we just refetched (success or
                // still-failed) and merge the fresh entries in.
                const carried = previous.data.filter((entry) => !retried.has(entry.friendId))
                const merged = [...carried, ...[...refreshedByFriend.values()].flat()]
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
