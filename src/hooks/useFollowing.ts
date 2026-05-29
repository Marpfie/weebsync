import { useQuery } from '@apollo/client/react'

import { FollowingDocument } from '../gql/graphql'

/** Friends the current user follows on AniList. Skips fetch when no userId is known. */
export const useFollowing = (userId: null | number | undefined) =>
    useQuery(FollowingDocument, {
        skip: !userId,
        variables: { page: 1, userId: userId ?? 0 },
    })
