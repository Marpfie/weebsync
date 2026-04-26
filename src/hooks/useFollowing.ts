import { useQuery } from '@apollo/client/react'

import { FollowingDocument } from '../documents'

export const useFollowing = (userId: null | number | undefined) => {
    return useQuery(FollowingDocument, {
        skip: !userId,
        variables: { page: 1, userId: userId ?? 0 },
    })
}
