import { useQuery } from '@apollo/client/react'

import type { MediaType } from '../gql/graphql'
import { UserMediaListsDocument } from '../gql/graphql'

/** The current user's own anime or manga list. */
export const useUserLists = (userId: null | number | undefined, type: MediaType) =>
    useQuery(UserMediaListsDocument, {
        skip: !userId,
        variables: { type, userId: userId ?? 0 },
    })
