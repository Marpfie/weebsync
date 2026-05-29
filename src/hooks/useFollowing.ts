import { useQuery } from '@apollo/client/react'
import { useEffect, useRef } from 'react'

import { FollowingDocument } from '../gql/graphql'

/**
 * Friends the current user follows on AniList.
 *
 * Walks every page using `fetchMore` until
 * `pageInfo.hasNextPage` is false, then stops. The `Page.following` merge
 * typePolicy in `apollo.ts` concatenates pages into one cached list so all
 * consumers see the full set without re-fetching.
 *
 * Guarded by a per-userId ref so re-renders don't re-trigger pagination.
 */
export const useFollowing = (userId: null | number | undefined) => {
    const result = useQuery(FollowingDocument, {
        skip: !userId,
        variables: { page: 1, userId: userId ?? 0 },
    })

    const paginatedFor = useRef<null | number>(null)

    useEffect(() => {
        if (!userId || result.loading || result.error) return
        if (paginatedFor.current === userId) return

        const pageInfo = result.data?.Page?.pageInfo

        if (!pageInfo?.hasNextPage) {
            // Only mark "done" once we've actually seen a definite "no more pages".
            if (pageInfo) paginatedFor.current = userId

            return
        }

        paginatedFor.current = userId

        let cancelled = false
        const loadAll = async () => {
            let nextPage = (pageInfo.currentPage ?? 1) + 1

            while (!cancelled) {
                const more = await result.fetchMore({ variables: { page: nextPage, userId } })
                const info = more.data?.Page?.pageInfo

                if (!info?.hasNextPage) {
                    break
                }

                nextPage = (info.currentPage ?? nextPage) + 1
            }
        }
        void loadAll()

        return () => {
            cancelled = true
        }
    }, [userId, result.loading, result.error, result.data, result.fetchMore, result])

    return result
}
